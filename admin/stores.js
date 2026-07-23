/**
 * 多门店注册表（功能测试 · 无真实后端）
 * 测试店：Relaxation Ruana、Starry Flow Spa、Luna spa 河原町店
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
      bedLabels: ['オイルルーム①', 'オイルルーム②', 'もみほぐし室', 'VIP包間', 'ペアルーム'],
      confirmGuestsThreshold: 2,
      courses: [
        { id: 'oil-60', name: 'オイルトリートメント 60分 / 精油护理 60分钟' },
        { id: 'oil-90', name: 'オイルトリートメント 90分 / 精油护理 90分钟' },
        { id: 'oil-120', name: 'オイルトリートメント 120分 / 精油护理 120分钟' },
        { id: 'momi-60', name: 'もみほぐし 60分 / 推拿放松 60分钟' },
        { id: 'momi-90', name: 'もみほぐし 90分 / 推拿放松 90分钟' },
        { id: 'head-30', name: 'ヘッドスパ 30分 / 头部水疗 30分钟' },
        { id: 'head-45', name: 'ヘッドスパ 45分 / 头部水疗 45分钟' },
        { id: 'foot-30', name: 'フットケア 30分 / 足部护理 30分钟' },
        { id: 'combo', name: 'コース组合 / 套餐组合' },
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
      /** 每日自动发给商家预约汇总的本地时间（可在客服端按店覆盖） */
      dailyEmailTime: '00:00',
      /** Google 日历：填 list-calendars 输出的 id；名称用于核对 */
      googleCalendarId: 'c1f6823fef64f0f87406ea7e337a7ff7b026e496f513d453ec97ba74edb62380@group.calendar.google.com',
      googleCalendarName: 'Ruana',
      /** 门店营业按日本时间；写入 Google 用此时区，保证「填 15:00 日历就显示 15:00」（与客服看日历习惯一致） */
      timeZone: 'Asia/Tokyo',
      googleWriteTimeZone: 'Asia/Shanghai',
      storageKey: 'booking-platform-runana-v1',
      /** 商家端识别码（测试用，非正式） */
      accessCode: 'RUANA88',
      technicians: [
        { id: 'ruana-a', code: 'R1', name: { jp: '佐藤', en: 'Sato', cn: '佐藤' } },
        { id: 'ruana-b', code: 'R2', name: { jp: '鈴木', en: 'Suzuki', cn: '铃木' } },
        { id: 'ruana-c', code: 'R3', name: { jp: '高橋', en: 'Takahashi', cn: '高桥' } },
        { id: 'ruana-d', code: 'R4', name: { jp: '伊藤', en: 'Ito', cn: '伊藤' } },
      ],
      techWorkKey: 'tech-work-runana-v1',
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
      bedLabels: ['スパルームA', 'スパルームB', 'リラクスルーム', 'VIPスイート', 'ミッドナイトルーム'],
      confirmGuestsThreshold: 2,
      courses: [
        { id: 'body-60', name: 'ボディマッサージ 60分 / 身体按摩 60分钟' },
        { id: 'body-90', name: 'ボディマッサージ 90分 / 身体按摩 90分钟' },
        { id: 'body-120', name: 'ボディマッサージ 120分 / 身体按摩 120分钟' },
        { id: 'oil-60', name: 'アロマオイル 60分 / 芳香精油 60分钟' },
        { id: 'oil-90', name: 'アロマオイル 90分 / 芳香精油 90分钟' },
        { id: 'oil-120', name: 'アロマオイル 120分 / 芳香精油 120分钟' },
        { id: 'spa-90', name: 'スパトリートメント 90分 / 水疗护理 90分钟' },
        { id: 'spa-120', name: 'スパトリートメント 120分 / 水疗护理 120分钟' },
        { id: 'relax-60', name: 'リラクゼーション 60分 / 放松护理 60分钟' },
        { id: 'head-30', name: 'ヘッドスパ 30分 / 头部水疗 30分钟' },
        { id: 'head-45', name: 'ヘッドスパ 45分 / 头部水疗 45分钟' },
        { id: 'foot-30', name: 'フットセラピー 30分 / 足部护理 30分钟' },
        { id: 'foot-45', name: 'フットセラピー 45分 / 足部护理 45分钟' },
        { id: 'head-shoulder', name: 'ヘッド＆ショルダー 45分 / 头肩护理 45分钟' },
        { id: 'pair-90', name: 'ペアコース 90分 / 双人套餐 90分钟' },
        { id: 'midnight-120', name: 'ミッドナイトスパ 120分 / 深夜水疗 120分钟' },
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
      dailyEmailTime: '00:00',
      googleCalendarId: '3d2196ef12eb39bff5295bf771a252e75ad6691e5253c65380e1be88cbfc5501@group.calendar.google.com',
      googleCalendarName: 'Starry Flow Spa',
      timeZone: 'Asia/Tokyo',
      googleWriteTimeZone: 'Asia/Shanghai',
      storageKey: 'booking-platform-starryflow-v1',
      accessCode: 'STARRY88',
      technicians: [
        { id: 'starry-a', code: 'S1', name: { jp: '山本', en: 'Yamamoto', cn: '山本' } },
        { id: 'starry-b', code: 'S2', name: { jp: '中村', en: 'Nakamura', cn: '中村' } },
        { id: 'starry-c', code: 'S3', name: { jp: '小林', en: 'Kobayashi', cn: '小林' } },
        { id: 'starry-d', code: 'S4', name: { jp: '加藤', en: 'Kato', cn: '加藤' } },
      ],
      techWorkKey: 'tech-work-starryflow-v1',
    },
    {
      storeId: 'luna',
      storeName: {
        jp: 'Luna spa 河原町店',
        en: 'Luna Spa Kawaramachi',
        cn: 'Luna spa 河原町店',
      },
      tagline: '京都 · 河原町 / 祇园（测试版）',
      address: '〒605-0079 京都府京都市東山区常盤町161-4 MIRAIGion ビル 4F',
      accent: '#8b6f5c',
      overnight: true,
      openHour: 11,
      openMinute: 0,
      closeHour: 0,
      closeMinute: 0,
      hoursLabel: '11:00 – 24:00',
      slotMinutes: 30,
      bedCount: 5,
      bedLabels: ['アロマ包間', 'ボディルーム', 'フットケア室', 'ヘッドスパ室', 'VIP包房'],
      confirmGuestsThreshold: 2,
      courses: [
        { id: 'aroma-lux', name: '芳香奢华 - ¥24,800' },
        { id: 'aroma-prem', name: '芳香尊享 - ¥20,800' },
        { id: 'body-head', name: '身体·头部 - ¥13,800' },
        { id: 'body-foot', name: '身体·足部 - ¥13,800' },
        { id: 'aroma-head', name: '芳香·头部 - ¥16,800' },
        { id: 'aroma-foot', name: '芳香·足部 - ¥16,800' },
        { id: 'momi-60', name: '按摩 60分钟 - ¥8,800' },
        { id: 'momi-90', name: '按摩 90分钟 - ¥12,800' },
        { id: 'momi-120', name: '按摩 120分钟 - ¥16,800' },
        { id: 'oil-60', name: '芳香精油疗法 60分钟 - ¥11,800' },
        { id: 'oil-90', name: '芳香精油疗法 90分钟 - ¥15,800' },
        { id: 'oil-120', name: '芳香精油疗法 120分钟 - ¥19,800' },
        { id: 'head-30', name: '头部水疗 30分钟 - ¥5,800' },
        { id: 'head-45', name: '头部水疗 45分钟 - ¥7,800' },
        { id: 'foot-30', name: '足部护理 30分钟 - ¥5,800' },
        { id: 'foot-45', name: '足部护理 45分钟 - ¥7,800' },
      ],
      channels: [
        { id: 'whatsapp', name: 'WhatsApp' },
        { id: 'phone', name: '电话' },
        { id: 'line', name: 'LINE' },
        { id: 'walkin', name: '到店/线下' },
        { id: 'other', name: '其他' },
      ],
      merchantEmail: '1161132533@qq.com',
      emailSubjectPrefix: '[Luna预约]',
      dailyEmailTime: '00:00',
      /** 测试版：可先共用测试日历，或稍后填专用日历 id */
      googleCalendarId: 'c044c1c886ecf3dafe902a5a1f240e5c7201e1e10effb99bd2ba07c4810f1d54@group.calendar.google.com',
      googleCalendarName: 'Luna（测试）',
      timeZone: 'Asia/Tokyo',
      googleWriteTimeZone: 'Asia/Shanghai',
      storageKey: 'booking-platform-luna-v1',
      accessCode: 'LUNA88',
      /** 官网（测试托管路径） */
      sitePath: '../shops/luna/landing.html',
      technicians: [
        { id: 'luna-a', code: 'L1', name: { jp: '美咲', en: 'Misaki', cn: '美咲' } },
        { id: 'luna-b', code: 'L2', name: { jp: '結衣', en: 'Yui', cn: '结衣' } },
        { id: 'luna-c', code: 'L3', name: { jp: '陽菜', en: 'Hina', cn: '阳菜' } },
        { id: 'luna-d', code: 'L4', name: { jp: '咲良', en: 'Sakura', cn: '咲良' } },
      ],
      techWorkKey: 'tech-work-luna-v1',
    },
  ];

  const SESSION_STORE = 'booking_platform_store';
  const SESSION_ROLE = 'booking_platform_role';
  const SESSION_TECH = 'booking_platform_tech';
  const RESOURCE_OVERRIDE_KEY = 'booking_platform_resource_overrides_v1';

  function readResourceOverrides() {
    try {
      return JSON.parse(localStorage.getItem(RESOURCE_OVERRIDE_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function getResourceOverride(storeId) {
    const all = readResourceOverrides();
    return all[storeId] || null;
  }

  function setResourceOverride(storeId, patch) {
    const all = readResourceOverrides();
    const prev = all[storeId] || {};
    const next = Object.assign({}, prev, patch || {});
    const base = STORES.find((s) => s.storeId === storeId);
    const count = Math.max(
      1,
      Math.min(20, Number(next.bedCount != null ? next.bedCount : (base && base.bedCount) || 1))
    );
    let labels = Array.isArray(next.bedLabels)
      ? next.bedLabels.map((x) => String(x || '').trim())
      : (base && base.bedLabels ? base.bedLabels.slice() : []);
    while (labels.length < count) labels.push(`资源${labels.length + 1}`);
    labels = labels.slice(0, count).map((name, i) => name || `资源${i + 1}`);

    let courses = Array.isArray(next.courses) ? next.courses : prev.courses;
    if (Array.isArray(courses)) {
      courses = courses
        .map((c, i) => {
          const name = String((c && c.name) || '').trim();
          if (!name) return null;
          const id =
            String((c && c.id) || '')
              .trim()
              .replace(/\s+/g, '-') || `course-${i + 1}`;
          return { id, name };
        })
        .filter(Boolean);
    }

    const saved = { bedCount: count, bedLabels: labels };
    if (courses) saved.courses = courses;
    all[storeId] = saved;
    localStorage.setItem(RESOURCE_OVERRIDE_KEY, JSON.stringify(all));
    return all[storeId];
  }

  function clearResourceOverride(storeId) {
    const all = readResourceOverrides();
    delete all[storeId];
    localStorage.setItem(RESOURCE_OVERRIDE_KEY, JSON.stringify(all));
  }

  function withResourceOverride(store) {
    if (!store) return null;
    const ov = getResourceOverride(store.storeId);
    if (!ov) return store;
    const merged = Object.assign({}, store, {
      bedCount: ov.bedCount != null ? ov.bedCount : store.bedCount,
      bedLabels: ov.bedLabels ? ov.bedLabels.slice() : store.bedLabels.slice(),
    });
    if (Array.isArray(ov.courses) && ov.courses.length) {
      merged.courses = ov.courses.map((c) => Object.assign({}, c));
    }
    return merged;
  }

  function listStores() {
    return STORES.map((s) => withResourceOverride(s));
  }

  function getStore(id) {
    return withResourceOverride(STORES.find((s) => s.storeId === id) || null);
  }

  function findByAccessCode(code) {
    const c = String(code || '')
      .trim()
      .toUpperCase();
    const raw = STORES.find((s) => s.accessCode.toUpperCase() === c) || null;
    return withResourceOverride(raw);
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

  function setTechnician(techId) {
    try {
      if (techId) sessionStorage.setItem(SESSION_TECH, techId);
      else sessionStorage.removeItem(SESSION_TECH);
    } catch (e) {}
  }

  function getTechnicianId() {
    try {
      return sessionStorage.getItem(SESSION_TECH) || '';
    } catch (e) {
      return '';
    }
  }

  function getTechnician() {
    const store = getStore(resolveStoreIdFromPage());
    if (!store) return null;
    const id = getTechnicianId();
    return (store.technicians || []).find((t) => t.id === id) || null;
  }

  function findTechnicianByCode(storeId, code) {
    const store = getStore(storeId);
    if (!store) return null;
    const c = String(code || '')
      .trim()
      .toUpperCase();
    return (store.technicians || []).find((t) => String(t.code).toUpperCase() === c) || null;
  }

  function clearSession() {
    try {
      sessionStorage.removeItem(SESSION_STORE);
      sessionStorage.removeItem(SESSION_ROLE);
      sessionStorage.removeItem(SESSION_TECH);
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
    getResourceOverride,
    setResourceOverride,
    clearResourceOverride,
    setTechnician,
    getTechnicianId,
    getTechnician,
    findTechnicianByCode,
  };
})(window);
