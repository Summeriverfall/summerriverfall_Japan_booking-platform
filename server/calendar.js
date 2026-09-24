/**
 * Google Calendar 客户端（OAuth refresh token）
 */
const net = require('net');
const { google } = require('googleapis');

const PLATFORM_SOURCE = 'booking-platform';

function canConnect(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(400, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function proxyPortFromEnv() {
  const raw = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
  const m = String(raw).match(/:(\d+)(?:\/|$)/);
  return m ? Number(m[1]) : null;
}

function clearProxyEnv() {
  delete process.env.HTTPS_PROXY;
  delete process.env.HTTP_PROXY;
  delete process.env.https_proxy;
  delete process.env.http_proxy;
}

async function ensureProxy() {
  const existing = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
  if (existing) {
    const port = proxyPortFromEnv();
    if (port && (await canConnect(port))) {
      console.log('[calendar] 使用代理', existing);
      return;
    }
    console.warn('[calendar] 配置的代理不可用，改为直连', existing);
    clearProxyEnv();
  }
  const candidates = [7897, 7890, 7891, 10809, 10808, 1080, 6152, 20171];
  for (const port of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await canConnect(port)) {
      const url = `http://127.0.0.1:${port}`;
      process.env.HTTPS_PROXY = url;
      process.env.HTTP_PROXY = url;
      console.log('[calendar] 自动使用本机代理', url);
      return;
    }
  }
  console.warn('[calendar] 未检测到本机代理，直连 Google');
}

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || '';
  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

function isConfigured() {
  return Boolean(getOAuthClient());
}

async function getCalendarApi() {
  await ensureProxy();
  const auth = getOAuthClient();
  if (!auth) {
    const err = new Error(
      '未配置 Google Calendar：请设置 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN'
    );
    err.code = 'CALENDAR_NOT_CONFIGURED';
    throw err;
  }
  return google.calendar({ version: 'v3', auth });
}

async function listCalendars() {
  const cal = await getCalendarApi();
  const res = await cal.calendarList.list({ maxResults: 250 });
  return (res.data.items || []).map((c) => ({
    id: c.id,
    summary: c.summary,
    primary: Boolean(c.primary),
    accessRole: c.accessRole,
    backgroundColor: c.backgroundColor,
  }));
}

function buildEventBody(input) {
  const timeZone = input.timeZone || 'Asia/Shanghai';
  const start = { dateTime: input.startDateTime };
  const end = { dateTime: input.endDateTime };
  if (!/[+-]\d{2}:\d{2}$/.test(String(input.startDateTime || ''))) {
    start.timeZone = timeZone;
  }
  if (!/[+-]\d{2}:\d{2}$/.test(String(input.endDateTime || ''))) {
    end.timeZone = timeZone;
  }
  const body = {
    summary: input.summary,
    description: input.description || '',
    start,
    end,
  };
  if (input.bookingId || input.storeId) {
    body.extendedProperties = {
      private: {
        source: PLATFORM_SOURCE,
        bookingId: String(input.bookingId || ''),
        storeId: String(input.storeId || ''),
      },
    };
  }
  return body;
}

/** 列出某日历在时间窗内的事件（含扩展属性） */
async function listEventsInRange(calendarId, timeMin, timeMax) {
  const cal = await getCalendarApi();
  const items = [];
  let pageToken;
  do {
    // eslint-disable-next-line no-await-in-loop
    const res = await cal.events.list({
      calendarId: calendarId || 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
      pageToken,
    });
    items.push(...(res.data.items || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return items;
}

function eventMatchesBooking(ev, bookingId) {
  if (!bookingId) return false;
  const priv = (ev.extendedProperties && ev.extendedProperties.private) || {};
  if (priv.bookingId && String(priv.bookingId) === String(bookingId)) return true;
  const desc = String(ev.description || '');
  return desc.includes(`Booking ID: ${bookingId}`);
}

function isPlatformEvent(ev) {
  const priv = (ev.extendedProperties && ev.extendedProperties.private) || {};
  if (priv.source === PLATFORM_SOURCE) return true;
  const desc = String(ev.description || '');
  return /Booking ID:\s*\S+/.test(desc) || /We look forward to welcoming you/.test(desc);
}

/**
 * 查找同一 bookingId 的已有事件，返回 ids（可能多个重复）
 */
async function findEventsForBooking(calendarId, bookingId, aroundDateTime) {
  if (!bookingId) return [];
  const cal = await getCalendarApi();

  // 1) 扩展属性精确查
  try {
    const res = await cal.events.list({
      calendarId: calendarId || 'primary',
      privateExtendedProperty: `bookingId=${bookingId}`,
      maxResults: 50,
      singleEvents: true,
    });
    const byProp = res.data.items || [];
    if (byProp.length) return byProp;
  } catch (_) {
    /* 旧事件可能无扩展属性 */
  }

  // 2) 在前后几天描述里搜 Booking ID
  const center = aroundDateTime ? new Date(aroundDateTime) : new Date();
  const timeMin = new Date(center.getTime() - 2 * 24 * 3600 * 1000).toISOString();
  const timeMax = new Date(center.getTime() + 3 * 24 * 3600 * 1000).toISOString();
  const windowItems = await listEventsInRange(calendarId, timeMin, timeMax);
  return windowItems.filter((ev) => eventMatchesBooking(ev, bookingId));
}

/**
 * 创建或更新；同一 bookingId 只保留一条，多余删除
 */
async function upsertEvent(input) {
  const cal = await getCalendarApi();
  const calendarId = input.calendarId || 'primary';
  const body = buildEventBody(input);
  const bookingId = input.bookingId || '';

  const existing = await findEventsForBooking(
    calendarId,
    bookingId,
    input.startDateTime
  );
  let primaryId = input.eventId || null;
  if (!primaryId && existing.length) {
    primaryId = existing[0].id;
  }

  // 删掉同单号的其它重复
  const toDelete = existing.filter((ev) => ev.id !== primaryId);
  for (const ev of toDelete) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await cal.events.delete({ calendarId, eventId: ev.id });
    } catch (_) {
      /* ignore */
    }
  }

  if (primaryId) {
    try {
      const updated = await cal.events.update({
        calendarId,
        eventId: primaryId,
        requestBody: body,
      });
      return {
        ok: true,
        mode: existing.length > 1 ? 'updated_deduped' : 'updated',
        eventId: updated.data.id,
        htmlLink: updated.data.htmlLink,
        removedDuplicates: toDelete.length,
      };
    } catch (err) {
      if (!(err && (err.code === 404 || err.status === 404))) throw err;
      primaryId = null;
    }
  }

  const created = await cal.events.insert({
    calendarId,
    requestBody: body,
  });
  return {
    ok: true,
    mode: 'created',
    eventId: created.data.id,
    htmlLink: created.data.htmlLink,
    removedDuplicates: toDelete.length,
  };
}

async function deleteEvent(calendarId, eventId) {
  const cal = await getCalendarApi();
  await cal.events.delete({
    calendarId: calendarId || 'primary',
    eventId,
  });
  return { ok: true };
}

/**
 * 按 bookingId 删除（含重复）
 */
async function deleteByBookingId(calendarId, bookingId, aroundDateTime) {
  const list = await findEventsForBooking(calendarId, bookingId, aroundDateTime);
  const cal = await getCalendarApi();
  let removed = 0;
  for (const ev of list) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await cal.events.delete({ calendarId: calendarId || 'primary', eventId: ev.id });
      removed += 1;
    } catch (_) {
      /* ignore */
    }
  }
  return { ok: true, removed };
}

function isPlatformEvent(ev) {
  const priv = (ev && ev.extendedProperties && ev.extendedProperties.private) || {};
  return String(priv.source || '') === PLATFORM_SOURCE || Boolean(priv.bookingId);
}

/**
 * 只清空某日「本平台写入」的事件。共享店日历上的店家原事件一律不删。
 */
async function cleanupPlatformDay(calendarId, dateStr) {
  const timeMinWide = `${dateStr}T00:00:00Z`;
  const next = addDaysYmd(dateStr, 1);
  const timeMaxWide = `${next}T00:00:00Z`;
  const items = await listEventsInRange(calendarId, timeMinWide, timeMaxWide);
  const cal = await getCalendarApi();
  let removed = 0;
  for (const ev of items) {
    if (!isPlatformEvent(ev)) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      await cal.events.delete({ calendarId, eventId: ev.id });
      removed += 1;
    } catch (_) {
      /* ignore */
    }
  }
  return { ok: true, removed };
}

async function deleteCalendar(calendarId) {
  const cal = await getCalendarApi();
  await cal.calendars.delete({ calendarId });
  return { ok: true };
}

function addDaysYmd(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * 整日重写：先清空当日，再纯插入（不再 upsert，避免同日多次写入叠出重复）
 */
async function rewriteDay(calendarId, dateStr, events) {
  const cleaned = await cleanupPlatformDay(calendarId, dateStr);
  const cal = await getCalendarApi();
  const written = [];
  for (const ev of events || []) {
    const body = buildEventBody(Object.assign({}, ev, { calendarId }));
    // eslint-disable-next-line no-await-in-loop
    const created = await cal.events.insert({
      calendarId,
      requestBody: body,
    });
    written.push({
      ok: true,
      mode: 'created',
      eventId: created.data.id,
      htmlLink: created.data.htmlLink,
      bookingId: ev.bookingId || null,
    });
  }
  return {
    ok: true,
    removed: cleaned.removed,
    written: written.length,
    events: written,
  };
}

async function ensureNamedCalendar(summary, colorId) {
  const cal = await getCalendarApi();
  const list = await cal.calendarList.list({ maxResults: 250 });
  let existing = (list.data.items || []).find(
    (c) => String(c.summary || '').trim() === String(summary).trim()
  );

  if (!existing) {
    const created = await cal.calendars.insert({
      requestBody: {
        summary,
        timeZone: 'Asia/Shanghai',
      },
    });
    const id = created.data.id;
    await cal.calendarList.insert({
      requestBody: {
        id,
        colorId: String(colorId || '7'),
        selected: true,
      },
    });
    const again = await cal.calendarList.get({ calendarId: id });
    existing = again.data;
  } else if (colorId && String(existing.colorId) !== String(colorId)) {
    await cal.calendarList.patch({
      calendarId: existing.id,
      requestBody: { colorId: String(colorId), selected: true },
    });
    const again = await cal.calendarList.get({ calendarId: existing.id });
    existing = again.data;
  }

  return {
    id: existing.id,
    summary: existing.summary,
    colorId: existing.colorId,
    backgroundColor: existing.backgroundColor,
  };
}

module.exports = {
  isConfigured,
  listCalendars,
  listEventsInRange,
  upsertEvent,
  deleteEvent,
  deleteByBookingId,
  cleanupPlatformDay,
  rewriteDay,
  deleteCalendar,
  ensureNamedCalendar,
  PLATFORM_SOURCE,
};
