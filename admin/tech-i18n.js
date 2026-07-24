/**
 * 技师工作端文案 · 默认日语
 */
(function (global) {
  const LANG_KEY = 'booking_portal_lang';
  const DICT = {
    jp: {
      portalTitle: 'スタッフ作業記録',
      portalSub: 'スタッフとコースを選び、表で開始位置を指定して送信',
      loginTitle: 'スタッフログイン',
      loginSub: '店舗コードを入力（スタッフは作業画面で選択）',
      storeCode: '店舗コード',
      loginBtn: '入る',
      loginErr: 'コードが正しくありません',
      backHome: '← 入口へ戻る',
      tabLog: '記録する',
      tabBoard: '本日のタイムテーブル',
      logout: 'ログアウト',
      pickTech: 'スタッフ',
      pickCourse: 'コース',
      pickSlot: '時間表',
      boardHint: 'セルをタップして開始位置を選ぶ。既存の記録をタップすると削除できます',
      courseHint: 'コースを選ぶと施術時間が自動で入ります。上の表で開始位置を選んでから「送信」',
      min: '分',
      saved: '記録しました',
      needPick: 'スタッフ・コース・開始位置を選んでください',
      submit: '送信して保存',
      clearPick: '選択クリア',
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
      resourceCol: 'リソース',
    },
    cn: {
      portalTitle: '技师工作记录',
      portalSub: '选择技师与项目，在时间表点选开始位置后提交保存',
      loginTitle: '技师端登录',
      loginSub: '输入门店识别码（技师名在工作页选择）',
      storeCode: '门店识别码',
      loginBtn: '进入',
      loginErr: '识别码无效，请重试',
      backHome: '← 返回平台入口',
      tabLog: '记工',
      tabBoard: '今日时间表',
      logout: '退出',
      pickTech: '技师',
      pickCourse: '项目',
      pickSlot: '时间表',
      boardHint: '点击格子选择开始位置；点击已有记录可删除',
      courseHint: '选项目会自动带入时长；若已点选表上位置，会同步更新该段时长。需点「提交保存」才会写入',
      min: '分钟',
      saved: '已记录',
      needPick: '请选择技师、项目，并在时间表点选开始位置',
      submit: '提交保存',
      clearPick: '清除选择',
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
      resourceCol: '资源',
    },
    en: {
      portalTitle: 'Therapist work log',
      portalSub: 'Pick staff and course, tap a start cell on the board, then submit',
      loginTitle: 'Staff login',
      loginSub: 'Enter store code (choose staff on the work screen)',
      storeCode: 'Store code',
      loginBtn: 'Enter',
      loginErr: 'Invalid code',
      backHome: '← Back to hub',
      tabLog: 'Log work',
      tabBoard: 'Today timeline',
      logout: 'Log out',
      pickTech: 'Staff',
      pickCourse: 'Course',
      pickSlot: 'Timeline',
      boardHint: 'Tap a cell to set start. Tap an existing block to delete.',
      courseHint: 'Choosing a course sets duration. If a board cell is selected, its length updates. Submit to save.',
      min: 'min',
      saved: 'Saved',
      needPick: 'Select staff, course and a start cell on the board',
      submit: 'Submit & save',
      clearPick: 'Clear selection',
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
      resourceCol: 'Resource',
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
    const parts = base.split('/').map((x) => x.trim()).filter(Boolean);
    if (parts.length >= 2 && !/[a-zA-Z]{3,}/.test(parts[0])) {
      if (lang === 'jp') return parts[0];
      if (lang === 'cn') return parts[1] || parts[0];
      return parts[0];
    }
    return base;
  }

  /** 去掉名称末尾自带的时长，避免和单独的时长行重复 */
  function courseTitle(course) {
    return String(courseLabel(course) || '')
      .replace(/\s*[\(（]?\s*\d+\s*(分|分钟|mins?|minutes?)\s*[\)）]?\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  global.TechI18n = { getLang, setLang, t, techName, courseLabel, courseTitle, DICT };
})(window);
