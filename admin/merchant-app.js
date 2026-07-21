(function () {
  if (!StoreRegistry.requireStoreOrRedirect('merchant-login.html')) return;
  if (StoreRegistry.getRole() !== 'merchant') {
    // 允许识别码登录后带着 store 参数进入；若直接打开则退回登录
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
    `商家端 · ${cfg.storeName.cn}<div class="hint" style="margin:0">${cfg.tagline} · ${cfg.hoursLabel}</div>`;
  document.getElementById('navMerchant').href = `merchant.html?store=${encodeURIComponent(cfg.storeId)}`;

  const mid = String(Math.min(cfg.openHour + 3, cfg.overnight ? 20 : Math.max(cfg.openHour + 1, cfg.closeHour - 2))).padStart(2, '0');
  document.getElementById('startTime').value = `${mid}:00`;
  document.getElementById('endTime').value = `${String(Number(mid) + 2).padStart(2, '0')}:00`;

  const dateInput = document.getElementById('dateInput');
  const boardEl = document.getElementById('board');
  const listEl = document.getElementById('closureList');
  const formErr = document.getElementById('formErr');
  const bedChecks = document.getElementById('bedChecks');
  const startTimeEl = document.getElementById('startTime');
  const endTimeEl = document.getElementById('endTime');

  /** @type {{ bedIndexes: number[], startOffset: number, endOffset: number } | null} */
  let rangeSelection = null;

  function currentDate() {
    return dateInput.value || BookingStore.todayBusinessDate();
  }

  function buildBedChecks() {
    bedChecks.innerHTML =
      `<label class="bed-check-item"><input type="checkbox" id="bedAll" value="all"> <span class="bed-check-text">全部床位</span></label>` +
      STORE_CONFIG.bedLabels
        .map(
          (name, i) =>
            `<label class="bed-check-item"><input type="checkbox" class="bed-one" value="${i}"> <span class="bed-check-text">${name}</span></label>`
        )
        .join('');
  }

  function setBedChecks(indexes, all) {
    const allBox = document.getElementById('bedAll');
    const ones = [...bedChecks.querySelectorAll('input.bed-one')];
    if (all) {
      if (allBox) allBox.checked = true;
      ones.forEach((el) => {
        el.checked = true;
        el.disabled = true;
      });
      return;
    }
    if (allBox) allBox.checked = false;
    const set = new Set((indexes || []).map(Number));
    ones.forEach((el) => {
      el.disabled = false;
      el.checked = set.has(Number(el.value));
    });
  }

  function selectedBeds() {
    const allBox = document.getElementById('bedAll');
    if (allBox && allBox.checked) return BookingStore.allBedIndexes();
    return [...bedChecks.querySelectorAll('input.bed-one:checked')].map((x) =>
      Number(x.value)
    );
  }

  function syncSelectionFromForm() {
    const beds = selectedBeds();
    const start = BookingStore.timeToOffset(startTimeEl.value);
    const end = BookingStore.timeToOffset(endTimeEl.value);
    if (!beds.length || !(end > start)) {
      rangeSelection = null;
      return;
    }
    rangeSelection = {
      bedIndexes: beds,
      startOffset: start,
      endOffset: end,
    };
  }

  function refresh() {
    const date = currentDate();
    dateInput.value = date;
    BoardUI.renderBoard(boardEl, date, {
      selection: rangeSelection,
      selectionHint: '空档拖选要关闭的床位与时段',
      onRangeSelect: (range) => {
        rangeSelection = {
          bedIndexes: range.bedIndexes.slice(),
          startOffset: range.startOffset,
          endOffset: range.endOffset,
        };
        startTimeEl.value = range.startTime;
        endTimeEl.value = range.endTime;
        setBedChecks(range.bedIndexes, false);
        formErr.textContent = '';
        refresh();
      },
    });

    const closures = BookingStore.listClosures(date);
    listEl.innerHTML = closures.length
      ? closures
          .map((c) => {
            const beds = (c.beds || [])
              .map((i) => STORE_CONFIG.bedLabels[i])
              .join('、');
            return `
          <div class="item">
            <div class="title">${c.startTime} – ${c.endTime}</div>
            <div class="meta">${beds || '（无床位）'} · ${c.reason || ''} · ${c.id}</div>
            <div class="actions">
              <button class="btn" data-release="${c.id}">打开（释放）</button>
            </div>
          </div>`;
          })
          .join('')
      : '<div class="hint">当日暂无手动关闭</div>';
  }

  bedChecks.addEventListener('change', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.id === 'bedAll') {
      setBedChecks([], t.checked);
    } else if (t.classList.contains('bed-one')) {
      const allBox = document.getElementById('bedAll');
      if (allBox) allBox.checked = false;
    }
    syncSelectionFromForm();
    refresh();
  });

  document.getElementById('btnClose').addEventListener('click', () => {
    formErr.textContent = '';
    const beds = selectedBeds();
    if (!beds.length) {
      formErr.textContent = '请先在时间轴拖选，或勾选要关闭的床位（需要关全部请勾「全部床位」）';
      return;
    }
    const r = BookingStore.setClosure({
      date: currentDate(),
      startTime: startTimeEl.value,
      endTime: endTimeEl.value,
      beds,
      reason: document.getElementById('reason').value.trim(),
    });
    if (!r.ok) {
      formErr.textContent = r.error;
      return;
    }
    rangeSelection = null;
    setBedChecks([], false);
    refresh();
  });

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-release]');
    if (!btn) return;
    BookingStore.releaseClosure(btn.getAttribute('data-release'));
    refresh();
  });

  document.getElementById('btnRefresh').addEventListener('click', refresh);
  dateInput.addEventListener('change', refresh);
  startTimeEl.addEventListener('change', () => {
    syncSelectionFromForm();
    refresh();
  });
  endTimeEl.addEventListener('change', () => {
    syncSelectionFromForm();
    refresh();
  });
  window.addEventListener('booking-store-changed', refresh);

  buildBedChecks();
  dateInput.value = BookingStore.todayBusinessDate();
  refresh();
})();
