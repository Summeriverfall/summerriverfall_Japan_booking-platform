/**
 * 时间轴看板渲染 + 邮件用「床位实时状态图」生成（Canvas → PNG）
 */
(function (global) {
  const TYPE_COLOR = {
    booking: '#2f9d62',
    pending: '#d97706',
    hold: '#7c3aed',
    closure: '#6b7280',
    closure_request: '#0f766e',
  };

  function bedLabel(i) {
    if (global.DeskI18n && DeskI18n.bedLabelAt) return DeskI18n.bedLabelAt(i);
    const raw = STORE_CONFIG.bedLabels && STORE_CONFIG.bedLabels[i];
    if (raw == null) return `${i + 1}`;
    if (typeof raw === 'string') return raw;
    return raw.jp || raw.cn || raw.en || `${i + 1}`;
  }

  function tokyoNowHhmm() {
    if (BookingStore.nowTokyoHhmm) return BookingStore.nowTokyoHhmm();
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  function hourLabels() {
    const cfg = STORE_CONFIG;
    const labels = [];
    let h = cfg.openHour;
    while (true) {
      labels.push(h);
      h = (h + 1) % 24;
      if (h === cfg.closeHour) {
        labels.push(h);
        break;
      }
    }
    return labels;
  }

  /** 小时格元数据：宽度按真实分钟比例，与选区/占用定位同一坐标系 */
  function hourSlotMeta() {
    const span = BookingStore.businessSpanMinutes();
    const slots = [];
    let offset = 0;
    while (offset < span) {
      const duration = Math.min(60, span - offset);
      const startTime = BookingStore.offsetToTime(offset);
      const endTime = BookingStore.offsetToTime(offset + duration);
      slots.push({
        hour: Number(startTime.split(':')[0]),
        startOffset: offset,
        duration,
        widthPct: (duration / span) * 100,
        startTime,
        endTime,
      });
      offset += duration;
    }
    return slots;
  }

  function hourSlots() {
    return hourSlotMeta().map((s) => s.hour);
  }

  function isNextDayHour(hour) {
    const cfg = STORE_CONFIG;
    return Boolean(cfg.overnight) && Number(hour) < Number(cfg.openHour || 0);
  }

  function nextDayLabel() {
    return global.DeskI18n ? DeskI18n.t('nextDayMark') : '第二天';
  }

  function renderBoard(container, dateStr, options) {
    const cfg = STORE_CONFIG;
    const span = BookingStore.businessSpanMinutes();
    const items = BookingStore.occupancyForDate(dateStr);
    const opts = options || {};
    const slotMeta = hourSlotMeta();
    const snap = 30; // 拖选半小时对齐

    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'board';

    const head = document.createElement('div');
    head.className = 'board-head';
    const noun =
      global.DeskI18n && DeskI18n.resourceNoun ? DeskI18n.resourceNoun() : '床位';
    head.innerHTML = `<div class="board-corner">${noun}</div><div class="board-hours"></div>`;
    const hoursEl = head.querySelector('.board-hours');
    const hourCells = [];
    slotMeta.forEach((slot, idx) => {
      const cell = document.createElement('div');
      cell.className = 'board-hour';
      if (isNextDayHour(slot.hour)) cell.classList.add('is-nextday');
      cell.dataset.hourIndex = String(idx);
      cell.style.flex = `0 0 ${slot.widthPct}%`;
      cell.style.width = `${slot.widthPct}%`;
      cell.textContent = String(slot.hour).padStart(2, '0');
      cell.title = `${slot.startTime} – ${slot.endTime}`;
      hoursEl.appendChild(cell);
      hourCells.push(cell);
    });
    const nextSlots = slotMeta.filter((s) => isNextDayHour(s.hour));
    if (nextSlots.length) {
      hoursEl.classList.add('has-nextday');
      const band = document.createElement('div');
      band.className = 'board-nextday-band';
      const start = nextSlots[0].startOffset;
      const end =
        nextSlots[nextSlots.length - 1].startOffset +
        nextSlots[nextSlots.length - 1].duration;
      band.style.left = `${(start / span) * 100}%`;
      band.style.width = `${((end - start) / span) * 100}%`;
      band.textContent = nextDayLabel();
      hoursEl.appendChild(band);
    }
    wrap.appendChild(head);

    function offsetFromClientX(track, clientX) {
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const raw = ratio * span;
      const snapped = Math.floor(raw / snap) * snap;
      return Math.min(Math.max(0, span - snap), snapped);
    }

    function applyHourHeaderHighlight(startOff, endOff) {
      hourCells.forEach((cell, idx) => {
        const slot = slotMeta[idx];
        const hit =
          slot.startOffset < endOff && slot.startOffset + slot.duration > startOff;
        cell.classList.toggle('is-selected', hit);
      });
    }

    function clearHourHeaderHighlight() {
      hourCells.forEach((cell) => cell.classList.remove('is-selected'));
    }

    function paintSelection(selEl, startOff, endOff) {
      const a = Math.min(startOff, endOff);
      const b = Math.max(startOff, endOff) + snap;
      const end = Math.min(span, b);
      selEl.style.left = `${(a / span) * 100}%`;
      selEl.style.width = `${((end - a) / span) * 100}%`;
      selEl.hidden = false;
      return { start: a, end };
    }

    function paintBedsRange(bedA, bedB, startOff, endOff) {
      const b0 = Math.min(bedA, bedB);
      const b1 = Math.max(bedA, bedB);
      let bedIndexes = Array.from({ length: b1 - b0 + 1 }, (_, i) => b0 + i);
      if (global.StoreRegistry && typeof StoreRegistry.expandBedIndexes === 'function') {
        bedIndexes = StoreRegistry.expandBedIndexes(cfg, bedIndexes);
      }
      const bedSet = new Set(bedIndexes);
      let range = null;
      wrap.querySelectorAll('.board-track').forEach((t) => {
        const bed = Number(t.dataset.bed);
        const sel = t.querySelector('.board-selection');
        if (!sel) return;
        if (bedSet.has(bed)) {
          range = paintSelection(sel, startOff, endOff);
        } else {
          sel.hidden = true;
        }
      });
      if (range) applyHourHeaderHighlight(range.start, range.end);
      return {
        range,
        bedIndexes,
      };
    }

    function bedFromClientY(clientY) {
      const tracks = [...wrap.querySelectorAll('.board-track')];
      for (const t of tracks) {
        const r = t.getBoundingClientRect();
        if (clientY >= r.top && clientY <= r.bottom) return Number(t.dataset.bed);
      }
      if (!tracks.length) return 0;
      const first = tracks[0].getBoundingClientRect();
      const last = tracks[tracks.length - 1].getBoundingClientRect();
      if (clientY < first.top) return Number(tracks[0].dataset.bed);
      if (clientY > last.bottom) return Number(tracks[tracks.length - 1].dataset.bed);
      // 落在行间隙时取最近
      let best = 0;
      let bestDist = Infinity;
      tracks.forEach((t) => {
        const r = t.getBoundingClientRect();
        const mid = (r.top + r.bottom) / 2;
        const d = Math.abs(clientY - mid);
        if (d < bestDist) {
          bestDist = d;
          best = Number(t.dataset.bed);
        }
      });
      return best;
    }

    function anyTrackFromClientX(clientX) {
      const t = wrap.querySelector('.board-track');
      return t ? offsetFromClientX(t, clientX) : 0;
    }

    let activeDrag = null;

    function onDragMove(e) {
      if (!activeDrag) return;
      const curBed = bedFromClientY(e.clientY);
      const curOff = anyTrackFromClientX(e.clientX);
      paintBedsRange(activeDrag.startBed, curBed, activeDrag.startOff, curOff);
      activeDrag.curBed = curBed;
      activeDrag.curOff = curOff;
    }

    function onDragEnd(e) {
      if (!activeDrag) return;
      const curBed = bedFromClientY(e.clientY);
      const curOff = anyTrackFromClientX(e.clientX);
      const painted = paintBedsRange(
        activeDrag.startBed,
        curBed,
        activeDrag.startOff,
        curOff
      );
      wrap.classList.remove('is-dragging');
      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', onDragEnd);
      window.removeEventListener('pointercancel', onDragEnd);
      const drag = activeDrag;
      activeDrag = null;
      if (opts.onDragEnd) opts.onDragEnd(drag);

      const movedFar =
        Math.abs(curOff - drag.startOff) >= snap || curBed !== drag.startBed;
      const selBeds =
        (opts.selection &&
          (opts.selection.bedIndexes ||
            (opts.selection.bedIndex != null ? [opts.selection.bedIndex] : null))) ||
        null;
      // 仅「再点当前选区」才取消；点同资源其它格应直接切到新选区
      const clickInCurrentSelection =
        !movedFar &&
        selBeds &&
        selBeds.includes(drag.startBed) &&
        opts.selection &&
        Number.isFinite(opts.selection.startOffset) &&
        Number.isFinite(opts.selection.endOffset) &&
        drag.startOff >= opts.selection.startOffset &&
        drag.startOff < opts.selection.endOffset;
      if (
        !movedFar &&
        opts.onCancelSelection &&
        (clickInCurrentSelection || opts.selectedBookingId || opts.selectedClosureId)
      ) {
        wrap.querySelectorAll('.board-selection').forEach((s) => {
          s.hidden = true;
        });
        clearHourHeaderHighlight();
        opts.onCancelSelection({ bedIndex: drag.startBed });
        return;
      }

      if (!painted.range) return;
      if (opts.onRangeSelect) {
        opts.onRangeSelect({
          bedIndex: painted.bedIndexes[0],
          bedIndexes: painted.bedIndexes,
          guests: painted.bedIndexes.length,
          startOffset: painted.range.start,
          endOffset: painted.range.end,
          startTime: BookingStore.offsetToTime(painted.range.start),
          endTime: BookingStore.offsetToTime(painted.range.end),
          durationMinutes: painted.range.end - painted.range.start,
          clientX: e.clientX,
          clientY: e.clientY,
        });
      }
    }

    function appendNowLine(track) {
      if (opts.showNowLine === false) return;
      try {
        if (dateStr !== BookingStore.todayBusinessDate()) return;
        const hhmm = tokyoNowHhmm();
        const off = BookingStore.timeToOffset(hhmm);
        if (off < 0 || off > span) return;
        const line = document.createElement('div');
        line.className = 'board-now-line';
        line.style.left = `${(off / span) * 100}%`;
        line.title = `当前时间:${hhmm}`;
        line.setAttribute('aria-label', `当前时间:${hhmm}`);
        track.appendChild(line);
      } catch (err) {}
    }

    let activePairGroup = null;
    let pairGroupEl = null;
    let pairRowsEl = null;

    for (let bed = 0; bed < cfg.bedCount; bed++) {
      const row = document.createElement('div');
      row.className = 'board-row';
      const label = document.createElement('div');
      label.className = 'board-label';
      const name = bedLabel(bed);
      const meta = (cfg.bedLabels && cfg.bedLabels[bed]) || {};
      const pairGroup = String(meta.pairGroup || '').trim();
      const isPair = Boolean(pairGroup || meta.typeId === 'pair');
      if (isPair) {
        row.classList.add('is-pair-row');
        label.classList.add('is-pair-half');
        const seats = (cfg.bedLabels || [])
          .map((lab, idx) => ({ lab, idx }))
          .filter((x) => String((x.lab && x.lab.pairGroup) || '').trim() === pairGroup)
          .map((x) => x.idx);
        if (seats[0] === bed) {
          row.classList.add('is-pair-first');
          label.classList.add('is-pair-first');
        }
        if (seats[seats.length - 1] === bed) {
          row.classList.add('is-pair-last');
          label.classList.add('is-pair-last');
        }
      }

      if (opts.bedDayControls) {
        label.classList.add('has-day-controls');
        const nameEl = document.createElement('div');
        nameEl.className = 'board-label-name';
        nameEl.textContent = name;
        const btns = document.createElement('div');
        btns.className = 'board-day-btns';
        const dayClosed = Boolean(
          opts.isBedDayClosed && opts.isBedDayClosed(bed)
        );
        const btnClose = document.createElement('button');
        btnClose.type = 'button';
        btnClose.className = 'board-day-btn board-day-btn-close';
        btnClose.textContent = '关';
        btnClose.title = '整日关闭';
        btnClose.disabled = dayClosed;
        btnClose.addEventListener('click', (e) => {
          e.stopPropagation();
          if (opts.onDayClose) opts.onDayClose(bed, e);
        });
        const btnOpen = document.createElement('button');
        btnOpen.type = 'button';
        btnOpen.className = 'board-day-btn board-day-btn-open';
        btnOpen.textContent = '开';
        btnOpen.title = '释放整日关闭';
        btnOpen.disabled = !dayClosed;
        btnOpen.addEventListener('click', (e) => {
          e.stopPropagation();
          if (opts.onDayOpen) opts.onDayOpen(bed, e);
        });
        btns.appendChild(btnClose);
        btns.appendChild(btnOpen);
        label.appendChild(nameEl);
        label.appendChild(btns);
        if (dayClosed) label.classList.add('is-day-closed');
      } else {
        label.textContent = name;
        if (opts.onBedLabelClick) {
          label.classList.add('is-clickable');
          label.title = opts.bedLabelTitle || '点击可整日关闭该资源';
          label.addEventListener('click', (e) => {
            e.stopPropagation();
            opts.onBedLabelClick(bed, { clientX: e.clientX, clientY: e.clientY });
          });
        }
      }
      const track = document.createElement('div');
      track.className = 'board-track';
      track.dataset.bed = String(bed);

      const grid = document.createElement('div');
      grid.className = 'board-hour-grid';
      grid.setAttribute('aria-hidden', 'true');
      slotMeta.forEach((slot) => {
        const cell = document.createElement('div');
        cell.className = 'board-hour-cell';
        if (isNextDayHour(slot.hour)) cell.classList.add('is-nextday');
        if (slot.duration < 60) cell.classList.add('is-partial');
        cell.style.flex = `0 0 ${slot.widthPct}%`;
        cell.style.width = `${slot.widthPct}%`;
        if (slot.duration >= 60) {
          const mid = document.createElement('i');
          mid.className = 'board-half-tick';
          cell.appendChild(mid);
        }
        grid.appendChild(cell);
      });
      track.appendChild(grid);

      const sel = document.createElement('div');
      sel.className = 'board-selection';
      sel.hidden = true;
      track.appendChild(sel);

      const selBeds = (opts.selection && (opts.selection.bedIndexes || (opts.selection.bedIndex != null ? [opts.selection.bedIndex] : null))) || null;
      if (
        selBeds &&
        selBeds.includes(bed) &&
        Number.isFinite(opts.selection.startOffset) &&
        Number.isFinite(opts.selection.endOffset)
      ) {
        paintSelection(
          sel,
          opts.selection.startOffset,
          Math.max(opts.selection.startOffset, opts.selection.endOffset - snap)
        );
        applyHourHeaderHighlight(opts.selection.startOffset, opts.selection.endOffset);
      }

      items
        .filter((x) => x.bedIndex === bed)
        .forEach((x) => {
          const block = document.createElement('div');
          block.className = `board-block type-${x.type}`;
          if (x.ref && x.ref.calendarIssues && x.ref.calendarIssues.length) {
            block.classList.add('is-cal-issue');
          }
          block.style.left = `${(x.start / span) * 100}%`;
          block.style.width = `calc(${((x.end - x.start) / span) * 100}% - 3px)`;
          const isClosure =
            x.type === 'closure' || x.type === 'closure_request';
          const guestLabel = (() => {
            const n = String((x.ref && x.ref.guestName) || '').trim();
            if (!n || n === '预占') return '';
            return n;
          })();
          const title = isClosure
            ? x.type === 'closure_request'
              ? `开床申请中 ${x.startTime}-${x.endTime}`
              : `关闭 ${x.startTime}-${x.endTime}`
            : x.type === 'hold'
              ? `预占 ${x.startTime}-${x.endTime}`
              : `${guestLabel || '预约'} ${x.startTime} · ${x.ref.guests || 1}人${
                  x.ref.calendarIssues && x.ref.calendarIssues.length ? ' · 日历异常' : ''
                }`;
          block.title = title;
          const labelEl = document.createElement('span');
          labelEl.className = 'board-block-label';
          labelEl.textContent = isClosure
            ? x.type === 'closure_request'
              ? '申'
              : '关'
            : x.type === 'hold'
              ? '占'
              : guestLabel || '约';
          block.appendChild(labelEl);

          if (x.type !== 'closure' && x.ref && x.ref.id) {
            block.dataset.bookingId = x.ref.id;
            const bedsSorted = (x.ref.beds || [bed]).slice().sort((a, c) => a - c);
            const selected = opts.selectedBookingId === x.ref.id;
            const canEditBooking = Boolean(opts.onBookingLayoutChange);
            if (selected) {
              block.classList.add('is-selected');
              if (canEditBooking) {
                [['w', '左'], ['e', '右']].forEach(([h]) => {
                  const hd = document.createElement('i');
                  hd.className = `blk-handle blk-handle-${h}`;
                  hd.dataset.handle = h;
                  block.appendChild(hd);
                });
                if (bed === bedsSorted[0]) {
                  const hd = document.createElement('i');
                  hd.className = 'blk-handle blk-handle-n';
                  hd.dataset.handle = 'n';
                  block.appendChild(hd);
                }
                if (bed === bedsSorted[bedsSorted.length - 1]) {
                  const hd = document.createElement('i');
                  hd.className = 'blk-handle blk-handle-s';
                  hd.dataset.handle = 's';
                  block.appendChild(hd);
                }
              }
            }

            block.addEventListener('pointerdown', (e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              e.preventDefault();
              const handle = e.target.closest('.blk-handle');
              if (opts.selectedBookingId !== x.ref.id || !canEditBooking) {
                if (opts.onBookingSelect) {
                  opts.onBookingSelect(x.ref, { clientX: e.clientX, clientY: e.clientY });
                }
                return;
              }
              // 已选中：拖动手柄改尺寸，拖动本体改位置
              startBlockEdit(
                {
                  id: x.ref.id,
                  beds: x.ref.beds || [bed],
                  startTime: x.ref.startTime,
                  durationMinutes: x.ref.durationMinutes,
                },
                handle ? handle.dataset.handle : 'move',
                e,
                'booking'
              );
            });
          }

          if (isClosure && x.ref && x.ref.id) {
            block.dataset.closureId = x.ref.id;
            const bedsSorted = (x.ref.beds || [bed]).slice().sort((a, c) => a - c);
            const selected = opts.selectedClosureId === x.ref.id;
            const canEditClosure = Boolean(opts.onClosureLayoutChange);
            if (selected) {
              block.classList.add('is-selected');
              if (canEditClosure) {
                [['w', '左'], ['e', '右']].forEach(([h]) => {
                  const hd = document.createElement('i');
                  hd.className = `blk-handle blk-handle-${h}`;
                  hd.dataset.handle = h;
                  block.appendChild(hd);
                });
                if (bed === bedsSorted[0]) {
                  const hd = document.createElement('i');
                  hd.className = 'blk-handle blk-handle-n';
                  hd.dataset.handle = 'n';
                  block.appendChild(hd);
                }
                if (bed === bedsSorted[bedsSorted.length - 1]) {
                  const hd = document.createElement('i');
                  hd.className = 'blk-handle blk-handle-s';
                  hd.dataset.handle = 's';
                  block.appendChild(hd);
                }
              }
            }

            block.addEventListener('pointerdown', (e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              e.preventDefault();
              if (!opts.onClosureSelect && !opts.onClosureLayoutChange) {
                if (opts.onBlockClick) opts.onBlockClick(x);
                return;
              }
              const handle = e.target.closest('.blk-handle');
              if (opts.selectedClosureId !== x.ref.id || !canEditClosure) {
                if (opts.onClosureSelect) {
                  opts.onClosureSelect(x.ref, { clientX: e.clientX, clientY: e.clientY });
                }
                return;
              }
              const startOff = BookingStore.timeToOffset(x.ref.startTime);
              const endOff = BookingStore.timeToOffset(x.ref.endTime);
              startBlockEdit(
                {
                  id: x.ref.id,
                  beds: x.ref.beds || [bed],
                  startTime: x.ref.startTime,
                  durationMinutes: endOff - startOff,
                },
                handle ? handle.dataset.handle : 'move',
                e,
                'closure'
              );
            });
          } else if (opts.onBlockClick && isClosure) {
            block.addEventListener('click', (e) => {
              e.stopPropagation();
              opts.onBlockClick(x);
            });
          }
          track.appendChild(block);
        });

      track.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('.board-block')) return;
        e.preventDefault();
        if (opts.onClearBookingSelect) opts.onClearBookingSelect();
        if (opts.onClearClosureSelect) opts.onClearClosureSelect();
        const startOff = offsetFromClientX(track, e.clientX);
        activeDrag = { startBed: bed, startOff, curBed: bed, curOff: startOff };
        wrap.classList.add('is-dragging');
        if (opts.onDragStart) opts.onDragStart({ bedIndex: bed, startOffset: startOff });
        paintBedsRange(bed, bed, startOff, startOff);
        window.addEventListener('pointermove', onDragMove);
        window.addEventListener('pointerup', onDragEnd);
        window.addEventListener('pointercancel', onDragEnd);
      });

      appendNowLine(track);

      row.appendChild(label);
      row.appendChild(track);

      if (isPair && pairGroup) {
        if (activePairGroup !== pairGroup) {
          activePairGroup = pairGroup;
          pairGroupEl = document.createElement('div');
          pairGroupEl.className = 'board-pair-group';
          pairGroupEl.dataset.pairGroup = pairGroup;
          const brace = document.createElement('div');
          brace.className = 'board-pair-brace';
          brace.setAttribute('aria-hidden', 'true');
          pairRowsEl = document.createElement('div');
          pairRowsEl.className = 'board-pair-rows';
          pairGroupEl.appendChild(brace);
          pairGroupEl.appendChild(pairRowsEl);
          wrap.appendChild(pairGroupEl);
        }
        pairRowsEl.appendChild(row);
        if (row.classList.contains('is-pair-last')) {
          activePairGroup = null;
          pairGroupEl = null;
          pairRowsEl = null;
        }
      } else {
        activePairGroup = null;
        pairGroupEl = null;
        pairRowsEl = null;
        wrap.appendChild(row);
      }
    }

    function startBlockEdit(block, mode, e, kind) {
      const beds0 = (block.beds || []).slice().sort((a, c) => a - c);
      const start0 = BookingStore.timeToOffset(block.startTime);
      const end0 = start0 + block.durationMinutes;
      const originOff = anyTrackFromClientX(e.clientX);
      const originBed = bedFromClientY(e.clientY);
      const edit = {
        id: block.id,
        kind,
        mode,
        start0,
        end0,
        beds0,
        originOff,
        originBed,
      };
      wrap.classList.add('is-editing-block');
      const idAttr = kind === 'closure' ? 'data-closure-id' : 'data-booking-id';

      function applyPreview(startOff, endOff, beds) {
        const b0 = Math.min(...beds);
        const b1 = Math.max(...beds);
        wrap.querySelectorAll(`.board-block[${idAttr}="${block.id}"]`).forEach((el) => {
          el.style.opacity = '0.3';
        });
        paintBedsRange(b0, b1, startOff, Math.max(startOff, endOff - snap));
        edit.preview = { startOff, endOff, beds };
      }

      function onEditMove(ev) {
        const curOff = anyTrackFromClientX(ev.clientX);
        const curBed = bedFromClientY(ev.clientY);
        let startOff = edit.start0;
        let endOff = edit.end0;
        let beds = edit.beds0.slice();

        if (edit.mode === 'move') {
          let dOff = Math.round((curOff - edit.originOff) / snap) * snap;
          let dBed = curBed - edit.originBed;
          startOff = edit.start0 + dOff;
          endOff = edit.end0 + dOff;
          if (startOff < 0) {
            endOff -= startOff;
            startOff = 0;
          }
          if (endOff > span) {
            startOff -= endOff - span;
            endOff = span;
          }
          startOff = Math.max(0, Math.min(span - snap, startOff));
          endOff = Math.max(startOff + snap, Math.min(span, endOff));
          beds = edit.beds0.map((b) => b + dBed);
          const minB = Math.min(...beds);
          const maxB = Math.max(...beds);
          if (minB < 0) beds = beds.map((b) => b - minB);
          if (maxB >= cfg.bedCount) {
            const over = maxB - (cfg.bedCount - 1);
            beds = beds.map((b) => b - over);
          }
        } else if (edit.mode === 'e') {
          endOff = Math.max(startOff + snap, Math.min(span, Math.round(curOff / snap) * snap + snap));
        } else if (edit.mode === 'w') {
          startOff = Math.min(endOff - snap, Math.max(0, Math.round(curOff / snap) * snap));
        } else if (edit.mode === 'n') {
          const top = Math.min(curBed, edit.beds0[edit.beds0.length - 1]);
          const bottom = edit.beds0[edit.beds0.length - 1];
          beds = Array.from({ length: bottom - top + 1 }, (_, i) => top + i);
        } else if (edit.mode === 's') {
          const top = edit.beds0[0];
          const bottom = Math.max(curBed, top);
          beds = Array.from({ length: bottom - top + 1 }, (_, i) => top + i);
        }

        applyPreview(startOff, endOff, beds);
      }

      function onEditEnd() {
        window.removeEventListener('pointermove', onEditMove);
        window.removeEventListener('pointerup', onEditEnd);
        window.removeEventListener('pointercancel', onEditEnd);
        wrap.classList.remove('is-editing-block');
        const p = edit.preview;
        if (!p) return;
        const payload = {
          id: edit.id,
          startTime: BookingStore.offsetToTime(p.startOff),
          endTime: BookingStore.offsetToTime(p.endOff),
          durationMinutes: p.endOff - p.startOff,
          beds: p.beds,
          guests: p.beds.length,
          clientX: e.clientX,
          clientY: e.clientY,
        };
        if (kind === 'closure') {
          if (opts.onClosureLayoutChange) opts.onClosureLayoutChange(payload);
        } else if (opts.onBookingLayoutChange) {
          opts.onBookingLayoutChange(payload);
        }
      }

      applyPreview(start0, end0, beds0);
      window.addEventListener('pointermove', onEditMove);
      window.addEventListener('pointerup', onEditEnd);
      window.addEventListener('pointercancel', onEditEnd);
    }

    if (!opts.selection) clearHourHeaderHighlight();

    // 底部时间轴标签行（对齐当前时刻竖线）
    try {
      if (opts.showNowLine !== false && dateStr === BookingStore.todayBusinessDate()) {
        const hhmm = tokyoNowHhmm();
        const off = BookingStore.timeToOffset(hhmm);
        if (off >= 0 && off <= span) {
          const nowAxis = document.createElement('div');
          nowAxis.className = 'board-row board-now-axis';
          nowAxis.innerHTML = `<div class="board-corner"></div><div class="board-now-axis-track"></div>`;
          const axisTrack = nowAxis.querySelector('.board-now-axis-track');
          const lab = document.createElement('span');
          lab.className = 'board-now-label';
          lab.textContent = hhmm;
          lab.style.left = `${(off / span) * 100}%`;
          lab.title = `当前时间:${hhmm}`;
          axisTrack.appendChild(lab);
          wrap.appendChild(nowAxis);
        }
      }
    } catch (err) {}

    if (opts.showLegend !== false) {
      const legend = document.createElement('div');
      legend.className = 'board-legend';
      legend.innerHTML = `
      <span><i class="lg booking"></i>已确认预约</span>
      <span><i class="lg pending"></i>待商家确认（≥2人）</span>
      <span><i class="lg hold"></i>仅预占（未建单）</span>
      <span><i class="lg closure"></i>商家关闭</span>
      <span><i class="lg selection"></i>${opts.selectionHint || '空档拖选 / 选中块可拖移与拉伸'}</span>
    `;
      wrap.appendChild(legend);
    }
    container.appendChild(wrap);
  }

  /**
   * 生成给商家邮件用的床位状态图（返回 dataURL）
   */
  function buildStatusChartImage(dateStr, highlightBookingId) {
    const cfg = STORE_CONFIG;
    const span = BookingStore.businessSpanMinutes();
    const items = BookingStore.occupancyForDate(dateStr);
    const labels = hourSlotMeta();

    const left = 72;
    const axisH = 22; // 小时刻度专用带
    const textH = 70; // 标题文字区（与刻度完全分开）
    const top = textH + axisH; // 床位轨道起点
    const rowH = 36;
    const footerH = 44;
    const width = 920;
    const height = top + cfg.bedCount * rowH + footerH;
    const trackW = width - left - 24;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#faf7f2';
    ctx.fillRect(0, 0, width, height);

    // 文字区背景，和下方刻度带视觉分隔
    ctx.fillStyle = '#f3eee6';
    ctx.fillRect(0, 0, width, textH);
    ctx.strokeStyle = '#e5ddd3';
    ctx.beginPath();
    ctx.moveTo(0, textH);
    ctx.lineTo(width, textH);
    ctx.stroke();

    ctx.fillStyle = '#2c2c2c';
    ctx.font = '600 18px sans-serif';
    ctx.fillText(`${cfg.storeName.cn} · 床位使用时段`, 20, 26);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#5a5a5a';
    ctx.fillText(`营业日 ${dateStr}`, 20, 48);
    ctx.fillText(`营业时段 ${cfg.hoursLabel || ''}`, 200, 48);
    ctx.fillText(`生成于 ${new Date().toLocaleString('zh-CN')}`, 20, 66);

    // 小时刻度：按真实时长比例
    const axisBaseline = textH + 16;
    labels.forEach((slot) => {
      const x = left + (slot.startOffset / span) * trackW;
      ctx.strokeStyle = '#e8e0d6';
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + cfg.bedCount * rowH);
      ctx.stroke();
      if (slot.duration >= 60) {
        const midX = left + ((slot.startOffset + 30) / span) * trackW;
        ctx.strokeStyle = '#efe6da';
        ctx.beginPath();
        ctx.moveTo(midX, top);
        ctx.lineTo(midX, top + cfg.bedCount * rowH);
        ctx.stroke();
      }
      ctx.fillStyle = isNextDayHour(slot.hour) ? '#c45c26' : '#8a8178';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(String(slot.hour).padStart(2, '0'), x + 2, axisBaseline);
    });
    const midnight = labels.find((s) => isNextDayHour(s.hour));
    if (midnight) {
      const mx = left + (midnight.startOffset / span) * trackW;
      ctx.fillStyle = '#c45c26';
      ctx.font = '600 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(nextDayLabel(), mx + 4, textH - 8);
    }
    // 右边界
    ctx.strokeStyle = '#e8e0d6';
    ctx.beginPath();
    ctx.moveTo(left + trackW, top);
    ctx.lineTo(left + trackW, top + cfg.bedCount * rowH);
    ctx.stroke();

    for (let bed = 0; bed < cfg.bedCount; bed++) {
      const y = top + bed * rowH;
      ctx.fillStyle = '#fff';
      ctx.fillRect(left, y + 4, trackW, rowH - 8);
      ctx.strokeStyle = '#e5ddd3';
      ctx.strokeRect(left, y + 4, trackW, rowH - 8);

      ctx.fillStyle = '#2c2c2c';
      ctx.font = '13px sans-serif';
      ctx.fillText(bedLabel(bed), 12, y + rowH / 2 + 4);

      items
        .filter((x) => x.bedIndex === bed)
        .forEach((x) => {
          const bx = left + (x.start / span) * trackW;
          const bw = Math.max(4, ((x.end - x.start) / span) * trackW);
          const hi = highlightBookingId && x.ref && x.ref.id === highlightBookingId;
          ctx.fillStyle = TYPE_COLOR[x.type] || '#999';
          if (hi) {
            ctx.fillStyle = '#166534';
          }
          ctx.fillRect(bx + 1, y + 8, Math.max(3, bw - 3), rowH - 16);
        });
    }

    // legend
    const ly = height - 22;
    const legs = [
      ['#2f9d62', '已确认'],
      ['#d97706', '待商家确认'],
      ['#7c3aed', '预占'],
      ['#6b7280', '商家关闭'],
      ['#0f766e', '开床申请'],
      ['#1E8E4F', '本单高亮'],
    ];
    let lx = 20;
    legs.forEach(([c, t]) => {
      ctx.fillStyle = c;
      ctx.fillRect(lx, ly - 8, 12, 12);
      ctx.fillStyle = '#444';
      ctx.font = '12px sans-serif';
      ctx.fillText(t, lx + 16, ly + 2);
      lx += 72;
    });

    return canvas.toDataURL('image/png');
  }

  function buildEmailDraft(booking, eventType) {
    const cfg = STORE_CONFIG;
    const course = cfg.courses.find((c) => c.id === booking.courseId);
    const channel = cfg.channels.find((c) => c.id === booking.channelId);
    const beds = (booking.beds || []).map((i) => bedLabel(i)).join('、');
    const end = BookingStore.offsetToTime(
      BookingStore.timeToOffset(booking.startTime) + booking.durationMinutes
    );
    const eventLabel =
      eventType === 'reschedule'
        ? '改期通知'
        : eventType === 'confirm'
          ? '预约确认'
          : eventType === 'cancel'
            ? '取消通知'
            : '新预约通知';

    const subject = `${cfg.emailSubjectPrefix}${eventLabel} ${booking.date} ${booking.startTime}`;
    const body = [
      `【${eventLabel}】（邮件正文模板待提供，以下为测试占位）`,
      '',
      `门店：${cfg.storeName.cn}`,
      `单号：${booking.id}`,
      `状态：${booking.status}`,
      `日期：${booking.date}`,
      `时段：${booking.startTime} – ${end}`,
      `时长：${booking.durationMinutes} 分钟`,
      `人数：${booking.guests}`,
      `床位：${beds}`,
      `项目：${course ? (global.DeskI18n ? DeskI18n.courseLabel(course) : course.name) : '-'}`,
      `渠道：${channel ? channel.name : '-'}`,
      `客人：${booking.guestName || '-'}`,
      `电话：${booking.guestPhone || '-'}`,
      `备注：${booking.note || '-'}`,
      '',
      '附件/配图：床位使用时段实时状态图（见预览区图片）',
      '',
      '— 预约管理平台（功能测试版）',
    ].join('\n');

    return { subject, body, chartDataUrl: buildStatusChartImage(booking.date, booking.id) };
  }

  function buildOpenRequestEmail(closure) {
    const cfg = STORE_CONFIG;
    const beds = (closure.beds || []).map((i) => bedLabel(i)).join('、');
    const subject = `${cfg.emailSubjectPrefix}开床申请 ${closure.date} ${beds || ''}`;
    const body = [
      '【开床申请】',
      '',
      `门店：${cfg.storeName.cn}`,
      `营业日：${closure.date}`,
      `关闭时段：${closure.startTime} – ${closure.endTime}`,
      `床位：${beds || '-'}`,
      `原关闭原因：${closure.reason || '-'}`,
      `申请备注：${closure.openRequestNote || '-'}`,
      '',
      '客服申请打开上述关闭床位，请在商家端查看并选择「同意开床」或「拒绝」。',
      '附件/配图：床位使用时段实时状态图（见预览区图片）',
      '',
      '— 预约管理平台（功能测试版）',
    ].join('\n');
    return {
      subject,
      body,
      chartDataUrl: buildStatusChartImage(closure.date, null),
    };
  }

  function buildDailyDigestEmail(dateStr) {
    const cfg = STORE_CONFIG;
    const bookings = BookingStore.listBookings(dateStr).filter(
      (b) => b.status !== 'cancelled'
    );
    const closures = BookingStore.listClosures(dateStr);
    const lines = bookings.map((b) => {
      const end = BookingStore.offsetToTime(
        BookingStore.timeToOffset(b.startTime) + b.durationMinutes
      );
      const beds = (b.beds || []).map((i) => bedLabel(i)).join('、');
      const course = (cfg.courses.find((c) => c.id === b.courseId) || {}).name || '-';
      return `· [${b.status}] ${b.startTime}–${end} ${beds} ${b.guests || 1}人 ${
        b.guestName || '未留名'
      } / ${course}`;
    });
    const closeLines = closures.map((c) => {
      const beds = (c.beds || []).map((i) => bedLabel(i)).join('、');
      const tag = c.openRequestStatus === 'requested' ? '（开床申请中）' : '';
      return `· ${c.startTime}–${c.endTime} ${beds || '-'} ${c.reason || ''}${tag}`;
    });
    const subject = `${cfg.emailSubjectPrefix}每日预约汇总 ${dateStr}`;
    const body = [
      '【每日预约汇总】',
      '',
      `门店：${cfg.storeName.cn}`,
      `营业日：${dateStr}`,
      `营业时段：${cfg.hoursLabel}`,
      '',
      `预约（${bookings.length}）：`,
      ...(lines.length ? lines : ['（当日无预约）']),
      '',
      `商家关闭（${closures.length}）：`,
      ...(closeLines.length ? closeLines : ['（当日无关闭）']),
      '',
      '附件/配图：床位使用时段实时状态图（见预览区图片）',
      '',
      '— 预约管理平台（功能测试版）',
    ].join('\n');
    return {
      subject,
      body,
      chartDataUrl: buildStatusChartImage(dateStr, null),
    };
  }

  function addDaysYmd(dateStr, days) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  function formatUsShortDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${Number(m)}/${Number(d)}`;
  }

  /** 对齐现有 Google 日历手工录入格式 */
  function buildCalendarDraft(booking, eventType) {
    const cfg = STORE_CONFIG;
    const course = cfg.courses.find((c) => c.id === booking.courseId);
    const courseName = course
      ? String(
          global.DeskI18n ? DeskI18n.courseLabel(course) : course.name || ''
        )
          .split('/')[0]
          .trim()
      : 'Service';
    const beds = (booking.beds || []).map((i) => bedLabel(i)).join('、');
    const endTime = BookingStore.offsetToTime(
      BookingStore.timeToOffset(booking.startTime) + booking.durationMinutes
    );
    const [sh] = booking.startTime.split(':').map(Number);
    const [eh] = endTime.split(':').map(Number);
    // 结束钟点早于开始 → 跨自然日（如 23:00–01:00）
    const endDate = eh < sh ? addDaysYmd(booking.date, 1) : booking.date;

    // 客服多在中国时区看日历：写入时带 +08:00，保证「填 15:00 → 日历显示 15:00」
    // （若只写 Asia/Tokyo，中国区查看会整体早 1 小时）
    const writeTz = cfg.googleWriteTimeZone || 'Asia/Shanghai';
    const offset = writeTz === 'Asia/Tokyo' ? '+09:00' : '+08:00';
    const summary = `${booking.guests || 1}人，${booking.durationMinutes}分钟${courseName}`;
    const head =
      eventType === 'reschedule'
        ? 'Your appointment has been updated.'
        : eventType === 'cancel'
          ? 'Your appointment has been cancelled.'
          : 'Your appointment has been confirmed.';
    const description = [
      head,
      `SHOP: ${cfg.storeName.en || cfg.storeName.cn}`,
      `Name: ${booking.guestName || '-'}`,
      `Time: ${formatUsShortDate(booking.date)}, ${booking.startTime}`,
      `Number of Guests: ${booking.guests || 1}`,
      `Service: ${
        course ? (global.DeskI18n ? DeskI18n.courseLabel(course) : course.name) : '-'
      } ${booking.durationMinutes} min`,
      `Contact (WhatsApp): ${booking.guestPhone || '-'}`,
      `Beds: ${beds || '-'}`,
      `Channel: ${(cfg.channels.find((c) => c.id === booking.channelId) || {}).name || '-'}`,
      `Booking ID: ${booking.id}`,
      booking.note ? `Note: ${booking.note}` : null,
      booking.price != null && booking.price !== '' ? `Price: ${booking.price}` : null,
      'We look forward to welcoming you.',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      calendarId: cfg.googleCalendarId || '',
      calendarName: cfg.googleCalendarName || cfg.storeName.cn,
      eventId: booking.googleEventId || null,
      bookingId: booking.id || null,
      storeId: cfg.storeId || null,
      summary,
      description,
      // 带明确偏移，避免被日历默认「日本时区」改写
      startDateTime: `${booking.date}T${booking.startTime}:00${offset}`,
      endDateTime: `${endDate}T${endTime}:00${offset}`,
      timeZone: writeTz,
    };
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function toYmd(y, m, d) {
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  function monthGrid(year, month, weekStart) {
    const startWeek = weekStart == null ? 0 : weekStart;
    const first = new Date(year, month - 1, 1);
    const lead = (first.getDay() - startWeek + 7) % 7;
    const start = new Date(year, month - 1, 1 - lead);
    const cells = [];
    for (let i = 0; i < 42; i += 1) {
      const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const y = dt.getFullYear();
      const m = dt.getMonth() + 1;
      const d = dt.getDate();
      cells.push({
        date: toYmd(y, m, d),
        day: d,
        inMonth: m === month && y === year,
      });
    }
    return cells;
  }

  function weekdayLabels() {
    const lang = global.DeskI18n ? DeskI18n.getLang() : 'jp';
    if (lang === 'cn') return ['日', '一', '二', '三', '四', '五', '六'];
    if (lang === 'en') return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return ['日', '月', '火', '水', '木', '金', '土'];
  }

  function monthHeading(year, month) {
    const lang = global.DeskI18n ? DeskI18n.getLang() : 'jp';
    if (lang === 'en') {
      return new Date(year, month - 1, 1).toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    }
    return `${year}年${month}月`;
  }

  function monthChipLabel(booking) {
    const name = booking.guestName || (global.DeskI18n ? DeskI18n.t('unnamedGuest') : '—');
    return `${booking.startTime} ${name}`;
  }

  function monthChipClass(booking) {
    if (booking.status === 'pending_confirm') return 'is-pending';
    if (booking.status === 'hold') return 'is-hold';
    return 'is-booking';
  }

  function renderMonth(container, dateStr, options) {
    const opts = options || {};
    const parts = String(dateStr || '').split('-').map(Number);
    const year = parts[0] || new Date().getFullYear();
    const month = parts[1] || new Date().getMonth() + 1;
    const cells = monthGrid(year, month, 0);
    const start = cells[0].date;
    const end = cells[cells.length - 1].date;
    const bookings = BookingStore.listBookingsInRange
      ? BookingStore.listBookingsInRange(start, end)
      : [];
    const byDate = {};
    bookings.forEach((b) => {
      if (!byDate[b.date]) byDate[b.date] = [];
      byDate[b.date].push(b);
    });
    const today = BookingStore.todayBusinessDate();
    const selected = dateStr;
    const maxChips = 3;
    const moreText = global.DeskI18n ? DeskI18n.t('monthMore') : '+{n}';

    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'month-cal';

    const head = document.createElement('div');
    head.className = 'month-cal-head';
    head.textContent = monthHeading(year, month);
    wrap.appendChild(head);

    const wrow = document.createElement('div');
    wrow.className = 'month-cal-weekdays';
    weekdayLabels().forEach((w) => {
      const el = document.createElement('div');
      el.textContent = w;
      wrow.appendChild(el);
    });
    wrap.appendChild(wrow);

    const grid = document.createElement('div');
    grid.className = 'month-cal-grid';
    cells.forEach((cell) => {
      const dayEl = document.createElement('button');
      dayEl.type = 'button';
      dayEl.className = 'month-cal-day';
      if (!cell.inMonth) dayEl.classList.add('is-out');
      if (cell.date === today) dayEl.classList.add('is-today');
      if (cell.date === selected) dayEl.classList.add('is-selected');
      dayEl.dataset.date = cell.date;

      const num = document.createElement('span');
      num.className = 'month-cal-num';
      num.textContent = String(cell.day);
      dayEl.appendChild(num);

      const list = byDate[cell.date] || [];
      const show = list.slice(0, maxChips);
      show.forEach((b) => {
        const chip = document.createElement('span');
        chip.className = `month-cal-chip ${monthChipClass(b)}`;
        chip.textContent = monthChipLabel(b);
        chip.title = monthChipLabel(b);
        chip.dataset.bookingId = b.id;
        dayEl.appendChild(chip);
      });
      if (list.length > maxChips) {
        const more = document.createElement('span');
        more.className = 'month-cal-more';
        more.textContent = moreText.replace('{n}', String(list.length - maxChips));
        dayEl.appendChild(more);
      }
      grid.appendChild(dayEl);
    });
    wrap.appendChild(grid);

    wrap.addEventListener('click', (e) => {
      const chip = e.target.closest('.month-cal-chip');
      if (chip && chip.dataset.bookingId) {
        e.preventDefault();
        e.stopPropagation();
        const booking = bookings.find((b) => b.id === chip.dataset.bookingId);
        if (booking && opts.onBookingSelect) {
          opts.onBookingSelect(booking, { x: e.clientX, y: e.clientY });
        }
        return;
      }
      const day = e.target.closest('.month-cal-day');
      if (day && day.dataset.date && opts.onDayClick) {
        opts.onDayClick(day.dataset.date);
      }
    });

    container.appendChild(wrap);
  }

  function agendaWeekday(ymd) {
    const [y, m, d] = String(ymd).split('-').map(Number);
    const dow = new Date(y, (m || 1) - 1, d || 1).getDay();
    const lang = global.DeskI18n ? DeskI18n.getLang() : 'jp';
    if (lang === 'cn') return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dow];
    if (lang === 'en') return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow];
    return ['日', '月', '火', '水', '木', '金', '土'][dow];
  }

  function agendaDateLabel(ymd) {
    const [, m, d] = String(ymd).split('-');
    const lang = global.DeskI18n ? DeskI18n.getLang() : 'jp';
    const wd = agendaWeekday(ymd);
    if (lang === 'en') return `${Number(m)}/${Number(d)} ${wd}`;
    return `${Number(m)}月${Number(d)}日 ${wd}`;
  }

  function agendaEscape(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;');
  }

  function agendaCourseText(b) {
    const cfg = global.STORE_CONFIG || {};
    const courses = cfg.courses || [];
    const dur = Number(b.durationMinutes) || 0;
    const lang =
      global.DeskI18n && DeskI18n.getLang ? DeskI18n.getLang() : 'jp';
    const pickName = (n) => {
      if (!n) return '';
      if (typeof n === 'object') return n[lang] || n.jp || n.cn || n.en || '';
      const raw = String(n).trim();
      if (raw.includes('/')) {
        const parts = raw.split('/').map((x) => x.trim()).filter(Boolean);
        if (lang === 'cn' && parts[1]) return parts[1];
        if (lang === 'en' && parts[2]) return parts[2];
        return parts[0] || raw;
      }
      return raw;
    };
    const labelOf = (c) => {
      if (!c) return '';
      const fromName = pickName(c.name);
      if (fromName) return fromName;
      if (global.DeskI18n && DeskI18n.courseLabel) {
        return String(DeskI18n.courseLabel(c) || '').replace(/\s*[-–]\s*¥.*$/, '');
      }
      return String(c.id || '');
    };
    const durOf = (c) => {
      if (!c) return 0;
      if (c.durationMinutes) return Number(c.durationMinutes) || 0;
      const m = String(labelOf(c) + ' ' + (typeof c.name === 'string' ? c.name : '')).match(
        /(\d+)\s*(?:分钟|分|min)/i
      );
      return m ? Number(m[1]) : 0;
    };
    const sameDur = dur ? courses.filter((c) => durOf(c) === dur) : [];
    let rematch = null;
    if (global.WaBookingParse && WaBookingParse.matchCourseId) {
      const id = WaBookingParse.matchCourseId(
        [b.courseName, b.note].filter(Boolean).join('\n'),
        courses,
        dur
      );
      rematch = courses.find((c) => c && c.id === id) || null;
    }
    const byId = courses.find((c) => c && c.id === b.courseId);
    const stored = pickName(b.courseName);
    const storedIsGuest = stored && b.guestName && stored === String(b.guestName).trim();

    const prefer = (c) => c && (!dur || !durOf(c) || durOf(c) === dur);
    if (prefer(rematch) && labelOf(rematch)) return labelOf(rematch);
    if (prefer(byId) && labelOf(byId)) return labelOf(byId);
    if (sameDur.length) {
      const typed =
        sameDur.find((c) => /body|ボディ|身体|massage/i.test(`${labelOf(c)} ${c.id || ''}`)) ||
        sameDur[0];
      if (typed) return labelOf(typed);
    }
    if (stored && !storedIsGuest) return stored;
    if (byId && labelOf(byId)) return labelOf(byId);
    if (dur) return lang === 'en' ? `${dur} min` : `${dur}分钟`;
    return '';
  }

  function agendaYmd(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const dt = new Date(s);
    if (Number.isNaN(dt.getTime())) return '';
    if (global.BookingStore && BookingStore.tokyoParts) {
      const p = BookingStore.tokyoParts(dt);
      return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
    }
    return '';
  }

  function agendaMd(ymd) {
    const m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    const lang =
      global.DeskI18n && DeskI18n.getLang ? DeskI18n.getLang() : 'cn';
    if (lang === 'en') return `${Number(m[2])}/${Number(m[3])}`;
    return `${Number(m[2])}月${Number(m[3])}日`;
  }

  function agendaShiftYmd(ymd, days) {
    const [y, m, d] = String(ymd || '').split('-').map(Number);
    if (!y || !m || !d) return '';
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + Number(days) || 0);
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  function agendaNoteText(b) {
    const visit = agendaYmd(b && b.date);
    const recorded = agendaYmd(
      b && (b.googleCreatedAt || b.recordedAt || b.createdAt)
    );
    if (!visit || !recorded) return '';
    const [vy, vm, vd] = visit.split('-').map(Number);
    const [ry, rm, rd] = recorded.split('-').map(Number);
    const gap =
      (Date.UTC(vy, vm - 1, vd) - Date.UTC(ry, rm - 1, rd)) / 86400000;
    if (!(gap > 3)) return '';
    const remind = agendaShiftYmd(visit, -1);
    const mark = (ymd) =>
      `<span class="agenda-md">${agendaEscape(agendaMd(ymd))}</span>`;
    const tpl =
      global.DeskI18n && DeskI18n.t
        ? DeskI18n.t('agendaEarlyRecord')
        : '{recorded}预约，建议{remind}提醒和确认';
    return String(tpl)
      .replace('{recorded}', mark(recorded))
      .replace('{remind}', mark(remind));
  }

  function renderAgenda(container, bookings, options) {
    const opts = options || {};
    const today = BookingStore.todayBusinessDate ? BookingStore.todayBusinessDate() : '';
    const empty = global.DeskI18n ? DeskI18n.t('upcomingEmpty') : '暂无今后预约';
    const guestsUnit = global.DeskI18n ? DeskI18n.t('agendaGuests') : '人';
    const t = (key, fallback) =>
      global.DeskI18n ? DeskI18n.t(key) : fallback;
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'agenda';
    const list = (bookings || []).filter((b) => b && b.status !== 'cancelled');
    const head = document.createElement('div');
    head.className = 'agenda-head';
    head.innerHTML = `<span>${t('agendaColTime', '时间')}</span>
      <span>${t('agendaColName', '姓名')}</span>
      <span>${t('agendaColCourse', '项目')}</span>
      <span class="agenda-note-h">${t('agendaColNote', '提醒')}</span>
      <span class="agenda-side-h">${t('agendaColSide', '人数')}</span>`;
    wrap.appendChild(head);
    if (!list.length) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'agenda-empty';
      emptyEl.textContent = empty;
      wrap.appendChild(emptyEl);
      container.appendChild(wrap);
      return;
    }
    let lastDate = '';
    list.forEach((b) => {
      if (b.date !== lastDate) {
        lastDate = b.date;
        const dateHead = document.createElement('div');
        dateHead.className = 'agenda-date';
        if (b.date === today) dateHead.classList.add('is-today');
        dateHead.textContent = agendaDateLabel(b.date);
        wrap.appendChild(dateHead);
      }
      const end = BookingStore.offsetToTime(
        BookingStore.timeToOffset(b.startTime) + Number(b.durationMinutes || 60)
      );
      const beds = (b.beds || []).map((i) =>
        global.DeskI18n ? DeskI18n.bedLabelAt(i) : i + 1
      ).join('、');
      const course = agendaCourseText(b);
      const name = b.guestName || (global.DeskI18n ? DeskI18n.t('unnamedGuest') : '—');
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `agenda-row is-${b.status || 'confirmed'}`;
      row.dataset.bookingId = b.id;
      row.dataset.date = b.date;
      row.innerHTML = `<span class="agenda-time">${b.startTime}–${end}</span>
        <span class="agenda-who"><span class="agenda-name">${agendaEscape(name)}</span></span>
        <span class="agenda-course">${agendaEscape(course)}</span>
        <span class="agenda-note">${agendaNoteText(b)}</span>
        <span class="agenda-side">
          <span class="agenda-guests${parseInt(b.guests, 10) > 2 ? ' is-many' : ''}">${b.guests || 1}${guestsUnit}</span>
          <span class="agenda-beds">${agendaEscape(beds)}</span>
        </span>`;
      wrap.appendChild(row);
    });
    wrap.addEventListener('click', (e) => {
      const row = e.target.closest('.agenda-row');
      if (!row) return;
      const booking = list.find((b) => b.id === row.dataset.bookingId);
      if (booking && opts.onBookingSelect) {
        opts.onBookingSelect(booking, { x: e.clientX, y: e.clientY });
      }
    });
    container.appendChild(wrap);
  }

  global.BoardUI = {
    renderBoard,
    renderMonth,
    renderAgenda,
    buildStatusChartImage,
    buildEmailDraft,
    buildOpenRequestEmail,
    buildDailyDigestEmail,
    buildCalendarDraft,
    hourLabels,
    hourSlots,
    hourSlotMeta,
  };
})(window);
