/**
 * Google Calendar 客户端（OAuth refresh token）
 */
const net = require('net');
const { google } = require('googleapis');

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

async function ensureProxy() {
  if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) return;
  const candidates = [7897, 7890, 10809, 10808];
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
}

// 启动时尽量挂上代理（googleapis 会读 HTTPS_PROXY）
ensureProxy().catch(() => {});

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

function calendarApi() {
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
  const cal = calendarApi();
  const res = await cal.calendarList.list({ maxResults: 250 });
  return (res.data.items || []).map((c) => ({
    id: c.id,
    summary: c.summary,
    primary: Boolean(c.primary),
    accessRole: c.accessRole,
    backgroundColor: c.backgroundColor,
  }));
}

/**
 * 创建或更新事件
 * @param {{
 *   calendarId: string,
 *   eventId?: string|null,
 *   summary: string,
 *   description: string,
 *   startDateTime: string,
 *   endDateTime: string,
 *   timeZone?: string,
 * }} input
 */
async function upsertEvent(input) {
  const cal = calendarApi();
  const calendarId = input.calendarId || 'primary';
  const timeZone = input.timeZone || 'Asia/Shanghai';
  // dateTime 若已含 ±HH:MM 偏移，则按该绝对时间写入；timeZone 仅作展示辅助
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
    description: input.description,
    start,
    end,
  };

  if (input.eventId) {
    try {
      const updated = await cal.events.update({
        calendarId,
        eventId: input.eventId,
        requestBody: body,
      });
      return {
        ok: true,
        mode: 'updated',
        eventId: updated.data.id,
        htmlLink: updated.data.htmlLink,
      };
    } catch (err) {
      // 事件被删或不存在 → 新建
      if (!(err && (err.code === 404 || err.status === 404))) throw err;
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
  };
}

async function deleteEvent(calendarId, eventId) {
  const cal = calendarApi();
  await cal.events.delete({
    calendarId: calendarId || 'primary',
    eventId,
  });
  return { ok: true };
}

/**
 * 按名称查找或创建日历，并设置颜色（Google 月视图里不同店=不同色点）
 * colorId: Google 预设 1–24，见 https://developers.google.com/calendar/api/v3/reference/colors
 */
async function ensureNamedCalendar(summary, colorId) {
  const cal = calendarApi();
  const list = await cal.calendarList.list({ maxResults: 250 });
  let existing = (list.data.items || []).find(
    (c) => String(c.summary || '').trim() === String(summary).trim()
  );

  if (!existing) {
    const created = await cal.calendars.insert({
      requestBody: {
        summary,
        timeZone: 'Asia/Tokyo',
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
  upsertEvent,
  deleteEvent,
  ensureNamedCalendar,
};
