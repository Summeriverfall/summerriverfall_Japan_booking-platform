(() => {
  const root = document.querySelector('.fab-booking');
  if (!root) return;

  const lang = document.documentElement.lang || 'en';
  const labels = {
    'zh-CN': {
      toggle: '预约',
      close: '关闭',
      wechat: '微信预约',
      line: 'LINE 预约',
      wa: 'WhatsApp 预约',
    },
    en: {
      toggle: 'Book',
      close: 'Close',
      wechat: 'WeChat booking',
      line: 'LINE booking',
      wa: 'WhatsApp booking',
    },
    ja: {
      toggle: '予約',
      close: '閉じる',
      wechat: 'WeChat予約',
      line: 'LINE予約',
      wa: 'WhatsApp予約',
    },
  };
  const t = labels[lang] || labels.en;

  const toggle = root.querySelector('.fab-booking__toggle');
  const menu = root.querySelector('.fab-booking__menu');
  const labelEl = root.querySelector('.fab-booking__label');
  const modal = document.getElementById('fab-qr-modal');
  const modalImg = modal?.querySelector('.fab-modal__img');
  const modalClose = modal?.querySelector('.fab-modal__close');
  const backdrop = modal?.querySelector('.fab-modal__backdrop');

  if (labelEl) labelEl.textContent = t.toggle;

  const wa = root.querySelector('.fab-booking__item--wa');
  const line = root.querySelector('.fab-booking__item--line');
  const wechat = root.querySelector('.fab-booking__item--wechat');
  if (wa) wa.setAttribute('aria-label', t.wa);
  if (line) line.setAttribute('aria-label', t.line);
  if (wechat) wechat.setAttribute('aria-label', t.wechat);
  if (modalClose) modalClose.setAttribute('aria-label', t.close);

  const setExpanded = (open) => {
    root.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (menu) menu.hidden = !open;
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setExpanded(!root.classList.contains('is-open'));
  });

  root.querySelectorAll('[data-qr]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const src = btn.getAttribute('data-qr');
      if (!modal || !modalImg || !src) return;
      modalImg.src = src;
      modalImg.alt = btn.getAttribute('aria-label') || '';
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
    });
  });

  const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    if (modalImg) modalImg.removeAttribute('src');
    document.body.style.overflow = '';
  };

  modalClose?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (modal && !modal.hidden) closeModal();
    else if (root.classList.contains('is-open')) setExpanded(false);
  });
})();
