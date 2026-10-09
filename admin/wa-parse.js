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
    const m = String(serviceText).match(
      /(\d+)\s*[-–]?\s*(?:Minutes?|Mins?|分钟|分)/i
    );
    return m ? Number(m[1]) : 0;
  }

  function courseNameText(c) {
    if (!c) return '';
    const n = c.name;
    if (n && typeof n === 'object' && !Array.isArray(n)) {
      return [n.jp, n.cn, n.en, n.ja, c.id].filter(Boolean).map(String).join(' ');
    }
    return String(n || c.id || '');
  }

  function courseDurationMinutes(c) {
    if (c && c.durationMinutes) return Number(c.durationMinutes) || 0;
    return extractDurationMinutes(courseNameText(c));
  }

  function courseTypeTags(text) {
    const s = String(text || '');
    const tags = [];
    [
      [/oil|アロマ|精油|arom/i, 'oil'],
      [/lymph|リンパ/i, 'lymph'],
      [/midnight|ミッドナイト|深夜/i, 'midnight'],
      [/pair|ペア|双人|couple/i, 'pair'],
      [/head[\s&＆]*shoulder|ヘッド.*ショルダー|头肩/i, 'head-shoulder'],
      [/head|ヘッド|头部/i, 'head'],
      [/foot|フット|足部|足リフレ/i, 'foot'],
      [/relax|リラックス|放松/i, 'relax'],
      [/spa|スパ|水疗/i, 'spa'],
      [/body|ボディ|身体|全身|massage|マッサージ/i, 'body'],
    ].forEach(([re, tag]) => {
      if (re.test(s)) tags.push(tag);
    });
    return tags;
  }

  function matchCourseId(serviceText, courses, durationMinutes) {
    if (!courses || !courses.length) return '';
    const text = String(serviceText || '');
    const lower = text.toLowerCase();
    const dur = Number(durationMinutes) || extractDurationMinutes(text) || 0;
    const textTags = courseTypeTags(text);

    let best = null;
    let bestScore = -1;
    courses.forEach((c) => {
      const name = courseNameText(c);
      const nameLower = name.toLowerCase();
      const cDur = courseDurationMinutes(c);
      const cTags = courseTypeTags(`${name} ${c.id || ''}`);
      let score = 0;
      if (nameLower && lower) {
        if (lower.includes(nameLower) || nameLower.includes(lower.trim())) score += 30;
        else {
          const first = nameLower.split('/')[0].trim();
          if (first && lower.includes(first)) score += 18;
        }
      }
      if (dur && cDur && dur === cDur) score += 20;
      else if (dur && cDur && Math.abs(dur - cDur) <= 15) score += 4;
      else if (dur && cDur) score -= 25;
      if (textTags.length && cTags.some((t) => textTags.includes(t))) score += 16;
      if (c.id && lower.includes(String(c.id).toLowerCase())) score += 8;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    });
    if (best && bestScore >= 16) return best.id;

    if (dur) {
      const sameDur = courses.filter((c) => courseDurationMinutes(c) === dur);
      if (sameDur.length === 1) return sameDur[0].id;
      if (sameDur.length) {
        const typed = sameDur.find((c) =>
          courseTypeTags(`${courseNameText(c)} ${c.id || ''}`).includes('body')
        );
        return (typed || sameDur[0]).id;
      }
    }
    return '';
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

    const courseId = matchCourseId(service || raw, courses, durationMinutes);
    const noteRaw = pick(raw, [
      /(?:^|\n)\s*(?:Note|备注|備考|Memo|Special request)\s*[:：]\s*(.+)$/im,
    ]);

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
      note: cleanBookingNote(noteRaw),
      serviceRaw: service,
    };
  }

  function cleanBookingNote(text) {
    let n = String(text || '').trim();
    if (!n || n === '-') return '';
    n = n
      .replace(/(?:^|[•·|,;]\s*)(?:Service|Price|Total)\s*[:：]\s*[^•·\n]+/gi, ' ')
      .replace(/\d+\s*-?\s*Minute(?:s)?\s+(?:Full\s+)?Package(?:\s*[•·].*)?/gi, ' ')
      .replace(/\d+\s*-?\s*Minute(?:s)?\s+dual[- ]Therapist\s*Pack(?:age)?(?:\s*[•·].*)?/gi, ' ')
      .replace(/Package\s*[•·]\s*Price[:：]?.*$/gi, ' ')
      .replace(/^[•·,;|\s]+|[•·,;|\s]+$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (!n || n === '-') return '';
    if (/^(?:body|massage|package|price)\b/i.test(n) && n.length < 48) return '';
    return n;
  }

  global.WaBookingParse = {
    parseWhatsAppBooking,
    parseTimeTo24,
    parseDateToISO,
    matchCourseId,
    courseNameText,
    courseDurationMinutes,
    cleanBookingNote,
  };
})(window);
