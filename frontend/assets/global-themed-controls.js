/**
 * Global Themed Controls Engine for Tessly CRM
 * 1. Theme-based dropdowns positioned strictly below the value only
 * 2. Theme-based monthly calendar picker
 * 3. Complete removal of up/down spin buttons on number inputs
 * 4. Strict numeric validation on number inputs (digits & decimals only)
 */

(function () {
  'use strict';

  // State
  let activeDropdown = null;
  let activeCalendar = null;

  function closeAll() {
    if (activeDropdown) {
      if (activeDropdown._cleanupScroll) activeDropdown._cleanupScroll();
      if (activeDropdown._cleanupKey) activeDropdown._cleanupKey();
      activeDropdown.remove();
      activeDropdown = null;
    }
    if (activeCalendar) {
      activeCalendar.remove();
      activeCalendar = null;
    }
  }

  // --- 0. GLOBAL SELECT PLACEHOLDER ---
  // A native <select> with an empty value always DISPLAYS its first option as
  // if it were the default. For every unselected single-select that has no
  // empty-value option of its own, we add a leading "Select…" item so the
  // closed control and the themed dropdown both make "nothing chosen" visible
  // instead of silently pre-selecting the first entry.
  //
  // Guards keep this surgical:
  //   - multiple / size>1 / disabled selects are untouched
  //   - selects that already own an empty-value option are untouched
  //   - selects with a real selection (incl. explicit defaults like "All")
  //     keep their value and are NOT modified
  //   - React re-renders that strip the option are healed by the observer
  // Read the value React actually holds for a controlled select. When no
  // matching option exists the DOM falls back to the first option, so the DOM
  // `value` alone cannot tell "nothing selected" from "first option picked".
  function reactControlledValue(sel) {
    const key = Object.keys(sel).find((k) => k.startsWith('__reactProps$'));
    if (key && sel[key] && sel[key].value !== undefined) return sel[key].value;
    return null; // not React-controlled -> fall back to the DOM value
  }
  function ensureSelectPlaceholders(root) {
    (root || document).querySelectorAll('select').forEach((sel) => {
      if (sel.disabled || sel.hasAttribute('multiple') || sel.size > 1) return;
      if (sel.getAttribute('data-tl-ph') === 'skip') return;
      const opts = sel.options;
      for (let i = 0; i < opts.length; i++) if (!opts[i].value) return; // own placeholder already
      const controlled = reactControlledValue(sel);
      const effValue = controlled !== null ? controlled : sel.value;
      if (effValue !== '') return; // real default or user selection -> leave alone
      const ph = document.createElement('option');
      ph.value = '';
      ph.textContent = 'Select\u2026';
      ph.dataset.tlPh = '1';
      sel.insertBefore(ph, sel.firstChild);
      sel.selectedIndex = 0; // make "Select…" the live displayed value immediately
    });
  }
  let phQueued = false;
  function queuePlaceholders() {
    if (phQueued) return;
    phQueued = true;
    requestAnimationFrame(() => { phQueued = false; ensureSelectPlaceholders(document); });
  }
  new MutationObserver(queuePlaceholders).observe(document.documentElement, { childList: true, subtree: true });
  queuePlaceholders();

  // --- 1. THEME-BASED DROPDOWN BELOW VALUE ONLY ---
  function openThemedSelect(select) {
    closeAll();
    const rect = select.getBoundingClientRect();
    const dropdown = document.createElement('div');
    dropdown.className = 'theme-dropdown';
    dropdown.setAttribute('role', 'listbox');

    // Position strictly below the value
    const top = rect.bottom + 4;
    const minWidth = rect.width; // dropdown matches the select's own width
    let left = rect.left;
    if (left + minWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - minWidth - 12);
    }

    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
    dropdown.style.width = `${minWidth}px`;
    dropdown.style.minWidth = `${minWidth}px`;
    dropdown.style.maxWidth = `${minWidth}px`;

    const options = Array.from(select.options || []);
    let focusedIndex = options.findIndex(o => o.value === select.value);
    if (focusedIndex < 0) focusedIndex = 0;

    options.forEach((opt, idx) => {
      if (opt.disabled && !opt.value) return; // skip dummy disabled placeholder if needed
      const item = document.createElement('div');
      const isPlaceholder = !opt.value && !opt.disabled;
      item.className = 'theme-dropdown-item' + (opt.value === select.value ? ' is-selected' : '') + (isPlaceholder ? ' is-placeholder' : '');
      item.setAttribute('role', 'option');
      item.setAttribute('data-value', opt.value);
      item.setAttribute('tabindex', '-1');

      const textSpan = document.createElement('span');
      textSpan.className = 'theme-dropdown-text';
      textSpan.textContent = opt.textContent || opt.label;
      item.appendChild(textSpan);

      if (opt.value === select.value && !isPlaceholder) {
        const checkIcon = document.createElement('span');
        checkIcon.className = 'theme-dropdown-check';
        checkIcon.innerHTML = `<svg class="ico" viewBox="0 0 24 24" style="width:15px;height:15px;stroke-width:2.5;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        item.appendChild(checkIcon);
      }

      item.addEventListener('click', (ev) => {
        ev.stopPropagation();
        selectOption(select, opt.value);
        closeAll();
      });

      dropdown.appendChild(item);
    });

    document.body.appendChild(dropdown);
    activeDropdown = dropdown;

    // Viewport-aware placement: never run off the bottom (or top) of the window.
    // Open below when it fits, otherwise flip above when there is more room, and always cap the
    // height to the space available so the list scrolls inside instead of being cut off.
    (function place() {
      const GAP = 4, MARGIN = 12, MIN_H = 120;
      dropdown.style.maxHeight = 'none';
      const natural = dropdown.scrollHeight;
      const below = window.innerHeight - rect.bottom - GAP - MARGIN;
      const above = rect.top - GAP - MARGIN;
      let h, topPx;
      if (natural <= below) { h = natural; topPx = rect.bottom + GAP; }
      else if (above > below) { h = Math.max(MIN_H, Math.min(natural, above)); topPx = rect.top - GAP - h; }
      else { h = Math.max(MIN_H, below); topPx = rect.bottom + GAP; }
      dropdown.style.maxHeight = `${Math.floor(h)}px`;
      dropdown.style.overflowY = 'auto';
      dropdown.style.top = `${Math.max(MARGIN, Math.floor(topPx))}px`;
    })();

    // The panel is position:fixed, so close it when the page scrolls or resizes underneath it.
    const onScrollClose = (ev) => { if (!dropdown.contains(ev.target)) closeAll(); };
    window.addEventListener('scroll', onScrollClose, true);
    window.addEventListener('resize', closeAll);
    dropdown._cleanupScroll = () => { window.removeEventListener('scroll', onScrollClose, true); window.removeEventListener('resize', closeAll); };

    // Scroll selected into view
    const selectedItem = dropdown.querySelector('.is-selected');
    if (selectedItem) selectedItem.scrollIntoView({ block: 'nearest' });

    // Keyboard navigation
    function handleKeyDown(ev) {
      const items = Array.from(dropdown.querySelectorAll('.theme-dropdown-item'));
      if (!items.length) return;

      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        focusedIndex = (focusedIndex + 1) % items.length;
        highlightItem(items, focusedIndex);
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        focusedIndex = (focusedIndex - 1 + items.length) % items.length;
        highlightItem(items, focusedIndex);
      } else if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        if (items[focusedIndex]) {
          const val = items[focusedIndex].getAttribute('data-value');
          selectOption(select, val);
          closeAll();
        }
      } else if (ev.key === 'Escape' || ev.key === 'Tab') {
        closeAll();
      }
    }

    function highlightItem(items, index) {
      items.forEach((it, i) => {
        it.classList.toggle('is-focused', i === index);
        if (i === index) it.scrollIntoView({ block: 'nearest' });
      });
    }

    document.addEventListener('keydown', handleKeyDown, { once: false, capture: true });
    dropdown._cleanupKey = () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }

  function selectOption(select, value) {
    if (select.value === value) return;
    const proto = Object.getPrototypeOf(select);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) {
      desc.set.call(select, value);
    } else {
      select.value = value;
    }
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Intercept click on native <select>
  document.addEventListener('pointerdown', (ev) => {
    const sel = ev.target.closest('select');
    if (sel && !sel.disabled) {
      // Check if clicking inside an active theme dropdown
      if (ev.target.closest('.theme-dropdown')) return;
      ev.preventDefault();
      ev.stopPropagation();
      sel.focus();
      openThemedSelect(sel);
    } else if (!ev.target.closest('.theme-dropdown') && !ev.target.closest('.theme-calendar')) {
      closeAll();
    }
  }, true);

  // Close on outside scroll (except scrolling inside dropdown)
  window.addEventListener('scroll', (ev) => {
    if (activeDropdown && !activeDropdown.contains(ev.target)) {
      closeAll();
    }
  }, { passive: true, capture: true });


  // --- 2. THEME-BASED MONTHLY CALENDAR PICKER ---
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function openMonthlyCalendar(input) {
    closeAll();
    const rect = input.getBoundingClientRect();
    const cal = document.createElement('div');
    cal.className = 'theme-calendar';

    let curDate = new Date();
    if (input.value) {
      const match = input.value.match(/(\d{4})[-/](\d{1,2})/);
      if (match) {
        curDate = new Date(parseInt(match[1]), parseInt(match[2]) - 1, 1);
      }
    }
    let viewYear = curDate.getFullYear();
    let selYear = curDate.getFullYear();
    let selMonth = curDate.getMonth();

    function renderCal() {
      cal.innerHTML = `
        <div class="theme-calendar-head">
          <button type="button" class="theme-cal-btn cal-prev" aria-label="Previous Year">
            <svg class="ico" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <span class="theme-cal-year">${viewYear}</span>
          <button type="button" class="theme-cal-btn cal-next" aria-label="Next Year">
            <svg class="ico" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
        <div class="theme-calendar-grid">
          ${MONTHS.map((m, idx) => {
            const isSel = (viewYear === selYear && idx === selMonth);
            const isNow = (viewYear === new Date().getFullYear() && idx === new Date().getMonth());
            return `
              <button type="button" class="theme-cal-month ${isSel ? 'is-selected' : ''} ${isNow ? 'is-now' : ''}" data-month="${idx}">
                ${m}
              </button>
            `;
          }).join('')}
        </div>
        <div class="theme-calendar-foot">
          <button type="button" class="theme-cal-today">Current Month</button>
        </div>
      `;

      // Year prev/next
      cal.querySelector('.cal-prev').onclick = (e) => { e.stopPropagation(); viewYear--; renderCal(); };
      cal.querySelector('.cal-next').onclick = (e) => { e.stopPropagation(); viewYear++; renderCal(); };
      cal.querySelector('.theme-cal-today').onclick = (e) => {
        e.stopPropagation();
        const now = new Date();
        pickMonth(now.getFullYear(), now.getMonth());
      };

      // Month click
      cal.querySelectorAll('.theme-cal-month').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const m = parseInt(btn.getAttribute('data-month'));
          pickMonth(viewYear, m);
        };
      });
    }

    function pickMonth(year, monthIdx) {
      const monthStr = String(monthIdx + 1).padStart(2, '0');
      const val = `${year}-${monthStr}`;
      
      const proto = Object.getPrototypeOf(input);
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && desc.set) {
        desc.set.call(input, val);
      } else {
        input.value = val;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      closeAll();
    }

    renderCal();

    // Position strictly below input
    const top = rect.bottom + 4;
    const width = 240;
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }

    cal.style.top = `${top}px`;
    cal.style.left = `${left}px`;
    cal.style.width = `${width}px`;

    document.body.appendChild(cal);
    activeCalendar = cal;
  }

  // Intercept month/calendar input clicks
  document.addEventListener('pointerdown', (ev) => {
    const input = ev.target.closest('input[type="month"], input.month-picker, input[data-calendar="month"]');
    if (input && !input.disabled && !input.readOnly) {
      ev.preventDefault();
      ev.stopPropagation();
      input.focus();
      openMonthlyCalendar(input);
    }
  }, true);


  // Never let the browser's own (old) month popup open on top of the themed one:
  // block every other way of opening it (click on the picker icon, keyboard, showPicker()).
  const MONTH_SEL = 'input[type="month"], input.month-picker, input[data-calendar="month"]';
  const isMonth = (t) => t && t.closest && t.closest(MONTH_SEL);
  ['mousedown', 'mouseup', 'click'].forEach((type) => {
    document.addEventListener(type, (ev) => {
      const input = isMonth(ev.target);
      if (input && !input.disabled && !input.readOnly) {
        ev.preventDefault();
        if (type === 'click') { ev.stopPropagation(); input.focus(); if (!activeCalendar) openMonthlyCalendar(input); }
      }
    }, true);
  });
  document.addEventListener('keydown', (ev) => {
    const input = isMonth(ev.target);
    if (!input || input.disabled || input.readOnly) return;
    if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'F4' || (ev.altKey && ev.key === 'ArrowDown')) {
      ev.preventDefault();
      openMonthlyCalendar(input);
    }
  }, true);
  try {
    const nativeShow = HTMLInputElement.prototype.showPicker;
    if (nativeShow) {
      HTMLInputElement.prototype.showPicker = function () {
        if (this.type === 'month') { openMonthlyCalendar(this); return undefined; }
        return nativeShow.apply(this, arguments);
      };
    }
  } catch (e) { /* ignore */ }

  // --- 2b. THEME-BASED DAY CALENDAR FOR input[type=date] ---
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const pad2 = (n) => String(n).padStart(2, '0');
  const toISO = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

  function openDateCalendar(input) {
    closeAll();
    const rect = input.getBoundingClientRect();
    const cal = document.createElement('div');
    cal.className = 'theme-calendar theme-calendar--days';
    const now = new Date();
    let sel = null;
    const m = (input.value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) sel = { y: +m[1], m: +m[2] - 1, d: +m[3] };
    let vy = sel ? sel.y : now.getFullYear();
    let vm = sel ? sel.m : now.getMonth();
    const min = input.min || '', max = input.max || '';

    function commit(val) {
      const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      desc.set.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      closeAll();
    }

    function render() {
      const first = new Date(vy, vm, 1).getDay();
      const dim = new Date(vy, vm + 1, 0).getDate();
      let cells = '';
      for (let i = 0; i < first; i++) cells += '<span class="tc-blank"></span>';
      for (let d = 1; d <= dim; d++) {
        const iso = toISO(vy, vm, d);
        const isSel = sel && sel.y === vy && sel.m === vm && sel.d === d;
        const isNow = now.getFullYear() === vy && now.getMonth() === vm && now.getDate() === d;
        const off = (min && iso < min) || (max && iso > max);
        cells += `<button type="button" class="tc-day${isSel ? ' is-selected' : ''}${isNow ? ' is-now' : ''}" data-d="${d}"${off ? ' disabled' : ''}>${d}</button>`;
      }
      cal.innerHTML = `
        <div class="theme-calendar-head">
          <button type="button" class="theme-cal-btn cal-prev" aria-label="Previous month"><svg class="ico" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
          <span class="theme-cal-year">${MONTH_NAMES[vm]} ${vy}</span>
          <button type="button" class="theme-cal-btn cal-next" aria-label="Next month"><svg class="ico" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
        </div>
        <div class="tc-week">${['S','M','T','W','T','F','S'].map((x) => `<span>${x}</span>`).join('')}</div>
        <div class="tc-days">${cells}</div>
        <div class="theme-calendar-foot tc-foot"><button type="button" class="theme-cal-today tc-clear">Clear</button><button type="button" class="theme-cal-today tc-today">Today</button></div>`;
      cal.querySelector('.cal-prev').onclick = (e) => { e.stopPropagation(); vm--; if (vm < 0) { vm = 11; vy--; } render(); };
      cal.querySelector('.cal-next').onclick = (e) => { e.stopPropagation(); vm++; if (vm > 11) { vm = 0; vy++; } render(); };
      cal.querySelector('.tc-today').onclick = (e) => { e.stopPropagation(); commit(toISO(now.getFullYear(), now.getMonth(), now.getDate())); };
      cal.querySelector('.tc-clear').onclick = (e) => { e.stopPropagation(); commit(''); };
      cal.querySelectorAll('.tc-day').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); commit(toISO(vy, vm, +b.dataset.d)); }; });
    }
    render();

    const width = 280;
    let left = rect.left;
    if (left + width > window.innerWidth - 12) left = Math.max(12, window.innerWidth - width - 12);
    cal.style.left = `${left}px`;
    cal.style.width = `${width}px`;
    cal.style.top = `${rect.bottom + 4}px`;
    document.body.appendChild(cal);
    activeCalendar = cal;
    // keep fully visible: flip above when it would run off the bottom
    const h = cal.offsetHeight;
    if (rect.bottom + 4 + h > window.innerHeight - 12 && rect.top - 4 - h > 12) cal.style.top = `${rect.top - 4 - h}px`;
    else if (rect.bottom + 4 + h > window.innerHeight - 12) cal.style.top = `${Math.max(12, window.innerHeight - h - 12)}px`;
  }

  document.addEventListener('pointerdown', (ev) => {
    const input = ev.target.closest && ev.target.closest('input[type="date"]');
    if (input && !input.disabled && !input.readOnly) {
      ev.preventDefault();
      ev.stopPropagation();
      input.focus();
      openDateCalendar(input);
    }
  }, true);
  // block the native picker from keyboard / programmatic opening too
  document.addEventListener('keydown', (ev) => {
    const input = ev.target && ev.target.matches && ev.target.matches('input[type="date"]') ? ev.target : null;
    if (input && (ev.key === 'Enter' || ev.key === ' ' || (ev.altKey && ev.key === 'ArrowDown'))) { ev.preventDefault(); openDateCalendar(input); }
  }, true);

  // --- 3. STRICT NUMBER INPUT VALIDATION (ONLY NUMERIC DIGITS ALLOWED) ---
  function isNumberInput(el) {
    if (!el || el.tagName !== 'INPUT') return false;
    const type = (el.getAttribute('type') || '').toLowerCase();
    const mode = (el.getAttribute('inputmode') || '').toLowerCase();
    const name = (el.getAttribute('name') || '').toLowerCase();
    const cls = (el.className || '').toLowerCase();

    if (type === 'number') return true;
    if (mode === 'numeric' || mode === 'decimal') return true;
    if (el.hasAttribute('data-type') && el.getAttribute('data-type') === 'number') return true;
    if (cls.includes('num') || cls.includes('amount') || cls.includes('price') || cls.includes('qty')) return true;
    if (/^(amount|price|qty|quantity|salary|rate|cost|discount|paid|total|hsn|phone|accountno|gst_rate|tax)$/i.test(name)) return true;

    return false;
  }

  // Block non-numeric keystrokes
  document.addEventListener('keydown', (ev) => {
    const input = ev.target;
    if (!isNumberInput(input)) return;

    // Allow control/nav keys
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ];
    if (allowedKeys.includes(ev.key)) return;

    // Allow Ctrl / Cmd combinations (Copy, Paste, Cut, Select All, Undo)
    if (ev.ctrlKey || ev.metaKey) return;

    // Digits 0-9
    if (/^[0-9]$/.test(ev.key)) return;

    // Single decimal point '.' (if not already present and not disabled)
    if (ev.key === '.' && !input.value.includes('.')) {
      return;
    }

    // Explicitly block all letters (including 'e', 'E'), '+', '-', and symbols
    ev.preventDefault();
  }, true);

  // Sanitize on paste
  document.addEventListener('paste', (ev) => {
    const input = ev.target;
    if (!isNumberInput(input)) return;

    ev.preventDefault();
    const text = (ev.clipboardData || window.clipboardData).getData('text');
    // Strip everything except digits and first decimal point
    let clean = text.replace(/[^0-9.]/g, '');
    const firstDot = clean.indexOf('.');
    if (firstDot !== -1) {
      clean = clean.slice(0, firstDot + 1) + clean.slice(firstDot + 1).replace(/\./g, '');
    }

    // Insert sanitized text
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const current = input.value || '';
    const updated = current.slice(0, start) + clean + current.slice(end);

    const proto = Object.getPrototypeOf(input);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) {
      desc.set.call(input, updated);
    } else {
      input.value = updated;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, true);

  // Failsafe on input event
  document.addEventListener('input', (ev) => {
    const input = ev.target;
    if (!isNumberInput(input)) return;

    const original = input.value;
    if (/[^0-9.]/.test(original)) {
      let clean = original.replace(/[^0-9.]/g, '');
      const firstDot = clean.indexOf('.');
      if (firstDot !== -1) {
        clean = clean.slice(0, firstDot + 1) + clean.slice(firstDot + 1).replace(/\./g, '');
      }
      if (clean !== original) {
        input.value = clean;
      }
    }
  }, true);

  // ---------------------------------------------------------------------
  // Global logo / seal / image upload: any text input whose field label
  // mentions logo, seal, signature or QR gets an "Upload" button that
  // stores the chosen image as a data URL (React-compatible).
  // ---------------------------------------------------------------------
  const IMG_LABEL = /(logo|seal|signature stamp|\bqr\b|favicon|avatar|photo)/i;
  function setReactValue(input, value) {
    const proto = Object.getPrototypeOf(input);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(input, value); else input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function enhanceUpload(input) {
    if (input.dataset.uploadReady || input.type === 'file' || input.tagName !== 'INPUT') return;
    if (input.type && !['text', 'url', ''].includes(input.type)) return;
    const field = input.closest('label.field, .field');
    if (!field) return;
    const labelEl = field.querySelector(':scope > span');
    const text = ((labelEl && labelEl.textContent) || '') + ' ' + (input.placeholder || '');
    if (!IMG_LABEL.test(text)) return;
    input.dataset.uploadReady = '1';
    field.classList.add('has-upload');
    input.classList.add('has-upload__input');

    // Extra row placed AFTER the input (the input itself is never re-parented,
    // so React's reconciliation is unaffected).
    const wrap = document.createElement('div');
    wrap.className = 'tl-upload';
    input.insertAdjacentElement('afterend', wrap);

    // Visible preview tile under the field (uploaded logo / seal / QR), with a remove button.
    const tile = document.createElement('div');
    tile.className = 'tl-upload__tile';
    tile.style.display = 'none';
    const preview = document.createElement('img');
    preview.className = 'tl-upload__prev';
    preview.alt = 'Uploaded image preview';
    const meta = document.createElement('div');
    meta.className = 'tl-upload__meta';
    meta.innerHTML = '<b>Image added</b><span></span>';
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'tl-upload__rm';
    rm.textContent = 'Remove';
    rm.addEventListener('click', () => { setReactValue(input, ''); syncPreview(); place(); });
    tile.appendChild(preview); tile.appendChild(meta); tile.appendChild(rm);
    wrap.insertAdjacentElement('afterend', tile);
    const syncPreview = () => {
      const v = input.value || '';
      if (/^(data:image|https?:|\/)/.test(v)) {
        preview.src = v;
        const kb = v.startsWith('data:') ? Math.max(1, Math.round(v.length * 0.75 / 1024)) + ' KB uploaded' : 'Linked image';
        meta.querySelector('span').textContent = kb;
        tile.style.display = 'flex';
      } else { tile.style.display = 'none'; }
    };

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tl-upload__btn';
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><span>Upload</span>';
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/png,image/jpeg,image/svg+xml,image/webp';
    file.style.display = 'none';
    btn.addEventListener('click', () => file.click());
    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      if (!f) return;
      if (f.size > 2 * 1024 * 1024) { alert('Please choose an image under 2 MB.'); return; }
      const reader = new FileReader();
      reader.onload = () => { setReactValue(input, String(reader.result)); syncPreview(); };
      reader.readAsDataURL(f);
      file.value = '';
    });
    wrap.appendChild(btn);
    wrap.appendChild(file);
    // Keep the button vertically centred ON the input, whatever the label height is.
    const place = () => {
      if (!input.offsetHeight) return;
      const h = wrap.offsetHeight || 24;
      wrap.style.bottom = 'auto';
      wrap.style.top = (input.offsetTop + Math.round((input.offsetHeight - h) / 2)) + 'px';
    };
    input.addEventListener('input', () => { syncPreview(); place(); });
    syncPreview();
    place();
    if (window.ResizeObserver) { const ro = new ResizeObserver(place); ro.observe(field); ro.observe(input); }
    window.addEventListener('resize', place);
    setInterval(() => { syncPreview(); place(); }, 1500);
  }
  function scanUploads(root) {
    (root || document).querySelectorAll('label.field input, .field input').forEach(enhanceUpload);
  }
  new MutationObserver(() => scanUploads()).observe(document.documentElement, { childList: true, subtree: true });
  scanUploads();

  // ---------------------------------------------------------------------
  // Global themed dialogs: replaces the browser's native confirm()/alert()
  //   await window.themedConfirm('Delete this?')  -> true / false
  //   window.alert('message')                      -> themed notice dialog
  // ---------------------------------------------------------------------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function openDialog({ title, text, ok = 'OK', cancel = 'Cancel', danger = false, showCancel = true }) {
    return new Promise(resolve => {
      const prevFocus = document.activeElement;
      const scrim = document.createElement('div');
      scrim.className = 'tl-dialog-scrim';
      scrim.innerHTML =
        '<div class="tl-dialog" role="alertdialog" aria-modal="true">' +
          '<div class="tl-dialog__ico' + (danger ? ' is-danger' : '') + '">' +
            '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              (danger ? '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
                      : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>') +
            '</svg></div>' +
          '<div class="tl-dialog__body"><b>' + esc(title) + '</b>' + (text ? '<p>' + esc(text) + '</p>' : '') + '</div>' +
          '<div class="tl-dialog__actions">' +
            (showCancel ? '<button type="button" class="tl-dialog__btn" data-act="cancel">' + esc(cancel) + '</button>' : '') +
            '<button type="button" class="tl-dialog__btn tl-dialog__btn--primary' + (danger ? ' is-danger' : '') + '" data-act="ok">' + esc(ok) + '</button>' +
          '</div></div>';
      const done = (v) => {
        document.removeEventListener('keydown', onKey, true);
        scrim.classList.add('is-out');
        setTimeout(() => scrim.remove(), 140);
        if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) {}
        resolve(v);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); }
        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); done(true); }
      };
      scrim.addEventListener('mousedown', (e) => { if (e.target === scrim) done(false); });
      scrim.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => done(b.dataset.act === 'ok')));
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(scrim);
      const okBtn = scrim.querySelector('[data-act="ok"]');
      if (okBtn) okBtn.focus();
    });
  }
  window.themedConfirm = (message, opts) => {
    const m = String(message || 'Are you sure?');
    const danger = /delete|remove|reset|erase|discard/i.test(m);
    return openDialog(Object.assign({ title: danger ? 'Please confirm' : 'Confirm', text: m, ok: danger ? 'Yes, continue' : 'OK', danger }, opts || {}));
  };
  window.themedAlert = (message, opts) =>
    openDialog(Object.assign({ title: 'Notice', text: String(message || ''), ok: 'Got it', showCancel: false }, opts || {}));
  // Native alert() -> themed notice (non-blocking). Native confirm()/prompt() cannot be
  // made synchronous, so call sites use `await window.themedConfirm(...)` instead.
  window.alert = (m) => { window.themedAlert(m); };

  // ---------------------------------------------------------------------
  // Global table action cells: every control inside an "Action(s)" column
  // becomes a round, icon-only, colour-coded button (view / edit / delete ...).
  // Only classes + title are added; React-owned children are not rewritten.
  // ---------------------------------------------------------------------
  function actKind(el) {
    const s = ((el.textContent || '') + ' ' + (el.getAttribute('title') || '') + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.className || '')).toLowerCase();
    if (/set as default|make default|set default/.test(s)) return 'star';
    if (/delete|remove|trash|archive|revoke|cancel invoice/.test(s)) return 'delete';
    if (/edit|update|modify|pencil|rename/.test(s)) return 'edit';
    if (/download|pdf|export|print/.test(s)) return 'download';
    if (/send|share|mail|dispatch|resend|remind/.test(s)) return 'send';
    if (/view|open|visit|preview|details|eye|arrow-up-right|show|see/.test(s)) return 'view';
    return 'view';
  }
  function labelFor(el, kind) {
    const txt = (el.textContent || '').trim();
    return el.getAttribute('title') || el.getAttribute('aria-label') || txt || ({ delete: 'Delete', edit: 'Edit', download: 'Download', send: 'Send', view: 'View', star: 'Set as default' }[kind]);
  }
  function enhanceActionTables() {
    document.querySelectorAll('table').forEach(table => {
      const ths = table.querySelectorAll('thead th');
      let idx = -1;
      ths.forEach((th, i) => { if (/^\s*actions?\s*$/i.test(th.textContent || '')) idx = i; });
      if (idx < 0) return;
      // Never re-style form / line-item tables (rows with inputs) — e.g. the
      // invoice line-items editor. Only read-only list tables get action chips.
      if (table.querySelector('tbody input, tbody select, tbody textarea')) return;
      ths[idx].classList.add('tl-act-th');
      table.querySelectorAll('tbody tr').forEach(tr => {
        const cell = tr.children[idx];
        if (!cell) return;
        if (cell.querySelector('input, select, textarea')) return;
        cell.classList.add('tl-act-cell');
        cell.querySelectorAll('button, a.btn, a.ibtn, a[href]').forEach(el => {
          if (el.dataset.tlAct) return;
          if (el.closest('.tl-dialog, .menu')) return;
          const kind = actKind(el);
          const label = labelFor(el, kind);
          el.dataset.tlAct = kind;
          el.classList.add('tl-act', 'tl-act--' + kind);
          if (!el.getAttribute('title')) el.setAttribute('title', label);
          if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', label);
          if ((el.textContent || '').trim()) el.classList.add('tl-act--text');
        });
      });
    });
  }
  // Every "Cancel" button gets the same shape as the primary submit button (outlined secondary variant).
  function enhanceCancelButtons() {
    document.querySelectorAll('button:not([data-tl-cancel])').forEach((b) => {
      if (b.closest('.tl-act-cell')) return;
      if (/^\s*cancel\s*$/i.test(b.textContent || '')) { b.dataset.tlCancel = '1'; b.classList.add('tl-cancel'); }
    });
  }
  new MutationObserver(() => enhanceCancelButtons()).observe(document.documentElement, { childList: true, subtree: true });
  enhanceCancelButtons();

  new MutationObserver(() => enhanceActionTables()).observe(document.documentElement, { childList: true, subtree: true });
  enhanceActionTables();

  // ---------------------------------------------------------------------
  // Global country -> currency symbol. Choosing a country in
  // Settings > Platform Identity stores it (localStorage 'tl:country') and every
  // amount on every page (₹ / $ / € ...) is shown with that country's symbol.
  // ---------------------------------------------------------------------
  const COUNTRIES = {
    IN: ['India', 'INR', '₹'], US: ['United States', 'USD', '$'], GB: ['United Kingdom', 'GBP', '£'],
    AE: ['United Arab Emirates', 'AED', 'AED '], SA: ['Saudi Arabia', 'SAR', 'SAR '], SG: ['Singapore', 'SGD', 'S$'],
    AU: ['Australia', 'AUD', 'A$'], CA: ['Canada', 'CAD', 'C$'], NZ: ['New Zealand', 'NZD', 'NZ$'],
    DE: ['Germany', 'EUR', '€'], FR: ['France', 'EUR', '€'], IT: ['Italy', 'EUR', '€'], ES: ['Spain', 'EUR', '€'], NL: ['Netherlands', 'EUR', '€'],
    JP: ['Japan', 'JPY', '¥'], CN: ['China', 'CNY', '¥'], CH: ['Switzerland', 'CHF', 'CHF '], ZA: ['South Africa', 'ZAR', 'R'],
    LK: ['Sri Lanka', 'LKR', 'Rs. '], NP: ['Nepal', 'NPR', 'Rs. '], BD: ['Bangladesh', 'BDT', '৳'], MY: ['Malaysia', 'MYR', 'RM '],
    ID: ['Indonesia', 'IDR', 'Rp '], TH: ['Thailand', 'THB', '฿']
  };
  window.TL_COUNTRIES = COUNTRIES;
  const SYMS = ['NZ$', 'S$', 'A$', 'C$', 'CHF', 'AED', 'SAR', 'Rs.', 'Rs', 'RM', 'Rp', '₹', '€', '£', '¥', '৳', '฿', '$'];
  const SYM_RE = new RegExp('(?<![A-Za-z$])(' + SYMS.map(s => s.replace(/[$.]/g, '\\$&')).join('|') + ')(\\s?)(?=\\d)', 'g');
  function currentCountry() { try { return localStorage.getItem('tl:country') || 'IN'; } catch (e) { return 'IN'; } }
  function applyCurrency(root) {
    const code = currentCountry();
    const info = COUNTRIES[code];
    if (!info) return;
    const sym = info[2].trim();
    const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION|CODE)$/.test(p.tagName)) return NodeFilter.FILTER_REJECT;
        return /[\d]/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      const v = n.nodeValue;
      const out = v.replace(SYM_RE, (m, s, sp) => (s === sym ? m : sym + (sym.length > 1 && /[A-Za-z.]$/.test(sym) ? ' ' : sp)));
      if (out !== v) n.nodeValue = out;
    });
  }
  window.tlSetCountry = (code) => {
    try { localStorage.setItem('tl:country', code); } catch (e) {}
    applyCurrency(document.body);
    window.dispatchEvent(new CustomEvent('tl:country', { detail: code }));
  };
  // Runs synchronously in the mutation microtask (before the browser paints), so the
  // old symbol is never visible - no flash of static values on load or navigation.
  let curApplying = false;
  const curObserver = new MutationObserver(() => {
    if (curApplying) return;
    curApplying = true;
    try { applyCurrency(document.body); } finally { curObserver.takeRecords(); curApplying = false; }
  });
  curObserver.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  applyCurrency(document.body);

  // ---------------------------------------------------------------------
  // Row-limited tables (per page): show N rows, then scroll inside the table with the header pinned.
  // ---------------------------------------------------------------------
  const ROW_LIMIT_PAGES = { '/accounts/sales': 5 };
  function applyRowLimits() {
    const limit = ROW_LIMIT_PAGES[location.pathname.replace(/\/+$/, '')];
    document.querySelectorAll('.table-wrap').forEach((wrap) => {
      const table = wrap.querySelector('table');
      if (!table) return;
      if (!limit) { if (wrap.dataset.rowLimit) { wrap.style.maxHeight = ''; wrap.style.overflowY = ''; delete wrap.dataset.rowLimit; } return; }
      const rows = [...table.querySelectorAll('tbody tr')];
      if (rows.length <= limit) { wrap.style.maxHeight = ''; wrap.style.overflowY = ''; delete wrap.dataset.rowLimit; return; }
      const head = table.querySelector('thead');
      const h = (head ? head.getBoundingClientRect().height : 0) + rows.slice(0, limit).reduce((s, r) => s + r.getBoundingClientRect().height, 0);
      if (h > 0) {
        wrap.style.maxHeight = Math.ceil(h) + 'px';
        wrap.style.overflowY = 'auto';
        wrap.dataset.rowLimit = String(limit);
      }
    });
  }
  new MutationObserver(() => applyRowLimits()).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', applyRowLimits);
  setInterval(applyRowLimits, 1200);
  applyRowLimits();

  // ---------------------------------------------------------------------
  // GLOBAL AUTO-REFRESH & NAVIGATION SHIELD
  // Prevents unintended page reloads from form submissions, hash links,
  // relative hrefs, Vite full-reloads, and rapid consecutive reloads.
  // ---------------------------------------------------------------------

  // 1. Intercept native unhandled form submissions
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!form || form.getAttribute('target') === '_blank') return;
    const action = form.getAttribute('action');
    if (!action || action === '#' || action.startsWith('/') || action.startsWith(window.location.origin)) {
      e.preventDefault();
      form.dispatchEvent(new CustomEvent('tessly:form-submit', { bubbles: true, cancelable: true }));
    }
  }, true);

  // 2. Global anchor click interceptor for seamless SPA navigation
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    const href = link.getAttribute('href');
    if (!href) return;
    if (href === '#' || href === 'javascript:void(0)' || href === 'javascript:;') {
      e.preventDefault();
      return;
    }
    let target = href;
    if (target.startsWith(window.location.origin)) {
      target = target.slice(window.location.origin.length);
    }
    if (target.startsWith('#/')) {
      target = target.replace(/^#/, '');
    }
    if (target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/assets/')) {
      e.preventDefault();
      if (window.__navigate) {
        window.__navigate(target);
      } else if (window.history && window.history.pushState) {
        window.history.pushState(null, '', target);
        window.dispatchEvent(new Event('popstate'));
      }
    }
  }, true);

  // 3. Vite development full-reload suppression for non-code files
  if (typeof window !== 'undefined') {
    window.addEventListener('vite:beforeFullReload', (e) => {
      const p = e.detail?.path || '';
      if (/test-reports|test|dist|\.png|\.jpg|\.json|\.md/i.test(p)) {
        e.preventDefault();
        console.log('[Tessly Shield] Suppressed unwanted full-reload for background file:', p);
      }
    });
  }

  console.log('[Tessly] Global Themed Controls & Auto-Refresh Shield initialized.');
})();


/* Page-title entrance animation for EVERY page header.
   Pages that already run the shared entrance (GSAP sets an inline transform on the letters) are left alone;
   all others get the same letter-rise (translateY 115% + 6deg -> 0, 0.8s, 20ms stagger, power4.out). */
(function () {
  if (window.__titleAnimInstalled) return;
  window.__titleAnimInstalled = true;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = new WeakSet();
  function run(h) {
    if (seen.has(h)) return;
    seen.add(h);
    var chars = h.querySelectorAll('.ch');
    if (!chars.length || reduce) return;
    if (chars[0].style.transform) return; // already animated by the page itself
    chars.forEach(function (c, i) {
      try {
        c.animate(
          [{ transform: 'translateY(115%) rotate(6deg)' }, { transform: 'translateY(0) rotate(0deg)' }],
          { duration: 800, delay: i * 20, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'backwards' }
        );
      } catch (e) { /* ignore */ }
    });
  }
  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.matches && root.matches('.phead .ttl')) run(root);
    var found = root.querySelectorAll ? root.querySelectorAll('.phead .ttl') : [];
    for (var i = 0; i < found.length; i++) run(found[i]);
  }
  new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) for (var j = 0; j < list[i].addedNodes.length; j++) scan(list[i].addedNodes[j]);
  }).observe(document.documentElement, { childList: true, subtree: true });
  scan(document.body);
})();
