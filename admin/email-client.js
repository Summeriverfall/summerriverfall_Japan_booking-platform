/**
 * 调用本机通知网关：邮件 + Google 日历
 */
(function (global) {
  function cfg() {
    return global.EMAIL_CONFIG || { apiBaseUrl: 'http://127.0.0.1:8787', apiKey: '' };
  }

  function baseUrl() {
    return String(cfg().apiBaseUrl || '').replace(/\/$/, '');
  }

  function headers() {
    const h = { 'Content-Type': 'application/json' };
    if (cfg().apiKey) h['x-api-key'] = cfg().apiKey;
    return h;
  }

  async function health() {
    const res = await fetch(`${baseUrl()}/health`);
    if (!res.ok) throw new Error(`通知服务不可用 HTTP ${res.status}`);
    return res.json();
  }

  async function sendMerchantMail(payload) {
    if (!baseUrl()) throw new Error('未配置 EMAIL_CONFIG.apiBaseUrl');
    if (!payload || !payload.to) throw new Error('商家收件邮箱未配置');

    const res = await fetch(`${baseUrl()}/send`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
    if (!res.ok || !data || !data.ok) {
      throw new Error((data && data.error) || `发送失败 HTTP ${res.status}`);
    }
    return data;
  }

  async function upsertCalendarEvent(payload) {
    if (!baseUrl()) throw new Error('未配置 EMAIL_CONFIG.apiBaseUrl');
    if (!payload || !payload.calendarId) {
      throw new Error('未配置门店 googleCalendarId（先 npm run list-calendars 再填 stores.js）');
    }
    const res = await fetch(`${baseUrl()}/calendar/upsert`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
    if (!res.ok || !data || !data.ok) {
      throw new Error((data && data.error) || `日历同步失败 HTTP ${res.status}`);
    }
    return data;
  }

  async function deleteCalendarEvent(payload) {
    if (!baseUrl()) throw new Error('未配置 EMAIL_CONFIG.apiBaseUrl');
    if (!payload || (!payload.eventId && !payload.bookingId)) {
      return { ok: true, skipped: true };
    }
    const res = await fetch(`${baseUrl()}/calendar/delete`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        calendarId: payload.calendarId || '',
        eventId: payload.eventId || null,
        bookingId: payload.bookingId || null,
        aroundDateTime: payload.aroundDateTime || null,
      }),
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
    if (!res.ok || !data || !data.ok) {
      throw new Error((data && data.error) || `日历删除失败 HTTP ${res.status}`);
    }
    return data;
  }

  async function cleanupCalendarDay(payload) {
    if (!baseUrl()) throw new Error('未配置 EMAIL_CONFIG.apiBaseUrl');
    const res = await fetch(`${baseUrl()}/calendar/cleanup-day`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
    if (!res.ok || !data || !data.ok) {
      throw new Error((data && data.error) || `日历清理失败 HTTP ${res.status}`);
    }
    return data;
  }

  /** 整日重写：清空当日后再写入 */
  async function rewriteCalendarDay(payload) {
    if (!baseUrl()) throw new Error('未配置 EMAIL_CONFIG.apiBaseUrl');
    const res = await fetch(`${baseUrl()}/calendar/rewrite-day`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
    if (!res.ok || !data || !data.ok) {
      throw new Error((data && data.error) || `日历重写失败 HTTP ${res.status}`);
    }
    return data;
  }

  async function registerDailyDigest(payload) {
    if (!baseUrl()) throw new Error('未配置 EMAIL_CONFIG.apiBaseUrl');
    const res = await fetch(`${baseUrl()}/digest/register`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
    if (!res.ok || !data || !data.ok) {
      throw new Error((data && data.error) || `每日汇总登记失败 HTTP ${res.status}`);
    }
    return data;
  }

  global.EmailClient = {
    health,
    sendMerchantMail,
    upsertCalendarEvent,
    deleteCalendarEvent,
    cleanupCalendarDay,
    rewriteCalendarDay,
    registerDailyDigest,
  };
})(window);
