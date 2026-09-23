/**
 * 多门店注册表（功能测试 · 无真实后端）
 * 测试店：Relaxation Ruana、Starry Flow Spa、Luna spa 河原町店、Flora SPA
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
      resourceNoun: { jp: 'ベッド', cn: '床位', en: 'Beds' },
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
      resourceNoun: { jp: 'ベッド', cn: '床位', en: 'Beds' },
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
      googleCalendarId: '3068cca264852c7503af72c708bf996b6cb1c3b66a3538715db2d7566b0337ca@group.calendar.google.com',
      googleCalendarName: 'StarryFlow spa',
      googleCalendarShared: true,
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
      /** 真实配置：3 单人房 + 2 双人房（各自独立可约，不成对绑定） */
      bedCount: 5,
      resourceNoun: { jp: 'ベッド', cn: '床位', en: 'Beds' },
      bedLabels: [
        { typeId: 'single', jp: 'シングル1', cn: '单人房1', en: 'Single 1' },
        { typeId: 'single', jp: 'シングル2', cn: '单人房2', en: 'Single 2' },
        { typeId: 'single', jp: 'シングル3', cn: '单人房3', en: 'Single 3' },
        { typeId: 'pair', jp: 'ペア1', cn: '双人房1', en: 'Double 1' },
        { typeId: 'pair', jp: 'ペア2', cn: '双人房2', en: 'Double 2' },
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
    {
      storeId: 'floraspa',
      storeName: {
        jp: 'Flora SPA',
        en: 'Flora SPA',
        cn: 'Flora SPA',
      },
      tagline: '测试店',
      address: '',
      accent: '#6b8f71',
      overnight: false,
      openHour: 11,
      openMinute: 0,
      closeHour: 22,
      closeMinute: 0,
      hoursLabel: '11:00 – 22:00',
      slotMinutes: 30,
      bedCount: 5,
      resourceNoun: { jp: 'ベッド', cn: '床位', en: 'Beds' },
      bedLabels: [
        { jp: 'ベッド1', cn: '床位1', en: 'Bed 1' },
        { jp: 'ベッド2', cn: '床位2', en: 'Bed 2' },
        { jp: 'ベッド3', cn: '床位3', en: 'Bed 3' },
        { jp: 'ベッド4', cn: '床位4', en: 'Bed 4' },
        { jp: 'ベッド5', cn: '床位5', en: 'Bed 5' },
      ],
      confirmGuestsThreshold: 2,
      courses: [
        { id: 'oil-60', name: 'オイルトリートメント 60分 / 精油护理 60分钟' },
        { id: 'oil-90', name: 'オイルトリートメント 90分 / 精油护理 90分钟' },
        { id: 'body-60', name: 'ボディマッサージ 60分 / 身体按摩 60分钟' },
        { id: 'body-90', name: 'ボディマッサージ 90分 / 身体按摩 90分钟' },
        { id: 'head-45', name: 'ヘッドスパ 45分 / 头部水疗 45分钟' },
        { id: 'foot-30', name: 'フットケア 30分 / 足部护理 30分钟' },
      ],
      channels: [
        { id: 'whatsapp', name: 'WhatsApp' },
        { id: 'phone', name: '电话' },
        { id: 'line', name: 'LINE' },
        { id: 'walkin', name: '到店/线下' },
        { id: 'other', name: '其他' },
      ],
      merchantEmail: '1161132533@qq.com',
      emailSubjectPrefix: '[Flora SPA预约]',
      dailyEmailTime: '00:00',
      googleCalendarId: '1f92b0f7ee39a8b42bb060d9058f32da62f10543046c03e4d7e50ce0d3902651@group.calendar.google.com',
      googleCalendarShared: true,
      googleCalendarName: 'FLORA SPA',
      timeZone: 'Asia/Tokyo',
      googleWriteTimeZone: 'Asia/Shanghai',
      storageKey: 'booking-platform-floraspa-v1',
      accessCode: 'FLORA88',
      technicians: [
        { id: 'flora-a', code: 'F1', name: { jp: '葵', en: 'Aoi', cn: '葵' } },
        { id: 'flora-b', code: 'F2', name: { jp: '凛', en: 'Rin', cn: '凛' } },
        { id: 'flora-c', code: 'F3', name: { jp: '芽衣', en: 'Mei', cn: '芽衣' } },
        { id: 'flora-d', code: 'F4', name: { jp: '桜', en: 'Sakura', cn: '樱' } },
      ],
      techWorkKey: 'tech-work-floraspa-v1',
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

  const RESOURCE_TYPES = [
    { id: 'single', jp: 'シングルルーム', cn: '单人房', en: 'Single room' },
    { id: 'pair', jp: 'ペアルーム', cn: '双人房', en: 'Double room' },
    { id: 'vip', jp: 'VIP個室', cn: 'VIP包间', en: 'VIP private room' },
  ];

  function listResourceTypes() {
    return RESOURCE_TYPES.map((t) => ({ ...t }));
  }

  function findResourceTypeById(id) {
    return RESOURCE_TYPES.find((t) => t.id === id) || null;
  }

  function findResourceTypeByJp(jp) {
    const s = String(jp || '').trim();
    if (!s) return null;
    const exact = RESOURCE_TYPES.find((t) => t.jp === s || t.cn === s || t.en === s);
    if (exact) return exact;
    if (/VIP|包间|個室/i.test(s)) return findResourceTypeById('vip');
    if (/ペア|双人|Double|Pair/i.test(s)) return findResourceTypeById('pair');
    if (/シングル|单人|Single/i.test(s)) return findResourceTypeById('single');
    return RESOURCE_TYPES.find((t) => s.includes(t.cn) || s.includes(t.jp)) || null;
  }

  function normalizeBedLabel(raw, index) {
    if (raw && typeof raw === 'object') {
      const typeId = String(raw.typeId || '').trim();
      const pairGroup = String(raw.pairGroup || '').trim();
      const fromType = typeId ? findResourceTypeById(typeId) : null;
      const jp = String(raw.jp || (fromType && fromType.jp) || raw.cn || raw.en || '').trim();
      const cn = String(raw.cn || (fromType && fromType.cn) || raw.jp || jp).trim();
      const en = String(raw.en || (fromType && fromType.en) || raw.jp || jp).trim();
      if (!jp && !cn && !en) {
        const fallback = `R${(index || 0) + 1}`;
        return { jp: fallback, cn: fallback, en: fallback, typeId: typeId || '', pairGroup };
      }
      const inferred = fromType || findResourceTypeByJp(jp) || findResourceTypeByJp(cn);
      return {
        jp,
        cn,
        en,
        typeId: typeId || (inferred && inferred.id) || '',
        pairGroup,
      };
    }
    const s = String(raw || '').trim();
    if (!s) {
      const fallback = `R${(index || 0) + 1}`;
      return { jp: fallback, cn: fallback, en: fallback, typeId: '', pairGroup: '' };
    }
    const fromCat = findResourceTypeById(s) || findResourceTypeByJp(s);
    if (fromCat) {
      return { jp: fromCat.jp, cn: fromCat.cn, en: fromCat.en, typeId: fromCat.id, pairGroup: '' };
    }
    return { jp: s, cn: s, en: s, typeId: '', pairGroup: '' };
  }

  function matchResourceTypeId(label) {
    const n = normalizeBedLabel(label, 0);
    if (n.typeId && findResourceTypeById(n.typeId)) return n.typeId;
    const hit = findResourceTypeByJp(n.jp) || findResourceTypeByJp(n.cn);
    return hit ? hit.id : '';
  }

  /** 资源各自独立；双人房类型仅作分类，选中/关房不再成对绑定 */
  function expandBedIndexes(_store, bedIndexes) {
    const set = new Set((bedIndexes || []).map((n) => Number(n)).filter((n) => Number.isFinite(n)));
    return Array.from(set).sort((a, b) => a - b);
  }

  function assignPairGroups(_storeId, labels) {
    const out = [];
    for (let i = 0; i < labels.length; i += 1) {
      const n = normalizeBedLabel(labels[i], i);
      const typeId = String(n.typeId || matchResourceTypeId(n) || '').trim();
      const fromType = findResourceTypeById(typeId);
      const customJp = String(n.jp || '').trim();
      const customCn = String(n.cn || '').trim();
      const customEn = String(n.en || '').trim();
      // 保留自定义名称；未填时才回落到类型默认名。双人房不再写入 pairGroup。
      out.push({
        jp: customJp || (fromType && fromType.jp) || `R${i + 1}`,
        cn: customCn || customJp || (fromType && fromType.cn) || `R${i + 1}`,
        en: customEn || customJp || (fromType && fromType.en) || `R${i + 1}`,
        typeId,
        pairGroup: '',
        pairSeat: 0,
      });
    }
    return out;
  }

  function normalizeStoreResources(store) {
    if (!store) return null;
    const labels = assignPairGroups(store.storeId, store.bedLabels || []);
    return Object.assign({}, store, {
      bedLabels: labels,
      bedCount: labels.length || store.bedCount || 0,
    });
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
      ? next.bedLabels.slice()
      : (base && base.bedLabels ? base.bedLabels.slice() : []);
    while (labels.length < count) {
      labels.push({ typeId: 'single' });
    }
    labels = assignPairGroups(storeId, labels.slice(0, count));

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

    const openHour = clampHour(next.openHour, base && base.openHour);
    const openMinute = clampMinute(next.openMinute, base && base.openMinute);
    const closeHour = clampHour(next.closeHour, base && base.closeHour);
    const closeMinute = clampMinute(next.closeMinute, base && base.closeMinute);
    const overnight =
      next.overnight != null
        ? Boolean(next.overnight)
        : Boolean(base && base.overnight);
    const hoursLabel =
      next.hoursLabel ||
      formatHoursLabel(openHour, openMinute, closeHour, closeMinute, overnight);

    const minGapMinutes = clampGapMinutes(
      next.minGapMinutes != null ? next.minGapMinutes : prev.minGapMinutes,
      base && base.minGapMinutes
    );

    const saved = {
      bedCount: count,
      bedLabels: labels,
      openHour,
      openMinute,
      closeHour,
      closeMinute,
      overnight,
      hoursLabel,
      minGapMinutes,
    };
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

  function clampHour(v, fallback) {
    const n = Number(v);
    if (!Number.isFinite(n)) return Number(fallback) || 0;
    return Math.max(0, Math.min(23, Math.round(n)));
  }

  function clampMinute(v, fallback) {
    const n = Number(v);
    if (!Number.isFinite(n)) return Number(fallback) || 0;
    return n >= 30 ? 30 : 0;
  }

  function clampGapMinutes(v, fallback) {
    const n = Number(v);
    if (!Number.isFinite(n)) {
      const fb = Number(fallback);
      return Number.isFinite(fb) ? Math.max(0, Math.min(180, Math.round(fb))) : 0;
    }
    return Math.max(0, Math.min(180, Math.round(n)));
  }

  function formatHoursLabel(openH, openM, closeH, closeM, overnight) {
    const a = `${String(openH).padStart(2, '0')}:${String(openM).padStart(2, '0')}`;
    const b = `${String(closeH).padStart(2, '0')}:${String(closeM).padStart(2, '0')}`;
    if (overnight) {
      if (closeH === 0 && closeM === 0) return `${a} – 24:00`;
      return `${a} – 次日 ${b}`;
    }
    if (closeH === 0 && closeM === 0) return `${a} – 24:00`;
    return `${a} – ${b}`;
  }

  function withResourceOverride(store) {
    if (!store) return null;
    const ov = getResourceOverride(store.storeId);
    let merged = store;
    if (ov) {
      merged = Object.assign({}, store, {
        bedCount: ov.bedCount != null ? ov.bedCount : store.bedCount,
        bedLabels: ov.bedLabels ? ov.bedLabels.slice() : (store.bedLabels || []).slice(),
      });
      if (Array.isArray(ov.courses) && ov.courses.length) {
        merged.courses = ov.courses.map((c) => Object.assign({}, c));
      }
      if (ov.openHour != null) merged.openHour = clampHour(ov.openHour, store.openHour);
      if (ov.openMinute != null) merged.openMinute = clampMinute(ov.openMinute, store.openMinute);
      if (ov.closeHour != null) merged.closeHour = clampHour(ov.closeHour, store.closeHour);
      if (ov.closeMinute != null) {
        merged.closeMinute = clampMinute(ov.closeMinute, store.closeMinute);
      }
      if (ov.overnight != null) merged.overnight = Boolean(ov.overnight);
      if (ov.minGapMinutes != null) {
        merged.minGapMinutes = clampGapMinutes(ov.minGapMinutes, store.minGapMinutes);
      }
      merged.hoursLabel =
        ov.hoursLabel ||
        formatHoursLabel(
          merged.openHour,
          merged.openMinute || 0,
          merged.closeHour,
          merged.closeMinute || 0,
          merged.overnight
        );
    }
    merged.minGapMinutes = clampGapMinutes(merged.minGapMinutes, 0);
    return normalizeStoreResources(merged);
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
    expandBedIndexes,
    RESOURCE_TYPES,
  };
})(window);
