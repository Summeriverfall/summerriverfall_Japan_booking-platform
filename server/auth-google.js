/**
 * 一次性授权：用「有日历编辑权限」的 Google 账号登录，生成 refresh token。
 *
 * 前置：
 * 1. Google Cloud Console 创建项目，启用 Google Calendar API
 * 2. 配置 OAuth 同意屏幕（测试用户加上你的邮箱）
 * 3. 创建 OAuth 客户端 → 桌面应用，下载 JSON 或复制 Client ID/Secret 到 .env
 *
 * 用法：
 *   cd server
 *   npm run auth-google
 */
require('dotenv').config();
const http = require('http');
const { URL } = require('url');
const { google } = require('googleapis');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT = 'http://127.0.0.1:8765/oauth2callback';
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('请先在 .env 填写 GOOGLE_CLIENT_ID 与 GOOGLE_CLIENT_SECRET');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT);
const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
});

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, REDIRECT);
    if (u.pathname !== '/oauth2callback') {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const code = u.searchParams.get('code');
    if (!code) {
      res.writeHead(400);
      res.end('Missing code');
      return;
    }
    const { tokens } = await oauth2.getToken(code);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(
      '<h2>授权成功</h2><p>可以关闭此页，回到终端复制 refresh_token。</p>'
    );
    console.log('\n===== 把下面这一行写入 server/.env =====\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token || ''}`);
    if (!tokens.refresh_token) {
      console.log(
        '\n（未返回 refresh_token：请确认 prompt=consent，或在 Google 账号权限里撤销后重试）'
      );
    }
    console.log('\n======================================\n');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    res.writeHead(500);
    res.end(String(err.message || err));
    process.exit(1);
  }
});

server.listen(8765, '127.0.0.1', () => {
  console.log('请在浏览器打开以下链接，使用「有日历编辑权限」的账号登录授权：\n');
  console.log(authUrl);
  console.log('\n等待回调 http://127.0.0.1:8765/oauth2callback ...');
});
