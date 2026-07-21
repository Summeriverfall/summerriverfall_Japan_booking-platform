/**
 * 调用本机 / 云端邮件代发 API
 */
(function (global) {
  function cfg() {
    return global.EMAIL_CONFIG || { apiBaseUrl: 'http://127.0.0.1:8787', apiKey: '' };
  }

  async function health() {
    const base = String(cfg().apiBaseUrl || '').replace(/\/$/, '');
    const res = await fetch(`${base}/health`);
    if (!res.ok) throw new Error(`代发服务不可用 HTTP ${res.status}`);
    return res.json();
  }

  /**
   * @param {{ to: string, subject: string, text: string, chartDataUrl?: string, storeId?: string, bookingId?: string, eventType?: string }} payload
   */
  async function sendMerchantMail(payload) {
    const base = String(cfg().apiBaseUrl || '').replace(/\/$/, '');
    if (!base) throw new Error('未配置 EMAIL_CONFIG.apiBaseUrl');
    if (!payload || !payload.to) throw new Error('商家收件邮箱未配置');

    const headers = { 'Content-Type': 'application/json' };
    if (cfg().apiKey) headers['x-api-key'] = cfg().apiKey;

    const res = await fetch(`${base}/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
    if (!res.ok || !data || !data.ok) {
      const msg = (data && data.error) || `发送失败 HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  global.EmailClient = { health, sendMerchantMail };
})(window);
