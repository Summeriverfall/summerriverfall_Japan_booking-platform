(function () {
  if (!StoreRegistry.requireStoreOrRedirect('merchant-login.html')) return;
  if (StoreRegistry.getRole() !== 'merchant') {
    const params = new URLSearchParams(location.search);
    if (!params.get('store')) {
      location.replace('merchant-login.html');
      return;
    }
    StoreRegistry.setRole('merchant');
  }

  const REASON_PRESETS = ['临时关闭', '线下客户占用', '设备维护', '店员休息', '其他'];

  const cfg = STORE_CONFIG;
  const mid = String(
    Math.min(cfg.openHour + 3, cfg.overnight ? 20 : Math.max(cfg.openHour + 1, cfg.closeHour - 2))
  ).padStart(2, '0');
  document.getElementById('startTime').value = `${mid}:00`;
  document.getElementById('endTime').value = `${String(Number(mid) + 1).padStart(2, '0')}:00`;
  document.getElementById('startTime').step = '1800';
  document.getElementById('endTime').step = '1800';

  function updateChrome() {
    const name = DeskI18n.storeName(cfg);
    document.title = `${DeskI18n.t('merchantBrand')} · ${name}`;
    document.getElementById('pageBrand').innerHTML =
      `${DeskI18n.t('merchantBrand')} · ${name}<div class="hint" style="margin:0" id="pageSub">${cfg.tagline} · ${cfg.hoursLabel} · ${cfg.bedCount} ${DeskI18n.t('resourcesUnit')}</div>`;
  }
  DeskI18n.mountSwitch(document.querySelector('.topbar-right'));
  DeskI18n.applyDom();
  updateChrome();
  DeskI18n.onChange(() => {
    DeskI18n.applyDom();
    updateChrome();
    softRefresh();
  });

  function snapTimeInput(el) {
    if (!el || !el.value) return;
    const [h, m] = el.value.split(':').map(Number);
    const snap = STORE_CONFIG.slotMinutes || 30;
    const total = Math.round((h * 60 + (m || 0)) / snap) * snap;
    const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    el.value = `${hh}:${mm}`;
  }
  document.getElementById('startTime').addEventListener('change', () => {
    snapTimeInput(document.getElementById('startTime'));
  });
  document.getElementById('endTime').addEventListener('change', () => {
    snapTimeInput(document.getElementById('endTime'));
  });

  const dateInput = document.getElementById('dateInput');
  const boardEl = document.getElementById('board');
  const listEl = document.getElementById('closureList');
  const formErr = document.getElementById('formErr');
  const sideErr = document.getElementById('sideErr');
  const remainHint = document.getElementById('remainHint');
  const sidePanel = document.getElementById('sidePanel');
  const sideHint = document.getElementById('sideHint');
  const sideBeds = document.getElementById('sideBeds');
  const startTimeEl = document.getElementById('startTime');
  const endTimeEl = document.getElementById('endTime');
  const reasonEl = document.getElementById('reason');
  const reasonOtherEl = document.getElementById('reasonOther');
  const reasonChips = document.getElementById('reasonChips');
  const btnClose = document.getElementById('btnClose');
  const btnConfirmBooking = document.getElementById('btnConfirmBooking');
  const btnRelease = document.getElementById('btnRelease');
  const btnApproveOpen = document.getElementById('btnApproveOpen');
  const btnRejectOpen = document.getElementById('btnRejectOpen');
  const openReqHint = document.getElementById('openReqHint');
  const mTimeline = document.getElementById('mTimeline');
  const mSummaryHint = document.getElementById('mSummaryHint');
  const summaryStats = document.getElementById('summaryStats');
  const mPendingRequests = document.getElementById('mPendingRequests');
  const occStrip = document.getElementById('occStrip');
  const bookingListToday = document.getElementById('bookingListToday');
  const mDock = document.getElementById('mDock');
  const mSheetScrim = document.getElementById('mSheetScrim');
  const mTimelineHint = document.getElementById('mTimelineHint');
  const sideTitle = document.getElementById('sideTitle');
  const sideBodyForm = document.getElementById('sideBodyForm');
  const sideBodyBooking = document.getElementById('sideBodyBooking');
  const sideBookingDetail = document.getElementById('sideBookingDetail');
  const sideBodyRequests = document.getElementById('sideBodyRequests');
  const sideRequestList = document.getElementById('sideRequestList');

  let lastPointer = { x: 80, y: 120 };
  let rangeSelection = null;
  let selectedClosureId = null;
  let selectedBookingId = null;
  let mobilePickStart = null;
  let dockMode = null;
  /** day | range | edit | request | booking */
  let sheetMode = null;
  let suppressPanelUntilSelect = false;

  function isMobileMerchant() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function courseNameOf(booking) {
    if (!booking) return '—';
    const course = (STORE_CONFIG.courses || []).find((c) => c.id === booking.courseId);
    if (course) return DeskI18n.courseLabel(course);
    if (booking.courseName) {
      if (typeof booking.courseName === 'object') return DeskI18n.localizedText(booking.courseName);
      return booking.courseName;
    }
    return booking.courseId || '—';
  }

  function statusLabel(s) {
    if (s === 'confirmed') return '已确认';
    if (s === 'pending_confirm') return DeskI18n.t('statusPending');
    if (s === 'hold') return '预占';
    if (s === 'cancelled') return '已取消';
    return s || '—';
  }

  function setReason(code, otherText) {
    const preset = REASON_PRESETS.includes(code) ? code : '其他';
    if (reasonChips) {
      reasonChips.querySelectorAll('button').forEach((b) => {
        b.classList.toggle('is-on', b.getAttribute('data-reason') === preset);
      });
    }
    if (reasonOtherEl) {
      const showOther = preset === '其他';
      reasonOtherEl.hidden = !showOther;
      if (otherText != null) reasonOtherEl.value = otherText;
      if (!showOther) reasonOtherEl.value = '';
    }
    const text =
      preset === '其他'
        ? String((reasonOtherEl && reasonOtherEl.value) || otherText || '').trim() || '其他'
        : preset;
    if (reasonEl) reasonEl.value = text;
    return { reasonCode: preset, reason: text };
  }

  function syncReasonFromUi() {
    const on = reasonChips && reasonChips.querySelector('button.is-on');
    const code = on ? on.getAttribute('data-reason') : '临时关闭';
    return setReason(code, reasonOtherEl ? reasonOtherEl.value : '');
  }

  if (reasonChips) {
    reasonChips.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-reason]');
      if (!btn) return;
      setReason(btn.getAttribute('data-reason'));
    });
  }
  if (reasonOtherEl) {
    reasonOtherEl.addEventListener('input', () => syncReasonFromUi());
  }
  setReason('临时关闭');

  function setDockOn(mode) {
    dockMode = mode;
    if (!mDock) return;
    mDock.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('is-on', b.getAttribute('data-dock') === mode);
    });
  }

  function currentDate() {
    return dateInput.value || BookingStore.todayBusinessDate();
  }

  function renderSideBeds(selected) {
    const set = new Set((selected || []).map(Number));
    sideBeds.innerHTML = STORE_CONFIG.bedLabels
      .map(
        (raw, i) =>
          `<label class="bed-check-item"><input type="checkbox" value="${i}" ${
            set.has(i) ? 'checked' : ''
          }><span class="bed-check-text">${DeskI18n.bedLabelAt(i)}</span></label>`
      )
      .join('');
  }

  function selectedBedsFromSide() {
    return [...sideBeds.querySelectorAll('input:checked')].map((x) => Number(x.value));
  }

  function fillFormFromClosure(c) {
    startTimeEl.value = c.startTime;
    endTimeEl.value = c.endTime;
    const reason = c.reason || '临时关闭';
    if (REASON_PRESETS.includes(reason) && reason !== '其他') {
      setReason(reason);
    } else if (c.reasonCode && REASON_PRESETS.includes(c.reasonCode)) {
      setReason(c.reasonCode, c.reasonCode === '其他' ? reason : '');
    } else {
      setReason('其他', reason);
    }
    renderSideBeds(c.beds || []);
  }

  function getMenuAnchorRect() {
    if (selectedClosureId) {
      const blocks = [
        ...document.querySelectorAll(`.board-block[data-closure-id="${selectedClosureId}"]`),
      ];
      if (blocks.length) {
        let left = Infinity;
        let top = Infinity;
        let right = -Infinity;
        let bottom = -Infinity;
        blocks.forEach((el) => {
          const r = el.getBoundingClientRect();
          left = Math.min(left, r.left);
          top = Math.min(top, r.top);
          right = Math.max(right, r.right);
          bottom = Math.max(bottom, r.bottom);
        });
        return { left, top, right, bottom };
      }
    }
    if (selectedBookingId) {
      const blocks = [
        ...document.querySelectorAll(`.board-block[data-booking-id="${selectedBookingId}"]`),
      ];
      if (blocks.length) {
        let left = Infinity;
        let top = Infinity;
        let right = -Infinity;
        let bottom = -Infinity;
        blocks.forEach((el) => {
          const r = el.getBoundingClientRect();
          left = Math.min(left, r.left);
          top = Math.min(top, r.top);
          right = Math.max(right, r.right);
          bottom = Math.max(bottom, r.bottom);
        });
        return { left, top, right, bottom };
      }
    }
    const sels = [...document.querySelectorAll('.board-selection')].filter(
      (el) => !el.hidden && el.offsetParent !== null
    );
    if (sels.length) {
      let left = Infinity;
      let top = Infinity;
      let right = -Infinity;
      let bottom = -Infinity;
      sels.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 2 && r.height < 2) return;
        left = Math.min(left, r.left);
        top = Math.min(top, r.top);
        right = Math.max(right, r.right);
        bottom = Math.max(bottom, r.bottom);
      });
      if (right > left) return { left, top, right, bottom };
    }
    return null;
  }

  function placeCtxMenu() {
    sidePanel.classList.remove('is-drag-hidden', 'is-drag-faded');
    sidePanel.hidden = false;
    sidePanel.classList.add('is-open');
    sidePanel.setAttribute('aria-hidden', 'false');
    if (mSheetScrim && isMobileMerchant()) {
      mSheetScrim.hidden = false;
      sidePanel.style.left = '0px';
      sidePanel.style.top = 'auto';
      return;
    }
    if (mSheetScrim) mSheetScrim.hidden = true;
    const pad = 8;
    const gap = 8;
    sidePanel.style.left = '-9999px';
    sidePanel.style.top = '0px';
    const menu = sidePanel.getBoundingClientRect();
    const anchor = getMenuAnchorRect();

    let left;
    let top;
    if (anchor) {
      left = anchor.right + gap;
      top = anchor.top;
      if (left + menu.width > window.innerWidth - pad) {
        left = anchor.left - menu.width - gap;
      }
      if (left < pad) left = pad;
      if (top + menu.height > window.innerHeight - pad) {
        top = Math.max(pad, window.innerHeight - menu.height - pad);
      }
      if (top < pad) top = pad;
    } else {
      left = Math.min(lastPointer.x + gap, window.innerWidth - menu.width - pad);
      top = Math.min(lastPointer.y + gap, window.innerHeight - menu.height - pad);
      left = Math.max(pad, left);
      top = Math.max(pad, top);
    }
    sidePanel.style.left = `${left}px`;
    sidePanel.style.top = `${top}px`;
  }

  function selectedClosure() {
    if (!selectedClosureId) return null;
    return BookingStore.listClosures(currentDate()).find((c) => c.id === selectedClosureId) || null;
  }

  function setSheetBodies(mode) {
    const isReq = mode === 'request';
    const isBooking = mode === 'booking';
    if (sideBodyForm) sideBodyForm.hidden = isReq || isBooking;
    if (sideBodyRequests) sideBodyRequests.hidden = !isReq;
    if (sideBodyBooking) sideBodyBooking.hidden = !isBooking;
  }

  function setTimeInputsLocked(locked) {
    startTimeEl.readOnly = Boolean(locked);
    endTimeEl.readOnly = Boolean(locked);
    startTimeEl.disabled = Boolean(locked);
    endTimeEl.disabled = Boolean(locked);
  }

  function syncActionButtons() {
    const c = selectedClosure();
    const hasRequest = c && c.openRequestStatus === 'requested';
    if (openReqHint) openReqHint.hidden = !hasRequest || sheetMode === 'request' || sheetMode === 'booking';
    if (btnApproveOpen) btnApproveOpen.hidden = !(hasRequest && sheetMode !== 'request' && sheetMode !== 'booking');
    if (btnRejectOpen) btnRejectOpen.hidden = !(hasRequest && sheetMode !== 'request' && sheetMode !== 'booking');

    const booking =
      selectedBookingId &&
      BookingStore.listBookings(currentDate()).find((b) => b.id === selectedBookingId);
    const canConfirmBooking =
      sheetMode === 'booking' && booking && booking.status === 'pending_confirm';
    if (btnConfirmBooking) {
      btnConfirmBooking.hidden = !canConfirmBooking;
      btnConfirmBooking.textContent = DeskI18n.t('btnConfirmBooking');
    }

    if (sheetMode === 'request' || sheetMode === 'booking') {
      btnClose.hidden = true;
      btnRelease.hidden = true;
      return;
    }
    if (selectedClosureId) {
      btnClose.textContent = DeskI18n.t('btnSaveAdjust');
      btnRelease.hidden = hasRequest;
      btnClose.hidden = hasRequest;
      if (!hasRequest) {
        const isDay = BookingStore.isDayScopeClosure(c);
        btnRelease.textContent = DeskI18n.t(isDay ? 'btnReleaseDay' : 'btnReleaseSlot');
      }
    } else {
      btnClose.hidden = false;
      btnClose.textContent =
        sheetMode === 'day' ? DeskI18n.t('btnConfirmDayClose') : DeskI18n.t('btnConfirmClose');
      btnRelease.hidden = true;
    }
  }

  function openSide(msg, point) {
    suppressPanelUntilSelect = false;
    sidePanel.classList.remove('is-drag-hidden', 'is-drag-faded');
    if (msg) sideHint.textContent = msg;
    if (point && point.x != null) lastPointer = { x: point.x, y: point.y };
    setSheetBodies(sheetMode);
    syncActionButtons();
    requestAnimationFrame(() => placeCtxMenu());
  }

  function fadeSideDuringDrag() {
    if (sidePanel.hidden) return;
    sidePanel.classList.add('is-drag-faded');
    sidePanel.classList.remove('is-drag-hidden');
  }

  function closeSide() {
    sidePanel.classList.remove('is-open', 'is-drag-hidden', 'is-drag-faded');
    sidePanel.setAttribute('aria-hidden', 'true');
    sidePanel.hidden = true;
    if (mSheetScrim) mSheetScrim.hidden = true;
    setTimeInputsLocked(false);
    sheetMode = null;
    selectedBookingId = null;
    setSheetBodies(null);
    if (btnConfirmBooking) btnConfirmBooking.hidden = true;
    if (!selectedClosureId) setDockOn(null);
  }

  function closeDayBed(bedIndex) {
    const name = DeskI18n.bedLabelAt(bedIndex);
    if (BookingStore.hasDayClosureForBed(currentDate(), bedIndex)) {
      formErr.className = 'err';
      formErr.textContent = `「${name}」已整日关闭，不能重复关闭。请先点「开」释放。`;
      return;
    }
    const startTime = BookingStore.offsetToTime(0);
    const endTime = BookingStore.offsetToTime(BookingStore.businessSpanMinutes());
    const slotOverlaps = BookingStore.findOverlappingClosures(
      currentDate(),
      startTime,
      endTime,
      [bedIndex]
    ).filter((c) => !BookingStore.isDayScopeClosure(c));
    const tip = slotOverlaps.length
      ? `将「${name}」整天关闭（营业时段 ${STORE_CONFIG.hoursLabel}）？\n该资源上已有 ${slotOverlaps.length} 条时段关闭，将被整日关覆盖。`
      : `将「${name}」整天关闭（营业时段 ${STORE_CONFIG.hoursLabel}）？`;
    if (!confirm(tip)) return;
    if (!confirmIfBookingConflict(currentDate(), startTime, endTime, [bedIndex])) return;
    const reason = syncReasonFromUi();
    const r = BookingStore.closeDayBed(currentDate(), bedIndex, {
      reason: reason.reason || '临时关闭',
      reasonCode: reason.reasonCode,
    });
    if (!r.ok) {
      formErr.className = 'err';
      formErr.textContent = r.error || '关床失败';
      return;
    }
    selectedClosureId = null;
    rangeSelection = null;
    mobilePickStart = null;
    formErr.className = 'hint ok';
    formErr.textContent = slotOverlaps.length
      ? `已整日关闭 ${name}（已覆盖原时段关闭）。点「开」可释放整日关。`
      : `已整日关闭 ${name}。点左侧「开」可单独释放整日关。`;
    closeSide();
    refresh();
  }

  function openDayBedRow(bedIndex) {
    const name = DeskI18n.bedLabelAt(bedIndex);
    const r = BookingStore.openDayBed(currentDate(), bedIndex);
    if (!r.ok) {
      formErr.className = 'err';
      formErr.textContent = r.error || '打开失败';
      return;
    }
    formErr.className = 'hint ok';
    formErr.textContent = `已释放「${name}」的整日关闭（时段关闭不受影响）。`;
    closeSide();
    refresh();
  }

  function clearRangeSelection(msg) {
    rangeSelection = null;
    selectedClosureId = null;
    mobilePickStart = null;
    closeSide();
    formErr.className = 'hint ok';
    formErr.textContent = msg || '已取消选择';
    refresh();
  }

  function snapOffset(mins) {
    const snap = STORE_CONFIG.slotMinutes || 30;
    return Math.round(Number(mins) / snap) * snap;
  }

  function openRangeSheet(bedIndex, startOffset, endOffset, msg) {
    selectedClosureId = null;
    selectedBookingId = null;
    sheetMode = 'range';
    setTimeInputsLocked(false);
    const snap = STORE_CONFIG.slotMinutes || 30;
    let start = snapOffset(startOffset);
    let end = snapOffset(endOffset);
    if (!(end > start)) end = start + snap;
    const span = BookingStore.businessSpanMinutes();
    if (end > span) end = span;
    rangeSelection = {
      bedIndex,
      bedIndexes: [bedIndex],
      startOffset: start,
      endOffset: end,
    };
    startTimeEl.value = BookingStore.offsetToTime(start);
    endTimeEl.value = BookingStore.offsetToTime(end);
    setReason('临时关闭');
    renderSideBeds([bedIndex]);
    if (sideTitle) sideTitle.textContent = '关时段';
    setDockOn('range');
    openSide(msg || `${DeskI18n.bedLabelAt(bedIndex)} · 请确认后关闭`, {
      x: window.innerWidth / 2,
      y: window.innerHeight - 80,
    });
  }

  function openDayCloseSheet(preselectBeds) {
    selectedClosureId = null;
    selectedBookingId = null;
    sheetMode = 'day';
    const start = 0;
    const end = BookingStore.businessSpanMinutes();
    const beds =
      preselectBeds && preselectBeds.length
        ? preselectBeds.map(Number)
        : rangeSelection
          ? [rangeSelection.bedIndex]
          : [0];
    rangeSelection = {
      bedIndex: beds[0],
      bedIndexes: beds.slice(),
      startOffset: start,
      endOffset: end,
    };
    startTimeEl.value = BookingStore.offsetToTime(start);
    endTimeEl.value = BookingStore.offsetToTime(end);
    setTimeInputsLocked(true);
    setReason('临时关闭');
    renderSideBeds(beds);
    if (sideTitle) sideTitle.textContent = '整日关床';
    setDockOn('day');
    openSide(`营业时段 ${STORE_CONFIG.hoursLabel} 将全部关闭，请勾选资源后确认`, {
      x: window.innerWidth / 2,
      y: window.innerHeight - 80,
    });
  }

  function openBookingView(booking, point) {
    selectedClosureId = null;
    selectedBookingId = booking.id;
    sheetMode = 'booking';
    rangeSelection = null;
    const beds = (booking.beds || [])
      .map((i) => DeskI18n.bedLabelAt(i))
      .join('、');
    const channel = (STORE_CONFIG.channels || []).find((c) => c.id === booking.channelId);
    const endOff =
      BookingStore.timeToOffset(booking.startTime) + (booking.durationMinutes || 60);
    const pending = booking.status === 'pending_confirm';
    if (sideBookingDetail) {
      sideBookingDetail.innerHTML = `
        <div><strong>${booking.guestName || '客人'}</strong> · ${statusLabel(booking.status)}</div>
        <div>${booking.startTime}–${BookingStore.offsetToTime(endOff)} · ${booking.durationMinutes || 60} 分</div>
        <div><strong>项目：</strong>${courseNameOf(booking)}</div>
        <div>资源：${beds || '—'}</div>
        <div>人数：${booking.guests || 1}</div>
        <div>渠道：${(channel && channel.name) || booking.channelId || '—'}</div>
        <div>备注：${booking.note || '—'}</div>
        <div class="hint" style="margin-top:.35rem">${
          pending ? DeskI18n.t('bookingConfirmHint') : DeskI18n.t('bookingReadonly')
        }</div>
      `;
    }
    if (sideTitle) sideTitle.textContent = pending ? DeskI18n.t('statusPending') : '预约信息';
    openSide(pending ? DeskI18n.t('bookingConfirmHint') : DeskI18n.t('bookingReadonly'), point);
  }

  function confirmSelectedBooking() {
    if (!selectedBookingId) return;
    const r = BookingStore.confirmBooking(selectedBookingId);
    if (!r.ok) {
      formErr.className = 'err';
      formErr.textContent = r.error || '确认失败';
      return;
    }
    formErr.className = 'hint ok';
    formErr.textContent = DeskI18n.t('bookingConfirmed');
    openBookingView(r.booking, {
      x: window.innerWidth / 2,
      y: window.innerHeight - 80,
    });
    refresh();
  }

  function openRequestSheet() {
    selectedClosureId = null;
    selectedBookingId = null;
    sheetMode = 'request';
    setTimeInputsLocked(false);
    setDockOn('req');
    if (sideTitle) sideTitle.textContent = '开床申请';
    const requests = BookingStore.listClosures(currentDate()).filter(
      (c) => c.openRequestStatus === 'requested'
    );
    if (!sideRequestList) {
      openSide('无法加载申请列表');
      return;
    }
    if (!requests.length) {
      sideRequestList.innerHTML = '<p class="hint">今日暂无待处理开床申请。</p>';
      openSide('暂无申请可处理');
      return;
    }
    sideRequestList.innerHTML = requests
      .map((c) => {
        const beds = (c.beds || []).map((i) => DeskI18n.bedLabelAt(i)).join('、');
        const kind = BookingStore.isDayScopeClosure(c) ? '整日关' : '时段关';
        return `<div class="item" data-req-id="${c.id}">
          <div class="title">${kind} · ${beds} · ${c.startTime}–${c.endTime}</div>
          <div class="meta">${c.openRequestNote || c.reason || '客服申请开床'}</div>
          <div class="actions">
            <button type="button" class="btn primary" data-approve="${c.id}">同意开床</button>
            <button type="button" class="btn danger" data-reject="${c.id}">拒绝</button>
          </div>
        </div>`;
      })
      .join('');
    openSide(`待处理 ${requests.length} 条，请选择同意或拒绝`, {
      x: window.innerWidth / 2,
      y: window.innerHeight - 80,
    });
  }

  function renderDaySummary(date) {
    const bookings = BookingStore.listBookings(date).filter((b) => b.status !== 'cancelled');
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
    const pending = bookings.filter((b) => b.status === 'pending_confirm').length;
    const holds = bookings.filter((b) => b.status === 'hold').length;
    const closures = BookingStore.listClosures(date);
    const dayClosures = closures.filter((c) => BookingStore.isDayScopeClosure(c)).length;
    const slotClosures = closures.length - dayClosures;
    const requests = closures.filter((c) => c.openRequestStatus === 'requested');

    if (mSummaryHint) {
      mSummaryHint.textContent = `${STORE_CONFIG.storeName.cn} · ${date} · 占用状态分类见下方`;
    }
    if (summaryStats) {
      summaryStats.innerHTML = `
        <span>已确认 <strong>${confirmed}</strong></span>
        <span>${DeskI18n.t('pendingStat')} <strong>${pending}</strong></span>
        <span>预占 <strong>${holds}</strong></span>
        <span>整日关 <strong>${dayClosures}</strong></span>
        <span>时段关 <strong>${slotClosures}</strong></span>
        <span>开床申请 <strong>${requests.length}</strong></span>
        <span>资源 <strong>${STORE_CONFIG.bedCount}</strong></span>
      `;
    }

    if (bookingListToday) {
      const sorted = bookings
        .slice()
        .sort(
          (a, b) =>
            BookingStore.timeToOffset(a.startTime) - BookingStore.timeToOffset(b.startTime)
        );
      bookingListToday.innerHTML = sorted.length
        ? sorted
            .map((b) => {
              const beds = (b.beds || []).map((i) => DeskI18n.bedLabelAt(i)).join('、');
              const end = BookingStore.offsetToTime(
                BookingStore.timeToOffset(b.startTime) + (b.durationMinutes || 60)
              );
              return `<div class="item" data-booking-row="${b.id}">
                <div class="title">${b.startTime}–${end} · <span class="badge ${b.status}">${statusLabel(
                  b.status
                )}</span></div>
                <div class="meta">${b.guestName || '客人'} · ${courseNameOf(b)}</div>
                <div class="meta">资源：${beds || '—'} · ${b.guests || 1}人</div>
                <div class="actions">
                  <button type="button" class="btn" data-view-booking="${b.id}">查看</button>
                  ${
                    b.status === 'pending_confirm'
                      ? `<button type="button" class="btn primary" data-confirm-booking="${b.id}">${DeskI18n.t(
                          'btnConfirmBooking'
                        )}</button>`
                      : ''
                  }
                </div>
              </div>`;
            })
            .join('')
        : '<div class="hint">今日暂无预约</div>';
    }

    if (!mPendingRequests) return;
    if (!requests.length) {
      mPendingRequests.innerHTML =
        '<p class="hint" style="margin-top:.55rem">暂无待处理开床申请</p>';
      return;
    }
    mPendingRequests.innerHTML = requests
      .map((c) => {
        const beds = (c.beds || []).map((i) => DeskI18n.bedLabelAt(i)).join('、');
        return `<div class="item">
          <div class="title">待处理申请 · ${beds} · ${c.startTime}–${c.endTime}</div>
          <div class="meta">${c.openRequestNote || c.reason || ''}</div>
          <div class="actions">
            <button class="btn primary" data-approve="${c.id}">同意</button>
            <button class="btn danger" data-reject="${c.id}">拒绝</button>
          </div>
        </div>`;
      })
      .join('');
  }

  function renderOccStrip(date) {
    if (!occStrip) return;
    const bookings = BookingStore.listBookings(date).filter((b) => b.status !== 'cancelled');
    const closures = BookingStore.listClosures(date);
    const items = [];
    bookings.forEach((b) => {
      items.push({
        kind: 'booking',
        start: BookingStore.timeToOffset(b.startTime),
        startTime: b.startTime,
        endTime: BookingStore.offsetToTime(
          BookingStore.timeToOffset(b.startTime) + (b.durationMinutes || 60)
        ),
        ref: b,
      });
    });
    closures.forEach((c) => {
      items.push({
        kind: 'closure',
        start: BookingStore.timeToOffset(c.startTime),
        startTime: c.startTime,
        endTime: c.endTime,
        ref: c,
      });
    });
    items.sort((a, b) => a.start - b.start || a.startTime.localeCompare(b.startTime));

    if (!items.length) {
      occStrip.innerHTML = '<div class="hint">当日暂无预约或关闭</div>';
      return;
    }

    occStrip.innerHTML = items
      .map((it) => {
        if (it.kind === 'booking') {
          const b = it.ref;
          const beds = (b.beds || []).map((i) => DeskI18n.bedLabelAt(i)).join('、');
          const on = selectedBookingId === b.id ? ' is-on' : '';
          return `<button type="button" class="occ-card${on}" data-occ-booking="${b.id}">
            <div class="occ-kicker">${statusLabel(b.status)} · 预约</div>
            <div class="occ-title">${it.startTime}–${it.endTime}</div>
            <div class="occ-meta">${b.guestName || '客人'} · ${beds}<br><strong>${courseNameOf(
            b
          )}</strong></div>
          </button>`;
        }
        const c = it.ref;
        const beds = (c.beds || []).map((i) => DeskI18n.bedLabelAt(i)).join('、');
        const kind = BookingStore.isDayScopeClosure(c) ? '整日关' : '时段关';
        const on = selectedClosureId === c.id ? ' is-on' : '';
        return `<button type="button" class="occ-card${on}" data-occ-closure="${c.id}">
          <div class="occ-kicker">${kind}${
            c.openRequestStatus === 'requested' ? ' · 开床申请' : ''
          }</div>
          <div class="occ-title">${it.startTime}–${it.endTime}</div>
          <div class="occ-meta">${beds}<br>${c.reason || ''}</div>
        </button>`;
      })
      .join('');
  }

  function occupancyMap(date) {
    const snap = STORE_CONFIG.slotMinutes || 30;
    const span = BookingStore.businessSpanMinutes();
    const slots = Math.ceil(span / snap);
    const map = Array.from({ length: STORE_CONFIG.bedCount }, () =>
      Array.from({ length: slots }, () => null)
    );
    BookingStore.occupancyForDate(date).forEach((x) => {
      const from = Math.floor(x.start / snap);
      const to = Math.ceil(x.end / snap);
      for (let i = from; i < to && i < slots; i++) {
        if (i < 0) continue;
        map[x.bedIndex][i] = x;
      }
    });
    return { map, slots, snap, span };
  }

  function renderMobileTimeline(date) {
    if (!mTimeline) return;
    const { map, slots, snap } = occupancyMap(date);
    const hourMeta = BoardUI.hourSlotMeta();
    const prevScroll = mTimeline.querySelector('.m-timeline-scroll');
    const keepLeft = prevScroll ? prevScroll.scrollLeft : 0;

    const hoursHtml = hourMeta
      .map((h) => {
        const w = Math.round((h.duration / snap) * 28);
        return `<div class="m-tl-hour" style="flex:0 0 ${w}px;width:${w}px">${h.hour}</div>`;
      })
      .join('');

    let rows = `
      <div class="m-tl-row m-tl-head">
        <div class="m-tl-corner">资源</div>
        <div class="m-tl-hours">${hoursHtml}</div>
      </div>`;

    for (let bed = 0; bed < STORE_CONFIG.bedCount; bed++) {
      let cells = '';
      for (let i = 0; i < slots; i++) {
        const cell = map[bed][i];
        const type = cell ? cell.type : '';
        const startOff = i * snap;
        let cls = 'm-tl-slot';
        if (type) cls += ` is-${type}`;
        if (rangeSelection && (rangeSelection.bedIndexes || []).includes(bed)) {
          const a = rangeSelection.startOffset;
          const b = rangeSelection.endOffset;
          if (startOff >= a && startOff < b) {
            cls +=
              startOff === a || startOff + snap >= b ? ' is-pick' : ' is-pick-mid';
          }
        }
        const title = cell
          ? `${cell.startTime}-${cell.endTime} ${type}`
          : BookingStore.offsetToTime(startOff);
        cells += `<button type="button" class="${cls}" data-bed="${bed}" data-slot="${i}" title="${title}"></button>`;
      }
      const label = DeskI18n.bedLabelAt(bed);
      const dayClosed = BookingStore.hasDayClosureForBed(date, bed);
      rows += `<div class="m-tl-row">
        <div class="m-tl-label-wrap">
          <div class="m-tl-label-name">${label}</div>
          <div class="m-tl-day-btns">
            <button type="button" class="board-day-btn board-day-btn-close" data-bed-close="${bed}" ${
              dayClosed ? 'disabled' : ''
            }>关</button>
            <button type="button" class="board-day-btn board-day-btn-open" data-bed-open="${bed}" ${
              dayClosed ? '' : 'disabled'
            }>开</button>
          </div>
        </div>
        <div class="m-tl-track">${cells}</div>
      </div>`;
    }

    mTimeline.innerHTML = `<div class="m-timeline-scroll"><div class="m-timeline-inner">${rows}</div></div>`;
    const scroller = mTimeline.querySelector('.m-timeline-scroll');
    if (scroller) scroller.scrollLeft = keepLeft;

    mTimeline.querySelectorAll('[data-bed-close]').forEach((el) => {
      el.addEventListener('click', () => closeDayBed(Number(el.getAttribute('data-bed-close'))));
    });
    mTimeline.querySelectorAll('[data-bed-open]').forEach((el) => {
      el.addEventListener('click', () => openDayBedRow(Number(el.getAttribute('data-bed-open'))));
    });

    mTimeline.querySelectorAll('.m-tl-slot').forEach((el) => {
      el.addEventListener('click', () => {
        const bed = Number(el.getAttribute('data-bed'));
        const slot = Number(el.getAttribute('data-slot'));
        const startOff = slot * snap;
        const cell = map[bed][slot];

        // 再点当前选区内空档 → 取消选择
        if (
          !cell &&
          rangeSelection &&
          (rangeSelection.bedIndexes || []).includes(bed) &&
          startOff >= rangeSelection.startOffset &&
          startOff < rangeSelection.endOffset
        ) {
          clearRangeSelection('已取消选择');
          return;
        }

        if (cell && (cell.type === 'closure' || cell.type === 'closure_request')) {
          const closure = cell.ref;
          selectedClosureId = closure.id;
          selectedBookingId = null;
          mobilePickStart = null;
          sheetMode = 'edit';
          setTimeInputsLocked(false);
          setSheetBodies(null);
          rangeSelection = {
            bedIndex: (closure.beds || [bed])[0],
            bedIndexes: (closure.beds || [bed]).slice(),
            startOffset: BookingStore.timeToOffset(closure.startTime),
            endOffset: BookingStore.timeToOffset(closure.endTime),
          };
          fillFormFromClosure(closure);
          if (sideTitle) sideTitle.textContent = '关床编辑';
          setDockOn(closure.openRequestStatus === 'requested' ? 'req' : 'range');
          openSide(
            closure.openRequestStatus === 'requested'
              ? '开床申请，请选择同意或拒绝'
              : BookingStore.isDayScopeClosure(closure)
                ? '编辑整日关闭（释放只影响这一条）'
                : '编辑时段关闭（释放只影响这一条）'
          );
          refresh();
          return;
        }

        if (cell && (cell.type === 'booking' || cell.type === 'pending' || cell.type === 'hold')) {
          openBookingView(cell.ref, {
            x: window.innerWidth / 2,
            y: window.innerHeight - 80,
          });
          refresh();
          return;
        }

        // 已有选区时点其它空档 → 直接切换到新格（不先关掉）
        if (!cell && rangeSelection) {
          mobilePickStart = { bed, slot };
          const endOff = Math.min(startOff + snap, BookingStore.businessSpanMinutes());
          openRangeSheet(bed, startOff, endOff, '已切换选区；可再点同格取消');
          if (mTimelineHint) {
            mTimelineHint.textContent = `已选 ${DeskI18n.bedLabelAt(bed)} ${BookingStore.offsetToTime(
              startOff
            )} 起；再点当前选区取消`;
          }
          refresh();
          return;
        }

        if (
          mobilePickStart &&
          mobilePickStart.bed === bed &&
          mobilePickStart.slot !== slot
        ) {
          const a = Math.min(mobilePickStart.slot, slot) * snap;
          const b = Math.max(mobilePickStart.slot, slot) * snap + snap;
          mobilePickStart = null;
          openRangeSheet(bed, a, b, '已选时段，确认关闭');
          refresh();
          return;
        }

        // 再点同一起始格 → 取消
        if (mobilePickStart && mobilePickStart.bed === bed && mobilePickStart.slot === slot) {
          clearRangeSelection('已取消选择');
          return;
        }

        mobilePickStart = { bed, slot };
        const endOff = Math.min(startOff + snap, BookingStore.businessSpanMinutes());
        openRangeSheet(bed, startOff, endOff, '已选半小时；按住可继续拖选，弹层会变淡');
        if (mTimelineHint) {
          mTimelineHint.textContent = `已选 ${DeskI18n.bedLabelAt(bed)} ${BookingStore.offsetToTime(
            startOff
          )} 起；再点同格取消，或再点结束格扩选`;
        }
        refresh();
      });
    });
  }

  function refresh() {
    const date = currentDate();
    dateInput.value = date;
    renderDaySummary(date);
    renderOccStrip(date);

    if (isMobileMerchant()) {
      renderMobileTimeline(date);
      remainHint.textContent = '';
    } else {
      BoardUI.renderBoard(boardEl, date, {
        selection: rangeSelection,
        selectedClosureId,
        selectedBookingId,
        selectionHint: '左侧关/开=整日；空档拖选=时段关；再点当前选区取消，点其它格切换',
        showLegend: false,
        bedDayControls: true,
        isBedDayClosed: (bedIndex) => BookingStore.hasDayClosureForBed(date, bedIndex),
        onDayClose: (bedIndex) => closeDayBed(bedIndex),
        onDayOpen: (bedIndex) => openDayBedRow(bedIndex),
        onClearClosureSelect: () => {
          if (selectedClosureId) selectedClosureId = null;
        },
        onClearBookingSelect: () => {
          if (selectedBookingId) selectedBookingId = null;
        },
        onDragStart: () => fadeSideDuringDrag(),
        onDragEnd: () => {
          sidePanel.classList.remove('is-drag-faded');
        },
        onCancelSelection: () => clearRangeSelection('已取消选择'),
        onBookingSelect: (booking, point) => {
          openBookingView(booking, point);
          refresh();
        },
        onClosureSelect: (closure, point) => {
          selectedClosureId = closure.id;
          selectedBookingId = null;
          sheetMode = 'edit';
          rangeSelection = {
            bedIndex: (closure.beds || [0])[0],
            bedIndexes: (closure.beds || []).slice(),
            startOffset: BookingStore.timeToOffset(closure.startTime),
            endOffset: BookingStore.timeToOffset(closure.endTime),
          };
          fillFormFromClosure(closure);
          refresh();
          const names = (closure.beds || [])
            .map((i) => DeskI18n.bedLabelAt(i))
            .join('、');
          const kind = BookingStore.isDayScopeClosure(closure) ? '整日关' : '时段关';
          if (sideTitle) sideTitle.textContent = '关床编辑';
          openSide(
            closure.openRequestStatus === 'requested'
              ? `开床申请：${names} · ${closure.startTime}–${closure.endTime}`
              : `已选中「${kind}」：${names} · 释放只取消这一条`,
            point
          );
        },
        onClosureLayoutChange: (patch) => {
          if (
            !confirmIfBookingConflict(
              currentDate(),
              patch.startTime,
              patch.endTime,
              patch.beds
            )
          ) {
            refresh();
            return;
          }
          const r = BookingStore.updateClosure(patch.id, {
            startTime: patch.startTime,
            endTime: patch.endTime,
            beds: patch.beds,
          });
          if (!r.ok) {
            alert(r.error);
            refresh();
            return;
          }
          selectedClosureId = patch.id;
          rangeSelection = {
            bedIndex: patch.beds[0],
            bedIndexes: patch.beds.slice(),
            startOffset: BookingStore.timeToOffset(patch.startTime),
            endOffset: BookingStore.timeToOffset(patch.endTime),
          };
          fillFormFromClosure(r.closure);
          formErr.className = 'hint ok';
          formErr.textContent = `已调整：${patch.startTime}–${patch.endTime}`;
          refresh();
          openSide('调整已保存，可继续拖动', {
            x: patch.clientX,
            y: patch.clientY,
          });
        },
        onRangeSelect: (range) => {
          // 若与当前选区完全相同 → 取消
          if (
            rangeSelection &&
            rangeSelection.startOffset === range.startOffset &&
            rangeSelection.endOffset === range.endOffset &&
            String(rangeSelection.bedIndexes || []) === String(range.bedIndexes || [])
          ) {
            clearRangeSelection('已取消选择');
            return;
          }
          selectedClosureId = null;
          selectedBookingId = null;
          sheetMode = 'range';
          const beds = range.bedIndexes || [range.bedIndex];
          rangeSelection = {
            bedIndex: beds[0],
            bedIndexes: beds,
            startOffset: range.startOffset,
            endOffset: range.endOffset,
          };
          startTimeEl.value = range.startTime;
          endTimeEl.value = range.endTime;
          renderSideBeds(beds);
          setReason('临时关闭');
          const names = beds.map((i) => DeskI18n.bedLabelAt(i)).join('、');
          const conflicts = BookingStore.findBookingConflictsForRange(
            currentDate(),
            range.startTime,
            range.endTime,
            beds
          );
          sideErr.textContent = conflicts.length
            ? `注意：与 ${conflicts.length} 笔预约重叠，确认关闭时会再警告一次`
            : '';
          formErr.className = conflicts.length ? 'hint warn' : 'hint ok';
          formErr.textContent = conflicts.length
            ? `已选 ${names} · ${range.startTime}–${range.endTime}（与预约重叠）`
            : `已选 ${names} · ${range.startTime}–${range.endTime}，请确认关闭。再点当前选区可取消。`;
          remainHint.textContent = `选区：${names} · ${range.startTime}–${range.endTime}`;
          if (sideTitle) sideTitle.textContent = '关时段';
          openSide(
            conflicts.length
              ? `已选 ${names} · 与预约重叠；继续拖选时弹层会变淡`
              : `已选 ${names} · ${range.startTime}–${range.endTime}（拖动时弹层变淡）`,
            {
              x: range.clientX,
              y: range.clientY,
            }
          );
          refresh();
        },
      });

      if (!rangeSelection && !selectedClosureId && !selectedBookingId) {
        remainHint.textContent = '左侧「关/开」整日操作；空档拖选关时段；点预约看项目';
      }
    }

    const closures = BookingStore.listClosures(date);
    listEl.innerHTML = closures.length
      ? closures
          .map((c) => {
            const beds = (c.beds || []).map((i) => DeskI18n.bedLabelAt(i)).join('、');
            const kind = BookingStore.isDayScopeClosure(c) ? '整日关' : '时段关';
            const req =
              c.openRequestStatus === 'requested'
                ? '<span class="badge hold">开床申请中</span>'
                : '';
            return `
          <div class="item" data-id="${c.id}">
            <div class="title"><span class="badge">${kind}</span> ${c.startTime} – ${c.endTime} ${req}</div>
            <div class="meta">${beds || '（无资源）'} · ${c.reason || ''} · ${c.id}</div>
            <div class="actions">
              <button class="btn" data-select="${c.id}">选中编辑</button>
              ${
                c.openRequestStatus === 'requested'
                  ? `<button class="btn primary" data-approve="${c.id}">同意开床</button>
                     <button class="btn" data-reject="${c.id}">拒绝</button>`
                  : `<button class="btn" data-release="${c.id}">释放此${kind}</button>`
              }
            </div>
          </div>`;
          })
          .join('')
      : '<div class="hint">当日暂无手动关闭</div>';
  }

  function confirmIfBookingConflict(date, startTime, endTime, beds) {
    const conflicts = BookingStore.findBookingConflictsForRange(
      date,
      startTime,
      endTime,
      beds
    );
    if (!conflicts.length) return true;
    return window.confirm(BookingStore.formatBookingConflictWarning(conflicts));
  }

  function doCloseOrSave() {
    sideErr.textContent = '';
    formErr.textContent = '';
    const beds = selectedBedsFromSide();
    if (!beds.length) {
      sideErr.textContent = '请勾选要关闭的资源';
      openSide();
      return;
    }

    if (
      !confirmIfBookingConflict(
        currentDate(),
        startTimeEl.value,
        endTimeEl.value,
        beds
      )
    ) {
      return;
    }

    const reason = syncReasonFromUi();
    const scope =
      sheetMode === 'day' ||
      (BookingStore.timeToOffset(startTimeEl.value) === 0 &&
        BookingStore.timeToOffset(endTimeEl.value) === BookingStore.businessSpanMinutes())
        ? 'day'
        : 'slot';

    if (selectedClosureId) {
      const r = BookingStore.updateClosure(selectedClosureId, {
        startTime: startTimeEl.value,
        endTime: endTimeEl.value,
        beds,
        reason: reason.reason,
        reasonCode: reason.reasonCode,
        scope,
      });
      if (!r.ok) {
        sideErr.textContent = r.error;
        openSide();
        return;
      }
      formErr.className = 'hint ok';
      formErr.textContent = '已保存对该关闭时段的调整。';
      closeSide();
      refresh();
      return;
    }

    const r = BookingStore.setClosure({
      date: currentDate(),
      startTime: startTimeEl.value,
      endTime: endTimeEl.value,
      beds,
      reason: reason.reason,
      reasonCode: reason.reasonCode,
      scope,
      absorbOverlaps: scope === 'day',
    });
    if (!r.ok) {
      sideErr.textContent = r.error;
      formErr.className = 'err';
      formErr.textContent = r.error;
      openSide();
      return;
    }
    selectedClosureId = null;
    rangeSelection = null;
    mobilePickStart = null;
    formErr.className = 'hint ok';
    formErr.textContent =
      scope === 'day'
        ? '已整日关闭。释放时请点对应「整日关」记录。'
        : '已关闭所选时段。释放时请点对应「时段关」记录。';
    closeSide();
    setDockOn(null);
    refresh();
  }

  function doRelease(id) {
    const target = id || selectedClosureId;
    if (!target) return;
    const before = BookingStore.listClosures(currentDate()).find((c) => c.id === target);
    const kind = before && BookingStore.isDayScopeClosure(before) ? '整日关' : '时段关';
    BookingStore.releaseClosure(target);
    if (selectedClosureId === target) selectedClosureId = null;
    rangeSelection = null;
    formErr.className = 'hint ok';
    formErr.textContent = `已释放此「${kind}」记录；其他关闭不受影响。`;
    closeSide();
    refresh();
  }

  btnClose.addEventListener('click', doCloseOrSave);
  btnRelease.addEventListener('click', () => doRelease());

  function doRespondOpen(id, approve) {
    const target = id || selectedClosureId;
    if (!target) return;
    const r = BookingStore.respondOpenRequest(target, approve);
    if (!r.ok) {
      formErr.className = 'err';
      formErr.textContent = r.error || '处理失败';
      const reqErr = document.getElementById('sideReqErr');
      if (reqErr) reqErr.textContent = r.error || '处理失败';
      return;
    }
    if (selectedClosureId === target) selectedClosureId = null;
    rangeSelection = null;
    formErr.className = 'hint ok';
    formErr.textContent = approve ? '已同意开床（关闭已释放）' : '已拒绝开床申请（床位仍关闭）';
    const still = BookingStore.listClosures(currentDate()).filter(
      (c) => c.openRequestStatus === 'requested'
    );
    if (sheetMode === 'request' && still.length) {
      openRequestSheet();
      refresh();
      return;
    }
    closeSide();
    refresh();
  }

  if (btnApproveOpen) {
    btnApproveOpen.addEventListener('click', () => doRespondOpen(null, true));
  }
  if (btnRejectOpen) {
    btnRejectOpen.addEventListener('click', () => doRespondOpen(null, false));
  }

  document.addEventListener('pointerdown', (e) => {
    if (sidePanel.hidden || sidePanel.classList.contains('is-drag-hidden')) return;
    if (sidePanel.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.board-track')) return;
    if (e.target.closest && e.target.closest('.board-label')) return;
    if (e.target.closest && e.target.closest('.m-timeline')) return;
    if (e.target.closest && e.target.closest('.m-dock')) return;
    if (e.target.closest && e.target.closest('.occ-strip')) return;
    if (mSheetScrim && e.target === mSheetScrim) {
      closeSide();
      return;
    }
    if (isMobileMerchant()) return;
    closeSide();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSide();
  });

  if (mSheetScrim) {
    mSheetScrim.addEventListener('click', () => closeSide());
  }
  const btnSheetClose = document.getElementById('btnSheetClose');
  if (btnSheetClose) btnSheetClose.addEventListener('click', () => closeSide());

  if (mDock) {
    mDock.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-dock]');
      if (!btn) return;
      const mode = btn.getAttribute('data-dock');
      const snap = STORE_CONFIG.slotMinutes || 30;
      if (mode === 'day') {
        openDayCloseSheet(
          rangeSelection ? rangeSelection.bedIndexes || [rangeSelection.bedIndex] : null
        );
        return;
      }
      if (mode === 'range') {
        const bed = rangeSelection ? rangeSelection.bedIndex : 0;
        const start = rangeSelection
          ? rangeSelection.startOffset
          : BookingStore.timeToOffset(
              `${String(Math.min(STORE_CONFIG.openHour + 2, 20)).padStart(2, '0')}:00`
            );
        const end = rangeSelection ? rangeSelection.endOffset : start + snap;
        openRangeSheet(bed, start, end);
        refresh();
        return;
      }
      if (mode === 'req') {
        openRequestSheet();
      }
    });
  }

  function onApproveRejectClick(e) {
    const approveBtn = e.target.closest('[data-approve]');
    if (approveBtn) {
      doRespondOpen(approveBtn.getAttribute('data-approve'), true);
      return;
    }
    const rejectBtn = e.target.closest('[data-reject]');
    if (rejectBtn) {
      doRespondOpen(rejectBtn.getAttribute('data-reject'), false);
    }
  }

  if (mPendingRequests) {
    mPendingRequests.addEventListener('click', onApproveRejectClick);
  }
  if (sideRequestList) {
    sideRequestList.addEventListener('click', onApproveRejectClick);
  }

  if (bookingListToday) {
    bookingListToday.addEventListener('click', (e) => {
      const confirmBtn = e.target.closest('[data-confirm-booking]');
      if (confirmBtn) {
        const id = confirmBtn.getAttribute('data-confirm-booking');
        selectedBookingId = id;
        confirmSelectedBooking();
        return;
      }
      const btn = e.target.closest('[data-view-booking]');
      if (!btn) return;
      const id = btn.getAttribute('data-view-booking');
      const booking = BookingStore.listBookings(currentDate()).find((x) => x.id === id);
      if (booking) {
        openBookingView(booking, { x: e.clientX, y: e.clientY });
        refresh();
      }
    });
  }

  if (btnConfirmBooking) {
    btnConfirmBooking.addEventListener('click', () => confirmSelectedBooking());
  }

  if (occStrip) {
    occStrip.addEventListener('click', (e) => {
      const bBtn = e.target.closest('[data-occ-booking]');
      if (bBtn) {
        const id = bBtn.getAttribute('data-occ-booking');
        const booking = BookingStore.listBookings(currentDate()).find((x) => x.id === id);
        if (booking) {
          openBookingView(booking, { x: e.clientX, y: e.clientY });
          refresh();
        }
        return;
      }
      const cBtn = e.target.closest('[data-occ-closure]');
      if (!cBtn) return;
      const id = cBtn.getAttribute('data-occ-closure');
      const c = BookingStore.listClosures(currentDate()).find((x) => x.id === id);
      if (!c) return;
      selectedClosureId = c.id;
      selectedBookingId = null;
      sheetMode = 'edit';
      rangeSelection = {
        bedIndex: (c.beds || [0])[0],
        bedIndexes: (c.beds || []).slice(),
        startOffset: BookingStore.timeToOffset(c.startTime),
        endOffset: BookingStore.timeToOffset(c.endTime),
      };
      fillFormFromClosure(c);
      if (sideTitle) sideTitle.textContent = '关床编辑';
      openSide(
        BookingStore.isDayScopeClosure(c)
          ? '整日关记录（释放只取消这一条）'
          : '时段关记录（释放只取消这一条）',
        { x: e.clientX, y: e.clientY }
      );
      refresh();
    });
  }

  window.addEventListener('resize', () => {
    refresh();
  });

  sideBeds.addEventListener('change', () => {
    const beds = selectedBedsFromSide();
    if (!beds.length || !rangeSelection) return;
    rangeSelection = {
      bedIndex: beds[0],
      bedIndexes: beds,
      startOffset: rangeSelection.startOffset,
      endOffset: rangeSelection.endOffset,
    };
    refresh();
    openSide();
  });

  listEl.addEventListener('click', (e) => {
    const approveBtn = e.target.closest('[data-approve]');
    if (approveBtn) {
      doRespondOpen(approveBtn.getAttribute('data-approve'), true);
      return;
    }
    const rejectBtn = e.target.closest('[data-reject]');
    if (rejectBtn) {
      doRespondOpen(rejectBtn.getAttribute('data-reject'), false);
      return;
    }
    const releaseBtn = e.target.closest('[data-release]');
    if (releaseBtn) {
      doRelease(releaseBtn.getAttribute('data-release'));
      return;
    }
    const selectBtn = e.target.closest('[data-select]');
    if (!selectBtn) return;
    const id = selectBtn.getAttribute('data-select');
    const c = BookingStore.listClosures(currentDate()).find((x) => x.id === id);
    if (!c) return;
    selectedClosureId = c.id;
    selectedBookingId = null;
    sheetMode = 'edit';
    rangeSelection = {
      bedIndex: (c.beds || [0])[0],
      bedIndexes: (c.beds || []).slice(),
      startOffset: BookingStore.timeToOffset(c.startTime),
      endOffset: BookingStore.timeToOffset(c.endTime),
    };
    fillFormFromClosure(c);
    refresh();
    openSide(`已选中关闭块 · ${c.startTime}–${c.endTime}`, {
      x: Math.min(window.innerWidth - 40, 120),
      y: Math.min(window.innerHeight - 40, 160),
    });
  });

  document.getElementById('btnRefresh').addEventListener('click', refresh);
  dateInput.addEventListener('change', () => {
    selectedClosureId = null;
    selectedBookingId = null;
    rangeSelection = null;
    closeSide();
    refresh();
  });
  window.addEventListener('booking-store-changed', softRefresh);
  window.addEventListener('storage', (e) => {
    if (!e.key) return;
    if (e.key === STORE_CONFIG.storageKey || e.key === 'booking_platform_sync_ping') {
      softRefresh();
    }
  });

  function softRefresh() {
    if (document.querySelector('.board.is-dragging, .board.is-editing-block')) return;
    refresh();
  }

  // 5 秒自动刷新（含跨标签页 CS 改动）；拖选中跳过
  setInterval(softRefresh, 5000);

  renderSideBeds([]);
  dateInput.value = BookingStore.todayBusinessDate();
  refresh();
})();
