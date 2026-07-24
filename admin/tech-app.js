/**
 * 技师工作端：技师 + 项目 + 时间表点选 + 提交保存
 */
(function () {
  if (!StoreRegistry.requireStoreOrRedirect('tech-login.html')) return;
  if (StoreRegistry.getRole() !== 'technician') {
    location.replace('tech-login.html');
    return;
  }

  const cfg = STORE_CONFIG;
  const techs = cfg.technicians || [];
  const courses = cfg.courses || [];
  const snap = cfg.slotMinutes || 30;

  const state = {
    techId: StoreRegistry.getTechnicianId() || (techs[0] && techs[0].id) || null,
    courseId: null,
    bedIndex: null,
    startOffset: null,
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
    courseGrid: document.getElementById('courseGrid'),
    slotBoard: document.getElementById('slotBoard'),
    dateInput: document.getElementById('dateInput'),
    boardRoot: document.getElementById('boardRoot'),
    dayCount: document.getElementById('dayCount'),
    toast: document.getElementById('toast'),
    viewFilter: document.getElementById('viewFilter'),
    btnRefresh: document.getElementById('btnRefresh'),
    btnSubmit: document.getElementById('btnSubmit'),
    btnClear: document.getElementById('btnClear'),
  };

  function selectedTech() {
    return techs.find((t) => t.id === state.techId) || null;
  }

  function selectedCourse() {
    return courses.find((c) => c.id === state.courseId) || null;
  }

  function resourceLabel(i) {
    if (window.DeskI18n && DeskI18n.bedLabelAt) return DeskI18n.bedLabelAt(i);
    const labels = cfg.bedLabels || [];
    const raw = labels[i];
    if (raw && typeof raw === 'object') {
      const lang = TechI18n.getLang();
      return raw[lang] || raw.jp || raw.cn || raw.en || `R${i + 1}`;
    }
    return raw || `R${i + 1}`;
  }

  function bedCount() {
    return cfg.bedCount || (cfg.bedLabels && cfg.bedLabels.length) || 0;
  }

  function spanMinutes() {
    return BookingStore.businessSpanMinutes();
  }

  function offsetToTime(off) {
    return BookingStore.offsetToTime(off);
  }

  function timeToOffset(hhmm) {
    if (typeof BookingStore.timeToOffset === 'function') {
      return BookingStore.timeToOffset(hhmm);
    }
    const [h, m] = String(hhmm).split(':').map(Number);
    const open = (cfg.openHour || 0) * 60 + (cfg.openMinute || 0);
    let t = h * 60 + m;
    if (cfg.overnight && t < open) t += 24 * 60;
    return t - open;
  }

  function addMinutes(hhmm, minutes) {
    const [h, m] = hhmm.split(':').map(Number);
    let total = h * 60 + m + minutes;
    total = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function courseDuration(course) {
    if (course && Number(course.durationMinutes) > 0) return Number(course.durationMinutes);
    const raw = TechI18n.courseLabel(course) || '';
    const m = String(raw).match(/(\d+)\s*(分|分钟|min)/i);
    if (m) {
      const n = Number(m[1]);
      if (n > 0 && n <= 240) return n;
    }
    return state.duration || 60;
  }

  function selectionEndOffset() {
    if (state.startOffset == null) return null;
    const span = spanMinutes();
    // 未选项目时只标开始格；选了项目才按项目时长拉长
    const dur = state.courseId ? state.duration || snap : snap;
    return Math.min(span, state.startOffset + dur);
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
    renderCourses();
    renderSlotBoard();
    renderDayList();
  }

  function renderSummary() {
    const parts = [];
    const tech = selectedTech();
    const course = selectedCourse();
    if (tech) parts.push(TechI18n.techName(tech));
    if (course) {
      parts.push(`${TechI18n.courseLabel(course)}（${state.duration}${TechI18n.t('min')}）`);
    }
    if (state.bedIndex != null && state.startOffset != null) {
      const start = offsetToTime(state.startOffset);
      const end = offsetToTime(selectionEndOffset());
      parts.push(`${resourceLabel(state.bedIndex)} ${start}–${end}`);
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
        renderSlotBoard();
      });
      els.techGrid.appendChild(btn);
    });
  }

  function renderCourses() {
    els.courseGrid.innerHTML = '';
    courses.forEach((course) => {
      const dur = courseDuration(course);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'course-tile' + (state.courseId === course.id ? ' is-on' : '');
      btn.innerHTML = `<span class="course-name">${TechI18n.courseLabel(course)}</span><span class="course-dur">${dur}${TechI18n.t('min')}</span>`;
      btn.addEventListener('click', () => {
        state.courseId = course.id;
        state.duration = dur;
        // 若已在表上选了开始位置，自动更新该段时长
        if (state.startOffset != null) {
          const span = spanMinutes();
          if (state.startOffset + state.duration > span) {
            state.startOffset = Math.max(0, span - state.duration);
            state.startOffset = Math.floor(state.startOffset / snap) * snap;
          }
        }
        renderCourses();
        renderSummary();
        renderSlotBoard();
      });
      els.courseGrid.appendChild(btn);
    });
  }

  function hourSlots() {
    const span = spanMinutes();
    const list = [];
    for (let off = 0; off < span; off += 60) {
      const dur = Math.min(60, span - off);
      list.push({
        hour: Number(offsetToTime(off).slice(0, 2)),
        startOffset: off,
        duration: dur,
        widthPct: (dur / span) * 100,
      });
    }
    return list;
  }

  function renderSlotBoard() {
    const span = spanMinutes();
    const count = bedCount();
    const logs = TechWorkStore.listByDate(state.boardDate);
    const hours = hourSlots();

    els.slotBoard.innerHTML = '';
    const board = document.createElement('div');
    board.className = 'tech-board';

    const head = document.createElement('div');
    head.className = 'tech-board-head';
    head.innerHTML = `<div class="tech-board-corner">${TechI18n.t('resourceCol')}</div><div class="tech-board-hours"></div>`;
    const hoursEl = head.querySelector('.tech-board-hours');
    hours.forEach((slot) => {
      const cell = document.createElement('div');
      cell.className = 'tech-board-hour';
      cell.style.flex = `0 0 ${slot.widthPct}%`;
      cell.textContent = String(slot.hour).padStart(2, '0');
      hoursEl.appendChild(cell);
    });
    board.appendChild(head);

    for (let bed = 0; bed < count; bed++) {
      const row = document.createElement('div');
      row.className = 'tech-board-row';
      row.innerHTML = `<div class="tech-board-label">${resourceLabel(bed)}</div><div class="tech-board-track" data-bed="${bed}"></div>`;
      const track = row.querySelector('.tech-board-track');

      // slot cells for click targets
      for (let off = 0; off < span; off += snap) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'tech-board-cell';
        cell.style.left = `${(off / span) * 100}%`;
        cell.style.width = `${(snap / span) * 100}%`;
        cell.dataset.offset = String(off);
        cell.title = offsetToTime(off);
        cell.addEventListener('click', () => {
          state.bedIndex = bed;
          state.startOffset = off;
          if (state.courseId) {
            state.duration = courseDuration(selectedCourse());
            if (off + state.duration > span) {
              state.startOffset = Math.max(0, Math.floor((span - state.duration) / snap) * snap);
            }
          }
          renderSummary();
          renderSlotBoard();
        });
        track.appendChild(cell);
      }

      // existing logs on this bed
      logs
        .filter((l) => Number(l.bedIndex) === bed)
        .forEach((log) => {
          const startOff = timeToOffset(log.startTime);
          const dur = Number(log.durationMinutes) || Math.max(snap, timeToOffset(log.endTime) - startOff);
          const block = document.createElement('div');
          block.className = 'tech-board-block';
          block.style.left = `${(startOff / span) * 100}%`;
          block.style.width = `${(Math.min(dur, span - startOff) / span) * 100}%`;
          const tech = techs.find((t) => t.id === log.technicianId);
          const course =
            courses.find((c) => c.id === log.courseId) || { name: log.courseName };
          block.innerHTML = `<strong>${log.startTime}</strong> ${TechI18n.techName(tech) || ''}<br>${TechI18n.courseLabel(course) || (typeof log.courseName === 'string' ? log.courseName : '')}`;
          block.title = `${TechI18n.techName(tech)} · ${TechI18n.courseLabel(course)}`;
          track.appendChild(block);
        });

      // current selection
      if (state.bedIndex === bed && state.startOffset != null) {
        const endOff = selectionEndOffset();
        const sel = document.createElement('div');
        sel.className = 'tech-board-selection';
        sel.style.left = `${(state.startOffset / span) * 100}%`;
        sel.style.width = `${(((endOff - state.startOffset) / span) * 100)}%`;
        const start = offsetToTime(state.startOffset);
        const end = offsetToTime(endOff);
        sel.textContent = `${start}–${end}`;
        track.appendChild(sel);
      }

      board.appendChild(row);
    }

    els.slotBoard.appendChild(board);
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('is-show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove('is-show'), 2200);
  }

  function clearPick(keepTech) {
    if (!keepTech) {
      /* keep tech as convenience */
    }
    state.courseId = null;
    state.bedIndex = null;
    state.startOffset = null;
    state.duration = 60;
    renderAll();
  }

  function submitLog() {
    const course = selectedCourse();
    if (!state.techId || !course || state.bedIndex == null || state.startOffset == null) {
      showToast(TechI18n.t('needPick'));
      return;
    }
    const duration = courseDuration(course);
    state.duration = duration;
    const startTime = offsetToTime(state.startOffset);
    const endTime = addMinutes(startTime, duration);
    const res = TechWorkStore.addLog({
      date: state.boardDate || BookingStore.todayBusinessDate(),
      technicianId: state.techId,
      bedIndex: state.bedIndex,
      startTime,
      endTime,
      durationMinutes: duration,
      courseId: course.id,
      courseName: TechI18n.courseLabel(course),
    });
    if (res.ok) {
      showToast(TechI18n.t('saved'));
      state.courseId = null;
      state.bedIndex = null;
      state.startOffset = null;
      state.duration = 60;
      renderAll();
    }
  }

  function findTech(id) {
    return techs.find((t) => t.id === id) || null;
  }

  function dayLogs() {
    return TechWorkStore.listByDate(state.boardDate);
  }

  function renderDayList() {
    const logs = dayLogs();
    const unit = TechI18n.t('dayCount');
    els.dayCount.textContent = unit ? `${logs.length} ${unit}` : String(logs.length);
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
    techs.forEach((tech) => {
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
      courses.find((c) => c.id === log.courseId) || { name: log.courseName };
    const when = `${log.startTime}–${log.endTime}`;
    const where = resourceLabel(log.bedIndex);
    const courseText =
      TechI18n.courseLabel(course) ||
      (log.courseName && typeof log.courseName === 'object'
        ? TechI18n.courseLabel({ name: log.courseName })
        : String(log.courseName || ''));
    let html = `<div><div class="when">${when}</div>`;
    if (showTech) {
      html += `<div class="meta">${TechI18n.techName(tech) || log.technicianId} · ${where}</div>`;
    } else {
      html += `<div class="meta">${where}</div>`;
    }
    html += `<div>${courseText}</div></div>`;
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
      renderDayList();
      renderSlotBoard();
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
    state.logDate = state.boardDate;
    renderDayList();
    renderSlotBoard();
  });

  els.viewFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-view]');
    if (!btn) return;
    state.boardView = btn.dataset.view;
    els.viewFilter.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('is-on', b === btn);
    });
    renderDayList();
  });

  els.btnRefresh.addEventListener('click', () => {
    renderDayList();
    renderSlotBoard();
  });
  els.btnSubmit.addEventListener('click', submitLog);
  els.btnClear.addEventListener('click', () => clearPick(true));
  window.addEventListener('tech-work-changed', () => {
    renderDayList();
    renderSlotBoard();
  });

  applyI18n();
})();
