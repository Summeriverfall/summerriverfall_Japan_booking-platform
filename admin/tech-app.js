/**
 * 技师工作端：三步记工 + 当日安排
 */
(function () {
  if (!StoreRegistry.requireStoreOrRedirect('tech-login.html')) return;
  if (StoreRegistry.getRole() !== 'technician' || !StoreRegistry.getTechnician()) {
    location.replace('tech-login.html');
    return;
  }

  const cfg = STORE_CONFIG;
  const me = StoreRegistry.getTechnician();
  const DURATIONS = [30, 45, 60, 90, 120];

  const state = {
    step: 1,
    bedIndex: null,
    startTime: null,
    duration: 60,
    /** 记工始终写「当前营业日」；看板可另选日期回看 */
    logDate: BookingStore.todayBusinessDate(),
    boardDate: BookingStore.todayBusinessDate(),
    boardView: 'tech',
    boardScope: 'all',
  };

  const els = {
    pageTitle: document.getElementById('pageTitle'),
    pageSub: document.getElementById('pageSub'),
    langSwitch: document.getElementById('langSwitch'),
    btnLogout: document.getElementById('btnLogout'),
    tabLog: document.getElementById('tabLog'),
    tabBoard: document.getElementById('tabBoard'),
    panelLog: document.getElementById('panelLog'),
    panelBoard: document.getElementById('panelBoard'),
    stepBar: document.getElementById('stepBar'),
    pickSummary: document.getElementById('pickSummary'),
    step1: document.getElementById('step1'),
    step2: document.getElementById('step2'),
    step3: document.getElementById('step3'),
    resourceGrid: document.getElementById('resourceGrid'),
    startGrid: document.getElementById('startGrid'),
    durRow: document.getElementById('durRow'),
    courseGrid: document.getElementById('courseGrid'),
    dateInput: document.getElementById('dateInput'),
    boardRoot: document.getElementById('boardRoot'),
    toast: document.getElementById('toast'),
    viewFilter: document.getElementById('viewFilter'),
    scopeFilter: document.getElementById('scopeFilter'),
    btnRefresh: document.getElementById('btnRefresh'),
  };

  function resourceLabel(i) {
    if (window.DeskI18n && DeskI18n.bedLabelAt) return DeskI18n.bedLabelAt(i);
    const labels = cfg.bedLabels || [];
    const raw = labels[i];
    if (raw && typeof raw === 'object') return raw.jp || raw.cn || raw.en || `R${i + 1}`;
    return raw || `R${i + 1}`;
  }

  function addMinutes(hhmm, minutes) {
    const [h, m] = hhmm.split(':').map(Number);
    let total = h * 60 + m + minutes;
    total = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
    const nh = Math.floor(total / 60);
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  }

  function startTimes() {
    const snap = cfg.slotMinutes || 30;
    const span = BookingStore.businessSpanMinutes();
    const list = [];
    for (let off = 0; off < span; off += snap) {
      list.push(BookingStore.offsetToTime(off));
    }
    return list;
  }

  function guessDurationFromCourse(course) {
    const raw = String((course && course.name) || '');
    const m = raw.match(/(\d+)\s*(分|分钟|min)/i);
    if (m) {
      const n = Number(m[1]);
      if (DURATIONS.includes(n)) return n;
      if (n > 0 && n <= 180) return n;
    }
    return state.duration || 60;
  }

  function applyI18n() {
    const lang = TechI18n.getLang();
    document.documentElement.lang = lang === 'jp' ? 'ja' : lang === 'cn' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = TechI18n.t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('#langSwitch button').forEach((btn) => {
      btn.classList.toggle('is-on', btn.dataset.lang === lang);
    });
    const storeName =
      (cfg.storeName && (cfg.storeName[lang] || cfg.storeName.jp || cfg.storeName.cn)) ||
      cfg.storeId;
    els.pageTitle.textContent = TechI18n.t('portalTitle');
    els.pageSub.textContent = `${storeName} · ${TechI18n.techName(me)}`;
    document.title = TechI18n.t('portalTitle');
    renderSummary();
    renderResources();
    renderTimes();
    renderDurations();
    renderCourses();
    renderBoard();
  }

  function renderSummary() {
    const parts = [];
    if (state.bedIndex != null) parts.push(resourceLabel(state.bedIndex));
    if (state.startTime) {
      const end = addMinutes(state.startTime, state.duration);
      parts.push(`${state.startTime}–${end}`);
    }
    els.pickSummary.textContent = parts.length
      ? parts.join('  ·  ')
      : TechI18n.t('portalSub');
  }

  function setStep(n) {
    state.step = n;
    els.step1.hidden = n !== 1;
    els.step2.hidden = n !== 2;
    els.step3.hidden = n !== 3;
    els.stepBar.querySelectorAll('.step-pill').forEach((pill) => {
      const s = Number(pill.dataset.step);
      pill.classList.toggle('is-active', s === n);
      pill.classList.toggle('is-done', s < n);
    });
    renderSummary();
  }

  function renderResources() {
    const count = cfg.bedCount || (cfg.bedLabels && cfg.bedLabels.length) || 0;
    els.resourceGrid.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tap-tile' + (state.bedIndex === i ? ' is-on' : '');
      btn.textContent = resourceLabel(i);
      btn.addEventListener('click', () => {
        state.bedIndex = i;
        setStep(2);
        renderResources();
        renderTimes();
      });
      els.resourceGrid.appendChild(btn);
    }
  }

  function renderTimes() {
    els.startGrid.innerHTML = '';
    startTimes().forEach((t) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tap-tile' + (state.startTime === t ? ' is-on' : '');
      btn.textContent = t;
      btn.addEventListener('click', () => {
        state.startTime = t;
        renderTimes();
        renderSummary();
        if (state.duration) setStep(3);
      });
      els.startGrid.appendChild(btn);
    });
  }

  function renderDurations() {
    els.durRow.innerHTML = '';
    DURATIONS.forEach((d) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dur-chip' + (state.duration === d ? ' is-on' : '');
      btn.textContent = `${d}${TechI18n.t('min')}`;
      btn.addEventListener('click', () => {
        state.duration = d;
        renderDurations();
        renderSummary();
        if (state.startTime) setStep(3);
      });
      els.durRow.appendChild(btn);
    });
  }

  function renderCourses() {
    els.courseGrid.innerHTML = '';
    (cfg.courses || []).forEach((course) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'course-tile';
      btn.textContent = TechI18n.courseLabel(course);
      btn.addEventListener('click', () => saveLog(course));
      els.courseGrid.appendChild(btn);
    });
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('is-show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove('is-show'), 2200);
  }

  function saveLog(course) {
    if (state.bedIndex == null || !state.startTime) {
      setStep(state.bedIndex == null ? 1 : 2);
      return;
    }
    const duration = guessDurationFromCourse(course) || state.duration || 60;
    state.duration = duration;
    const endTime = addMinutes(state.startTime, duration);
    const res = TechWorkStore.addLog({
      date: state.logDate || BookingStore.todayBusinessDate(),
      technicianId: me.id,
      bedIndex: state.bedIndex,
      startTime: state.startTime,
      endTime,
      durationMinutes: duration,
      courseId: course.id,
      courseName: course.name,
    });
    if (res.ok) {
      showToast(TechI18n.t('saved'));
      state.bedIndex = null;
      state.startTime = null;
      state.duration = 60;
      setStep(1);
      renderResources();
      renderTimes();
      renderDurations();
      if (els.panelBoard.classList.contains('is-on')) renderBoard();
    }
  }

  function findTech(id) {
    return (cfg.technicians || []).find((t) => t.id === id) || null;
  }

  function filteredLogs() {
    let logs = TechWorkStore.listByDate(state.boardDate);
    if (state.boardScope === 'me') {
      logs = logs.filter((l) => l.technicianId === me.id);
    }
    return logs;
  }

  function renderBoard() {
    const logs = filteredLogs();
    els.boardRoot.innerHTML = '';
    if (!logs.length) {
      const empty = document.createElement('div');
      empty.className = 'day-empty';
      empty.textContent = TechI18n.t('emptyDay');
      els.boardRoot.appendChild(empty);
      return;
    }

    if (state.boardView === 'time') {
      const wrap = document.createElement('div');
      wrap.className = 'time-list';
      logs.forEach((log) => wrap.appendChild(logCard(log, true)));
      els.boardRoot.appendChild(wrap);
      return;
    }

    const techs =
      state.boardScope === 'me'
        ? [me]
        : cfg.technicians && cfg.technicians.length
          ? cfg.technicians
          : [me];
    const cols = document.createElement('div');
    cols.className = 'tech-columns';
    techs.forEach((tech) => {
      const mine = logs.filter((l) => l.technicianId === tech.id);
      const col = document.createElement('div');
      col.className = 'tech-col' + (tech.id === me.id ? ' is-me' : '');
      col.innerHTML = `<h3><span>${TechI18n.techName(tech)}</span><span class="count">${mine.length}</span></h3>`;
      if (!mine.length) {
        const p = document.createElement('p');
        p.className = 'section-hint';
        p.textContent = '—';
        col.appendChild(p);
      } else {
        mine.forEach((log) => col.appendChild(logCard(log, false)));
      }
      cols.appendChild(col);
    });
    els.boardRoot.appendChild(cols);
  }

  function logCard(log, showTech) {
    const el = document.createElement('div');
    el.className = 'log-card';
    const tech = findTech(log.technicianId);
    const course =
      (cfg.courses || []).find((c) => c.id === log.courseId) || {
        name: log.courseName,
      };
    const when = `${log.startTime}–${log.endTime}`;
    const where = resourceLabel(log.bedIndex);
    let html = `<div><div class="when">${when}</div>`;
    if (showTech) {
      html += `<div class="meta">${TechI18n.techName(tech) || log.technicianId} · ${where}</div>`;
    } else {
      html += `<div class="meta">${where}</div>`;
    }
    html += `<div>${TechI18n.courseLabel(course) || log.courseName || ''}</div></div>`;
    el.innerHTML = html;
    if (log.technicianId === me.id) {
      const actions = document.createElement('div');
      actions.className = 'row-actions';
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn-del';
      del.textContent = TechI18n.t('delete');
      del.addEventListener('click', () => {
        if (!confirm(TechI18n.t('confirmDelete'))) return;
        TechWorkStore.removeLog(log.id);
        renderBoard();
      });
      actions.appendChild(del);
      el.appendChild(actions);
    }
    return el;
  }

  function showTab(name) {
    const isLog = name === 'log';
    els.tabLog.classList.toggle('is-on', isLog);
    els.tabBoard.classList.toggle('is-on', !isLog);
    els.panelLog.classList.toggle('is-on', isLog);
    els.panelBoard.classList.toggle('is-on', !isLog);
    if (!isLog) renderBoard();
  }

  els.langSwitch.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-lang]');
    if (!btn) return;
    TechI18n.setLang(btn.dataset.lang);
    applyI18n();
  });

  els.btnLogout.addEventListener('click', () => {
    StoreRegistry.setTechnician(null);
    StoreRegistry.setRole('');
    location.href = 'tech-login.html';
  });

  els.tabLog.addEventListener('click', () => showTab('log'));
  els.tabBoard.addEventListener('click', () => showTab('board'));

  els.stepBar.addEventListener('click', (e) => {
    const pill = e.target.closest('.step-pill');
    if (!pill) return;
    const s = Number(pill.dataset.step);
    if (s === 1) setStep(1);
    else if (s === 2 && state.bedIndex != null) setStep(2);
    else if (s === 3 && state.bedIndex != null && state.startTime) setStep(3);
  });

  els.dateInput.value = state.boardDate;
  els.dateInput.addEventListener('change', () => {
    state.boardDate = els.dateInput.value || BookingStore.todayBusinessDate();
    renderBoard();
  });

  els.viewFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-view]');
    if (!btn) return;
    state.boardView = btn.dataset.view;
    els.viewFilter.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('is-on', b === btn);
    });
    renderBoard();
  });

  els.scopeFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-scope]');
    if (!btn) return;
    state.boardScope = btn.dataset.scope;
    els.scopeFilter.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('is-on', b === btn);
    });
    renderBoard();
  });

  els.btnRefresh.addEventListener('click', () => renderBoard());
  window.addEventListener('tech-work-changed', () => {
    if (els.panelBoard.classList.contains('is-on')) renderBoard();
  });

  if (!(cfg.technicians || []).length) {
    els.pageSub.textContent = TechI18n.t('noTech');
  }

  setStep(1);
  applyI18n();
})();
