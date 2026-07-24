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
      bedLabels: [
        { jp: 'オイルルーム①', cn: '精油房①', en: 'Oil room 1' },
        { jp: 'オイルルーム②', cn: '精油房②', en: 'Oil room 2' },
        { jp: 'もみほぐし室', cn: '推拿室', en: 'Massage room' },
        { jp: 'VIP包間', cn: 'VIP包间', en: 'VIP room' },
        { jp: 'ペアルーム', cn: '双人房', en: 'Pair room' },
      ],
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
      bedLabels: [
        { jp: 'スパルームA', cn: '水疗室A', en: 'Spa room A' },
        { jp: 'スパルームB', cn: '水疗室B', en: 'Spa room B' },
        { jp: 'リラクスルーム', cn: '放松室', en: 'Relax room' },
        { jp: 'VIPスイート', cn: 'VIP套房', en: 'VIP suite' },
        { jp: 'ミッドナイトルーム', cn: '深夜房', en: 'Midnight room' },
      ],
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
      bedLabels: [
        { jp: 'アロマ包間', cn: '芳香包间', en: 'Aroma private room' },
        { jp: 'ボディルーム', cn: '身体护理室', en: 'Body room' },
        { jp: 'フットケア室', cn: '足部护理室', en: 'Foot care room' },
        { jp: 'ヘッドスパ室', cn: '头部水疗室', en: 'Head spa room' },
        { jp: 'VIP包房', cn: 'VIP包房', en: 'VIP suite' },
      ],
      confirmGuestsThreshold: 2,
      /** 对照 d:/Work/Project/luna 官网价目校准 */
      courses: [
        { id: 'foot-30', durationMinutes: 30, price: 4800, name: { jp: '足リフレクソロジー 30分', cn: '足部反射疗法 30分钟', en: 'Foot Reflexology 30 min' } },
        { id: 'foot-45', durationMinutes: 45, price: 5800, name: { jp: '足リフレクソロジー 45分', cn: '足部反射疗法 45分钟', en: 'Foot Reflexology 45 min' } },
        { id: 'body-60', durationMinutes: 60, price: 7800, name: { jp: '全身もみほぐし 60分', cn: '全身按摩 60分钟', en: 'Full Body Massage 60 min' } },
        { id: 'body-90', durationMinutes: 90, price: 11800, name: { jp: '全身もみほぐし 90分', cn: '全身按摩 90分钟', en: 'Full Body Massage 90 min' } },
        { id: 'body-120', durationMinutes: 120, price: 14800, name: { jp: '全身もみほぐし 120分', cn: '全身按摩 120分钟', en: 'Full Body Massage 120 min' } },
        { id: 'body-150', durationMinutes: 150, price: 17800, name: { jp: '全身もみほぐし 150分', cn: '全身按摩 150分钟', en: 'Full Body Massage 150 min' } },
        { id: 'lymph-60', durationMinutes: 60, price: 10800, name: { jp: '全身リンパトリートメント 60分', cn: '全身精油淋巴疗法 60分钟', en: 'Full-Body Essential Oil Lymphatic Therapy 60 min' } },
        { id: 'lymph-90', durationMinutes: 90, price: 13800, name: { jp: '全身リンパトリートメント 90分', cn: '全身精油淋巴疗法 90分钟', en: 'Full-Body Essential Oil Lymphatic Therapy 90 min' } },
        { id: 'lymph-120', durationMinutes: 120, price: 16800, name: { jp: '全身リンパトリートメント 120分', cn: '全身精油淋巴疗法 120分钟', en: 'Full-Body Essential Oil Lymphatic Therapy 120 min' } },
        { id: 'lymph-150', durationMinutes: 150, price: 19800, name: { jp: '全身リンパトリートメント 150分', cn: '全身精油淋巴疗法 150分钟', en: 'Full-Body Essential Oil Lymphatic Therapy 150 min' } },
        { id: 'head-45', durationMinutes: 45, price: 6800, name: { jp: 'ドライヘッドスパ 45分', cn: '头部放松项目 45分钟', en: 'Dry Head Spa 45 min' } },
        { id: 'head-60', durationMinutes: 60, price: 7800, name: { jp: 'ドライヘッドスパ 60分', cn: '头部放松项目 60分钟', en: 'Dry Head Spa 60 min' } },
        { id: 'leg-60', durationMinutes: 60, price: 10800, name: { jp: '足集中ケア 60分', cn: '足部集中护理 60分钟', en: 'Focused Leg Care 60 min' } },
        { id: 'recovery1', durationMinutes: 120, price: 16300, name: { jp: '疲労回復コース① 120分', cn: '疲劳恢复课程1 120分钟', en: 'Fatigue Recovery Course 1 120 min' } },
        { id: 'recovery2', durationMinutes: 120, price: 18300, name: { jp: '疲労回復コース② 120分', cn: '疲劳恢复课程2 120分钟', en: 'Fatigue Recovery Course 2 120 min' } },
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

  function normalizeBedLabel(raw, index) {
    if (raw && typeof raw === 'object') {
      const jp = String(raw.jp || raw.cn || raw.en || '').trim();
      if (!jp && !raw.cn && !raw.en) {
        return { jp: `资源${(index || 0) + 1}`, cn: `资源${(index || 0) + 1}`, en: `Resource ${(index || 0) + 1}` };
      }
      return {
        jp: String(raw.jp || jp).trim(),
        cn: String(raw.cn || raw.jp || jp).trim(),
        en: String(raw.en || raw.jp || jp).trim(),
      };
    }
    const s = String(raw || '').trim();
    if (!s) {
      return { jp: `资源${(index || 0) + 1}`, cn: `资源${(index || 0) + 1}`, en: `Resource ${(index || 0) + 1}` };
    }
    // 若是类型 id，解析为完整三语文案
    const fromCat = findResourceTypeById(s) || findResourceTypeByJp(s);
    if (fromCat) return { jp: fromCat.jp, cn: fromCat.cn, en: fromCat.en };
    return { jp: s, cn: s, en: s };
  }

  /** 各店出现过的资源类型（去重，按日文名） */
  function listResourceTypes() {
    const map = new Map();
    STORES.forEach((store) => {
      (store.bedLabels || []).forEach((lab) => {
        let jp = '';
        let cn = '';
        let en = '';
        if (lab && typeof lab === 'object') {
          jp = String(lab.jp || lab.cn || lab.en || '').trim();
          cn = String(lab.cn || lab.jp || jp).trim();
          en = String(lab.en || lab.jp || jp).trim();
        } else {
          jp = String(lab || '').trim();
          cn = jp;
          en = jp;
        }
        if (!jp || map.has(jp)) return;
        const id =
          'rt-' +
          (
            jp
              .replace(/\s+/g, '-')
              .replace(/[^\w\u3040-\u30ff\u4e00-\u9fff\-]/g, '')
              .slice(0, 40) || `type-${map.size + 1}`
          );
        map.set(jp, { id, jp, cn, en });
      });
    });
    return Array.from(map.values());
  }

  function findResourceTypeById(id) {
    return listResourceTypes().find((t) => t.id === id) || null;
  }

  function findResourceTypeByJp(jp) {
    const s = String(jp || '').trim();
    return listResourceTypes().find((t) => t.jp === s || t.cn === s || t.en === s) || null;
  }

  function matchResourceTypeId(label) {
    const n = normalizeBedLabel(label, 0);
    const hit = findResourceTypeByJp(n.jp);
    return hit ? hit.id : '';
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
      ? next.bedLabels.map((x, i) => normalizeBedLabel(x, i))
      : (base && base.bedLabels ? base.bedLabels.map((x, i) => normalizeBedLabel(x, i)) : []);
    while (labels.length < count) {
      labels.push(normalizeBedLabel(null, labels.length));
    }
    labels = labels.slice(0, count);

    let courses = Array.isArray(next.courses) ? next.courses : prev.courses;
    // 覆盖保存时保留多语 name / 时长 / 价格
    if (Array.isArray(courses)) {
      courses = courses
        .map((c, i) => {
          if (!c) return null;
          const id =
            String((c && c.id) || '')
              .trim()
              .replace(/\s+/g, '-') || `course-${i + 1}`;
          const out = { id };
          if (c.name && typeof c.name === 'object') {
            out.name = Object.assign({}, c.name);
          } else {
            const name = String((c && c.name) || '').trim();
            if (!name) return null;
            out.name = name;
          }
          if (c.durationMinutes != null) out.durationMinutes = Number(c.durationMinutes) || undefined;
          if (c.price != null) out.price = Number(c.price) || c.price;
          return out;
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
    listResourceTypes,
    findResourceTypeById,
    matchResourceTypeId,
    normalizeBedLabel,
  };
})(window);
