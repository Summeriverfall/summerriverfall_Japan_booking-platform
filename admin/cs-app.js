(function () {
  if (!StoreRegistry.requireStoreOrRedirect('admin-portal.html')) return;
  StoreRegistry.setRole('admin');

  const cfg = STORE_CONFIG;
  function updateChrome() {
    const name = DeskI18n.storeName(cfg);
    document.title = `${DeskI18n.t('csBrand')} · ${name}`;
    document.getElementById('pageBrand').innerHTML =
      `${DeskI18n.t('csBrand')} · ${name}<div class="hint" style="margin:0" id="pageSub">${cfg.tagline} · ${cfg.hoursLabel} · ${cfg.bedCount} ${DeskI18n.t('bedsUnit')}</div>`;
  }
  DeskI18n.mountSwitch(document.querySelector('.topbar-right'));
  DeskI18n.applyDom();
  updateChrome();
  document.getElementById('navCs').href = `cs.html?store=${encodeURIComponent(cfg.storeId)}`;
  DeskI18n.onChange(() => {
    DeskI18n.applyDom();
    updateChrome();
    fillSelects();
    softRefresh();
  });

  const defaultHour = String(
    Math.min(cfg.openHour + 2, cfg.overnight ? 22 : cfg.closeHour - 1)
  ).padStart(2, '0');
  document.getElementById('startTime').value = `${defaultHour}:00`;

  const dateInput = document.getElementById('dateInput');
  const boardEl = document.getElementById('board');
  const listEl = document.getElementById('bookingList');
  const emailBox = document.getElementById('emailBox');
  const formErr = document.getElementById('formErr');
  const sideErr = document.getElementById('sideErr');
  const remainHint = document.getElementById('remainHint');
  const sidePanel = document.getElementById('sidePanel');
  const sideHint = document.getElementById('sideHint');
  const sideTitle = document.getElementById('sideTitle');
  const sideBeds = document.getElementById('sideBeds');
  const sideBodyBooking = document.getElementById('sideBodyBooking');
  const sideBodyOpenReq = document.getElementById('sideBodyOpenReq');
  const dailyEmailTimeEl = document.getElementById('dailyEmailTime');
  let lastPointer = { x: 80, y: 120 };

  let rangeSelection = null;
  let selectedBookingId = null;
  let selectedClosureId = null;
  /** 'booking' | 'openRequest' */
  let sideMode = 'booking';

  if (dailyEmailTimeEl) {
    dailyEmailTimeEl.value = BookingStore.getDailyEmailTime() || '00:00';
  }

  function fillSelects() {
    document.getElementById('course').innerHTML = STORE_CONFIG.courses
      .map((c) => `<option value="${c.id}">${escapeHtml(DeskI18n.courseLabel(c))}</option>`)
      .join('');
    document.getElementById('channel').innerHTML = STORE_CONFIG.channels
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join('');
    document.getElementById('channel').value = 'whatsapp';
  }

  function fillFormFromBooking(b) {
    document.getElementById('startTime').value = b.startTime;
    document.getElementById('duration').value = String(b.durationMinutes);
    document.getElementById('guests').value = String(b.guests || (b.beds || []).length || 1);
    document.getElementById('course').value = b.courseId || '';
    document.getElementById('channel').value = b.channelId || 'whatsapp';
    document.getElementById('guestName').value =
      b.guestName && b.guestName !== '预占' ? b.guestName : '';
    document.getElementById('guestPhone').value = b.guestPhone || '';
    document.getElementById('note').value = b.note || '';
    renderSideBeds(b.beds || []);
  }

  function renderSideBeds(selected) {
    const set = new Set((selected || []).map(Number));
    sideBeds.innerHTML = STORE_CONFIG.bedLabels
      .map(
        (raw, i) =>
          `<label class="bed-check-item"><input type="checkbox" value="${i}" ${
            set.has(i) ? 'checked' : ''
          }><span class="bed-check-text">${escapeHtml(DeskI18n.bedLabelAt(i))}</span></label>`
      )
      .join('');
  }

  function selectedBedsFromSide() {
    return [...sideBeds.querySelectorAll('input:checked')].map((x) => Number(x.value));
  }

  function currentDate() {
    return dateInput.value || BookingStore.todayBusinessDate();
  }

  function getMenuAnchorRect() {
    const selectedId = selectedBookingId || selectedClosureId;
    const attr = selectedBookingId ? 'data-booking-id' : 'data-closure-id';
    if (selectedId) {
      const blocks = [
        ...document.querySelectorAll(`.board-block[${attr}="${selectedId}"]`),
      ];
      if (blocks.length) {
        let left = Infinity;
        let top = Infinity;
        let right = -Infinity;
        let bottom = -Infinity;
        blocks.forEach((el) => {
          const r = el.getBoundingClientRect();
          left = Math.min(left, r.left);
          top = Math.min(top, r.top);
          right = Math.max(right, r.right);
          bottom = Math.max(bottom, r.bottom);
        });
        return { left, top, right, bottom };
      }
    }
    const sels = [...document.querySelectorAll('.board-selection')].filter(
      (el) => !el.hidden && el.offsetParent !== null
    );
    if (sels.length) {
      let left = Infinity;
      let top = Infinity;
      let right = -Infinity;
      let bottom = -Infinity;
      sels.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 2 && r.height < 2) return;
        left = Math.min(left, r.left);
        top = Math.min(top, r.top);
        right = Math.max(right, r.right);
        bottom = Math.max(bottom, r.bottom);
      });
      if (right > left) return { left, top, right, bottom };
    }
    return null;
  }

  function placeCtxMenu() {
    const pad = 8;
    const gap = 8;
    sidePanel.hidden = false;
    sidePanel.classList.add('is-open');
    sidePanel.setAttribute('aria-hidden', 'false');
    // 先放到屏外测量真实尺寸
    sidePanel.style.left = '-9999px';
    sidePanel.style.top = '0px';
    const menu = sidePanel.getBoundingClientRect();
    const anchor = getMenuAnchorRect();

    let left;
    let top;
    if (anchor) {
      // 默认紧贴预约格右侧
      left = anchor.right + gap;
      top = anchor.top;
      // 右侧放不下 → 改贴左侧
      if (left + menu.width > window.innerWidth - pad) {
        left = anchor.left - menu.width - gap;
      }
      if (left < pad) left = pad;
      if (top + menu.height > window.innerHeight - pad) {
        top = Math.max(pad, window.innerHeight - menu.height - pad);
      }
      if (top < pad) top = pad;
    } else {
      left = Math.min(lastPointer.x + gap, window.innerWidth - menu.width - pad);
      top = Math.min(lastPointer.y + gap, window.innerHeight - menu.height - pad);
      left = Math.max(pad, left);
      top = Math.max(pad, top);
    }
    sidePanel.style.left = `${left}px`;
    sidePanel.style.top = `${top}px`;
  }

  function setSideMode(mode) {
    sideMode = mode === 'openRequest' ? 'openRequest' : 'booking';
    if (sideBodyBooking) sideBodyBooking.hidden = sideMode !== 'booking';
    if (sideBodyOpenReq) sideBodyOpenReq.hidden = sideMode !== 'openRequest';
    if (sideTitle) {
      sideTitle.textContent =
        sideMode === 'openRequest' ? DeskI18n.t('sideOpenReq') : DeskI18n.t('sideBookingEdit');
    }
  }

  function openSide(msg, point) {
    if (msg) sideHint.textContent = msg;
    if (point && point.x != null) {
      lastPointer = { x: point.x, y: point.y };
    }
    const createBtn = document.getElementById('btnCreate');
    const holdBtn = document.getElementById('btnHold');
    const deleteBtn = document.getElementById('btnDeleteBooking');
    const convertBtn = document.getElementById('btnConvertHold');
    const requestOpenBtn = document.getElementById('btnRequestOpen');

    if (sideMode === 'openRequest') {
      setSideMode('openRequest');
      if (createBtn) createBtn.hidden = true;
      if (holdBtn) holdBtn.hidden = true;
      if (deleteBtn) deleteBtn.hidden = true;
      if (convertBtn) convertBtn.hidden = true;
      if (requestOpenBtn) {
        requestOpenBtn.hidden = false;
        const c =
          BookingStore.listClosures(currentDate()).find((x) => x.id === selectedClosureId) ||
          {};
        requestOpenBtn.textContent =
          c.openRequestStatus === 'requested'
            ? DeskI18n.t('btnRequestOpenAgain')
            : DeskI18n.t('btnRequestOpen');
      }
      requestAnimationFrame(() => placeCtxMenu());
      return;
    }

    setSideMode('booking');
    const booking = selectedBookingId
      ? BookingStore.load().bookings.find((b) => b.id === selectedBookingId)
      : null;
    const isHold = booking && booking.status === 'hold';

    if (createBtn) {
      // 预占只显示「转为预约 / 释放」，不提供保存修改；转成预约后再改
      createBtn.hidden = isHold;
      createBtn.textContent = selectedBookingId
        ? DeskI18n.t('btnSaveBooking')
        : DeskI18n.t('btnCreate');
    }
    if (holdBtn) holdBtn.hidden = Boolean(selectedBookingId);
    if (convertBtn) convertBtn.hidden = !isHold;
    if (requestOpenBtn) requestOpenBtn.hidden = true;
    if (deleteBtn) {
      deleteBtn.hidden = !selectedBookingId;
      deleteBtn.textContent = isHold
        ? DeskI18n.t('btnReleaseHold')
        : DeskI18n.t('btnDeleteBooking');
    }
    requestAnimationFrame(() => placeCtxMenu());
  }

  async function removeGoogleEventForBooking(booking) {
    if (!booking || !window.EmailClient) return { ok: true, skipped: true };
    if (!booking.googleEventId && !booking.id) return { ok: true, skipped: true };
    const calendarId =
      booking.googleCalendarId || STORE_CONFIG.googleCalendarId || '';
    try {
      await EmailClient.deleteCalendarEvent({
        calendarId,
        eventId: booking.googleEventId || null,
        bookingId: booking.id || null,
        aroundDateTime: `${booking.date}T${booking.startTime}:00+08:00`,
      });
      BookingStore.setGoogleEvent(booking.id, {
        eventId: null,
        htmlLink: null,
        calendarId: null,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err && err.message) || String(err) };
    }
  }

  async function doDeleteBooking(bookingId) {
    const id = bookingId || selectedBookingId;
    if (!id) return;
    const state = BookingStore.load();
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking) return;
    const isHold = booking.status === 'hold';
    if (
      !confirm(
        isHold
          ? '释放该预占？若已同步日历将一并删除。'
          : '确认删除该预约？将从看板移除，并删除对应 Google 日历事件。'
      )
    ) {
      return;
    }

    const cal = await removeGoogleEventForBooking(booking);
    const r = BookingStore.cancelBooking(id, isHold ? '释放预占' : '客服删除');
    if (!r.ok) {
      alert(r.error || '删除失败');
      return;
    }
    selectedBookingId = null;
    rangeSelection = null;
    closeSide();
    refresh();
    formErr.className = cal.ok ? 'hint ok' : 'hint warn';
    formErr.textContent = cal.ok
      ? isHold
        ? '已释放预占，日历已同步删除（如有）。'
        : '已删除预约，Google 日历已同步删除（如有）。'
      : `已删除预约，但日历删除失败：${cal.error}（可稍后在日历手动删）`;
    if (!isHold && booking.status === 'confirmed') {
      // 可选：生成取消邮件预览，方便通知商家
      const cancelled = Object.assign({}, booking, { status: 'cancelled' });
      showEmail(cancelled, 'cancel');
    }
  }

  function closeSide() {
    sidePanel.classList.remove('is-open', 'is-drag-hidden', 'is-drag-faded');
    sidePanel.setAttribute('aria-hidden', 'true');
    sidePanel.hidden = true;
  }

  function fadeSideDuringDrag() {
    if (sidePanel.hidden) return;
    sidePanel.classList.add('is-drag-faded');
    sidePanel.classList.remove('is-drag-hidden');
  }

  function clearRangeSelection(msg) {
    rangeSelection = null;
    selectedBookingId = null;
    selectedClosureId = null;
    closeSide();
    formErr.className = 'hint ok';
    formErr.textContent = msg || '已取消选择';
    refresh();
  }

  function formPayload(mode) {
    const beds = selectedBedsFromSide();
    const guests = Number(document.getElementById('guests').value) || 1;
    return {
      mode: mode || 'create',
      date: currentDate(),
      startTime: document.getElementById('startTime').value,
      durationMinutes: Number(document.getElementById('duration').value) || 60,
      guests: beds.length ? Math.max(guests, beds.length) : guests,
      beds: beds.length ? beds : undefined,
      courseId: document.getElementById('course').value,
      channelId: document.getElementById('channel').value,
      guestName: document.getElementById('guestName').value.trim(),
      guestPhone: document.getElementById('guestPhone').value.trim(),
      note: document.getElementById('note').value.trim(),
    };
  }

  function applyParsedToForm(parsed) {
    if (parsed.date) dateInput.value = parsed.date;
    if (parsed.startTime) document.getElementById('startTime').value = parsed.startTime;
    if (parsed.durationMinutes) {
      document.getElementById('duration').value = String(parsed.durationMinutes);
    }
    if (parsed.guests) document.getElementById('guests').value = String(parsed.guests);
    if (parsed.courseId) document.getElementById('course').value = parsed.courseId;
    if (parsed.channelId) document.getElementById('channel').value = parsed.channelId;
    if (parsed.guestName) document.getElementById('guestName').value = parsed.guestName;
    if (parsed.guestPhone) document.getElementById('guestPhone').value = parsed.guestPhone;
    if (parsed.note) document.getElementById('note').value = parsed.note;

    // 按人数预勾床位（从空床里取）
    const guests = parsed.guests || 1;
    const date = currentDate();
    const start = document.getElementById('startTime').value;
    const dur = Number(document.getElementById('duration').value) || 60;
    const free = BookingStore.findFreeBeds(date, start, dur, guests);
    renderSideBeds(free.length ? free : Array.from({ length: Math.min(guests, cfg.bedCount) }, (_, i) => i));

    if (start && Number.isFinite(BookingStore.timeToOffset(start))) {
      const startOff = BookingStore.timeToOffset(start);
      rangeSelection = {
        bedIndex: free[0] != null ? free[0] : 0,
        bedIndexes: free.length ? free : [0],
        startOffset: startOff,
        endOffset: startOff + dur,
      };
    }
  }

  function showEmail(booking, eventType, customDraft) {
    const draft =
      customDraft ||
      (eventType === 'open_request'
        ? BoardUI.buildOpenRequestEmail(booking)
        : eventType === 'daily'
          ? BoardUI.buildDailyDigestEmail(booking.date || currentDate())
          : BoardUI.buildEmailDraft(booking, eventType));
    const skipCalendar =
      eventType === 'cancel' ||
      eventType === 'open_request' ||
      eventType === 'daily';
    const calDraft =
      booking && booking.id && !skipCalendar
        ? BoardUI.buildCalendarDraft(booking, eventType)
        : null;
    const to = STORE_CONFIG.merchantEmail || '';
    const calHint = STORE_CONFIG.googleCalendarId
      ? `日历：${escapeHtml(STORE_CONFIG.googleCalendarName || STORE_CONFIG.googleCalendarId)}`
      : '日历：尚未配置 googleCalendarId';
    const dateKey = (booking && booking.date) || currentDate();
    const sendLabel =
      eventType === 'cancel'
        ? '发送取消邮件'
        : eventType === 'open_request'
          ? '发送开床申请邮件'
          : eventType === 'daily'
            ? '立即发送每日汇总'
            : '发送邮件并重写当日日历';
    emailBox.innerHTML = `
      <div class="mail-subject-row">
        <strong>主题：</strong>
        <span class="mail-subject-view" id="mailSubjectView" title="点击编辑主题">${escapeHtml(
          draft.subject
        )}</span>
        <input class="mail-subject-edit" id="mailSubjectEdit" hidden value="${escapeHtml(
          draft.subject
        )}">
      </div>
      <div class="hint" style="margin-top:.35rem">发件：${escapeHtml(
        (window.EMAIL_CONFIG && window.EMAIL_CONFIG.fromLabel) || 'summerriverfall@gmail.com'
      )} → 收件：${escapeHtml(to || '（待配置商家邮箱）')} · ${calHint}</div>
      <div class="hint" style="margin-top:.25rem">${
        eventType === 'cancel'
          ? '删除时已尝试同步移除日历事件；此处可再发取消邮件通知商家'
          : eventType === 'open_request'
            ? '开床申请不会改日历；发送后请商家在商家端处理'
            : eventType === 'daily'
              ? '每日汇总不会改日历；也可由网关按设定时刻自动发送'
              : `日历标题预览：${escapeHtml((calDraft && calDraft.summary) || '')}`
      }</div>
      <div class="hint" style="margin-top:.35rem">正文（点击后可编辑）：</div>
      <pre class="mail-body-view" id="mailBodyView" title="点击编辑正文">${escapeHtml(
        draft.body
      )}</pre>
      <textarea class="mail-body-edit" id="mailBodyEdit" hidden></textarea>
      <div class="hint">床位使用时段状态图（将随邮件发送）：</div>
      <img alt="床位状态图" src="${draft.chartDataUrl}">
      <div class="actions" style="margin-top:.6rem;display:flex;gap:.4rem;flex-wrap:wrap;align-items:center">
        <button class="btn primary" type="button" id="btnSendMail">${sendLabel}</button>
        <a class="btn" download="bed-status-${dateKey}.png" href="${draft.chartDataUrl}">下载状态图</a>
        <button class="btn" type="button" id="btnCopyMail">复制邮件正文</button>
        <span class="hint" id="mailSendStatus">需本机运行 server 通知网关</span>
      </div>
    `;
    const statusEl = document.getElementById('mailSendStatus');
    const bodyView = document.getElementById('mailBodyView');
    const bodyEdit = document.getElementById('mailBodyEdit');
    const subjectView = document.getElementById('mailSubjectView');
    const subjectEdit = document.getElementById('mailSubjectEdit');
    let bodyText = draft.body;
    let subjectText = draft.subject;

    function enterBodyEdit() {
      if (!bodyView || !bodyEdit || !bodyEdit.hidden) return;
      bodyEdit.value = bodyText;
      bodyView.hidden = true;
      bodyEdit.hidden = false;
      bodyEdit.focus();
      bodyEdit.setSelectionRange(bodyEdit.value.length, bodyEdit.value.length);
    }
    function leaveBodyEdit() {
      if (!bodyView || !bodyEdit || bodyEdit.hidden) return;
      bodyText = bodyEdit.value;
      bodyView.textContent = bodyText;
      bodyEdit.hidden = true;
      bodyView.hidden = false;
    }
    function enterSubjectEdit() {
      if (!subjectView || !subjectEdit || !subjectEdit.hidden) return;
      subjectEdit.value = subjectText;
      subjectView.hidden = true;
      subjectEdit.hidden = false;
      subjectEdit.focus();
      subjectEdit.select();
    }
    function leaveSubjectEdit() {
      if (!subjectView || !subjectEdit || subjectEdit.hidden) return;
      subjectText = subjectEdit.value.trim() || subjectText;
      subjectView.textContent = subjectText;
      subjectEdit.hidden = true;
      subjectView.hidden = false;
    }

    if (bodyView) bodyView.addEventListener('click', enterBodyEdit);
    if (subjectView) subjectView.addEventListener('click', enterSubjectEdit);
    if (bodyEdit) {
      bodyEdit.addEventListener('blur', leaveBodyEdit);
      bodyEdit.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          bodyEdit.blur();
        }
      });
    }
    if (subjectEdit) {
      subjectEdit.addEventListener('blur', leaveSubjectEdit);
      subjectEdit.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          subjectEdit.blur();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          subjectEdit.value = subjectText;
          subjectEdit.blur();
        }
      });
    }

    const getEditedBody = () =>
      bodyEdit && !bodyEdit.hidden ? bodyEdit.value : bodyText;
    const getEditedSubject = () =>
      subjectEdit && !subjectEdit.hidden
        ? subjectEdit.value.trim() || subjectText
        : subjectText;
    const btnCopy = document.getElementById('btnCopyMail');
    if (btnCopy) {
      btnCopy.addEventListener('click', async () => {
        await navigator.clipboard.writeText(getEditedBody());
        btnCopy.textContent = '已复制';
      });
    }
    const btnSend = document.getElementById('btnSendMail');
    if (btnSend) {
      btnSend.addEventListener('click', async () => {
        if (!window.EmailClient) {
          statusEl.className = 'err';
          statusEl.textContent = '通知客户端未加载';
          return;
        }
        btnSend.disabled = true;
        const parts = [];
        statusEl.className = 'hint';
        statusEl.textContent = '处理中…';
        const text = getEditedBody();
        const subject = getEditedSubject();

        if (!to) {
          parts.push('邮件跳过（未配置收件）');
        } else {
          try {
            statusEl.textContent = '发送邮件中…';
            const result = await EmailClient.sendMerchantMail({
              to,
              subject,
              text,
              chartDataUrl: draft.chartDataUrl,
              storeId: STORE_CONFIG.storeId,
              bookingId: (booking && booking.id) || null,
              eventType,
            });
            parts.push(`邮件已发（${result.messageId || 'ok'}）`);
            if (booking && booking.id) {
              BookingStore.appendEmailLog(booking.id, {
                eventType,
                mode: 'smtp_sent',
                to,
                messageId: result.messageId || null,
              });
            }
          } catch (err) {
            parts.push(`邮件失败：${(err && err.message) || err}`);
            if (booking && booking.id) {
              BookingStore.appendEmailLog(booking.id, {
                eventType,
                mode: 'smtp_failed',
                to,
                error: (err && err.message) || String(err),
              });
            }
          }
        }

        if (eventType === 'cancel') {
          parts.push('日历已在删除时同步移除');
        } else if (!skipCalendar && booking) {
          try {
            statusEl.textContent = '正在重写当日 Google 日历…';
            const date = booking.date;
            const calendarId = STORE_CONFIG.googleCalendarId;
            if (!calendarId) throw new Error('未配置 googleCalendarId');

            const active = BookingStore.listBookings(date).filter(
              (b) => b.status !== 'cancelled' && b.status !== 'hold'
            );
            if (
              booking.status === 'hold' &&
              !active.some((b) => b.id === booking.id)
            ) {
              active.push(booking);
            }

            const events = active.map((b) => {
              const cal = BoardUI.buildCalendarDraft(
                b,
                b.id === booking.id ? eventType : 'new'
              );
              return {
                calendarId,
                bookingId: cal.bookingId,
                storeId: cal.storeId,
                summary: cal.summary,
                description: cal.description,
                startDateTime: cal.startDateTime,
                endDateTime: cal.endDateTime,
                timeZone: cal.timeZone,
              };
            });

            const calResult = await EmailClient.rewriteCalendarDay({
              calendarId,
              date,
              events,
            });

            (calResult.events || []).forEach((r, idx) => {
              const b = active[idx];
              if (b && r && r.eventId) {
                BookingStore.setGoogleEvent(b.id, {
                  eventId: r.eventId,
                  htmlLink: r.htmlLink,
                  calendarId,
                });
              }
            });

            const link =
              (calResult.events || []).find((e) => e.htmlLink) || {};
            parts.push(
              `日历已重写当日（清 ${calResult.removed || 0} / 写 ${
                calResult.written || 0
              }）` +
                (link.htmlLink
                  ? ` <a href="${link.htmlLink}" target="_blank" rel="noopener">打开</a>`
                  : '')
            );
          } catch (err) {
            parts.push(`日历失败：${(err && err.message) || err}`);
          }
        }

        const hasFail = parts.some((p) => p.includes('失败'));
        statusEl.className = hasFail ? 'err' : 'hint ok';
        statusEl.innerHTML = parts.join(' · ');
        btnSend.disabled = false;
      });
    }
    if (booking && booking.id) {
      BookingStore.appendEmailLog(booking.id, { eventType, mode: 'preview_only' });
    }
    // 不自动滚到邮件区，避免时间表改动时页面下跳
  }

  async function syncDailyDigestToGateway() {
    if (!window.EmailClient || !EmailClient.registerDailyDigest) return;
    const date = BookingStore.todayBusinessDate();
    const draft = BoardUI.buildDailyDigestEmail(date);
    const to = STORE_CONFIG.merchantEmail || '';
    if (!to) return;
    try {
      await EmailClient.registerDailyDigest({
        storeId: STORE_CONFIG.storeId,
        storeName: STORE_CONFIG.storeName.cn,
        to,
        time: BookingStore.getDailyEmailTime() || '00:00',
        date,
        subject: draft.subject,
        text: draft.body,
        chartDataUrl: draft.chartDataUrl,
      });
    } catch (_) {
      /* 网关未开时忽略 */
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function refresh() {
    const date = currentDate();
    dateInput.value = date;
    BoardUI.renderBoard(boardEl, date, {
      selection: rangeSelection,
      selectedBookingId,
      selectedClosureId,
      selectionHint: '空档拖选新建；再点当前选区取消；拖动时弹层变淡',
      onDragStart: () => fadeSideDuringDrag(),
      onDragEnd: () => {
        sidePanel.classList.remove('is-drag-faded');
      },
      onCancelSelection: () => clearRangeSelection('已取消选择'),
      onClearBookingSelect: () => {
        if (selectedBookingId) selectedBookingId = null;
      },
      onClearClosureSelect: () => {
        if (selectedClosureId) selectedClosureId = null;
      },
      onBookingSelect: (booking, point) => {
        selectedBookingId = booking.id;
        selectedClosureId = null;
        setSideMode('booking');
        rangeSelection = {
          bedIndex: (booking.beds || [0])[0],
          bedIndexes: (booking.beds || []).slice(),
          startOffset: BookingStore.timeToOffset(booking.startTime),
          endOffset:
            BookingStore.timeToOffset(booking.startTime) + booking.durationMinutes,
        };
        fillFormFromBooking(booking);
        refresh();
        openSide(
          `已选中：可拖动移动；左右拉时长，上下拉床数 · ${booking.guestName || booking.id}`,
          point
        );
      },
      onBookingLayoutChange: (patch) => {
        const r = BookingStore.updateBookingLayout(patch.id, patch);
        if (!r.ok) {
          alert(r.error);
          refresh();
          return;
        }
        selectedBookingId = patch.id;
        selectedClosureId = null;
        setSideMode('booking');
        rangeSelection = {
          bedIndex: patch.beds[0],
          bedIndexes: patch.beds.slice(),
          startOffset: BookingStore.timeToOffset(patch.startTime),
          endOffset:
            BookingStore.timeToOffset(patch.startTime) + patch.durationMinutes,
        };
        fillFormFromBooking(r.booking);
        formErr.className = 'hint ok';
        formErr.textContent = `已改期：${patch.startTime} 起 ${patch.durationMinutes} 分 · ${patch.beds.length} 床`;
        if (r.booking.status === 'confirmed') {
          showEmail(r.booking, 'reschedule');
        }
        refresh();
        openSide('改期已保存，可继续拖动调整', {
          x: patch.clientX,
          y: patch.clientY,
        });
      },
      onClosureSelect: (closure, point) => {
        selectedClosureId = closure.id;
        selectedBookingId = null;
        setSideMode('openRequest');
        rangeSelection = {
          bedIndex: (closure.beds || [0])[0],
          bedIndexes: (closure.beds || []).slice(),
          startOffset: BookingStore.timeToOffset(closure.startTime),
          endOffset: BookingStore.timeToOffset(closure.endTime),
        };
        const names = (closure.beds || [])
          .map((i) => DeskI18n.bedLabelAt(i))
          .join('、');
        const detail = document.getElementById('openReqDetail');
        if (detail) {
          detail.textContent =
            closure.openRequestStatus === 'requested'
              ? `已申请开床：${names} · ${closure.startTime}–${closure.endTime}（商家尚未处理）`
              : `商家关闭：${names} · ${closure.startTime}–${closure.endTime}。客服不能直接开床，可发起开床申请。`;
        }
        const noteEl = document.getElementById('openReqNote');
        if (noteEl) noteEl.value = closure.openRequestNote || '';
        refresh();
        openSide(
          closure.openRequestStatus === 'requested'
            ? '开床申请中 · 可重拟邮件发给商家'
            : '已选关闭块 · 可申请开床',
          point
        );
      },
      onRangeSelect: (range) => {
        selectedBookingId = null;
        selectedClosureId = null;
        setSideMode('booking');
        const beds = range.bedIndexes || [range.bedIndex];
        rangeSelection = {
          bedIndex: beds[0],
          bedIndexes: beds,
          startOffset: range.startOffset,
          endOffset: range.endOffset,
        };
        document.getElementById('startTime').value = range.startTime;
        document.getElementById('duration').value = String(range.durationMinutes);
        document.getElementById('guests').value = String(range.guests || beds.length);
        document.getElementById('channel').value = 'whatsapp';
        renderSideBeds(beds);
        const names = beds.map((i) => DeskI18n.bedLabelAt(i)).join('、');
        openSide(
          `已选 ${names} · ${range.startTime}–${range.endTime}（${range.durationMinutes} 分 · ${beds.length} 人）`,
          { x: range.clientX, y: range.clientY }
        );
        sideErr.textContent = '';
        formErr.className = 'hint ok';
        formErr.textContent = `已选 ${names}，人数已自动设为 ${beds.length}。请在菜单确认后创建。`;
        remainHint.textContent = `参考：${range.startTime} 起 ${range.durationMinutes} 分钟，剩余可约约 ${BookingStore.remainingAt(date, range.startTime, range.durationMinutes)} 床`;
        refresh();
      },
      onBlockClick: (x) => {
        if (x.ref && x.ref.id && x.type !== 'closure' && x.type !== 'closure_request') {
          const el = document.querySelector(`[data-id="${x.ref.id}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      },
    });
    syncDailyDigestToGateway();

    if (!rangeSelection) {
      const start = document.getElementById('startTime').value || `${defaultHour}:00`;
      const dur = Number(document.getElementById('duration').value) || 60;
      remainHint.textContent = `参考：${start} 起 ${dur} 分钟，剩余可约约 ${BookingStore.remainingAt(date, start, dur)} 床`;
    }

    const bookings = BookingStore.listBookings(date);
    listEl.innerHTML = bookings.length
      ? bookings
          .map((b) => {
            const end = BookingStore.offsetToTime(
              BookingStore.timeToOffset(b.startTime) + b.durationMinutes
            );
            const beds = (b.beds || []).map((i) => DeskI18n.bedLabelAt(i)).join('、');
            return `
          <div class="item" data-id="${b.id}">
            <div class="title">
              ${escapeHtml(b.guestName || '未留名')} · ${b.guests}人
              <span class="badge ${b.status}">${statusLabel(b.status)}</span>
            </div>
            <div class="meta">${b.startTime}–${end} · ${beds} · ${b.id}</div>
            <div class="actions">
              ${
                b.status === 'hold'
                  ? `<button class="btn primary" data-act="convert" data-id="${b.id}">转为预约</button>`
                  : ''
              }
              ${
                b.status === 'pending_confirm'
                  ? `<button class="btn" type="button" disabled title="请商家端确认">等待商家确认</button>
                     <button class="btn primary" data-act="confirm" data-id="${b.id}">代商家确认</button>`
                  : ''
              }
              ${
                b.status === 'confirmed'
                  ? `<button class="btn" data-act="mail" data-id="${b.id}">重看邮件预览</button>`
                  : ''
              }
              ${
                b.status !== 'cancelled'
                  ? `<button class="btn" data-act="reschedule" data-id="${b.id}">改期</button>
                     <button class="btn danger" data-act="cancel" data-id="${b.id}">${
                       b.status === 'hold' ? '释放预占' : '删除预约'
                     }</button>`
                  : ''
              }
            </div>
          </div>`;
          })
          .join('')
      : '<div class="hint">当日暂无订单</div>';
  }

  function statusLabel(s) {
    if (s === 'confirmed') return '已确认';
    if (s === 'pending_confirm') return DeskI18n.t('statusPending');
    if (s === 'hold') return '仅预占';
    if (s === 'cancelled') return '已取消';
    return s;
  }

  function doCreate(mode) {
    sideErr.textContent = '';
    formErr.textContent = '';
    const payload = formPayload(mode);

    // 已选中已有订单：保存改期/信息，而不是新建
    if (selectedBookingId && mode !== 'hold') {
      const layout = BookingStore.updateBookingLayout(selectedBookingId, {
        startTime: payload.startTime,
        durationMinutes: payload.durationMinutes,
        beds: payload.beds,
        guests: payload.guests,
      });
      if (!layout.ok) {
        sideErr.textContent = layout.error;
        return;
      }
      const info = BookingStore.updateBookingInfo(selectedBookingId, {
        courseId: payload.courseId,
        channelId: payload.channelId || 'whatsapp',
        guestName: payload.guestName,
        guestPhone: payload.guestPhone,
        note: payload.note,
        guests: payload.guests,
      });
      refresh();
      formErr.className = 'hint ok';
      formErr.textContent = '已保存对该预约的修改。';
      if (info.booking && info.booking.status === 'confirmed') {
        showEmail(info.booking, 'reschedule');
      }
      closeSide();
      return;
    }

    const result = BookingStore.createBooking(payload);
    if (!result.ok) {
      sideErr.textContent = result.error;
      formErr.className = 'err';
      formErr.textContent = result.error;
      openSide();
      return;
    }
    selectedBookingId = null;
    refresh();
    if (mode === 'hold') {
      formErr.className = 'hint ok';
      formErr.textContent = '已仅预占空位。';
      closeSide();
      return;
    }
    if (result.needConfirm) {
      formErr.className = 'hint warn';
      formErr.textContent = '已创建，状态待商家确认。请商家端核对后确认（确认后变为蓝色预约）。';
      closeSide();
    } else {
      formErr.className = 'hint ok';
      formErr.textContent = '已创建并确认，已生成邮件预览。';
      closeSide();
      showEmail(result.booking, 'new');
    }
  }

  function parseWa(andCreate) {
    const waErr = document.getElementById('waErr');
    waErr.textContent = '';
    const text = document.getElementById('waPaste').value;
    const parsed = WaBookingParse.parseWhatsAppBooking(text, {
      courses: STORE_CONFIG.courses,
      year: new Date().getFullYear(),
    });
    if (!parsed.ok) {
      waErr.className = 'err';
      waErr.textContent = '未能识别有效预约字段，请检查粘贴内容。';
      return;
    }
    applyParsedToForm(parsed);
    openSide(
      `已从 WhatsApp 解析：${parsed.guestName || '未留名'} · ${parsed.startTime || '?'} · ${
        parsed.guests || '?'
      }人`,
      {
        x: Math.min(window.innerWidth - 40, 120),
        y: Math.min(window.innerHeight - 40, 160),
      }
    );
    refresh();
    waErr.className = 'hint ok';
    waErr.textContent = '已填入侧栏，请确认后创建。';
    if (andCreate) doCreate('create');
  }

  document.getElementById('btnHold').addEventListener('click', () => doCreate('hold'));
  document.getElementById('btnCreate').addEventListener('click', () => doCreate('create'));
  document.getElementById('btnDeleteBooking').addEventListener('click', () => doDeleteBooking());

  document.getElementById('btnConvertHold').addEventListener('click', () => {
    if (!selectedBookingId) return;
    const booking = BookingStore.load().bookings.find((b) => b.id === selectedBookingId);
    if (!booking || booking.status !== 'hold') return;
    const nameRaw = document.getElementById('guestName').value.trim();
    const r = BookingStore.convertHoldToBooking(selectedBookingId, {
      guestName: nameRaw && nameRaw !== '预占' ? nameRaw : '',
      guestPhone: document.getElementById('guestPhone').value.trim() || booking.guestPhone,
      courseId: document.getElementById('course').value || booking.courseId,
      channelId: document.getElementById('channel').value || booking.channelId,
      note: document.getElementById('note').value.trim() || booking.note,
      guests: Number(document.getElementById('guests').value) || booking.guests,
    });
    if (!r.ok) {
      sideErr.textContent = r.error || '转换失败';
      return;
    }
    selectedBookingId = r.booking.id;
    closeSide();
    refresh();
    formErr.className = 'hint ok';
    formErr.textContent = r.needConfirm
      ? '已转为预约，待人工确认。'
      : '已转为预约，已生成邮件预览。';
    if (!r.needConfirm) showEmail(r.booking, 'new');
  });

  document.getElementById('btnRequestOpen').addEventListener('click', () => {
    if (!selectedClosureId) return;
    const noteEl = document.getElementById('openReqNote');
    const errEl = document.getElementById('openReqErr');
    if (errEl) errEl.textContent = '';
    const r = BookingStore.requestOpenBed(
      selectedClosureId,
      noteEl ? noteEl.value.trim() : ''
    );
    if (!r.ok) {
      if (errEl) errEl.textContent = r.error || '申请失败';
      return;
    }
    closeSide();
    refresh();
    formErr.className = 'hint ok';
    formErr.textContent = '已发起开床申请，请编辑并发送邮件通知商家。';
    showEmail(r.closure, 'open_request');
  });

  const btnSaveDailyTime = document.getElementById('btnSaveDailyTime');
  if (btnSaveDailyTime) {
    btnSaveDailyTime.addEventListener('click', () => {
      const r = BookingStore.setDailyEmailTime(
        (dailyEmailTimeEl && dailyEmailTimeEl.value) || '00:00'
      );
      if (!r.ok) {
        formErr.className = 'err';
        formErr.textContent = r.error || '保存失败';
        return;
      }
      formErr.className = 'hint ok';
      formErr.textContent = `已保存本店每日商家邮件时刻：${r.dailyEmailTime}（需网关常开；客服页打开时会上报当日汇总）`;
      syncDailyDigestToGateway();
    });
  }
  const btnPreviewDigest = document.getElementById('btnPreviewDigest');
  if (btnPreviewDigest) {
    btnPreviewDigest.addEventListener('click', () => {
      const date = currentDate();
      showEmail({ date, id: null }, 'daily', BoardUI.buildDailyDigestEmail(date));
      syncDailyDigestToGateway();
    });
  }

  // 点空白关闭悬浮栏
  document.addEventListener('pointerdown', (e) => {
    if (sidePanel.hidden) return;
    if (sidePanel.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.board-track')) return;
    if (e.target.closest && e.target.closest('.board-label')) return;
    closeSide();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSide();
  });

  document.getElementById('btnParseWa').addEventListener('click', () => parseWa(false));
  document.getElementById('btnParseWaCreate').addEventListener('click', () => parseWa(true));

  sideBeds.addEventListener('change', () => {
    const beds = selectedBedsFromSide();
    if (beds.length) {
      document.getElementById('guests').value = String(beds.length);
      if (rangeSelection) {
        rangeSelection.bedIndexes = beds;
        rangeSelection.bedIndex = beds[0];
      }
    }
  });

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const act = btn.getAttribute('data-act');
    const state = BookingStore.load();
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking) return;

    if (act === 'convert') {
      const nameRaw = document.getElementById('guestName').value.trim();
      const r = BookingStore.convertHoldToBooking(id, {
        guestName:
          (nameRaw && nameRaw !== '预占' ? nameRaw : '') ||
          (booking.guestName !== '预占' ? booking.guestName : '') ||
          '',
        guestPhone: document.getElementById('guestPhone').value.trim() || booking.guestPhone,
        courseId: document.getElementById('course').value || booking.courseId,
        channelId: document.getElementById('channel').value || booking.channelId,
        note: document.getElementById('note').value.trim() || booking.note,
        guests: Number(document.getElementById('guests').value) || booking.guests,
      });
      if (!r.ok) return alert(r.error);
      refresh();
      if (!r.needConfirm) showEmail(r.booking, 'new');
    }
    if (act === 'confirm') {
      const r = BookingStore.confirmBooking(id);
      if (!r.ok) return alert(r.error);
      refresh();
      showEmail(r.booking, 'confirm');
    }
    if (act === 'mail') showEmail(booking, 'new');
    if (act === 'cancel') {
      doDeleteBooking(id);
      return;
    }
    if (act === 'reschedule') {
      const newDate = prompt('新营业日 (YYYY-MM-DD)', booking.date);
      if (!newDate) return;
      const newTime = prompt('新开始时间 (HH:MM)', booking.startTime);
      if (!newTime) return;
      const r = BookingStore.rescheduleBooking(id, newDate, newTime);
      if (!r.ok) return alert(r.error);
      dateInput.value = newDate;
      refresh();
      if (r.booking.status === 'confirmed') showEmail(r.booking, 'reschedule');
    }
  });

  document.getElementById('btnRefresh').addEventListener('click', refresh);
  dateInput.addEventListener('change', refresh);

  document.getElementById('btnExport').addEventListener('click', () => {
    const blob = new Blob([BookingStore.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `booking-${cfg.storeId}-${currentDate()}.json`;
    a.click();
  });

  document.getElementById('btnReset').addEventListener('click', () => {
    if (!confirm('清空本店全部测试预约/关床数据？')) return;
    BookingStore.resetAll();
    rangeSelection = null;
    refresh();
    emailBox.innerHTML = '<div class="hint">已清空。</div>';
  });

  window.addEventListener('booking-store-changed', softRefresh);
  window.addEventListener('storage', (e) => {
    if (!e.key) return;
    if (e.key === STORE_CONFIG.storageKey || e.key === 'booking_platform_sync_ping') {
      softRefresh();
    }
  });

  function softRefresh() {
    if (document.querySelector('.board.is-dragging, .board.is-editing-block')) return;
    refresh();
  }

  setInterval(softRefresh, 5000);

  fillSelects();
  renderSideBeds([0]);
  dateInput.value = BookingStore.todayBusinessDate();
  const courseEl = document.getElementById('course');
  if (courseEl) {
    courseEl.addEventListener('change', () => {
      const c = (STORE_CONFIG.courses || []).find((x) => x.id === courseEl.value);
      if (c && c.durationMinutes) {
        document.getElementById('duration').value = String(c.durationMinutes);
      }
    });
  }
  refresh();
})();
