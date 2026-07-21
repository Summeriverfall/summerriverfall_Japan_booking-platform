/**
 * 列出当前授权账号可访问的日历（用于填写 stores.js 的 googleCalendarId）
 */
require('dotenv').config();
const calendar = require('./calendar');

(async () => {
  try {
    if (!calendar.isConfigured()) {
      console.error('尚未配置 GOOGLE_*，请先填 Client ID/Secret 并运行 npm run auth-google');
      process.exit(1);
    }
    const list = await calendar.listCalendars();
    console.log(`共 ${list.length} 个日历：\n`);
    list.forEach((c) => {
      console.log(`- ${c.summary}`);
      console.log(`  id: ${c.id}`);
      console.log(`  role: ${c.accessRole}${c.primary ? ' (primary)' : ''}`);
      console.log('');
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
