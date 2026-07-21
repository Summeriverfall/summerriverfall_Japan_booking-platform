# 通知网关：邮件 + Google 日历

## 已有能力

- Gmail SMTP 发商家邮件（见下文「邮件」）
- 确认/改期后同步写入 [Google Calendar](https://calendar.google.com/calendar/u/0/r)

## 日历事件格式（对齐现有手工录入）

- **标题**：`3人，60分钟精油护理`（人数 + 时长 + 项目）
- **正文**（英文结构，与 Oasis 示例一致）：

```
Your appointment has been confirmed.
SHOP: Relaxation Ruana
Name: ...
Time: 7/21, 12:00
Number of Guests: 3
Service: ... 60 min
Contact (WhatsApp): ...
Beds: 1号床、2号床
Booking ID: ...
We look forward to welcoming you.
```

改期时首句为 `Your appointment has been updated.`

---

## 一、邮件（你已跑通可跳过）

`.env` 中配置 `GMAIL_USER` / `GMAIL_APP_PASSWORD`，`npm start` 后客服页点发送。

---

## 二、Google Calendar 授权（首次）

### 1. Google Cloud

1. 打开 [Google Cloud Console](https://console.cloud.google.com/)
2. 新建或选择项目 → 启用 **Google Calendar API**
3. **OAuth 同意屏幕**：用户类型选外部；测试用户加上你的 Gmail  
   （必须是**对该日历有编辑权限**的账号，例如能改 Ruana 日历的那个）
4. **凭据** → 创建凭据 → **OAuth 客户端 ID** → 应用类型选 **桌面应用**
5. 复制 Client ID、Client Secret 写入 `server/.env`：

```
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=....
```

### 2. 本机拿 refresh token

```powershell
cd d:\Work\Project\GYOZOKU-EN-booking-platform\server
npm install
npm run auth-google
```

浏览器登录授权后，终端会打印 `GOOGLE_REFRESH_TOKEN=...`，粘贴进 `.env`。

### 3. 查日历 ID，填到门店配置

```powershell
npm run list-calendars
```

在输出里找到例如 `Ruana`，把 `id:` 那一行复制到 `admin/stores.js`：

```js
googleCalendarId: 'xxxxxxxx@group.calendar.google.com',
googleCalendarName: 'Ruana',
```

Starry Flow 若还没有独立日历，可先在 Google 日历新建一个再填 ID。

### 4. 重启网关

```powershell
npm start
```

打开 http://127.0.0.1:8787/health ，应看到 `"calendarConfigured": true`。

---

## 三、客服怎么用

本机打开客服看板 → 确认预约 → 预览区点 **「发送邮件并同步日历」**。  
会先后：发 QQ/商家邮箱 + 写入对应门店 Google 日历。改期再次点会**更新同一条**日历事件（不会重复堆很多条）。
