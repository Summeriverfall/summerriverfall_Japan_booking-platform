/**
 * 时间轴看板渲染 + 邮件用「床位实时状态图」生成（Canvas → PNG）
 */
(function (global) {
  const TYPE_COLOR = {
    booking: '#9bb8d9',
    pending: '#d97706',
    hold: '#7c3aed',
    closure: '#6b7280',
    closure_request: '#0f766e',
  };

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
    head.innerHTML = `<div class="board-corner">资源</div><div class="board-hours"></div>`;
    const hoursEl = head.querySelector('.board-hours');
    const hourCells = [];
    slotMeta.forEach((slot, idx) => {
      const cell = document.createElement('div');
      cell.className = 'board-hour';
      cell.dataset.hourIndex = String(idx);
      cell.style.flex = `0 0 ${slot.widthPct}%`;
      cell.style.width = `${slot.widthPct}%`;
      cell.textContent = String(slot.hour).padStart(2, '0');
      cell.title = `${slot.startTime} – ${slot.endTime}`;
      hoursEl.appendChild(cell);
      hourCells.push(cell);
    });
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
      let range = null;
      wrap.querySelectorAll('.board-track').forEach((t) => {
        const bed = Number(t.dataset.bed);
        const sel = t.querySelector('.board-selection');
        if (!sel) return;
        if (bed >= b0 && bed <= b1) {
          range = paintSelection(sel, startOff, endOff);
        } else {
          sel.hidden = true;
        }
      });
      if (range) applyHourHeaderHighlight(range.start, range.end);
      return {
        range,
        bedIndexes: Array.from({ length: b1 - b0 + 1 }, (_, i) => b0 + i),
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
      if (clickInCurrentSelection && opts.onCancelSelection) {
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
        const now = new Date();
        const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(
          now.getMinutes()
        ).padStart(2, '0')}`;
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

    for (let bed = 0; bed < cfg.bedCount; bed++) {
      const row = document.createElement('div');
      row.className = 'board-row';
      const label = document.createElement('div');
      label.className = 'board-label';
      const name = cfg.bedLabels[bed] || `${bed + 1}号资源`;

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
          block.style.left = `${(x.start / span) * 100}%`;
          block.style.width = `${((x.end - x.start) / span) * 100}%`;
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
              : `${guestLabel || '预约'} ${x.startTime} · ${x.ref.guests || 1}人`;
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
      wrap.appendChild(row);
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
        const now = new Date();
        const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(
          now.getMinutes()
        ).padStart(2, '0')}`;
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
      <span><i class="lg pending"></i>待客服确认（≥2人）</span>
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
      ctx.fillStyle = '#8a8178';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(String(slot.hour).padStart(2, '0'), x + 2, axisBaseline);
    });
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
      ctx.fillText(cfg.bedLabels[bed], 12, y + rowH / 2 + 4);

      items
        .filter((x) => x.bedIndex === bed)
        .forEach((x) => {
          const bx = left + (x.start / span) * trackW;
          const bw = Math.max(4, ((x.end - x.start) / span) * trackW);
          const hi = highlightBookingId && x.ref && x.ref.id === highlightBookingId;
          ctx.fillStyle = TYPE_COLOR[x.type] || '#999';
          if (hi) {
            ctx.fillStyle = '#1E8E4F';
          }
          ctx.fillRect(bx, y + 8, bw, rowH - 16);
        });
    }

    // legend
    const ly = height - 22;
    const legs = [
      ['#9bb8d9', '已确认'],
      ['#d97706', '待确认'],
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
    const beds = (booking.beds || []).map((i) => cfg.bedLabels[i]).join('、');
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
      `项目：${course ? course.name : '-'}`,
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
    const beds = (closure.beds || []).map((i) => cfg.bedLabels[i]).join('、');
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
      const beds = (b.beds || []).map((i) => cfg.bedLabels[i]).join('、');
      const course = (cfg.courses.find((c) => c.id === b.courseId) || {}).name || '-';
      return `· [${b.status}] ${b.startTime}–${end} ${beds} ${b.guests || 1}人 ${
        b.guestName || '未留名'
      } / ${course}`;
    });
    const closeLines = closures.map((c) => {
      const beds = (c.beds || []).map((i) => cfg.bedLabels[i]).join('、');
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
    const courseName = course ? course.name.split('/')[0].trim() : 'Service';
    const beds = (booking.beds || []).map((i) => cfg.bedLabels[i]).join('、');
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
      `Service: ${course ? course.name : '-'} ${booking.durationMinutes} min`,
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

  global.BoardUI = {
    renderBoard,
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
