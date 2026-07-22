/**
 * 通知网关：Gmail SMTP + Google Calendar
 * 密钥只放本机 .env，不要提交到 Git。
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const calendar = require('./calendar');
const digest = require('./digest');

const PORT = Number(process.env.PORT || 8787);
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
const API_KEY = process.env.API_KEY || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.warn('[gateway] 缺少 GMAIL_USER / GMAIL_APP_PASSWORD');
}
if (!calendar.isConfigured()) {
  console.warn('[gateway] 尚未配置 Google Calendar OAuth（可先发信，稍后再配日历）');
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

const app = express();
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error('CORS blocked: ' + origin));
    },
  })
);
app.use(express.json({ limit: '8mb' }));

function requireApiKey(req, res, next) {
  if (!API_KEY) {
    next();
    return;
  }
  const key = req.get('x-api-key') || '';
  if (key !== API_KEY) {
    res.status(401).json({ ok: false, error: '未授权：API Key 不正确' });
    return;
  }
  next();
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'booking-notify-gateway',
    gmailConfigured: Boolean(GMAIL_USER && GMAIL_APP_PASSWORD),
    calendarConfigured: calendar.isConfigured(),
    from: GMAIL_USER || null,
    digest: digest.listStatus(),
    nowShanghai: digest.shanghaiNowParts(),
  });
});

/**
 * POST /digest/register
 * 客服端上报「某店某营业日」的每日汇总正文；网关到设定时刻自动发送
 */
app.post('/digest/register', requireApiKey, (req, res) => {
  try {
    const result = digest.register(req.body || {});
    res.json(result);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || String(err) });
  }
});

app.get('/digest/status', requireApiKey, (_req, res) => {
  res.json({ ok: true, stores: digest.listStatus(), now: digest.shanghaiNowParts() });
});

app.get('/calendar/list', requireApiKey, async (_req, res) => {
  try {
    const items = await calendar.listCalendars();
    res.json({ ok: true, items });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

/**
 * POST /calendar/upsert
 * body: {
 *   calendarId, eventId?, bookingId?, storeId?,
 *   summary, description, startDateTime, endDateTime, timeZone?
 * }
 * 同一 bookingId 只保留一条，自动删掉重复旧事件
 */
app.post('/calendar/upsert', requireApiKey, async (req, res) => {
  try {
    const {
      calendarId,
      eventId,
      bookingId,
      storeId,
      summary,
      description,
      startDateTime,
      endDateTime,
      timeZone,
    } = req.body || {};
    if (!calendarId || !summary || !startDateTime || !endDateTime) {
      res.status(400).json({
        ok: false,
        error: '缺少 calendarId / summary / startDateTime / endDateTime',
      });
      return;
    }
    const result = await calendar.upsertEvent({
      calendarId,
      eventId,
      bookingId,
      storeId,
      summary,
      description: description || '',
      startDateTime,
      endDateTime,
      timeZone: timeZone || 'Asia/Shanghai',
    });
    res.json(result);
  } catch (err) {
    console.error('[calendar] upsert failed', err);
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.post('/calendar/delete', requireApiKey, async (req, res) => {
  try {
    const { calendarId, eventId, bookingId, aroundDateTime } = req.body || {};
    if (bookingId) {
      const result = await calendar.deleteByBookingId(
        calendarId || 'primary',
        bookingId,
        aroundDateTime
      );
      res.json(result);
      return;
    }
    if (!eventId) {
      res.status(400).json({ ok: false, error: '缺少 eventId 或 bookingId' });
      return;
    }
    await calendar.deleteEvent(calendarId || 'primary', eventId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

/** 清理某日该店日历全部事件 */
app.post('/calendar/cleanup-day', requireApiKey, async (req, res) => {
  try {
    const { calendarId, date } = req.body || {};
    if (!calendarId || !date) {
      res.status(400).json({ ok: false, error: '缺少 calendarId / date' });
      return;
    }
    const result = await calendar.cleanupPlatformDay(calendarId, date);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

/**
 * 整日重写店日历：先清空当日，再写入 events[]
 * body: { calendarId, date, events: [upsert payload...] }
 */
app.post('/calendar/rewrite-day', requireApiKey, async (req, res) => {
  try {
    const { calendarId, date, events } = req.body || {};
    if (!calendarId || !date) {
      res.status(400).json({ ok: false, error: '缺少 calendarId / date' });
      return;
    }
    const result = await calendar.rewriteDay(calendarId, date, events || []);
    res.json(result);
  } catch (err) {
    console.error('[calendar] rewrite-day failed', err);
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

/**
 * POST /send
 * body: { to, subject, text, html?, chartDataUrl?, storeId?, bookingId?, eventType? }
 */
app.post('/send', requireApiKey, async (req, res) => {
  try {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      res.status(500).json({ ok: false, error: '服务端未配置 Gmail SMTP' });
      return;
    }

    const { to, subject, text, html, chartDataUrl } = req.body || {};
    if (!to || !subject || !(text || html)) {
      res.status(400).json({ ok: false, error: '缺少 to / subject / text' });
      return;
    }

    const attachments = [];
    let finalHtml = html;
    if (chartDataUrl && String(chartDataUrl).startsWith('data:image')) {
      const m = String(chartDataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (m) {
        attachments.push({
          filename: 'bed-status.png',
          content: Buffer.from(m[2], 'base64'),
          contentType: m[1],
          cid: 'bedstatus@booking',
        });
        if (!finalHtml) {
          finalHtml =
            `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(
              text || ''
            )}</pre>` +
            `<p><img src="cid:bedstatus@booking" alt="床位状态图" style="max-width:100%;border:1px solid #ddd"/></p>`;
        } else if (!finalHtml.includes('cid:bedstatus@booking')) {
          finalHtml +=
            `<p><img src="cid:bedstatus@booking" alt="床位状态图" style="max-width:100%;border:1px solid #ddd"/></p>`;
        }
      }
    }

    const info = await transporter.sendMail({
      from: `"预约管理平台" <${GMAIL_USER}>`,
      to,
      subject,
      text: text || undefined,
      html: finalHtml || undefined,
      attachments,
    });

    res.json({
      ok: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });
  } catch (err) {
    console.error('[mailer] send failed', err);
    res.status(500).json({
      ok: false,
      error: err && err.message ? err.message : String(err),
    });
  }
});

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendMailPayload({ to, subject, text, chartDataUrl }) {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error('服务端未配置 Gmail SMTP');
  }
  const attachments = [];
  let finalHtml;
  if (chartDataUrl && String(chartDataUrl).startsWith('data:image')) {
    const m = String(chartDataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (m) {
      attachments.push({
        filename: 'bed-status.png',
        content: Buffer.from(m[2], 'base64'),
        contentType: m[1],
        cid: 'bedstatus@booking',
      });
      finalHtml =
        `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(
          text || ''
        )}</pre>` +
        `<p><img src="cid:bedstatus@booking" alt="床位状态图" style="max-width:100%;border:1px solid #ddd"/></p>`;
    }
  }
  const info = await transporter.sendMail({
    from: `"预约管理平台" <${GMAIL_USER}>`,
    to,
    subject,
    text: text || undefined,
    html: finalHtml || undefined,
    attachments,
  });
  return { messageId: info.messageId };
}

app.listen(PORT, () => {
  console.log(`[gateway] listening on http://127.0.0.1:${PORT}`);
  console.log(
    `[gateway] gmail=${Boolean(GMAIL_USER && GMAIL_APP_PASSWORD)} calendar=${calendar.isConfigured()}`
  );
  // 每 30 秒检查是否到达各店设定的每日邮件时刻
  setInterval(() => {
    digest
      .tick(sendMailPayload)
      .then((results) => {
        if (results && results.length) {
          console.log('[digest] tick', JSON.stringify(results));
        }
      })
      .catch((err) => console.error('[digest] tick failed', err));
  }, 30000);
});
