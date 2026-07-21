/**
 * 邮件前端配置（不含密码）
 * 代发服务见 /server；Gmail 应用密码只放 server/.env
 */
window.EMAIL_CONFIG = {
  /** 本机代发服务地址；GitHub Pages 无法访问你电脑 localhost */
  apiBaseUrl: 'http://127.0.0.1:8787',
  /** 若 server/.env 设置了 API_KEY，这里填同一个；否则留空 */
  apiKey: '',
  /** 发件展示名（真实 From 由服务端 Gmail 决定） */
  fromLabel: 'summerriverfall@gmail.com',
};
