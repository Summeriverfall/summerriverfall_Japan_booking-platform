/**
 * 每日商家汇总邮件：客服端上报当日正文/配图，网关按设定时刻发送。
 * 数据文件：server/data/digests.json（勿提交密钥；本文件可提交空结构）
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'digests.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ stores: {} }, null, 2), 'utf8');
  }
}

function readAll() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (_) {
    return { stores: {} };
  }
}

function writeAll(data) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function tokyoNowParts() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  let hour = parts.hour;
  if (hour === '24') hour = '00';
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${hour}:${parts.minute}`,
  };
}

/** @deprecated 使用 tokyoNowParts；保留别名避免旧引用报错 */
function shanghaiNowParts() {
  return tokyoNowParts();
}

/**
 * 登记/更新某店待发送的每日汇总
 * body fields: storeId, storeName, to, time(HH:MM), date, subject, text, chartDataUrl?
 */
function register(payload) {
  const storeId = String((payload && payload.storeId) || '').trim();
  if (!storeId) throw new Error('缺少 storeId');
  const time = String((payload && payload.time) || '00:00').trim();
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error('time 格式应为 HH:MM');
  const date = String((payload && payload.date) || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('缺少有效 date');
  const to = String((payload && payload.to) || '').trim();
  if (!to) throw new Error('缺少 to');
  const subject = String((payload && payload.subject) || '').trim();
  const text = String((payload && payload.text) || '').trim();
  if (!subject || !text) throw new Error('缺少 subject / text');

  const all = readAll();
  const prev = all.stores[storeId] || {};
  all.stores[storeId] = {
    storeId,
    storeName: payload.storeName || prev.storeName || storeId,
    to,
    time,
    date,
    subject,
    text,
    chartDataUrl: payload.chartDataUrl || null,
    updatedAt: new Date().toISOString(),
    lastSentDate: prev.lastSentDate || null,
    lastSentAt: prev.lastSentAt || null,
  };
  writeAll(all);
  return { ok: true, store: all.stores[storeId] };
}

function listStatus() {
  const all = readAll();
  return Object.values(all.stores || {}).map((s) => ({
    storeId: s.storeId,
    storeName: s.storeName,
    to: s.to,
    time: s.time,
    date: s.date,
    lastSentDate: s.lastSentDate || null,
    updatedAt: s.updatedAt || null,
  }));
}

/**
 * 检查并发送到期的每日汇总；sendFn({to,subject,text,chartDataUrl}) 由网关注入
 */
async function tick(sendFn) {
  const { date: today, time: nowHm } = tokyoNowParts();
  const all = readAll();
  const results = [];
  for (const store of Object.values(all.stores || {})) {
    if (!store || !store.time || store.time !== nowHm) continue;
    // 只发「已上报的营业日」且当日尚未发过
    if (!store.date || store.lastSentDate === store.date) continue;
    // 若上报的是未来日则跳过；允许发今天或更早（跨夜店凌晨发前一营业日）
    if (store.date > today) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      const sent = await sendFn({
        to: store.to,
        subject: store.subject,
        text: store.text,
        chartDataUrl: store.chartDataUrl || null,
      });
      store.lastSentDate = store.date;
      store.lastSentAt = new Date().toISOString();
      store.lastMessageId = (sent && sent.messageId) || null;
      results.push({ storeId: store.storeId, ok: true, messageId: store.lastMessageId });
    } catch (err) {
      results.push({
        storeId: store.storeId,
        ok: false,
        error: (err && err.message) || String(err),
      });
    }
  }
  if (results.length) writeAll(all);
  return results;
}

module.exports = {
  register,
  listStatus,
  tick,
  tokyoNowParts,
  shanghaiNowParts,
};
