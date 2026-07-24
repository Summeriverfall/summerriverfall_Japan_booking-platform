/**
 * 技师工作端：单页记工（技师名 + 资源 + 时间 + 项目）+ 顶部今日安排总览
 */
(function () {
  if (!StoreRegistry.requireStoreOrRedirect('tech-login.html')) return;
  if (StoreRegistry.getRole() !== 'technician') {
    location.replace('tech-login.html');
    return;
  }

  const cfg = STORE_CONFIG;
  const DURATIONS = [30, 45, 60, 90, 120];
  const techs = cfg.technicians || [];

  const state = {
    techId: StoreRegistry.getTechnicianId() || (techs[0] && techs[0].id) || null,
    bedIndex: null,
    startTime: null,
    duration: 60,
    logDate: BookingStore.todayBusinessDate(),
    boardDate: BookingStore.todayBusinessDate(),
    boardView: 'time',
  };

  if (state.techId) StoreRegistry.setTechnician(state.techId);

  const els = {
    pageTitle: document.getElementById('pageTitle'),
    pageSub: document.getElementById('pageSub'),
    langSwitch: document.getElementById('langSwitch'),
    btnLogout: document.getElementById('btnLogout'),
    pickSummary: document.getElementById('pickSummary'),
    techGrid: document.getElementById('techGrid'),
    resourceGrid: document.getElementById('resourceGrid'),
    startGrid: document.getElementById('startGrid'),
    durRow: document.getElementById('durRow'),
    courseGrid: document.getElementById('courseGrid'),
    courseHint: document.getElementById('courseHint'),
    dateInput: document.getElementById('dateInput'),
    boardRoot: document.getElementById('boardRoot'),
    dayCount: document.getElementById('dayCount'),
    toast: document.getElementById('toast'),
    viewFilter: document.getElementById('viewFilter'),
    btnRefresh: document.getElementById('btnRefresh'),
  };

  function selectedTech() {
    return techs.find((t) => t.id === state.techId) || null;
  }

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
    els.pageSub.textContent = storeName;
    document.title = TechI18n.t('portalTitle');
    renderAll();
  }

  function renderAll() {
    renderSummary();
    renderTechs();
    renderResources();
    renderTimes();
    renderDurations();
    renderCourses();
    renderBoard();
  }

  function renderSummary() {
    const parts = [];
    const tech = selectedTech();
    if (tech) parts.push(TechI18n.techName(tech));
    if (state.bedIndex != null) parts.push(resourceLabel(state.bedIndex));
    if (state.startTime) {
      const end = addMinutes(state.startTime, state.duration);
      parts.push(`${state.startTime}–${end}`);
    }
    els.pickSummary.textContent = parts.length
      ? parts.join('  ·  ')
      : TechI18n.t('portalSub');
  }

  function renderTechs() {
    els.techGrid.innerHTML = '';
    if (!techs.length) {
      const empty = document.createElement('p');
      empty.className = 'section-hint';
      empty.textContent = TechI18n.t('noTech');
      els.techGrid.appendChild(empty);
      return;
    }
    techs.forEach((tech) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tap-tile tap-tile--person' + (state.techId === tech.id ? ' is-on' : '');
      const code = tech.code ? `<span class="tap-code">${tech.code}</span>` : '';
      btn.innerHTML = `<span class="tap-name">${TechI18n.techName(tech)}</span>${code}`;
      btn.addEventListener('click', () => {
        state.techId = tech.id;
        StoreRegistry.setTechnician(tech.id);
        renderTechs();
        renderSummary();
      });
      els.techGrid.appendChild(btn);
    });
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
        renderResources();
        renderSummary();
      });
      els.resourceGrid.appendChild(btn);
    }
  }

  function renderTimes() {
    els.startGrid.innerHTML = '';
    startTimes().forEach((t) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tap-tile tap-tile--time' + (state.startTime === t ? ' is-on' : '');
      btn.textContent = t;
      btn.addEventListener('click', () => {
        state.startTime = t;
        renderTimes();
        renderSummary();
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
    if (!state.techId || state.bedIndex == null || !state.startTime) {
      showToast(TechI18n.t('needPick'));
      return;
    }
    const duration = guessDurationFromCourse(course) || state.duration || 60;
    state.duration = duration;
    const endTime = addMinutes(state.startTime, duration);
    const res = TechWorkStore.addLog({
      date: state.logDate || BookingStore.todayBusinessDate(),
      technicianId: state.techId,
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
      renderResources();
      renderTimes();
      renderDurations();
      renderSummary();
      renderBoard();
    }
  }

  function findTech(id) {
    return techs.find((t) => t.id === id) || null;
  }

  function dayLogs() {
    return TechWorkStore.listByDate(state.boardDate);
  }

  function renderBoard() {
    const logs = dayLogs();
    const unit = TechI18n.t('dayCount');
    els.dayCount.textContent = unit
      ? `${logs.length} ${unit}`
      : String(logs.length);
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
      wrap.className = 'time-list time-list--compact';
      logs.forEach((log) => wrap.appendChild(logCard(log, true)));
      els.boardRoot.appendChild(wrap);
      return;
    }

    const cols = document.createElement('div');
    cols.className = 'tech-columns';
    const list = techs.length ? techs : [];
    list.forEach((tech) => {
      const mine = logs.filter((l) => l.technicianId === tech.id);
      const col = document.createElement('div');
      col.className = 'tech-col' + (tech.id === state.techId ? ' is-me' : '');
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
    return el;
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

  els.dateInput.value = state.boardDate;
  els.dateInput.addEventListener('change', () => {
    state.boardDate = els.dateInput.value || BookingStore.todayBusinessDate();
    if (state.boardDate === BookingStore.todayBusinessDate()) {
      state.logDate = state.boardDate;
    }
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

  els.btnRefresh.addEventListener('click', () => renderBoard());
  window.addEventListener('tech-work-changed', () => renderBoard());

  applyI18n();
})();
