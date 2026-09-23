/**
 * Google 日历事件 → 看板预约
 */
(function (global) {
  function pickLine(text, keys) {
    const raw = String(text || '');
    for (const key of keys) {
      const re = new RegExp('(?:^|\\n)\\s*' + key + '\\s*[:：]\\s*(.+)$', 'im');
      const m = raw.match(re);
      if (m && m[1]) return m[1].trim();
    }
    return '';
  }

  function hhmmFromDate(d) {
    const t = BookingStore.tokyoParts(d);
    return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
  }

  function durationBetween(start, end) {
    const ms = end - start;
    if (!(ms > 0)) return 60;
    let min = Math.round(ms / 60000);
    if (min < 30) min = 30;
    min = Math.round(min / 30) * 30;
    return min;
  }

  function parseBeds(text, cfg) {
    if (!text) return [];
    const found = [];
    (cfg.bedLabels || []).forEach((lab, i) => {
      const names = [];
      if (typeof lab === 'string') names.push(lab);
      else if (lab) names.push(lab.jp, lab.cn, lab.en);
      names.push(String(i + 1), `床${i + 1}`, `ベッド${i + 1}`);
      if (names.filter(Boolean).some((n) => text.includes(String(n)))) found.push(i);
    });
    return [...new Set(found)].sort((a, b) => a - b);
  }

  function parseEvent(ev, cfg) {
    const startRaw = ev.start && (ev.start.dateTime || ev.start.date);
    const endRaw = ev.end && (ev.end.dateTime || ev.end.date);
    if (!startRaw) return null;
    const isAllDay = String(startRaw).length <= 10;
    const start = isAllDay ? null : new Date(startRaw);
    const end = !isAllDay && endRaw ? new Date(endRaw) : null;
    if (!isAllDay && Number.isNaN(start.getTime())) return null;

    const desc = String(ev.description || '');
    const summary = String(ev.summary || '');
    const blob = [summary, desc].filter(Boolean).join('\n');
    const priv = (ev.extendedProperties && ev.extendedProperties.private) || {};

    const wa = global.WaBookingParse
      ? WaBookingParse.parseWhatsAppBooking(blob, { courses: (cfg && cfg.courses) || [] })
      : {};

    const guestsFromSummary = (summary.match(/(\d+)\s*人/) || [])[1];
    const durFromSummary = (
      summary.match(/(\d+)\s*分钟/) ||
      summary.match(/(\d+)\s*分/) ||
      []
    )[1];

    const date = isAllDay
      ? String(startRaw).slice(0, 10)
      : BookingStore.businessDateFromInstant
        ? BookingStore.businessDateFromInstant(start)
        : BookingStore.formatDate(start);
    const openHh = String((cfg && cfg.openHour) || 12).padStart(2, '0');
    const openMm = String((cfg && cfg.openMinute) || 0).padStart(2, '0');
    const startTime = isAllDay ? `${openHh}:${openMm}` : hhmmFromDate(start);
    let durationMinutes =
      (!isAllDay && start && end && durationBetween(start, end)) ||
      Number(durFromSummary) ||
      Number(wa && wa.durationMinutes) ||
      60;
    const guests = Number(wa && wa.guests) || Number(guestsFromSummary) || 1;

    const bedsText = pickLine(blob, ['Beds', 'Bed', '床位', 'ベッド']);
    const beds = parseBeds(bedsText, cfg || {});

    let courseName = (wa && wa.serviceRaw) || '';
    if (!courseName) {
      courseName = summary.replace(/^\d+\s*人[，,]\s*\d+\s*(?:分钟|分)/, '').trim();
    }

    const bookingId = priv.bookingId || pickLine(blob, ['Booking ID', '预约号']);
    let guestName =
      wa && wa.guestName && wa.guestName !== '-'
        ? wa.guestName
        : pickLine(blob, ['Name', '姓名']);
    guestName = String(guestName || '')
      .replace(/\s+(Number of Guests|Service|Beds|Contact|Time|SHOP).*$/i, '')
      .trim();
    const guestPhone =
      wa && wa.guestPhone && wa.guestPhone !== '-' ? wa.guestPhone : '';

    const issues = [];
    if (isAllDay) issues.push('missing-start');
    if (!guestName || guestName === '-') issues.push('missing-name');
    if (!courseName || courseName === '-' || /^Name:/i.test(courseName)) {
      issues.push('missing-service');
    }
    if (!beds.length && /Beds\s*[:：]\s*\?/i.test(blob)) issues.push('missing-beds');

    return {
      date,
      startTime,
      durationMinutes,
      guests: Math.max(1, guests),
      beds,
      courseId: (wa && wa.courseId) || '',
      courseName,
      guestName: guestName === '-' ? '' : guestName,
      guestPhone: guestPhone === '-' ? '' : guestPhone,
      note: (wa && wa.note) || (desc ? desc.slice(0, 240) : ''),
      channelId: 'whatsapp',
      existingBookingId: bookingId && bookingId !== '-' ? bookingId : '',
      googleEventId: ev.id,
      googleEventLink: ev.htmlLink || '',
      issues,
      isAllDay,
    };
  }

  async function runForDate(dateStr, opts) {
    const cfg = global.STORE_CONFIG;
    if (!cfg || !cfg.googleCalendarId) {
      throw new Error('本店未配置 googleCalendarId');
    }
    if (!global.EmailClient || !EmailClient.listCalendarEvents) {
      throw new Error('未加载日历客户端');
    }
    const data = await EmailClient.listCalendarEvents({
      calendarId: cfg.googleCalendarId,
      date: dateStr,
    });
    const items = data.items || [];
    return BookingStore.importFromCalendarEvents(items, {
      date: dateStr,
      prune: items.length > 0 && !(opts && opts.prune === false),
    });
  }

  let autoTimer = null;
  let inFlight = false;

  function isBusy() {
    return Boolean(document.querySelector('.board.is-dragging, .board.is-editing-block'));
  }

  async function pullOnce(getDate, onStatus) {
    if (inFlight || isBusy()) return;
    inFlight = true;
    try {
      if (EmailClient.health) {
        const health = await EmailClient.health();
        if (!health || !health.calendarConfigured) {
          const err = new Error('网关未配置 Google 日历');
          if (onStatus) onStatus({ ok: false, error: err.message });
          return;
        }
      }
      const dateStr = typeof getDate === 'function' ? getDate() : getDate;
      const result = await runForDate(dateStr, { prune: true });
      if (onStatus) onStatus({ ok: true, date: dateStr, ...result });
    } catch (err) {
      if (onStatus) onStatus({ ok: false, error: (err && err.message) || String(err) });
    } finally {
      inFlight = false;
    }
  }

  function startAutoSync(options) {
    const opts = options || {};
    const getDate = opts.getDate;
    const onStatus = opts.onStatus;
    const intervalMs = Number(opts.intervalMs) || 30000;
    stopAutoSync();
    pullOnce(getDate, onStatus);
    autoTimer = setInterval(() => {
      pullOnce(getDate, onStatus);
    }, intervalMs);
  }

  function stopAutoSync() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function syncNow(getDate, onStatus) {
    return pullOnce(getDate, onStatus);
  }

  function statusText(result) {
    if (!result) return '';
    if (!result.ok) {
      return `日历未同步：${result.error || '网关不可用'}（须本机打开看板）`;
    }
    const shown = Number(result.imported || 0) + Number(result.updated || 0);
    const extra = [];
    if (result.imported) extra.push(`新 ${result.imported}`);
    if (result.updated) extra.push(`改 ${result.updated}`);
    if (result.removed) extra.push(`撤 ${result.removed}`);
    const tail = extra.length ? ` · ${extra.join(' / ')}` : '';
    return `日历已同步${tail || ` · 当日 ${shown} 笔`}`;
  }

  global.CalendarImport = {
    parseEvent,
    runForDate,
    startAutoSync,
    stopAutoSync,
    syncNow,
    statusText,
  };
})(window);
