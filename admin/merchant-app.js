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

  const cfg = STORE_CONFIG;
  document.title = `商家端 · ${cfg.storeName.cn}`;
  document.getElementById('pageBrand').innerHTML =
    `商家端 · ${cfg.storeName.cn}<div class="hint" style="margin:0">${cfg.tagline} · ${cfg.hoursLabel} · ${cfg.bedCount} 床</div>`;
  const mid = String(
    Math.min(cfg.openHour + 3, cfg.overnight ? 20 : Math.max(cfg.openHour + 1, cfg.closeHour - 2))
  ).padStart(2, '0');
  document.getElementById('startTime').value = `${mid}:00`;
  document.getElementById('endTime').value = `${String(Number(mid) + 1).padStart(2, '0')}:00`;
  document.getElementById('startTime').step = '1800';
  document.getElementById('endTime').step = '1800';

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
  const btnClose = document.getElementById('btnClose');
  const btnRelease = document.getElementById('btnRelease');
  const btnApproveOpen = document.getElementById('btnApproveOpen');
  const btnRejectOpen = document.getElementById('btnRejectOpen');
  const openReqHint = document.getElementById('openReqHint');
  const mTimeline = document.getElementById('mTimeline');
  const mSummaryHint = document.getElementById('mSummaryHint');
  const mPendingRequests = document.getElementById('mPendingRequests');
  const mDock = document.getElementById('mDock');
  const mSheetScrim = document.getElementById('mSheetScrim');
  const mTimelineHint = document.getElementById('mTimelineHint');
  const sideTitle = document.getElementById('sideTitle');
  const sideBodyForm = document.getElementById('sideBodyForm');
  const sideBodyRequests = document.getElementById('sideBodyRequests');
  const sideRequestList = document.getElementById('sideRequestList');

  let lastPointer = { x: 80, y: 120 };
  let rangeSelection = null;
  let selectedClosureId = null;
  /** 手机点选：第一次点开始，第二次点结束并打开关时段 */
  let mobilePickStart = null;
  let dockMode = null;
  /** day | range | edit | request */
  let sheetMode = null;

  function isMobileMerchant() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

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
        (name, i) =>
          `<label class="bed-check-item"><input type="checkbox" value="${i}" ${
            set.has(i) ? 'checked' : ''
          }><span class="bed-check-text">${name}</span></label>`
      )
      .join('');
  }

  function selectedBedsFromSide() {
    return [...sideBeds.querySelectorAll('input:checked')].map((x) => Number(x.value));
  }

  function fillFormFromClosure(c) {
    startTimeEl.value = c.startTime;
    endTimeEl.value = c.endTime;
    reasonEl.value = c.reason || '';
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
    if (sideBodyForm) sideBodyForm.hidden = isReq;
    if (sideBodyRequests) sideBodyRequests.hidden = !isReq;
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
    if (openReqHint) openReqHint.hidden = !hasRequest || sheetMode === 'request';
    if (btnApproveOpen) btnApproveOpen.hidden = !(hasRequest && sheetMode !== 'request');
    if (btnRejectOpen) btnRejectOpen.hidden = !(hasRequest && sheetMode !== 'request');
    if (sheetMode === 'request') {
      btnClose.hidden = true;
      btnRelease.hidden = true;
      return;
    }
    if (selectedClosureId) {
      btnClose.textContent = '保存调整';
      btnRelease.hidden = hasRequest;
      btnClose.hidden = hasRequest;
    } else {
      btnClose.hidden = false;
      btnClose.textContent = sheetMode === 'day' ? '确认整日关闭' : '确认关闭';
      btnRelease.hidden = true;
    }
  }

  function openSide(msg, point) {
    if (msg) sideHint.textContent = msg;
    if (point && point.x != null) lastPointer = { x: point.x, y: point.y };
    setSheetBodies(sheetMode);
    syncActionButtons();
    requestAnimationFrame(() => placeCtxMenu());
  }

  function closeSide() {
    sidePanel.classList.remove('is-open');
    sidePanel.setAttribute('aria-hidden', 'true');
    sidePanel.hidden = true;
    if (mSheetScrim) mSheetScrim.hidden = true;
    setTimeInputsLocked(false);
    sheetMode = null;
    setSheetBodies(null);
    if (!selectedClosureId) setDockOn(null);
  }

  function closeDayBed(bedIndex) {
    const name = STORE_CONFIG.bedLabels[bedIndex] || `${bedIndex + 1}号床`;
    if (!confirm(`将 ${name} 整天关闭（营业时段 ${STORE_CONFIG.hoursLabel}）？`)) return;
    const startTime = BookingStore.offsetToTime(0);
    const endTime = BookingStore.offsetToTime(BookingStore.businessSpanMinutes());
    if (!confirmIfBookingConflict(currentDate(), startTime, endTime, [bedIndex])) return;
    const r = BookingStore.setClosure({
      date: currentDate(),
      startTime,
      endTime,
      beds: [bedIndex],
      reason: '商家一键整日关床',
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
    formErr.textContent = `已整日关闭 ${name}（${startTime}–${endTime}）`;
    closeSide();
    refresh();
  }

  function snapOffset(mins) {
    const snap = STORE_CONFIG.slotMinutes || 30;
    return Math.round(Number(mins) / snap) * snap;
  }

  function openRangeSheet(bedIndex, startOffset, endOffset, msg) {
    selectedClosureId = null;
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
    reasonEl.value = '商家手动关闭';
    renderSideBeds([bedIndex]);
    if (sideTitle) sideTitle.textContent = '关时段';
    setDockOn('range');
    openSide(msg || `${STORE_CONFIG.bedLabels[bedIndex]} · 请确认后关闭`, {
      x: window.innerWidth / 2,
      y: window.innerHeight - 80,
    });
  }

  function openDayCloseSheet(preselectBeds) {
    selectedClosureId = null;
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
    reasonEl.value = '商家一键整日关床';
    renderSideBeds(beds);
    if (sideTitle) sideTitle.textContent = '整日关床';
    setDockOn('day');
    openSide(`营业时段 ${STORE_CONFIG.hoursLabel} 将全部关闭，请勾选床位后确认`, {
      x: window.innerWidth / 2,
      y: window.innerHeight - 80,
    });
  }

  function openRequestSheet() {
    selectedClosureId = null;
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
      sideRequestList.innerHTML =
        '<p class="hint">今日暂无待处理开床申请。</p>';
      openSide('暂无申请可处理');
      return;
    }
    sideRequestList.innerHTML = requests
      .map((c) => {
        const beds = (c.beds || []).map((i) => STORE_CONFIG.bedLabels[i]).join('、');
        return `<div class="item" data-req-id="${c.id}">
          <div class="title">${beds} · ${c.startTime}–${c.endTime}</div>
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

  function renderMobileSummary(date) {
    if (!mSummaryHint) return;
    const bookings = BookingStore.listBookings(date).filter((b) => b.status !== 'cancelled');
    const closures = BookingStore.listClosures(date);
    const requests = closures.filter((c) => c.openRequestStatus === 'requested');
    mSummaryHint.innerHTML =
      `<span class="lg booking"></span>预约 ${bookings.length} · ` +
      `<span class="lg closure"></span>关闭 ${closures.length} · ` +
      `<span class="lg" style="background:var(--teal-request)"></span>开床申请 ${requests.length}`;

    if (!mPendingRequests) return;
    if (!requests.length) {
      mPendingRequests.innerHTML = '<p class="hint" style="margin-top:.4rem">暂无待处理开床申请</p>';
      return;
    }
    mPendingRequests.innerHTML = requests
      .map((c) => {
        const beds = (c.beds || []).map((i) => STORE_CONFIG.bedLabels[i]).join('、');
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
        <div class="m-tl-corner">床</div>
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
      const label = STORE_CONFIG.bedLabels[bed] || `${bed + 1}号床`;
      rows += `<div class="m-tl-row">
        <button type="button" class="m-tl-label" data-bed-day="${bed}">${label}</button>
        <div class="m-tl-track">${cells}</div>
      </div>`;
    }

    mTimeline.innerHTML = `<div class="m-timeline-scroll"><div class="m-timeline-inner">${rows}</div></div>`;
    const scroller = mTimeline.querySelector('.m-timeline-scroll');
    if (scroller) scroller.scrollLeft = keepLeft;

    mTimeline.querySelectorAll('[data-bed-day]').forEach((el) => {
      el.addEventListener('click', () => closeDayBed(Number(el.getAttribute('data-bed-day'))));
    });

    mTimeline.querySelectorAll('.m-tl-slot').forEach((el) => {
      el.addEventListener('click', () => {
        const bed = Number(el.getAttribute('data-bed'));
        const slot = Number(el.getAttribute('data-slot'));
        const startOff = slot * snap;
        const cell = map[bed][slot];

        if (cell && (cell.type === 'closure' || cell.type === 'closure_request')) {
          const closure = cell.ref;
          selectedClosureId = closure.id;
          mobilePickStart = null;
          sheetMode =
            closure.openRequestStatus === 'requested' ? 'edit' : 'edit';
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
            closure.openRequestStatus === 'requested' ? '开床申请，请选择同意或拒绝' : '编辑关闭时段'
          );
          refresh();
          return;
        }

        if (cell && (cell.type === 'booking' || cell.type === 'pending' || cell.type === 'hold')) {
          formErr.className = 'hint warn';
          formErr.textContent = '预约格只读，不能在此关闭。请点空档关时段。';
          return;
        }

        // 空格：点选关时段
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

        mobilePickStart = { bed, slot };
        const endOff = Math.min(startOff + snap, BookingStore.businessSpanMinutes());
        openRangeSheet(bed, startOff, endOff, '已选半小时，可再点结束格，或直接改时间后确认');
        if (mTimelineHint) {
          mTimelineHint.textContent = `已选 ${STORE_CONFIG.bedLabels[bed]} ${BookingStore.offsetToTime(
            startOff
          )} 起（半小时）；再点一格可改结束时间`;
        }
        refresh();
      });
    });
  }

  function refresh() {
    const date = currentDate();
    dateInput.value = date;

    if (isMobileMerchant()) {
      renderMobileSummary(date);
      renderMobileTimeline(date);
      // 操作说明放在时间表卡片 #mTimelineHint，避免挤占营业日
      remainHint.textContent = '';
    } else {
      BoardUI.renderBoard(boardEl, date, {
      selection: rangeSelection,
      selectedClosureId,
      selectionHint: '空档拖选关床 / 点床位号整日关 / 选中关块可拖移与拉伸',
      onClearClosureSelect: () => {
        if (selectedClosureId) selectedClosureId = null;
      },
      onBedLabelClick: (bedIndex) => closeDayBed(bedIndex),
      onClosureSelect: (closure, point) => {
        selectedClosureId = closure.id;
        rangeSelection = {
          bedIndex: (closure.beds || [0])[0],
          bedIndexes: (closure.beds || []).slice(),
          startOffset: BookingStore.timeToOffset(closure.startTime),
          endOffset: BookingStore.timeToOffset(closure.endTime),
        };
        fillFormFromClosure(closure);
        refresh();
        const names = (closure.beds || [])
          .map((i) => STORE_CONFIG.bedLabels[i] || `${i + 1}号床`)
          .join('、');
        openSide(
          closure.openRequestStatus === 'requested'
            ? `开床申请：${names} · ${closure.startTime}–${closure.endTime}`
            : `已选中关闭块：可拖动移动；左右拉时长，上下拉床数 · ${names}`,
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
        formErr.textContent = `已调整：${patch.startTime}–${patch.endTime} · ${patch.beds.length} 床`;
        refresh();
        openSide('调整已保存，可继续拖动', {
          x: patch.clientX,
          y: patch.clientY,
        });
      },
      onRangeSelect: (range) => {
        selectedClosureId = null;
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
        const names = beds.map((i) => STORE_CONFIG.bedLabels[i] || `${i + 1}号床`).join('、');
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
          ? `已选 ${names} · ${range.startTime}–${range.endTime}（与预约重叠，可关但会警告）`
          : `已选 ${names} · ${range.startTime}–${range.endTime}，请在菜单确认关闭。`;
        remainHint.textContent = `选区：${names} · ${range.startTime}–${range.endTime}`;
        openSide(
          conflicts.length
            ? `已选 ${names} · 与预约重叠，确认时将警告`
            : `已选 ${names} · ${range.startTime}–${range.endTime}`,
          {
            x: range.clientX,
            y: range.clientY,
          }
        );
        refresh();
      },
    });

      if (!rangeSelection) {
        remainHint.textContent = '在空档拖选，或点击灰色关闭块进行编辑';
      }
    }

    const closures = BookingStore.listClosures(date);
    listEl.innerHTML = closures.length
      ? closures
          .map((c) => {
            const beds = (c.beds || []).map((i) => STORE_CONFIG.bedLabels[i]).join('、');
            const req =
              c.openRequestStatus === 'requested'
                ? '<span class="badge hold">开床申请中</span>'
                : '';
            return `
          <div class="item" data-id="${c.id}">
            <div class="title">${c.startTime} – ${c.endTime} ${req}</div>
            <div class="meta">${beds || '（无床位）'} · ${c.reason || ''} · ${c.id}</div>
            <div class="actions">
              <button class="btn" data-select="${c.id}">选中编辑</button>
              ${
                c.openRequestStatus === 'requested'
                  ? `<button class="btn primary" data-approve="${c.id}">同意开床</button>
                     <button class="btn" data-reject="${c.id}">拒绝</button>`
                  : `<button class="btn" data-release="${c.id}">打开（释放）</button>`
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
      sideErr.textContent = '请勾选要关闭的床位';
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

    if (selectedClosureId) {
      const r = BookingStore.updateClosure(selectedClosureId, {
        startTime: startTimeEl.value,
        endTime: endTimeEl.value,
        beds,
        reason: reasonEl.value.trim(),
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
      reason: reasonEl.value.trim(),
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
    formErr.textContent = '已关闭所选床位时段。';
    closeSide();
    setDockOn(null);
    refresh();
  }

  function doRelease(id) {
    const target = id || selectedClosureId;
    if (!target) return;
    BookingStore.releaseClosure(target);
    if (selectedClosureId === target) selectedClosureId = null;
    rangeSelection = null;
    formErr.className = 'hint ok';
    formErr.textContent = '已打开（释放）该关闭时段。';
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
    if (sidePanel.hidden) return;
    if (sidePanel.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.board-track')) return;
    if (e.target.closest && e.target.closest('.board-label')) return;
    if (e.target.closest && e.target.closest('.m-timeline')) return;
    if (e.target.closest && e.target.closest('.m-dock')) return;
    if (mSheetScrim && e.target === mSheetScrim) {
      closeSide();
      return;
    }
    if (isMobileMerchant()) return; // 手机点空白不自动关弹层，点遮罩或 ×
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
    rangeSelection = null;
    closeSide();
    refresh();
  });
  window.addEventListener('booking-store-changed', refresh);

  renderSideBeds([]);
  dateInput.value = BookingStore.todayBusinessDate();
  refresh();
})();
