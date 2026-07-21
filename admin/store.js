/**
 * 统一占用账本（首期）：预约 / 待确认预留 / 商家手动关床
 * 数据存 localStorage，便于本机功能测试；后续可换服务端。
 */
(function (global) {
  const CFG = () => global.STORE_CONFIG;

  function todayBusinessDate() {
    const now = new Date();
    const cfg = CFG();
    // 跨夜店：凌晨仍算前一营业日
    if (cfg.overnight && now.getHours() < cfg.closeHour) {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return formatDate(d);
    }
    return formatDate(now);
  }

  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function parseDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function openMinutes() {
    const cfg = CFG();
    return cfg.openHour * 60 + (cfg.openMinute || 0);
  }

  function closeMinutesClock() {
    const cfg = CFG();
    return cfg.closeHour * 60 + (cfg.closeMinute || 0);
  }

  /** 营业日内的分钟偏移：开店时刻 = 0 */
  function timeToOffset(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const openMin = openMinutes();
    let minutes = h * 60 + m;
    if (CFG().overnight && minutes < openMin) {
      // 跨夜：凌晨时段算次日
      minutes += 24 * 60;
    }
    return minutes - openMin;
  }

  function offsetToTime(offset) {
    let total = openMinutes() + offset;
    let h = Math.floor(total / 60) % 24;
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function businessSpanMinutes() {
    const cfg = CFG();
    if (cfg.overnight) {
      return (24 * 60 - openMinutes()) + closeMinutesClock();
    }
    return closeMinutesClock() - openMinutes();
  }

  function load() {
    try {
      const raw = localStorage.getItem(CFG().storageKey);
      if (!raw) return emptyState();
      return Object.assign(emptyState(), JSON.parse(raw));
    } catch (e) {
      return emptyState();
    }
  }

  function emptyState() {
    return { bookings: [], closures: [], meta: { updatedAt: null } };
  }

  function save(state) {
    state.meta.updatedAt = new Date().toISOString();
    localStorage.setItem(CFG().storageKey, JSON.stringify(state));
    global.dispatchEvent(new CustomEvent('booking-store-changed', { detail: state }));
    return state;
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function overlaps(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && bStart < aEnd;
  }

  function occupancyForDate(dateStr) {
    const state = load();
    const items = [];

    state.bookings
      .filter((b) => b.date === dateStr && b.status !== 'cancelled')
      .forEach((b) => {
        const start = timeToOffset(b.startTime);
        const end = start + b.durationMinutes;
        let type = 'booking';
        if (b.status === 'pending_confirm') type = 'pending';
        if (b.status === 'hold') type = 'hold';
        (b.beds || []).forEach((bedIndex) => {
          items.push({
            type,
            bedIndex,
            start,
            end,
            startTime: b.startTime,
            endTime: offsetToTime(end),
            ref: b,
          });
        });
      });

    state.closures
      .filter((c) => c.date === dateStr && c.active !== false)
      .forEach((c) => {
        const start = timeToOffset(c.startTime);
        const end = timeToOffset(c.endTime);
        const beds = c.beds && c.beds.length ? c.beds : allBedIndexes();
        beds.forEach((bedIndex) => {
          items.push({
            type: 'closure',
            bedIndex,
            start,
            end,
            startTime: c.startTime,
            endTime: c.endTime,
            ref: c,
          });
        });
      });

    return items;
  }

  function allBedIndexes() {
    return Array.from({ length: CFG().bedCount }, (_, i) => i);
  }

  function isBedFree(dateStr, bedIndex, startTime, durationMinutes, ignoreBookingId) {
    const start = timeToOffset(startTime);
    const end = start + durationMinutes;
    if (end > businessSpanMinutes()) return false;
    const items = occupancyForDate(dateStr).filter((x) => x.bedIndex === bedIndex);
    return !items.some((x) => {
      if (ignoreBookingId && x.ref && x.ref.id === ignoreBookingId) return false;
      return overlaps(start, end, x.start, x.end);
    });
  }

  function findFreeBeds(dateStr, startTime, durationMinutes, needCount, ignoreBookingId) {
    const free = [];
    for (let i = 0; i < CFG().bedCount; i++) {
      if (isBedFree(dateStr, i, startTime, durationMinutes, ignoreBookingId)) free.push(i);
      if (free.length >= needCount) break;
    }
    return free;
  }

  function remainingAt(dateStr, startTime, durationMinutes) {
    let n = 0;
    for (let i = 0; i < CFG().bedCount; i++) {
      if (isBedFree(dateStr, i, startTime, durationMinutes)) n++;
    }
    return n;
  }

  /**
   * 关床时段是否与已有预约（含预占/待确认）重叠。
   * 产品规则：允许关，但 UI 应警告。
   */
  function findBookingConflictsForRange(dateStr, startTime, endTime, beds) {
    const start = timeToOffset(startTime);
    const end = timeToOffset(endTime);
    if (!(end > start)) return [];
    const bedSet = new Set((beds || []).map(Number));
    const conflicts = [];
    load()
      .bookings.filter((b) => b.date === dateStr && b.status !== 'cancelled')
      .forEach((b) => {
        const bStart = timeToOffset(b.startTime);
        const bEnd = bStart + b.durationMinutes;
        if (!overlaps(start, end, bStart, bEnd)) return;
        const hitBeds = (b.beds || []).filter((i) => bedSet.has(Number(i)));
        if (!hitBeds.length) return;
        conflicts.push({
          booking: b,
          beds: hitBeds,
          startTime: b.startTime,
          endTime: offsetToTime(bEnd),
        });
      });
    return conflicts;
  }

  function formatBookingConflictWarning(conflicts) {
    if (!conflicts || !conflicts.length) return '';
    const lines = conflicts.slice(0, 5).map((c) => {
      const beds = (c.beds || [])
        .map((i) => CFG().bedLabels[i] || `${i + 1}号床`)
        .join('、');
      const name = c.booking.guestName || '未留名';
      return `· ${beds} ${c.startTime}–${c.endTime}（${name}）`;
    });
    const more = conflicts.length > 5 ? `\n…另有 ${conflicts.length - 5} 笔` : '';
    return (
      `该关闭时段与已有预约重叠（共 ${conflicts.length} 笔）：\n` +
      `${lines.join('\n')}${more}\n\n` +
      `仍可关闭，但现场可能冲突。确定继续？`
    );
  }

  function createBooking(input) {
    const guests = Number(input.guests) || 1;
    const durationMinutes = Number(input.durationMinutes) || 60;
    let beds;
    let needBeds;

    if (input.beds && input.beds.length) {
      beds = input.beds.map(Number);
      needBeds = beds.length;
      const blocked = beds.filter(
        (i) => !isBedFree(input.date, i, input.startTime, durationMinutes)
      );
      if (blocked.length) {
        return {
          ok: false,
          error: `所选床位已被占用：${blocked.map((i) => CFG().bedLabels[i] || i + 1).join('、')}`,
        };
      }
    } else {
      needBeds = Math.min(guests, CFG().bedCount);
      beds = findFreeBeds(input.date, input.startTime, durationMinutes, needBeds);
      if (beds.length < needBeds) {
        return { ok: false, error: `空位不足：需要 ${needBeds} 床，仅剩 ${beds.length} 床` };
      }
    }

    const mode = input.mode || 'create'; // hold | create
    let status;
    let needConfirm = false;
    if (mode === 'hold') {
      status = 'hold';
    } else {
      needConfirm = guests >= CFG().confirmGuestsThreshold;
      status = needConfirm ? 'pending_confirm' : 'confirmed';
    }

    const booking = {
      id: uid(mode === 'hold' ? 'hd' : 'bk'),
      date: input.date,
      startTime: input.startTime,
      durationMinutes,
      guests: Math.max(guests, beds.length),
      beds,
      courseId: input.courseId || '',
      channelId: input.channelId || 'whatsapp',
      guestName: input.guestName || (mode === 'hold' ? '预占' : ''),
      guestPhone: input.guestPhone || '',
      note: input.note || '',
      status,
      createdAt: new Date().toISOString(),
      confirmedAt: status === 'confirmed' ? new Date().toISOString() : null,
      emailLogs: [],
    };

    const state = load();
    state.bookings.push(booking);
    save(state);
    return { ok: true, booking, needConfirm, mode };
  }

  /** 预占 → 正式预约（可补全信息；≥2 人仍进待确认） */
  function convertHoldToBooking(id, patch) {
    const state = load();
    const b = state.bookings.find((x) => x.id === id);
    if (!b) return { ok: false, error: '找不到预占' };
    if (b.status !== 'hold') return { ok: false, error: '仅预占单可转预约' };

    Object.assign(b, patch || {});
    const guests = Number(b.guests) || 1;
    const needConfirm = guests >= CFG().confirmGuestsThreshold;
    b.status = needConfirm ? 'pending_confirm' : 'confirmed';
    b.confirmedAt = needConfirm ? null : new Date().toISOString();
    b.convertedAt = new Date().toISOString();
    save(state);
    return { ok: true, booking: b, needConfirm };
  }

  function confirmBooking(id) {
    const state = load();
    const b = state.bookings.find((x) => x.id === id);
    if (!b) return { ok: false, error: '找不到订单' };
    if (b.status === 'cancelled') return { ok: false, error: '订单已取消' };
    b.status = 'confirmed';
    b.confirmedAt = new Date().toISOString();
    save(state);
    return { ok: true, booking: b };
  }

  function cancelBooking(id, reason) {
    const state = load();
    const b = state.bookings.find((x) => x.id === id);
    if (!b) return { ok: false, error: '找不到订单' };
    b.status = 'cancelled';
    b.cancelReason = reason || '';
    b.cancelledAt = new Date().toISOString();
    save(state);
    return { ok: true, booking: b };
  }

  function rescheduleBooking(id, newDate, newStartTime) {
    const state = load();
    const b = state.bookings.find((x) => x.id === id);
    if (!b) return { ok: false, error: '找不到订单' };
    if (b.status === 'cancelled') return { ok: false, error: '已取消不可改期' };

    const needBeds = b.beds.length;
    const free = findFreeBeds(newDate, newStartTime, b.durationMinutes, needBeds, b.id);
    if (free.length < needBeds) {
      return { ok: false, error: '目标时段空位不足，无法改期' };
    }

    const prev = { date: b.date, startTime: b.startTime, beds: b.beds.slice() };
    b.date = newDate;
    b.startTime = newStartTime;
    b.beds = free;
    b.rescheduledAt = new Date().toISOString();
    b.rescheduleFrom = prev;
    save(state);
    return { ok: true, booking: b, previous: prev };
  }

  /** 拖拽改期：改开始时间 / 时长 / 床位 */
  function updateBookingInfo(id, fields) {
    const state = load();
    const b = state.bookings.find((x) => x.id === id);
    if (!b) return { ok: false, error: '找不到订单' };
    Object.assign(b, fields || {});
    save(state);
    return { ok: true, booking: b };
  }

  function updateBookingLayout(id, patch) {
    const state = load();
    const b = state.bookings.find((x) => x.id === id);
    if (!b) return { ok: false, error: '找不到订单' };
    if (b.status === 'cancelled') return { ok: false, error: '已取消不可改期' };

    const date = patch.date || b.date;
    const startTime = patch.startTime || b.startTime;
    const durationMinutes = Number(patch.durationMinutes) || b.durationMinutes;
    let beds = patch.beds && patch.beds.length ? patch.beds.map(Number) : b.beds.slice();
    beds = [...new Set(beds)].sort((a, c) => a - c);
    if (!beds.length) return { ok: false, error: '至少保留一张床' };
    if (beds.some((i) => i < 0 || i >= CFG().bedCount)) {
      return { ok: false, error: '床位超出范围' };
    }
    if (durationMinutes < 30) return { ok: false, error: '时长至少 30 分钟' };
    if (timeToOffset(startTime) + durationMinutes > businessSpanMinutes()) {
      return { ok: false, error: '超出营业时段' };
    }

    const blocked = beds.filter(
      (i) => !isBedFree(date, i, startTime, durationMinutes, b.id)
    );
    if (blocked.length) {
      return {
        ok: false,
        error: `目标位置冲突：${blocked.map((i) => CFG().bedLabels[i] || i + 1).join('、')}`,
      };
    }

    const prev = {
      date: b.date,
      startTime: b.startTime,
      durationMinutes: b.durationMinutes,
      beds: b.beds.slice(),
      guests: b.guests,
    };
    b.date = date;
    b.startTime = startTime;
    b.durationMinutes = durationMinutes;
    b.beds = beds;
    if (patch.guests != null) b.guests = Number(patch.guests);
    else b.guests = Math.max(Number(b.guests) || 1, beds.length);
    b.rescheduledAt = new Date().toISOString();
    b.rescheduleFrom = prev;
    save(state);
    return { ok: true, booking: b, previous: prev };
  }

  function setClosure(input) {
    const state = load();
    const start = timeToOffset(input.startTime);
    const end = timeToOffset(input.endTime);
    if (end <= start) return { ok: false, error: '结束时间必须晚于开始时间（注意跨午夜）' };

    const beds = (input.beds || []).map(Number).filter((i) => Number.isFinite(i));
    if (!beds.length) {
      return { ok: false, error: '请先选择要关闭的床位（可在时间轴拖选，或勾选下方床位）' };
    }

    const closure = {
      id: uid('cl'),
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      beds: [...new Set(beds)].sort((a, b) => a - b),
      reason: input.reason || '商家手动关闭',
      active: true,
      createdAt: new Date().toISOString(),
    };
    state.closures.push(closure);
    save(state);
    return { ok: true, closure };
  }

  function releaseClosure(id) {
    const state = load();
    const c = state.closures.find((x) => x.id === id);
    if (!c) return { ok: false, error: '找不到关闭记录' };
    c.active = false;
    c.releasedAt = new Date().toISOString();
    save(state);
    return { ok: true, closure: c };
  }

  function updateClosure(id, patch) {
    const state = load();
    const c = state.closures.find((x) => x.id === id && x.active !== false);
    if (!c) return { ok: false, error: '找不到关闭记录' };

    const startTime = patch.startTime != null ? patch.startTime : c.startTime;
    const endTime = patch.endTime != null ? patch.endTime : c.endTime;
    const start = timeToOffset(startTime);
    const end = timeToOffset(endTime);
    if (end <= start) return { ok: false, error: '结束时间必须晚于开始时间（注意跨午夜）' };

    let beds = c.beds || [];
    if (patch.beds && patch.beds.length) {
      beds = [...new Set(patch.beds.map(Number))]
        .filter((i) => Number.isFinite(i))
        .sort((a, b) => a - b);
    }
    if (!beds.length) return { ok: false, error: '请至少保留一张床' };

    c.startTime = startTime;
    c.endTime = endTime;
    c.beds = beds;
    if (patch.reason != null) c.reason = String(patch.reason);
    c.updatedAt = new Date().toISOString();
    save(state);
    return { ok: true, closure: c };
  }

  function listBookings(dateStr) {
    return load()
      .bookings.filter((b) => b.date === dateStr)
      .sort((a, b) => timeToOffset(a.startTime) - timeToOffset(b.startTime));
  }

  function listClosures(dateStr) {
    return load().closures.filter((c) => c.date === dateStr && c.active !== false);
  }

  function appendEmailLog(bookingId, log) {
    const state = load();
    const b = state.bookings.find((x) => x.id === bookingId);
    if (!b) return;
    b.emailLogs = b.emailLogs || [];
    b.emailLogs.push(Object.assign({ at: new Date().toISOString() }, log));
    save(state);
  }

  function exportJson() {
    return JSON.stringify(load(), null, 2);
  }

  function importJson(text) {
    const data = JSON.parse(text);
    save(Object.assign(emptyState(), data));
  }

  function resetAll() {
    localStorage.removeItem(CFG().storageKey);
    save(emptyState());
  }

  global.BookingStore = {
    todayBusinessDate,
    formatDate,
    parseDate,
    timeToOffset,
    offsetToTime,
    businessSpanMinutes,
    load,
    save,
    occupancyForDate,
    isBedFree,
    findFreeBeds,
    remainingAt,
    findBookingConflictsForRange,
    formatBookingConflictWarning,
    createBooking,
    convertHoldToBooking,
    confirmBooking,
    cancelBooking,
    rescheduleBooking,
    updateBookingLayout,
    updateBookingInfo,
    setClosure,
    releaseClosure,
    updateClosure,
    listBookings,
    listClosures,
    appendEmailLog,
    exportJson,
    importJson,
    resetAll,
    allBedIndexes,
  };
})(window);
