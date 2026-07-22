/**
 * 一次性授权：用「有日历编辑权限」的 Google 账号登录，生成 refresh token。
 *
 * 若在国内网络：先开 VPN。本脚本会自动尝试本机常见代理端口（如 7897）。
 *
 * 用法：
 *   cd server
 *   npm run auth-google
 */
require('dotenv').config();
const http = require('http');
const net = require('net');
const { URL } = require('url');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

function canConnect(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(400, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function ensureProxy() {
  if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
    console.log('[proxy] 使用已有代理', process.env.HTTPS_PROXY || process.env.HTTP_PROXY);
    return;
  }
  const candidates = [7897, 7890, 10809, 10808];
  for (const port of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await canConnect(port)) {
      const url = `http://127.0.0.1:${port}`;
      process.env.HTTPS_PROXY = url;
      process.env.HTTP_PROXY = url;
      console.log('[proxy] 自动使用本机代理', url);
      return;
    }
  }
  console.warn('[proxy] 未检测到本机代理，若换 token 失败请开启 VPN 后重试');
}

function upsertEnv(key, val) {
  const envPath = path.join(__dirname, '.env');
  let text = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const re = new RegExp('^' + key + '=.*$', 'm');
  if (re.test(text)) text = text.replace(re, key + '=' + val);
  else {
    if (text && !text.endsWith('\n')) text += '\n';
    text += key + '=' + val + '\n';
  }
  fs.writeFileSync(envPath, text);
}

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT = 'http://127.0.0.1:8765/oauth2callback';
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('请先在 .env 填写 GOOGLE_CLIENT_ID 与 GOOGLE_CLIENT_SECRET');
  process.exit(1);
}

(async () => {
  await ensureProxy();

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
      if (tokens.refresh_token) {
        upsertEnv('GOOGLE_REFRESH_TOKEN', tokens.refresh_token);
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        '<h2>授权成功</h2><p>refresh token 已写入 server/.env，可关闭此页。</p>'
      );
      console.log('\n===== 授权成功 =====');
      if (tokens.refresh_token) {
        console.log('GOOGLE_REFRESH_TOKEN 已自动写入 .env');
      } else {
        console.log(
          '未返回 refresh_token：请到 Google 账号 → 安全性 → 第三方应用权限 撤销后重试'
        );
      }
      console.log('====================\n');
      server.close();
      process.exit(0);
    } catch (err) {
      const detail = [
        err && err.message,
        err && err.code,
        err && err.cause && err.cause.message,
        err && err.response && err.response.data && JSON.stringify(err.response.data),
      ]
        .filter(Boolean)
        .join(' | ');
      console.error('\n换取 token 失败：');
      console.error(detail || err);
      console.error('\n可手动设置代理后重试：');
      console.error('  set HTTPS_PROXY=http://127.0.0.1:7897');
      console.error('  npm run auth-google\n');
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        '<h2>换取 token 失败</h2><p>请开启 VPN/代理后重试 npm run auth-google。</p><pre>' +
          String(detail || err) +
          '</pre>'
      );
      process.exit(1);
    }
  });

  server.listen(8765, '127.0.0.1', () => {
    console.log('请在浏览器打开以下链接，使用「有日历编辑权限」的账号登录授权：\n');
    console.log(authUrl);
    console.log('\n等待回调 http://127.0.0.1:8765/oauth2callback ...');
    try {
      const { exec } = require('child_process');
      exec(`start "" "${authUrl}"`);
    } catch (_) {
      /* ignore */
    }
  });
})();
