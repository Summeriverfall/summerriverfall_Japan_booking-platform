/**
 * 商家 / 客服 / 选店门户 共用三语文案 · 默认日语
 * 与技师端共用 booking_portal_lang
 */
(function (global) {
  const LANG_KEY = 'booking_portal_lang';
  const listeners = [];

  const DICT = {
    jp: {
      lang: '言語',
      merchantTitle: '店舗側',
      merchantBrand: '店舗側',
      csTitle: 'カスタマー対応',
      csBrand: 'カスタマー対応',
      adminPortalTitle: '店舗を選択',
      merchantLoginTitle: '店舗ログイン',
      backHub: '← 入口へ戻る',
      switchStore: '店舗切替',
      csBoard: '予約ボード',
      hubEntry: '入口',
      businessDay: '営業日',
      refreshBoard: 'ボード更新',
      todaySummary: '本日の要約',
      boardTitle: 'リソース時間軸（開閉）',
      boardHint:
        '左の「閉/開」＝終日閉 / 終日閉を解除。空欄をドラッグで時間帯クローズ（ドラッグ中はパネルが薄くなります）。同じ選択をもう一度タップで取消。茶線＝現在時刻。',
      legendBooking: '確定予約',
      legendPending: '未確定',
      legendHold: '仮押さえ',
      legendClosure: '店舗クローズ',
      legendOpenReq: 'オープン申請',
      timelineTitle: '占用タイムテーブル',
      timelineHint: '「閉/開」で終日操作。空欄で時間帯クローズ。予約タップで内容確認。',
      legendBookingShort: '確定',
      todayBookings: '本日の予約一覧',
      todayBookingsHint: '来店時刻順。コースとリソースを表示。',
      occTitle: '当日占用（時間順）',
      occHint: '予約とクローズを混在表示。タップで詳細。',
      closureRecords: '当日クローズ記録',
      closureHintDesk: '終日閉 / 時間帯閉は別レコード。申請もここで処理可。',
      closureHintMobile: 'リストから解除または申請処理。',
      dockDay: '終日閉',
      dockRange: '時間帯閉',
      dockReq: '申請',
      sideCloseEdit: 'クローズ編集',
      sideHintConfirm: '選択後にここで確定',
      sideStart: '開始',
      sideEnd: '終了',
      sideWhichBeds: '閉じるリソース',
      sideReason: '理由',
      reasonTemp: '臨時クローズ',
      reasonWalkin: '来店客占用',
      reasonMaint: '設備メンテ',
      reasonRest: 'スタッフ休憩',
      reasonOther: 'その他',
      reasonOtherPh: 'その他の理由を入力',
      openReqHint: 'CSからオープン申請があります。承認または拒否してください。',
      btnConfirmClose: 'クローズ確定',
      btnConfirmDayClose: '終日クローズ確定',
      btnSaveAdjust: '調整を保存',
      btnReleaseDay: '開く（この終日閉を解除）',
      btnReleaseSlot: '開く（この時間帯閉を解除）',
      btnRelease: '開く（解除）',
      btnApprove: '承認して開く',
      btnReject: '申請を拒否',
      sideOpenReq: 'オープン申請',
      btnRequestOpenAgain: 'オープン申請メールを再作成',
      resourcesUnit: 'リソース',
      bedsUnit: 'ベッド',
      // CS
      dailyEmailTime: '毎日の店舗メール（ローカル時刻）',
      saveDailyTime: '送信時刻を保存',
      previewDigest: '日次サマリーをプレビュー',
      exportData: 'データ書き出し',
      resetData: '当店のテストデータを消去',
      csBoardTitle: 'ベッド時間軸（予約＋店舗クローズ）',
      csBoardHint:
        '空欄ドラッグで新規。色ブロックをタップで編集（仮押さえは予約に変換可）。灰/青緑のクローズはオープン申請のみ（直接解除不可）。チャネル初期値 WhatsApp。',
      waPasteTitle: 'WhatsApp 予約の貼り付け',
      waPasteHint: '確認メール / 予約原文を貼ると氏名・時間・人数・コース等を側欄へ自動入力。ワンタップ作成可。',
      waPastePh: 'WhatsApp の予約内容をここに貼り付け…',
      btnParseWa: '解析して側欄へ',
      btnParseWaCreate: '解析して直接作成',
      ordersToday: '当日オーダー',
      emailPanelTitle: '店舗メール / カレンダー同期',
      emailPanelHint:
        '確定・変更後にここでプレビュー。本文編集後に送信可。送信で店舗へメールし、必要に応じ当日 Google カレンダーを書き換え。日次サマリーは本機 server ゲートウェイ常時起動と送信時刻設定が必要。',
      emailEmpty: 'プレビューなし。作成・確定後に表示。',
      sideBookingEdit: '予約編集',
      sideHintEdit: '選択後にここで編集',
      sideStartTime: '開始時刻',
      sideDuration: '時間（分）',
      sideGuests: '人数（複数ベッド選択で自動）',
      sideBeds: '指定ベッド',
      sideCourse: 'コース',
      sideChannel: 'チャネル',
      sideGuestName: 'お客様名',
      sideGuestPhone: '電話 / WhatsApp',
      sideNote: 'メモ',
      optional: '任意',
      notePh: 'アレルギー / 指名など',
      multiHint: '2名以上は作成後「未確定」。確定後にメールプレビュー。',
      openReqDetail: '店舗が当該ベッド時間帯をクローズ済み。CSは直接開けず、オープン申請のみ可能。',
      openReqNote: '申請メモ（任意）',
      openReqNotePh: '例：お客様指名 / 臨時追加',
      btnHold: '仮押さえのみ',
      btnCreate: '予約作成',
      btnSaveBooking: '変更を保存',
      btnConvertHold: '予約に変換',
      btnDeleteBooking: '予約削除',
      btnReleaseHold: '仮押さえを解除',
      btnRequestOpen: 'オープン申請＋メール下書き',
      // portal
      editResources: 'リソースとコースを編集',
      editHintNormal: '普段はカードをタップしてCSへ',
      editHintOn: '編集モード：リソース名・数・コースを変更可',
      doneEdit: '編集完了',
      adminLede: '入ると当該店のCS画面。店ごとにデータ分離。編集でリソース名と数を変更（このブラウザに保存）。',
      merchantLoginLede: '店舗コードを入力。テスト版のため簡易認証のみ。',
      storeCode: '店舗コード',
      enterMerchant: '店舗側へ',
      testCodes: 'テスト用コード（非公式）：',
      loginErr: 'コードが無効です。再確認してください。',
      enterStore: '入店 →',
      saveStoreRes: 'この店のリソースとコースを保存',
      resetDefaultRes: 'デフォルトに戻す',
      savedRes: '保存しました。CS/店舗側を更新すると反映。',
      restoredRes: 'デフォルトのリソースに戻しました。',
      coursesLabel: '予約コース（1行1件：「id|名称」または名称のみ）',
      resCount: 'リソース数',
      resNames: 'リソース名（部屋 / VIP / ペア / ベッド等）',
    },
    cn: {
      lang: '语言',
      merchantTitle: '商家端',
      merchantBrand: '商家端',
      csTitle: '客服端',
      csBrand: '客服端',
      adminPortalTitle: '选择门店',
      merchantLoginTitle: '商家登录',
      backHub: '← 返回平台入口',
      switchStore: '切换门店',
      csBoard: '客服看板',
      hubEntry: '平台入口',
      businessDay: '营业日',
      refreshBoard: '刷新看板',
      todaySummary: '今日摘要',
      boardTitle: '资源时间轴（开关床）',
      boardHint:
        '左侧「关/开」= 整日关闭 / 释放整日关。空档按住拖选关时段（拖动时弹层变淡）。再点已选同一资源可取消选择。棕线=当前时刻，下方浅色小字为时刻。',
      legendBooking: '已确认预约',
      legendPending: '待确认',
      legendHold: '预占',
      legendClosure: '商家关闭',
      legendOpenReq: '开床申请',
      timelineTitle: '占用时间表',
      timelineHint: '点资源旁「关/开」整日操作；点空格关时段；点预约可查看项目。',
      legendBookingShort: '已确认',
      todayBookings: '今日预约列表',
      todayBookingsHint: '按到店时间排序；含项目与资源。',
      occTitle: '当日占用（按时间）',
      occHint: '预约与关闭混排，大致对应时间轴；点击查看。',
      closureRecords: '当日关闭记录',
      closureHintDesk: '整日关 / 时段关分条列出，释放互不影响。也可在列表里处理开床申请。',
      closureHintMobile: '列表可分别释放或处理开床申请。',
      dockDay: '整日关',
      dockRange: '关时段',
      dockReq: '申请',
      sideCloseEdit: '关床编辑',
      sideHintConfirm: '选中后可在此确认',
      sideStart: '开始',
      sideEnd: '结束',
      sideWhichBeds: '关闭哪些资源',
      sideReason: '原因',
      reasonTemp: '临时关闭',
      reasonWalkin: '线下客户占用',
      reasonMaint: '设备维护',
      reasonRest: '店员休息',
      reasonOther: '其他',
      reasonOtherPh: '请填写其他原因',
      openReqHint: '客服已申请开床，请选择同意或拒绝。',
      btnConfirmClose: '确认关闭',
      btnConfirmDayClose: '确认整日关闭',
      btnSaveAdjust: '保存调整',
      btnReleaseDay: '打开（释放此整日关）',
      btnReleaseSlot: '打开（释放此时段关）',
      btnRelease: '打开（释放）',
      btnApprove: '同意开床',
      btnReject: '拒绝申请',
      sideOpenReq: '开床申请',
      btnRequestOpenAgain: '重拟开床申请邮件',
      resourcesUnit: '资源',
      bedsUnit: '床',
      dailyEmailTime: '每日商家邮件（本地时间）',
      saveDailyTime: '保存发送时刻',
      previewDigest: '预览每日汇总邮件',
      exportData: '导出数据',
      resetData: '清空本店测试数据',
      csBoardTitle: '床位时间轴（预约 + 商家关闭）',
      csBoardHint:
        '空档拖选可新建；点预约色块可编辑（预占可选「转为预约」）。点灰色/青绿关闭块可申请开床（不能直接打开）。渠道默认 WhatsApp。',
      waPasteTitle: 'WhatsApp 预约信息粘贴',
      waPasteHint: '粘贴确认信 / 客人预约原文，自动解析姓名、时间、人数、项目、联系方式等并填入侧栏；可一键创建。',
      waPastePh: '在此粘贴 WhatsApp 预约信息…',
      btnParseWa: '解析并填入侧栏',
      btnParseWaCreate: '解析并直接创建预约',
      ordersToday: '当日订单',
      emailPanelTitle: '商家邮件 / 日历同步',
      emailPanelHint:
        '确认或改期后在此预览；正文可直接编辑后再发送。点发送会发信到商家，并按需重写当日 Google 日历。每日汇总需本机 server 网关常开，并在上方设定发送时刻。',
      emailEmpty: '暂无预览。创建并确认订单后显示。',
      sideBookingEdit: '预约编辑',
      sideHintEdit: '选中后可在此修改',
      sideStartTime: '开始时间',
      sideDuration: '时长(分)',
      sideGuests: '人数（跨床拖选会自动填）',
      sideBeds: '指定床位',
      sideCourse: '项目',
      sideChannel: '渠道',
      sideGuestName: '客人姓名',
      sideGuestPhone: '电话 / WhatsApp',
      sideNote: '备注',
      optional: '可选',
      notePh: '过敏/指定等',
      multiHint: '≥2 人创建后为「待确认」，需再点确认才出邮件预览。',
      openReqDetail: '商家已关闭该床位时段。客服不可直接开床，可发起开床申请。',
      openReqNote: '申请备注（可选）',
      openReqNotePh: '如：客人指定该床 / 临时加单',
      btnHold: '仅预占',
      btnCreate: '创建预约',
      btnSaveBooking: '保存修改',
      btnConvertHold: '转为预约',
      btnDeleteBooking: '删除预约',
      btnReleaseHold: '释放预占',
      btnRequestOpen: '申请开床并拟邮件',
      editResources: '编辑资源与项目',
      editHintNormal: '平时点击卡片进入客服端',
      editHintOn: '编辑模式：可改资源名/数量与预约项目',
      doneEdit: '完成编辑',
      adminLede: '进入后即为该店客服端。各店数据相互隔离。可进入编辑模式修改资源名与数量（保存在本机浏览器）。',
      merchantLoginLede: '请输入门店识别码。测试版无真实鉴权，仅做流程验证。',
      storeCode: '门店识别码',
      enterMerchant: '进入商家端',
      testCodes: '测试识别码（非正式）：',
      loginErr: '识别码无效，请核对后重试。',
      enterStore: '进入门店 →',
      saveStoreRes: '保存本店资源与项目',
      resetDefaultRes: '恢复默认资源',
      savedRes: '已保存资源与项目。客服端/商家端刷新后生效。',
      restoredRes: '已恢复默认资源列表。',
      coursesLabel: '预约项目（每行一项：可写「id|名称」或仅名称）',
      resCount: '资源数量',
      resNames: '资源名称（房间 / VIP / 双人房 / 床位等）',
    },
    en: {
      lang: 'Language',
      merchantTitle: 'Merchant',
      merchantBrand: 'Merchant',
      csTitle: 'Front desk CS',
      csBrand: 'CS desk',
      adminPortalTitle: 'Select store',
      merchantLoginTitle: 'Merchant login',
      backHub: '← Back to hub',
      switchStore: 'Switch store',
      csBoard: 'CS board',
      hubEntry: 'Hub',
      businessDay: 'Business day',
      refreshBoard: 'Refresh board',
      todaySummary: 'Today summary',
      boardTitle: 'Resource timeline (open / close)',
      boardHint:
        'Left Close/Open = full-day close / release. Drag empty slots to close a range (panel fades while dragging). Tap the same selection again to cancel. Brown line = now.',
      legendBooking: 'Confirmed',
      legendPending: 'Pending',
      legendHold: 'Hold',
      legendClosure: 'Merchant close',
      legendOpenReq: 'Open request',
      timelineTitle: 'Occupancy table',
      timelineHint: 'Use Close/Open for full day; tap empty slot to close range; tap booking for details.',
      legendBookingShort: 'Confirmed',
      todayBookings: 'Today bookings',
      todayBookingsHint: 'Sorted by arrival; course and resource included.',
      occTitle: 'Day occupancy (by time)',
      occHint: 'Bookings and closures mixed; tap to view.',
      closureRecords: 'Closure records today',
      closureHintDesk: 'Full-day and slot closures are separate. Handle open requests here too.',
      closureHintMobile: 'Release or handle open requests from the list.',
      dockDay: 'Full day',
      dockRange: 'Time range',
      dockReq: 'Requests',
      sideCloseEdit: 'Edit closure',
      sideHintConfirm: 'Confirm here after selecting',
      sideStart: 'Start',
      sideEnd: 'End',
      sideWhichBeds: 'Resources to close',
      sideReason: 'Reason',
      reasonTemp: 'Temporary close',
      reasonWalkin: 'Walk-in occupancy',
      reasonMaint: 'Maintenance',
      reasonRest: 'Staff break',
      reasonOther: 'Other',
      reasonOtherPh: 'Enter other reason',
      openReqHint: 'CS requested opening. Approve or reject.',
      btnConfirmClose: 'Confirm close',
      btnConfirmDayClose: 'Confirm full-day close',
      btnSaveAdjust: 'Save changes',
      btnReleaseDay: 'Open (release this full-day close)',
      btnReleaseSlot: 'Open (release this slot close)',
      btnRelease: 'Open (release)',
      btnApprove: 'Approve open',
      btnReject: 'Reject request',
      sideOpenReq: 'Open request',
      btnRequestOpenAgain: 'Redraft open-request email',
      resourcesUnit: 'resources',
      bedsUnit: 'beds',
      dailyEmailTime: 'Daily merchant email (local time)',
      saveDailyTime: 'Save send time',
      previewDigest: 'Preview daily digest',
      exportData: 'Export data',
      resetData: 'Clear this store’s test data',
      csBoardTitle: 'Bed timeline (bookings + closures)',
      csBoardHint:
        'Drag empty to create; tap blocks to edit (holds can convert). Grey/teal closures: request open only. Default channel WhatsApp.',
      waPasteTitle: 'Paste WhatsApp booking',
      waPasteHint: 'Paste confirmation / guest text to fill the side panel; one-tap create available.',
      waPastePh: 'Paste WhatsApp booking text here…',
      btnParseWa: 'Parse into side panel',
      btnParseWaCreate: 'Parse and create',
      ordersToday: 'Orders today',
      emailPanelTitle: 'Merchant email / calendar sync',
      emailPanelHint:
        'Preview after confirm/reschedule; edit body then send. Sending emails the merchant and may rewrite today’s Google Calendar. Daily digest needs the local server gateway and a send time above.',
      emailEmpty: 'No preview yet. Appears after create & confirm.',
      sideBookingEdit: 'Edit booking',
      sideHintEdit: 'Edit here after selecting',
      sideStartTime: 'Start time',
      sideDuration: 'Duration (min)',
      sideGuests: 'Guests (auto when multi-bed)',
      sideBeds: 'Beds',
      sideCourse: 'Course',
      sideChannel: 'Channel',
      sideGuestName: 'Guest name',
      sideGuestPhone: 'Phone / WhatsApp',
      sideNote: 'Note',
      optional: 'Optional',
      notePh: 'Allergy / request…',
      multiHint: '2+ guests stay Pending until confirmed; then email preview.',
      openReqDetail: 'Merchant closed this bed/slot. CS cannot open directly — request open instead.',
      openReqNote: 'Request note (optional)',
      openReqNotePh: 'e.g. guest asked for this bed',
      btnHold: 'Hold only',
      btnCreate: 'Create booking',
      btnSaveBooking: 'Save changes',
      btnConvertHold: 'Convert to booking',
      btnDeleteBooking: 'Delete booking',
      btnReleaseHold: 'Release hold',
      btnRequestOpen: 'Request open + draft email',
      editResources: 'Edit resources & courses',
      editHintNormal: 'Tap a card to open CS',
      editHintOn: 'Edit mode: change resource names/count and courses',
      doneEdit: 'Done editing',
      adminLede: 'Opens that store’s CS desk. Data is isolated per store. Edit mode changes resource names/count (saved in this browser).',
      merchantLoginLede: 'Enter store access code. Test build only — no real auth.',
      storeCode: 'Store code',
      enterMerchant: 'Enter merchant',
      testCodes: 'Test codes (informal):',
      loginErr: 'Invalid code. Please try again.',
      enterStore: 'Enter store →',
      saveStoreRes: 'Save this store’s resources & courses',
      resetDefaultRes: 'Restore defaults',
      savedRes: 'Saved. Refresh CS/merchant to apply.',
      restoredRes: 'Default resources restored.',
      coursesLabel: 'Courses (one per line: “id|name” or name only)',
      resCount: 'Resource count',
      resNames: 'Resource names (room / VIP / pair / bed…)',
    },
  };

  /** 原因存储仍用中文 key，展示时映射 */
  const REASON_KEYS = {
    临时关闭: 'reasonTemp',
    线下客户占用: 'reasonWalkin',
    设备维护: 'reasonMaint',
    店员休息: 'reasonRest',
    其他: 'reasonOther',
  };

  function getLang() {
    try {
      const s = localStorage.getItem(LANG_KEY);
      if (s && DICT[s]) return s;
    } catch (e) {}
    return 'jp';
  }

  function setLang(lang) {
    const l = DICT[lang] ? lang : 'jp';
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch (e) {}
    listeners.forEach((fn) => {
      try {
        fn(l);
      } catch (err) {}
    });
    return l;
  }

  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  function t(key) {
    const lang = getLang();
    return (DICT[lang] && DICT[lang][key]) || (DICT.jp && DICT.jp[key]) || key;
  }

  function reasonLabel(stored) {
    const k = REASON_KEYS[stored];
    return k ? t(k) : stored || '';
  }

  function storeName(cfg) {
    if (!cfg || !cfg.storeName) return '';
    const lang = getLang();
    const sn = cfg.storeName;
    if (typeof sn === 'string') return sn;
    return sn[lang] || sn.jp || sn.cn || sn.en || '';
  }

  function htmlLang() {
    const lang = getLang();
    return lang === 'jp' ? 'ja' : lang === 'cn' ? 'zh-CN' : 'en';
  }

  function applyDom(root) {
    const scope = root || document;
    document.documentElement.lang = htmlLang();
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const val = t(key);
      if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
        el.textContent = val;
      } else if (el.querySelector('.m-dock-ico')) {
        const ico = el.querySelector('.m-dock-ico');
        el.textContent = '';
        if (ico) el.appendChild(ico);
        el.appendChild(document.createTextNode(val));
      } else {
        el.textContent = val;
      }
    });
    scope.querySelectorAll('[data-i18n-html]').forEach((el) => {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    scope.querySelectorAll('.lang-switch button[data-lang]').forEach((btn) => {
      btn.classList.toggle('is-on', btn.dataset.lang === getLang());
    });
  }

  function mountSwitch(container, opts) {
    if (!container) return null;
    let el = container.querySelector('.lang-switch');
    if (!el) {
      el = document.createElement('div');
      el.className = 'lang-switch';
      el.setAttribute('role', 'group');
      el.setAttribute('aria-label', 'Language');
      ['jp', 'cn', 'en'].forEach((code) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.lang = code;
        b.textContent = code === 'jp' ? 'JP' : code === 'cn' ? '中' : 'EN';
        el.appendChild(b);
      });
      if (opts && opts.prepend) container.insertBefore(el, container.firstChild);
      else container.appendChild(el);
    }
    el.onclick = (e) => {
      const btn = e.target.closest('button[data-lang]');
      if (!btn) return;
      setLang(btn.dataset.lang);
      applyDom();
    };
    applyDom();
    return el;
  }

  global.DeskI18n = {
    LANG_KEY,
    getLang,
    setLang,
    onChange,
    t,
    reasonLabel,
    storeName,
    applyDom,
    mountSwitch,
    REASON_KEYS,
    DICT,
  };
})(window);
