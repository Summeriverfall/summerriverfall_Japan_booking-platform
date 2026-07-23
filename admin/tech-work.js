/**
 * 技师工作记录（localStorage，按店隔离）
 */
(function (global) {
  function key() {
    const cfg = global.STORE_CONFIG;
    return (cfg && cfg.techWorkKey) || 'tech-work-default-v1';
  }

  function empty() {
    return { logs: [], meta: { updatedAt: null } };
  }

  function load() {
    try {
      const raw = localStorage.getItem(key());
      if (!raw) return empty();
      return Object.assign(empty(), JSON.parse(raw));
    } catch (e) {
      return empty();
    }
  }

  function save(state) {
    state.meta = state.meta || {};
    state.meta.updatedAt = new Date().toISOString();
    localStorage.setItem(key(), JSON.stringify(state));
    global.dispatchEvent(new CustomEvent('tech-work-changed', { detail: state }));
    return state;
  }

  function uid() {
    return `tw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function addLog(input) {
    const state = load();
    const log = {
      id: uid(),
      date: input.date,
      technicianId: input.technicianId,
      bedIndex: Number(input.bedIndex),
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes: Number(input.durationMinutes) || 60,
      courseId: input.courseId || '',
      courseName: input.courseName || '',
      note: input.note || '',
      createdAt: new Date().toISOString(),
    };
    state.logs.push(log);
    save(state);
    return { ok: true, log };
  }

  function removeLog(id) {
    const state = load();
    const i = state.logs.findIndex((x) => x.id === id);
    if (i < 0) return { ok: false, error: 'not found' };
    state.logs.splice(i, 1);
    save(state);
    return { ok: true };
  }

  function listByDate(dateStr) {
    return load()
      .logs.filter((l) => l.date === dateStr)
      .slice()
      .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
  }

  global.TechWorkStore = {
    load,
    save,
    addLog,
    removeLog,
    listByDate,
  };
})(window);
