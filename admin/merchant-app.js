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

  function currentDate() {
    return dateInput.value || BookingStore.todayBusinessDate();
  }

  function buildBedChecks() {
    bedChecks.innerHTML = STORE_CONFIG.bedLabels
      .map(
        (name, i) =>
          `<label><input type="checkbox" value="${i}"> ${name}</label>`
      )
      .join('');
  }

  function selectedBeds() {
    const checked = [...bedChecks.querySelectorAll('input:checked')].map((x) =>
      Number(x.value)
    );
    return checked;
  }

  function refresh() {
    const date = currentDate();
    dateInput.value = date;
    BoardUI.renderBoard(boardEl, date);

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
            <div class="meta">${beds || '全部床'} · ${c.reason || ''} · ${c.id}</div>
            <div class="actions">
              <button class="btn" data-release="${c.id}">打开（释放）</button>
            </div>
          </div>`;
          })
          .join('')
      : '<div class="hint">当日暂无手动关闭</div>';
  }

  document.getElementById('btnClose').addEventListener('click', () => {
    formErr.textContent = '';
    const beds = selectedBeds();
    const r = BookingStore.setClosure({
      date: currentDate(),
      startTime: document.getElementById('startTime').value,
      endTime: document.getElementById('endTime').value,
      beds,
      reason: document.getElementById('reason').value.trim(),
    });
    if (!r.ok) {
      formErr.textContent = r.error;
      return;
    }
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
  window.addEventListener('booking-store-changed', refresh);

  buildBedChecks();
  dateInput.value = BookingStore.todayBusinessDate();
  refresh();
})();
