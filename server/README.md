# 商家邮件 · Gmail SMTP 代发

## 角色

- 发件：`summerriverfall@gmail.com`（Gmail SMTP）
- 收件（测试）：`1161132533@qq.com`（已写在门店配置里）

## 1. 生成 Gmail 应用专用密码

1. 打开 Google 账号：https://myaccount.google.com/security  
2. 开启「两步验证」（必须）  
3. 搜索「应用专用密码」→ 创建，名称可填 `booking-platform`  
4. 复制 16 位密码（只显示一次）

**不要把这个密码发给任何人，也不要提交到 Git。**

## 2. 本机配置并启动

```powershell
cd d:\Work\Project\GYOZOKU-EN-booking-platform\server
copy .env.example .env
notepad .env
```

在 `.env` 里把 `GMAIL_APP_PASSWORD=` 换成你的 16 位应用密码，保存。

```powershell
npm install
npm start
```

看到 `listening on http://127.0.0.1:8787` 即成功。  
浏览器打开 http://127.0.0.1:8787/health 应显示 `"gmailConfigured": true`。

## 3. 前端怎么发

客服看板生成邮件预览后，点 **「发送给商家」**。  
前端会请求本机代发服务（默认 `http://127.0.0.1:8787/send`）。

注意：用 GitHub Pages 打开的网页，浏览器往往无法访问你电脑上的 `127.0.0.1`。  
真发信请用本机打开客服页（或本地静态服务），并保持 `npm start` 在跑。

## 4. 调收件人

改 `admin/stores.js` 里各店的 `merchantEmail`。
