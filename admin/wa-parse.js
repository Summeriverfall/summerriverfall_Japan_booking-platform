/**
 * 解析 WhatsApp 预约确认 / 预约请求文本 → 结构化字段
 */
(function (global) {
  function pick(text, patterns) {
    for (const re of patterns) {
      const m = text.match(re);
      if (m && m[1]) return m[1].trim();
    }
    return '';
  }

  function parseTimeTo24(raw) {
    if (!raw) return '';
    let s = raw.replace(/\s+/g, ' ').trim();
    // 7/20，20:10 or 20:10
    let m = s.match(/(\d{1,2})[:：](\d{2})\s*(AM|PM|am|pm)?/);
    if (m) {
      let h = Number(m[1]);
      const min = m[2];
      const ap = (m[3] || '').toUpperCase();
      if (ap === 'PM' && h < 12) h += 12;
      if (ap === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${min}`;
    }
    // 6:00 PM
    m = s.match(/(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM|am|pm)/);
    if (m) {
      let h = Number(m[1]);
      const min = m[2];
      const ap = m[3].toUpperCase();
      if (ap === 'PM' && h < 12) h += 12;
      if (ap === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${min}`;
    }
    return '';
  }

  function parseDateToISO(raw, fallbackYear) {
    if (!raw) return '';
    const y = fallbackYear || new Date().getFullYear();
    let s = raw.replace(/，/g, ',').trim();

    // 7/20 or 7/20/2026 or 2026-07-20
    let m = s.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
    if (m) {
      return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
    }
    m = s.match(/(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/);
    if (m) {
      const month = Number(m[1]);
      const day = Number(m[2]);
      let year = m[3] ? Number(m[3]) : y;
      if (year < 100) year += 2000;
      // 若像 20/7 欧式，且第一段>12，交换
      if (month > 12 && day <= 12) {
        return `${year}-${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}`;
      }
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    // July 20, 2026
    m = s.match(
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i
    );
    if (m) {
      const months = {
        january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
        july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
      };
      const month = months[m[1].toLowerCase()];
      const day = Number(m[2]);
      const year = m[3] ? Number(m[3]) : y;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return '';
  }

  function extractDurationMinutes(serviceText) {
    if (!serviceText) return 0;
    const m = serviceText.match(/(\d+)\s*[-–]?\s*(?:Minute|Minutes|min|Mins|分钟)/i);
    return m ? Number(m[1]) : 0;
  }

  function matchCourseId(serviceText, courses) {
    if (!serviceText || !courses || !courses.length) return '';
    const lower = serviceText.toLowerCase();
    const hit = courses.find((c) => {
      const n = (c.name || '').toLowerCase();
      return n && (lower.includes(n.split('/')[0].trim()) || n.includes(lower.slice(0, 12)));
    });
    if (hit) return hit.id;
    // 关键词
    if (/oil|オイル|精油/.test(lower)) {
      const c = courses.find((x) => /oil|オイル|精油/i.test(x.name));
      if (c) return c.id;
    }
    if (/body|ボディ|身体|full package|package/.test(lower)) {
      const c = courses.find((x) => /body|ボディ|身体|spa|package|コース/i.test(x.name));
      if (c) return c.id;
    }
    return courses[0] ? courses[0].id : '';
  }

  function parseWhatsAppBooking(text, options) {
    const opts = options || {};
    const year = opts.year || new Date().getFullYear();
    const courses = opts.courses || [];
    const raw = String(text || '').replace(/\r/g, '');

    const name = pick(raw, [
      /(?:^|\n)\s*Name\s*[:：]\s*(.+)$/im,
      /(?:^|\n)\s*姓名\s*[:：]\s*(.+)$/im,
    ]);

    const guestsRaw = pick(raw, [
      /Number of Guests\s*[:：]\s*(\d+)/i,
      /Guests?\s*[:：]\s*(\d+)/i,
      /人数\s*[:：]\s*(\d+)/i,
    ]);

    const phone = pick(raw, [
      /Contact\s*\(WhatsApp\)\s*[:：]\s*(.+)$/im,
      /WhatsApp\s*[:：]\s*(.+)$/im,
      /Contact\s*[:：]\s*(\+?[\d\s\-]+)/im,
      /电话\s*[:：]\s*(.+)$/im,
    ]).replace(/\s+/g, ' ').trim();

    const service = pick(raw, [
      /(?:^|\n)\s*Service\s*[:：]\s*(.+)$/im,
      /(?:^|\n)\s*Main Guest\s*[:：]\s*(.+)$/im,
      /(?:^|\n)\s*项目\s*[:：]\s*(.+)$/im,
    ]);

    // Time line may include date: Time: 7/20，20:10
    const timeLine = pick(raw, [
      /(?:^|\n)\s*Time\s*[:：]\s*(.+)$/im,
      /(?:^|\n)\s*时间\s*[:：]\s*(.+)$/im,
    ]);
    const dateLine = pick(raw, [
      /(?:^|\n)\s*Date\s*[:：]\s*(.+)$/im,
      /(?:^|\n)\s*日期\s*[:：]\s*(.+)$/im,
    ]);

    let date = parseDateToISO(dateLine, year);
    let startTime = parseTimeTo24(timeLine);

    if (!date && timeLine) {
      // Time: 7/20，20:10
      const dm = timeLine.match(/(\d{1,2})[\/\-.](\d{1,2})/);
      if (dm) date = parseDateToISO(`${dm[1]}/${dm[2]}`, year);
    }
    if (!startTime && timeLine) startTime = parseTimeTo24(timeLine);

    let durationMinutes = extractDurationMinutes(service) || extractDurationMinutes(raw);
    if (!durationMinutes) durationMinutes = 60;

    const courseId = matchCourseId(service, courses);
    const noteParts = [];
    if (service) noteParts.push(`Service: ${service}`);
    const price = pick(raw, [/(?:^|\n)\s*Price\s*[:：]\s*(.+)$/im, /Total\s*[:：]\s*(.+)$/im]);
    if (price) noteParts.push(`Price: ${price}`);

    return {
      ok: !!(name || startTime || guestsRaw),
      guestName: name,
      guestPhone: phone,
      guests: guestsRaw ? Number(guestsRaw) : 0,
      date,
      startTime,
      durationMinutes,
      courseId,
      channelId: 'whatsapp',
      note: noteParts.join(' · '),
      serviceRaw: service,
    };
  }

  global.WaBookingParse = { parseWhatsAppBooking, parseTimeTo24, parseDateToISO };
})(window);
