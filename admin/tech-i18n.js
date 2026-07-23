/**
 * 技师工作端文案 · 默认日语
 */
(function (global) {
  const LANG_KEY = 'booking_portal_lang';
  const DICT = {
    jp: {
      portalTitle: 'スタッフ作業記録',
      portalSub: '本の代わりに、3タップで記録',
      loginTitle: 'スタッフログイン',
      loginSub: '店舗コードとスタッフコードを入力',
      storeCode: '店舗コード',
      techCode: 'スタッフコード',
      loginBtn: '入る',
      loginErr: 'コードが正しくありません',
      backHome: '← 入口へ戻る',
      lang: '言語',
      tabLog: '記録する',
      tabBoard: '本日の配置',
      logout: 'ログアウト',
      step1: '① リソース',
      step2: '② 時間',
      step3: '③ コース',
      pickResource: 'どの部屋／ベッド？',
      pickStart: '開始時刻',
      pickDuration: '施術時間',
      pickCourse: 'コース（タップで自動送信）',
      min: '分',
      saved: '記録しました',
      today: '営業日',
      refresh: '更新',
      emptyDay: '本日の記録はまだありません',
      byTech: 'スタッフ別',
      byTime: '時間順',
      delete: '削除',
      confirmDelete: 'この記録を削除しますか？',
      me: '自分',
      all: '全員',
      testHint: 'テストコード例',
      noTech: 'スタッフ設定がありません',
    },
    cn: {
      portalTitle: '技师工作记录',
      portalSub: '代替本子，三步点击即可记工',
      loginTitle: '技师登录',
      loginSub: '请输入门店识别码与技师码',
      storeCode: '门店识别码',
      techCode: '技师码',
      loginBtn: '进入',
      loginErr: '识别码无效，请重试',
      backHome: '← 返回平台入口',
      lang: '语言',
      tabLog: '记工',
      tabBoard: '今日安排',
      logout: '退出',
      step1: '① 资源',
      step2: '② 时间',
      step3: '③ 项目',
      pickResource: '选房间 / 床位',
      pickStart: '开始时间',
      pickDuration: '时长',
      pickCourse: '项目（点一下即自动上传）',
      min: '分钟',
      saved: '已记录',
      today: '营业日',
      refresh: '刷新',
      emptyDay: '今日暂无记录',
      byTech: '按技师',
      byTime: '按时间',
      delete: '删除',
      confirmDelete: '确定删除这条记录？',
      me: '我的',
      all: '全部',
      testHint: '测试码示例',
      noTech: '本店尚未配置技师',
    },
    en: {
      portalTitle: 'Therapist work log',
      portalSub: 'Replace the notebook — 3 taps to log',
      loginTitle: 'Staff login',
      loginSub: 'Enter store code and staff code',
      storeCode: 'Store code',
      techCode: 'Staff code',
      loginBtn: 'Enter',
      loginErr: 'Invalid code',
      backHome: '← Back to hub',
      lang: 'Language',
      tabLog: 'Log work',
      tabBoard: 'Today board',
      logout: 'Log out',
      step1: '① Resource',
      step2: '② Time',
      step3: '③ Course',
      pickResource: 'Room / bed',
      pickStart: 'Start time',
      pickDuration: 'Duration',
      pickCourse: 'Course (tap to auto-save)',
      min: 'min',
      saved: 'Saved',
      today: 'Business day',
      refresh: 'Refresh',
      emptyDay: 'No logs today',
      byTech: 'By staff',
      byTime: 'By time',
      delete: 'Delete',
      confirmDelete: 'Delete this log?',
      me: 'Mine',
      all: 'All',
      testHint: 'Test codes',
      noTech: 'No technicians configured',
    },
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
    return l;
  }

  function t(key) {
    const lang = getLang();
    return (DICT[lang] && DICT[lang][key]) || (DICT.jp && DICT.jp[key]) || key;
  }

  function techName(tech) {
    if (!tech) return '';
    const lang = getLang();
    if (tech.name && typeof tech.name === 'object') {
      return tech.name[lang] || tech.name.jp || tech.name.cn || tech.name.en || tech.id;
    }
    return String(tech.name || tech.id);
  }

  function courseLabel(course) {
    if (!course) return '';
    const lang = getLang();
    const raw = course.name || '';
    if (course.names && course.names[lang]) return course.names[lang];
    // "日 / 中" or "EN / CN" style
    const parts = String(raw).split('/').map((x) => x.trim());
    if (lang === 'jp') return parts[0] || raw;
    if (lang === 'cn') return parts[1] || parts[0] || raw;
    return parts[0] || raw;
  }

  global.TechI18n = { getLang, setLang, t, techName, courseLabel, DICT };
})(window);
