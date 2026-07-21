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
  document.getElementById('navMerchant').href = `merchant.html?store=${encodeURIComponent(cfg.storeId)}`;

  const mid = String(
    Math.min(cfg.openHour + 3, cfg.overnight ? 20 : Math.max(cfg.openHour + 1, cfg.closeHour - 2))
  ).padStart(2, '0');
  document.getElementById('startTime').value = `${mid}:00`;
  document.getElementById('endTime').value = `${String(Number(mid) + 2).padStart(2, '0')}:00`;

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

  let lastPointer = { x: 80, y: 120 };
  let rangeSelection = null;
  let selectedClosureId = null;

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
    const pad = 8;
    const gap = 8;
    sidePanel.hidden = false;
    sidePanel.classList.add('is-open');
    sidePanel.setAttribute('aria-hidden', 'false');
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

  function syncActionButtons() {
    if (selectedClosureId) {
      btnClose.textContent = '保存调整';
      btnRelease.hidden = false;
      btnClose.style.gridColumn = '';
    } else {
      btnClose.textContent = '确认关闭';
      btnRelease.hidden = true;
      btnClose.style.gridColumn = '1 / -1';
    }
  }

  function openSide(msg, point) {
    if (msg) sideHint.textContent = msg;
    if (point && point.x != null) lastPointer = { x: point.x, y: point.y };
    syncActionButtons();
    requestAnimationFrame(() => placeCtxMenu());
  }

  function closeSide() {
    sidePanel.classList.remove('is-open');
    sidePanel.setAttribute('aria-hidden', 'true');
    sidePanel.hidden = true;
  }

  function refresh() {
    const date = currentDate();
    dateInput.value = date;
    BoardUI.renderBoard(boardEl, date, {
      selection: rangeSelection,
      selectedClosureId,
      selectionHint: '空档拖选关床 / 选中关块可拖移与拉伸',
      onClearClosureSelect: () => {
        if (selectedClosureId) selectedClosureId = null;
      },
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
          `已选中关闭块：可拖动移动；左右拉时长，上下拉床数 · ${names}`,
          point
        );
      },
      onClosureLayoutChange: (patch) => {
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
        sideErr.textContent = '';
        formErr.className = 'hint ok';
        formErr.textContent = `已选 ${names} · ${range.startTime}–${range.endTime}，请在菜单确认关闭。`;
        remainHint.textContent = `选区：${names} · ${range.startTime}–${range.endTime}`;
        openSide(`已选 ${names} · ${range.startTime}–${range.endTime}`, {
          x: range.clientX,
          y: range.clientY,
        });
        refresh();
      },
    });

    if (!rangeSelection) {
      remainHint.textContent = '在空档拖选，或点击灰色关闭块进行编辑';
    }

    const closures = BookingStore.listClosures(date);
    listEl.innerHTML = closures.length
      ? closures
          .map((c) => {
            const beds = (c.beds || []).map((i) => STORE_CONFIG.bedLabels[i]).join('、');
            return `
          <div class="item" data-id="${c.id}">
            <div class="title">${c.startTime} – ${c.endTime}</div>
            <div class="meta">${beds || '（无床位）'} · ${c.reason || ''} · ${c.id}</div>
            <div class="actions">
              <button class="btn" data-select="${c.id}">选中编辑</button>
              <button class="btn" data-release="${c.id}">打开（释放）</button>
            </div>
          </div>`;
          })
          .join('')
      : '<div class="hint">当日暂无手动关闭</div>';
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
    formErr.className = 'hint ok';
    formErr.textContent = '已关闭所选床位时段。';
    closeSide();
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
  document.getElementById('btnSideClose').addEventListener('click', closeSide);
  document.getElementById('btnSideCloseTop').addEventListener('click', closeSide);

  document.addEventListener('pointerdown', (e) => {
    if (sidePanel.hidden) return;
    if (sidePanel.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.board-track')) return;
    closeSide();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSide();
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
