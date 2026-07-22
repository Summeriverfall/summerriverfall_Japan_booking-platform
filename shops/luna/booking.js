(() => {
  const WHATSAPP_PHONE = '85290744644';
  const form = document.getElementById('booking-form');
  if (!form) return;

  const lang = document.documentElement.lang || 'en';
  const params = new URLSearchParams(window.location.search);
  const presetService = params.get('service');

  const copy = {
    'zh-CN': {
      required: '请填写此字段',
      messageTitle: '【Luna spa 河原町店 预约】',
      service: '服务项目',
      date: '预约日期',
      time: '预约时间',
      guests: '人数',
      name: '姓名',
      guestOptions: ['1 位', '2 位', '3 位', '4 位', '5 位及以上'],
      guestPlaceholder: '请选择人数',
      samePackage: '所有客人都选择同一套餐',
      extraTitle: '其他客人服务项目（如不同）',
      guestLabel: (n) => `客人 ${n}`,
      selectService: '请选择服务项目',
      allSame: '（所有客人相同）',
    },
    ja: {
      required: '入力してください',
      messageTitle: '【Luna spa 河原町店 ご予約】',
      service: 'サービス',
      date: '予約日',
      time: '予約時間',
      guests: '人数',
      name: 'お名前',
      guestOptions: ['1名', '2名', '3名', '4名', '5名以上'],
      guestPlaceholder: '人数を選択',
      samePackage: '全員が同じコースを選択',
      extraTitle: '他の方のサービス（異なる場合）',
      guestLabel: (n) => `${n}名目`,
      selectService: 'サービスを選択',
      allSame: '（全員同じ）',
    },
    en: {
      required: 'Please fill in this field',
      messageTitle: '[Luna spa 河原町店 Booking]',
      service: 'Service',
      date: 'Date',
      time: 'Time',
      guests: 'Guests',
      name: 'Name',
      guestOptions: ['1 guest', '2 guests', '3 guests', '4 guests', '5+ guests'],
      guestPlaceholder: 'Select number of guests',
      samePackage: 'All guests choose the same package',
      extraTitle: "Additional Guests' Services (if different)",
      guestLabel: (n) => `Guest ${n}`,
      selectService: 'Select a service',
      allSame: '(all guests)',
    },
  };

  const t = copy[lang] || copy.en;
  const serviceSelect = form.querySelector('[name="service"]');
  const guestsSelect = form.querySelector('[name="guests"]');
  const submitBtn = form.querySelector('.booking-submit');

  const parseGuestCount = (value) => {
    if (!value) return 0;
    const num = parseInt(value, 10);
    return Number.isNaN(num) ? 0 : num;
  };

  const getServiceOptions = () =>
    [...serviceSelect.options]
      .filter((opt) => opt.value)
      .map((opt) => ({ value: opt.value, text: opt.textContent }));

  const buildServiceSelect = (name, required = true) => {
    const select = document.createElement('select');
    select.name = name;
    select.className = 'guest-service-select';
    if (required) select.required = true;

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = t.selectService;
    select.appendChild(placeholder);

    getServiceOptions().forEach(({ value, text }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.appendChild(option);
    });

    return select;
  };

  const panel = document.createElement('div');
  panel.className = 'guest-package-panel';
  panel.hidden = true;

  const checkWrap = document.createElement('div');
  checkWrap.className = 'form-check';

  const samePackageInput = document.createElement('input');
  samePackageInput.type = 'checkbox';
  samePackageInput.id = 'same-package';
  samePackageInput.name = 'same_package';
  samePackageInput.checked = true;

  const samePackageLabel = document.createElement('label');
  samePackageLabel.htmlFor = 'same-package';
  samePackageLabel.textContent = t.samePackage;

  checkWrap.append(samePackageInput, samePackageLabel);

  const extraSection = document.createElement('div');
  extraSection.className = 'extra-guest-services';
  extraSection.hidden = true;

  const extraTitle = document.createElement('p');
  extraTitle.className = 'extra-guest-services__title';
  extraTitle.textContent = t.extraTitle;

  const extraList = document.createElement('div');
  extraList.className = 'extra-guest-services__list';

  extraSection.append(extraTitle, extraList);
  panel.append(checkWrap, extraSection);

  if (submitBtn) {
    form.insertBefore(panel, submitBtn);
  } else {
    form.appendChild(panel);
  }

  const rebuildExtraGuestFields = () => {
    extraList.innerHTML = '';
    const count = parseGuestCount(guestsSelect?.value);

    for (let i = 2; i <= count; i += 1) {
      const row = document.createElement('div');
      row.className = 'guest-service-row form-group';

      const label = document.createElement('label');
      label.textContent = t.guestLabel(i);

      const select = buildServiceSelect(`guest_service_${i}`);
      row.append(label, select);
      extraList.appendChild(row);

      select.addEventListener('invalid', () => {
        select.setCustomValidity(t.required);
      });
      select.addEventListener('change', () => {
        select.setCustomValidity('');
      });
    }
  };

  const updateGuestPackageUI = () => {
    const count = parseGuestCount(guestsSelect?.value);
    const multi = count > 1;

    panel.hidden = !multi;

    if (!multi) {
      extraSection.hidden = true;
      return;
    }

    rebuildExtraGuestFields();
    extraSection.hidden = samePackageInput.checked;

    extraList.querySelectorAll('select').forEach((select) => {
      const active = !samePackageInput.checked;
      select.required = active;
      select.disabled = !active;
    });
  };

  if (presetService && serviceSelect) {
    const decoded = decodeURIComponent(presetService.replace(/\+/g, ' '));
    const options = [...serviceSelect.options];
    const exact = options.find((opt) => opt.value === decoded);
    const prefix = options.find((opt) => opt.value && opt.value.startsWith(decoded));
    const match = exact || prefix;

    if (match) {
      serviceSelect.value = match.value;
    } else {
      const option = document.createElement('option');
      option.value = decoded;
      option.textContent = decoded;
      option.selected = true;
      serviceSelect.appendChild(option);
    }
  }

  const dateInput = form.querySelector('[name="date"]');
  if (dateInput) {
    dateInput.min = new Date().toISOString().split('T')[0];
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = new FormData(form);
    const guestCount = parseGuestCount(data.get('guests'));
    const samePackage = samePackageInput.checked || guestCount <= 1;
    const serviceLines = samePackage
      ? [`${t.service}：${data.get('service')} ${t.allSame}`]
      : [
          `${t.guestLabel(1)} ${t.service}：${data.get('service')}`,
          ...Array.from({ length: guestCount - 1 }, (_, idx) => {
            const guestNum = idx + 2;
            return `${t.guestLabel(guestNum)} ${t.service}：${data.get(`guest_service_${guestNum}`)}`;
          }),
        ];

    const lines = [
      t.messageTitle,
      ...serviceLines,
      `${t.date}：${data.get('date')}`,
      `${t.time}：${data.get('time')}`,
      `${t.guests}：${data.get('guests')}`,
      `${t.name}：${data.get('name')}`,
    ];

    const url = `https://api.whatsapp.com/send/?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(lines.join('\n'))}`;
    window.location.href = url;
  });

  form.querySelectorAll('[required]').forEach((field) => {
    field.addEventListener('invalid', () => {
      field.setCustomValidity(t.required);
    });
    field.addEventListener('input', () => {
      field.setCustomValidity('');
    });
    field.addEventListener('change', () => {
      field.setCustomValidity('');
    });
  });

  if (guestsSelect && guestsSelect.options.length <= 1) {
    guestsSelect.innerHTML = `<option value="">${t.guestPlaceholder}</option>`;
    t.guestOptions.forEach((label) => {
      const option = document.createElement('option');
      option.value = label;
      option.textContent = label;
      guestsSelect.appendChild(option);
    });
  }

  guestsSelect?.addEventListener('change', updateGuestPackageUI);
  samePackageInput.addEventListener('change', updateGuestPackageUI);
  updateGuestPackageUI();
})();
