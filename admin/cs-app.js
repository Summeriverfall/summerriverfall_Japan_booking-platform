(function () {
  if (!StoreRegistry.requireStoreOrRedirect('admin-portal.html')) return;
  StoreRegistry.setRole('admin');

  const cfg = STORE_CONFIG;
  document.title = `客服端 · ${cfg.storeName.cn}`;
  document.getElementById('pageBrand').innerHTML =
    `客服端 · ${cfg.storeName.cn}<div class="hint" style="margin:0">${cfg.tagline} · ${cfg.hoursLabel} · ${cfg.bedCount} 床</div>`;
  document.getElementById('navCs').href = `cs.html?store=${encodeURIComponent(cfg.storeId)}`;

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
  const sideBeds = document.getElementById('sideBeds');
  let lastPointer = { x: 80, y: 120 };

  let rangeSelection = null;
  let selectedBookingId = null;

  function fillSelects() {
    document.getElementById('course').innerHTML = STORE_CONFIG.courses
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
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
    document.getElementById('guestName').value = b.guestName || '';
    document.getElementById('guestPhone').value = b.guestPhone || '';
    document.getElementById('note').value = b.note || '';
    renderSideBeds(b.beds || []);
  }

  function renderSideBeds(selected) {
    const set = new Set((selected || []).map(Number));
    sideBeds.innerHTML = STORE_CONFIG.bedLabels
      .map(
        (name, i) =>
          `<label class="bed-check-item"><input type="checkbox" value="${i}" ${
            set.has(i) ? 'checked' : ''
          }><span class="bed-check-text">${name}</span></label>`
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
    if (selectedBookingId) {
      const blocks = [
        ...document.querySelectorAll(
          `.board-block[data-booking-id="${selectedBookingId}"]`
        ),
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

  function openSide(msg, point) {
    if (msg) sideHint.textContent = msg;
    if (point && point.x != null) {
      lastPointer = { x: point.x, y: point.y };
    }
    const createBtn = document.getElementById('btnCreate');
    if (createBtn) {
      createBtn.textContent = selectedBookingId ? '保存修改' : '创建预约';
    }
    // 等 DOM/勾选床位渲染后再定位，避免贴边计算偏差
    requestAnimationFrame(() => placeCtxMenu());
  }

  function closeSide() {
    sidePanel.classList.remove('is-open');
    sidePanel.setAttribute('aria-hidden', 'true');
    sidePanel.hidden = true;
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

  function showEmail(booking, eventType) {
    const draft = BoardUI.buildEmailDraft(booking, eventType);
    const to = STORE_CONFIG.merchantEmail || '';
    emailBox.innerHTML = `
      <div><strong>主题：</strong>${escapeHtml(draft.subject)}</div>
      <div class="hint" style="margin-top:.35rem">发件：${escapeHtml(
        (window.EMAIL_CONFIG && window.EMAIL_CONFIG.fromLabel) || 'summerriverfall@gmail.com'
      )} → 收件：${escapeHtml(to || '（待配置商家邮箱）')}</div>
      <pre>${escapeHtml(draft.body)}</pre>
      <div class="hint">床位使用时段状态图（将随邮件发送）：</div>
      <img alt="床位状态图" src="${draft.chartDataUrl}">
      <div class="actions" style="margin-top:.6rem;display:flex;gap:.4rem;flex-wrap:wrap;align-items:center">
        <button class="btn primary" type="button" id="btnSendMail">发送给商家</button>
        <a class="btn" download="bed-status-${booking.date}.png" href="${draft.chartDataUrl}">下载状态图</a>
        <button class="btn" type="button" id="btnCopyMail">复制邮件正文</button>
        <span class="hint" id="mailSendStatus">需本机运行 server 代发服务</span>
      </div>
    `;
    const statusEl = document.getElementById('mailSendStatus');
    const btnCopy = document.getElementById('btnCopyMail');
    if (btnCopy) {
      btnCopy.addEventListener('click', async () => {
        await navigator.clipboard.writeText(draft.body);
        btnCopy.textContent = '已复制';
      });
    }
    const btnSend = document.getElementById('btnSendMail');
    if (btnSend) {
      btnSend.addEventListener('click', async () => {
        if (!to) {
          statusEl.className = 'err';
          statusEl.textContent = '未配置商家收件邮箱（stores.js → merchantEmail）';
          return;
        }
        if (!window.EmailClient) {
          statusEl.className = 'err';
          statusEl.textContent = '邮件客户端未加载';
          return;
        }
        btnSend.disabled = true;
        statusEl.className = 'hint';
        statusEl.textContent = '发送中…';
        try {
          const result = await EmailClient.sendMerchantMail({
            to,
            subject: draft.subject,
            text: draft.body,
            chartDataUrl: draft.chartDataUrl,
            storeId: STORE_CONFIG.storeId,
            bookingId: booking.id,
            eventType,
          });
          statusEl.className = 'hint ok';
          statusEl.textContent = `已发送（${result.messageId || 'ok'}）→ ${to}`;
          BookingStore.appendEmailLog(booking.id, {
            eventType,
            mode: 'smtp_sent',
            to,
            messageId: result.messageId || null,
          });
        } catch (err) {
          statusEl.className = 'err';
          statusEl.textContent =
            (err && err.message) ||
            '发送失败。请确认已 npm start 启动 server，且 .env 已填 Gmail 应用密码。';
          BookingStore.appendEmailLog(booking.id, {
            eventType,
            mode: 'smtp_failed',
            to,
            error: (err && err.message) || String(err),
          });
        } finally {
          btnSend.disabled = false;
        }
      });
    }
    BookingStore.appendEmailLog(booking.id, { eventType, mode: 'preview_only' });
    emailBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function refresh() {
    const date = currentDate();
    dateInput.value = date;
    BoardUI.renderBoard(boardEl, date, {
      selection: rangeSelection,
      selectedBookingId,
      onClearBookingSelect: () => {
        if (selectedBookingId) {
          selectedBookingId = null;
        }
      },
      onBookingSelect: (booking, point) => {
        selectedBookingId = booking.id;
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
      onRangeSelect: (range) => {
        selectedBookingId = null;
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
        const names = beds.map((i) => STORE_CONFIG.bedLabels[i] || `${i + 1}号床`).join('、');
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
        if (x.ref && x.ref.id && x.type !== 'closure') {
          const el = document.querySelector(`[data-id="${x.ref.id}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      },
    });

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
            const beds = (b.beds || []).map((i) => STORE_CONFIG.bedLabels[i]).join('、');
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
                  ? `<button class="btn primary" data-act="confirm" data-id="${b.id}">人工确认并发邮件预览</button>`
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
                       b.status === 'hold' ? '释放预占' : '取消'
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
    if (s === 'pending_confirm') return '待确认';
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
      formErr.textContent = '已创建，状态待确认。请在订单列表点人工确认。';
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
  document.getElementById('btnSideClose').addEventListener('click', closeSide);
  document.getElementById('btnSideCloseTop').addEventListener('click', closeSide);

  // 点菜单外关闭（像 Windows 右键菜单）
  document.addEventListener('pointerdown', (e) => {
    if (sidePanel.hidden) return;
    if (sidePanel.contains(e.target)) return;
    // 拖选时间轴时不立刻关掉：选区松手会再打开
    if (e.target.closest && e.target.closest('.board-track')) return;
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
      const r = BookingStore.convertHoldToBooking(id, {
        guestName: document.getElementById('guestName').value.trim() || booking.guestName,
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
      if (!confirm(booking.status === 'hold' ? '释放该预占？' : '确认取消该预约？')) return;
      BookingStore.cancelBooking(id);
      refresh();
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

  window.addEventListener('booking-store-changed', refresh);

  fillSelects();
  renderSideBeds([0]);
  dateInput.value = BookingStore.todayBusinessDate();
  refresh();
})();
