/**
 * Google Calendar 客户端（OAuth refresh token）
 */
const { google } = require('googleapis');

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
  const timeZone = input.timeZone || 'Asia/Tokyo';
  const body = {
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.startDateTime, timeZone },
    end: { dateTime: input.endDateTime, timeZone },
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

module.exports = {
  isConfigured,
  listCalendars,
  upsertEvent,
  deleteEvent,
};
