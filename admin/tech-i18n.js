/**
 * 技师工作端文案 · 默认日语
 */
(function (global) {
  const LANG_KEY = 'booking_portal_lang';
  const DICT = {
    jp: {
      portalTitle: 'スタッフ作業記録',
      portalSub: 'スタッフ・部屋・時間・コースを選んで記録',
      loginTitle: 'スタッフログイン',
      loginSub: '店舗コードを入力（スタッフは作業画面で選択）',
      storeCode: '店舗コード',
      loginBtn: '入る',
      loginErr: 'コードが正しくありません',
      backHome: '← 入口へ戻る',
      lang: '言語',
      tabLog: '記録する',
      tabBoard: '本日の配置',
      logout: 'ログアウト',
      pickTech: 'スタッフ',
      pickResource: 'どの部屋／ベッド？',
      pickStart: '開始時刻',
      pickDuration: '施術時間',
      pickCourse: 'コース（タップで自動送信）',
      courseHint: '上の項目を選んでからコースをタップ',
      min: '分',
      saved: '記録しました',
      needPick: 'スタッフ・部屋・開始時刻を先に選んでください',
      today: '営業日',
      refresh: '更新',
      emptyDay: '本日の記録はまだありません',
      byTech: 'スタッフ別',
      byTime: '時間順',
      delete: '削除',
      confirmDelete: 'この記録を削除しますか？',
      testHint: 'テストコード例',
      noTech: 'スタッフ設定がありません',
      dayCount: '件',
    },
    cn: {
      portalTitle: '技师工作记录',
      portalSub: '同页选择技师、资源、时间与项目后记工',
      loginTitle: '技师端登录',
      loginSub: '输入门店识别码（技师名在工作页选择）',
      storeCode: '门店识别码',
      loginBtn: '进入',
      loginErr: '识别码无效，请重试',
      backHome: '← 返回平台入口',
      lang: '语言',
      tabLog: '记工',
      tabBoard: '今日安排',
      logout: '退出',
      pickTech: '技师',
      pickResource: '房间 / 床位',
      pickStart: '开始时间',
      pickDuration: '时长',
      pickCourse: '项目（点一下即自动上传）',
      courseHint: '请先选好技师、床位和开始时间，再点项目',
      min: '分钟',
      saved: '已记录',
      needPick: '请先选择技师、床位和开始时间',
      today: '营业日',
      refresh: '刷新',
      emptyDay: '今日暂无记录',
      byTech: '按技师',
      byTime: '按时间',
      delete: '删除',
      confirmDelete: '确定删除这条记录？',
      testHint: '测试码示例',
      noTech: '本店尚未配置技师',
      dayCount: '条',
    },
    en: {
      portalTitle: 'Therapist work log',
      portalSub: 'Pick staff, room, time and course on one screen',
      loginTitle: 'Staff login',
      loginSub: 'Enter store code (choose staff on the work screen)',
      storeCode: 'Store code',
      loginBtn: 'Enter',
      loginErr: 'Invalid code',
      backHome: '← Back to hub',
      lang: 'Language',
      tabLog: 'Log work',
      tabBoard: 'Today board',
      logout: 'Log out',
      pickTech: 'Staff',
      pickResource: 'Room / bed',
      pickStart: 'Start time',
      pickDuration: 'Duration',
      pickCourse: 'Course (tap to auto-save)',
      courseHint: 'Select staff, room and start time first',
      min: 'min',
      saved: 'Saved',
      needPick: 'Select staff, room and start time first',
      today: 'Business day',
      refresh: 'Refresh',
      emptyDay: 'No logs today',
      byTech: 'By staff',
      byTime: 'By time',
      delete: 'Delete',
      confirmDelete: 'Delete this log?',
      testHint: 'Test codes',
      noTech: 'No technicians configured',
      dayCount: '',
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
    let base = '';
    if (course.names && typeof course.names === 'object') {
      base = course.names[lang] || course.names.jp || course.names.cn || course.names.en || '';
    } else if (course.name && typeof course.name === 'object') {
      base = course.name[lang] || course.name.jp || course.name.cn || course.name.en || '';
    } else {
      base = String(course.name || '');
    }
    if (!base) return course.id || '';
    // "日 / 中" style fallback for string names
    const parts = base.split('/').map((x) => x.trim()).filter(Boolean);
    if (parts.length >= 2 && !/[a-zA-Z]{3,}/.test(parts[0])) {
      if (lang === 'jp') return parts[0];
      if (lang === 'cn') return parts[1] || parts[0];
      return parts[0];
    }
    return base;
  }

  global.TechI18n = { getLang, setLang, t, techName, courseLabel, DICT };
})(window);
