/**
 * 多门店注册表（功能测试 · 无真实后端）
 * 测试店：Relaxation Ruana、Starry Flow Spa
 */
(function (global) {
  const STORES = [
    {
      storeId: 'runana',
      storeName: {
        jp: 'Relaxation Ruana',
        en: 'Relaxation Ruana',
        cn: 'Relaxation Ruana',
      },
      tagline: '京都 · 四条烏丸',
      address: '京都市中京区阪東屋町664-25 西ビル303',
      accent: '#c8956c',
      overnight: false,
      openHour: 11,
      openMinute: 0,
      closeHour: 21,
      closeMinute: 30,
      hoursLabel: '11:00 – 21:30',
      slotMinutes: 30,
      bedCount: 5,
      bedLabels: ['1号床', '2号床', '3号床', '4号床', '5号床'],
      confirmGuestsThreshold: 2,
      courses: [
        { id: 'oil', name: 'オイルトリートメント / 精油护理' },
        { id: 'momi', name: 'もみほぐし / 推拿放松' },
        { id: 'combo', name: 'コース组合' },
      ],
      channels: [
        { id: 'whatsapp', name: 'WhatsApp' },
        { id: 'phone', name: '电话' },
        { id: 'line', name: 'LINE' },
        { id: 'walkin', name: '到店/线下' },
        { id: 'other', name: '其他' },
      ],
      merchantEmail: '1161132533@qq.com',
      emailSubjectPrefix: '[Ruana预约]',
      /** Google 日历：填 list-calendars 输出的 id；名称用于核对 */
      googleCalendarId: '',
      googleCalendarName: 'Ruana',
      timeZone: 'Asia/Tokyo',
      storageKey: 'booking-platform-runana-v1',
      /** 商家端识别码（测试用，非正式） */
      accessCode: 'RUANA88',
    },
    {
      storeId: 'starryflow',
      storeName: {
        jp: 'Starry Flow Spa',
        en: 'Starry Flow Spa',
        cn: 'Starry Flow Spa',
      },
      tagline: '京都 · 河原町四条',
      address: '京都市下京区河原町通四条下る順風町312-1 アスター河原町ビル5F',
      accent: '#2c3e50',
      overnight: true,
      openHour: 12,
      openMinute: 0,
      closeHour: 2,
      closeMinute: 0,
      hoursLabel: '12:00 – 次日 02:00',
      slotMinutes: 30,
      bedCount: 5,
      bedLabels: ['1号床', '2号床', '3号床', '4号床', '5号床'],
      confirmGuestsThreshold: 2,
      courses: [
        { id: 'body', name: 'ボディマッサージ / 身体按摩' },
        { id: 'spa', name: 'スパトリートメント / 水疗护理' },
        { id: 'relax', name: 'リラクゼーション / 放松护理' },
      ],
      channels: [
        { id: 'whatsapp', name: 'WhatsApp' },
        { id: 'phone', name: '电话' },
        { id: 'line', name: 'LINE' },
        { id: 'walkin', name: '到店/线下' },
        { id: 'other', name: '其他' },
      ],
      merchantEmail: '1161132533@qq.com',
      emailSubjectPrefix: '[Starry Flow预约]',
      googleCalendarId: '',
      googleCalendarName: 'Starry Flow Spa',
      timeZone: 'Asia/Tokyo',
      storageKey: 'booking-platform-starryflow-v1',
      accessCode: 'STARRY88',
    },
  ];

  const SESSION_STORE = 'booking_platform_store';
  const SESSION_ROLE = 'booking_platform_role';

  function listStores() {
    return STORES.slice();
  }

  function getStore(id) {
    return STORES.find((s) => s.storeId === id) || null;
  }

  function findByAccessCode(code) {
    const c = String(code || '')
      .trim()
      .toUpperCase();
    return STORES.find((s) => s.accessCode.toUpperCase() === c) || null;
  }

  function applyStore(id) {
    const store = getStore(id);
    if (!store) return false;
    global.STORE_CONFIG = store;
    try {
      sessionStorage.setItem(SESSION_STORE, store.storeId);
    } catch (e) {}
    return true;
  }

  function resolveStoreIdFromPage() {
    const params = new URLSearchParams(location.search);
    const q = params.get('store');
    if (q && getStore(q)) return q;
    try {
      const s = sessionStorage.getItem(SESSION_STORE);
      if (s && getStore(s)) return s;
    } catch (e) {}
    return null;
  }

  function requireStoreOrRedirect(fallbackHtml) {
    const id = resolveStoreIdFromPage();
    if (!id || !applyStore(id)) {
      location.replace(fallbackHtml || 'admin-portal.html');
      return false;
    }
    return true;
  }

  function setRole(role) {
    try {
      sessionStorage.setItem(SESSION_ROLE, role);
    } catch (e) {}
  }

  function getRole() {
    try {
      return sessionStorage.getItem(SESSION_ROLE) || '';
    } catch (e) {
      return '';
    }
  }

  function clearSession() {
    try {
      sessionStorage.removeItem(SESSION_STORE);
      sessionStorage.removeItem(SESSION_ROLE);
    } catch (e) {}
  }

  global.StoreRegistry = {
    listStores,
    getStore,
    findByAccessCode,
    applyStore,
    resolveStoreIdFromPage,
    requireStoreOrRedirect,
    setRole,
    getRole,
    clearSession,
  };
})(window);
