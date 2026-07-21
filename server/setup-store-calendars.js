/**
 * 为各门店创建/对齐独立 Google 日历（不同颜色 = 月视图不同色点）
 */
require('dotenv').config();
const calendar = require('./calendar');

const STORES = [
  { storeId: 'runana', name: 'Ruana', colorId: '6' }, // 橘
  { storeId: 'starryflow', name: 'Starry Flow Spa', colorId: '9' }, // 蓝紫
];

(async () => {
  try {
    if (!calendar.isConfigured()) {
      console.error('未配置 Google OAuth，请先完成 auth-google');
      process.exit(1);
    }
    console.log('正在确保各店独立日历（不同色点）…\n');
    for (const s of STORES) {
      const c = await calendar.ensureNamedCalendar(s.name, s.colorId);
      console.log(`[${s.storeId}] ${c.summary}`);
      console.log(`  id: ${c.id}`);
      console.log(`  colorId: ${c.colorId}  bg: ${c.backgroundColor || '-'}`);
      console.log('');
    }
    console.log('请把上面的 id 填进 admin/stores.js 的 googleCalendarId。');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
