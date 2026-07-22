(function (global) {
  const HOURS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1];
  const BEDS = ['1号床', '2号床', '3号床', '4号床', '5号床'];

  /** 每床按 30 分钟格：0=空 1=约 2=关 3=开床申请 */
  const MOCK = {
    0: { 4: 1, 5: 1 }, // 14:00-15:00 约
    1: { 12: 2, 13: 2 }, // 18:00-19:00 关 → 实际 18:00-18:30 两格里用一格半简化
    2: {},
    3: { 8: 3, 9: 3 }, // 开床申请示意
    4: {},
  };
  // 修正：18:00 = index 12 if start 12:00 with 30min slots
  // slots from 12:00: index = (h-12)*2 for h>=12, for 0,1 use after 23
  function slotIndex(h, m) {
    let minutes = h * 60 + m;
    const open = 12 * 60;
    if (minutes < open) minutes += 24 * 60;
    return Math.floor((minutes - open) / 30);
  }

  const STATE = {
    0: {},
    1: {},
    2: {},
    3: {},
    4: {},
  };
  // 2号床 14:00-15:00 预约
  STATE[1][slotIndex(14, 0)] = 1;
  STATE[1][slotIndex(14, 30)] = 1;
  // 2号床 18:00-18:30 关闭
  STATE[1][slotIndex(18, 0)] = 2;
  // 4号床 开床申请示意 16:00-17:00
  STATE[3][slotIndex(16, 0)] = 3;
  STATE[3][slotIndex(16, 30)] = 3;

  function toast(msg) {
    let el = document.getElementById('demoToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'demoToast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 1800);
  }

  function navHtml(active) {
    const items = [
      ['index.html', '总览'],
      ['a-form.html', 'A 表单'],
      ['b-tap.html', 'B 点选'],
      ['c-bed.html', 'C 按床'],
      ['d-dual.html', 'D 双视图'],
      ['e-dock.html', 'E 底栏'],
    ];
    return items
      .map(
        ([href, label]) =>
          `<a href="${href}" class="${active === href ? 'active' : ''}">${label}</a>`
      )
      .join('');
  }

  function slotCount() {
    return 14 * 2; // 12:00–02:00 = 14h
  }

  function slotLabel(i) {
    const open = 12 * 60;
    const total = open + i * 30;
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  global.MobileDemo = {
    HOURS,
    BEDS,
    STATE,
    slotIndex,
    slotCount,
    slotLabel,
    toast,
    navHtml,
  };
})(window);
