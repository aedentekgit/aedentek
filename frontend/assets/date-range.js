/**
 * Global date filter for Tessly CRM — the store AND the popover behind the header button.
 *
 *   window.TesslyDateRange.get()         → { mode, preset, from, to, label, badge }
 *        mode: 'all' | 'date' | 'month' | 'year'     (preset is an alias of mode)
 *        from/to: YYYY-MM-DD, '' when the filter is off
 *   window.TesslyDateRange.set({ mode, from, to })
 *   window.TesslyDateRange.subscribe(fn) → unsubscribe
 *   window.TesslyDateRange.open(anchorEl) / close() / toggle(anchorEl) / isOpen()
 *
 * The popover has four tabs — ALL DATES · BY DATE · BY MONTH · BY YEAR — each with
 * shortcuts, a calendar / month grid / year grid and a live "scope" line.
 * Styling uses theme tokens only (see the .drp block in signin-styles.css).
 * The choice is kept in localStorage ("tessly.dateRange").
 */
(function () {
  'use strict';

  var KEY = 'tessly.dateRange';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MON = MONTHS.map(function (m) { return m.slice(0, 3); });
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // ------------------------------------------------------------------ date helpers
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? d : null;
  }
  function dmy(s) { var d = parse(s); return d ? pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() : ''; }
  function fromDmy(t) {
    var m = /^\s*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\s*$/.exec(String(t || ''));
    if (!m) return '';
    var d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[1]) ? ymd(d) : '';
  }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function monthStart(y, m) { return ymd(new Date(y, m, 1)); }
  function monthEnd(y, m) { return ymd(new Date(y, m + 1, 0)); }
  function daysBetween(a, b) { return Math.round((parse(b) - parse(a)) / 86400000) + 1; }
  function today() { return ymd(new Date()); }

  // ------------------------------------------------------------------ labels
  function labelFor(mode, from, to) {
    var a = parse(from);
    var b = parse(to || from);
    if (mode === 'all' || !a) return { label: 'All Dates', badge: '' };
    if (mode === 'year') {
      return { label: a.getFullYear() === b.getFullYear() ? String(a.getFullYear()) : a.getFullYear() + ' – ' + b.getFullYear(), badge: 'Year' };
    }
    if (mode === 'month') {
      var same = a.getFullYear() === b.getFullYear();
      var one = same && a.getMonth() === b.getMonth();
      return {
        label: one ? MON[a.getMonth()] + ' ' + a.getFullYear()
          : same ? MON[a.getMonth()] + ' – ' + MON[b.getMonth()] + ' ' + a.getFullYear()
            : MON[a.getMonth()] + ' ' + a.getFullYear() + ' – ' + MON[b.getMonth()] + ' ' + b.getFullYear(),
        badge: 'Month'
      };
    }
    function d(x, withYear) { return x.getDate() + ' ' + MON[x.getMonth()] + (withYear ? ' ' + x.getFullYear() : ''); }
    if (from === (to || from)) return { label: d(a, true), badge: 'Date' };
    return { label: a.getFullYear() === b.getFullYear() ? d(a, false) + ' – ' + d(b, true) : d(a, true) + ' – ' + d(b, true), badge: 'Date' };
  }

  // ------------------------------------------------------------------ store
  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && raw.mode) return { mode: raw.mode, from: raw.from || '', to: raw.to || '' };
      if (raw && raw.preset) { // older format
        return raw.preset === 'custom' ? { mode: 'date', from: raw.from || '', to: raw.to || '' } : { mode: 'all', from: '', to: '' };
      }
    } catch (e) { /* ignore */ }
    return { mode: 'all', from: '', to: '' };
  }
  var stored = load();
  var listeners = [];

  function snapshot() {
    var l = labelFor(stored.mode, stored.from, stored.to);
    return { mode: stored.mode, preset: stored.mode, from: stored.from, to: stored.to, label: l.label, badge: l.badge };
  }
  function emit() {
    var snap = snapshot();
    listeners.slice().forEach(function (fn) { try { fn(snap); } catch (e) { /* ignore */ } });
    try { window.dispatchEvent(new CustomEvent('tessly:daterange', { detail: snap })); } catch (e) { /* ignore */ }
  }
  function set(next) {
    var mode = next && next.mode ? next.mode : next && next.preset ? next.preset : 'all';
    var from = next && parse(next.from) ? next.from : '';
    var to = next && parse(next.to) ? next.to : '';
    if (mode !== 'date' && mode !== 'month' && mode !== 'year') mode = 'all';
    if (mode === 'all' || (!from && !to)) { mode = 'all'; from = ''; to = ''; }
    if (!from) from = to;
    if (!to) to = from;
    if (from > to) { var t = from; from = to; to = t; }
    stored = { mode: mode, from: from, to: to };
    try { localStorage.setItem(KEY, JSON.stringify(stored)); } catch (e) { /* ignore */ }
    emit();
  }
  function subscribe(fn) {
    listeners.push(fn);
    return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
  }

  // ------------------------------------------------------------------ popover
  var pop = null;

  function icon(name) {
    var p = {
      cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
      x: '<path d="M6 6l12 12M18 6L6 18"/>',
      left: '<path d="m15 6-6 6 6 6"/>',
      right: '<path d="m9 6 6 6-6 6"/>'
    }[name];
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function isOpen() { return !!pop; }
  function close() {
    if (!pop) return;
    document.removeEventListener('pointerdown', pop.onDown, true);
    document.removeEventListener('keydown', pop.onKey, true);
    window.removeEventListener('resize', pop.onResize);
    pop.el.remove();
    pop = null;
    try { window.dispatchEvent(new CustomEvent('tessly:daterange-ui', { detail: { open: false } })); } catch (e) { /* ignore */ }
  }
  function toggle(anchor) { if (pop) close(); else open(anchor); }

  function open(anchor) {
    close();
    var cur = snapshot();
    var now = new Date();
    var seed = parse(cur.from) || now;

    // draft state, local to this popover session
    var st = {
      tab: cur.mode === 'all' ? 'date' : cur.mode,   // opens on BY DATE by default; a saved filter reopens on its own tab
      from: cur.mode === 'all' ? '' : cur.from,
      to: cur.mode === 'all' ? '' : cur.to,
      pending: false,                        // month/year: waiting for the 2nd click of a range
      viewY: seed.getFullYear(),             // month grid year
      viewM: seed.getMonth(),                // calendar month
      yearBlock: Math.floor(seed.getFullYear() / 12) * 12 + 0
    };
    // the reference shows 2016–2027 around 2026: keep the current year in the last third of the block
    st.yearBlock = seed.getFullYear() - 10;

    var el = document.createElement('div');
    el.className = 'drp';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Date filter');
    document.body.appendChild(el);

    function scopeText() {
      if (st.tab === 'all') return 'Scope: All dates — no date restriction';
      if (!st.from) return st.tab === 'date' ? 'Pick a start and an end date' : st.tab === 'month' ? 'Pick a month (click twice for a range)' : 'Pick a year (click twice for a range)';
      var to = st.to || st.from;
      var n = daysBetween(st.from, to);
      var span = dmy(st.from) + ' — ' + dmy(to);
      if (st.tab === 'date') return 'Selection: ' + span + ' (' + n + ' Day' + (n === 1 ? '' : 's') + ' Selected)';
      var a = parse(st.from);
      var b = parse(to);
      if (st.tab === 'month') {
        var months = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() + 1;
        return 'Scope: ' + span + ' · ' + (months === 1 ? 'Full Calendar Month' : months + ' Calendar Months') + ' (' + n + ' Days)';
      }
      var years = b.getFullYear() - a.getFullYear() + 1;
      return 'Scope: ' + span + ' · ' + (years === 1 ? 'Full Calendar Year' : years + ' Calendar Years');
    }
    function valid() { return st.tab === 'all' || !!st.from; }

    function render() {
      var title = st.tab === 'month' ? 'Select month' : st.tab === 'year' ? 'Select year' : 'Select date range';
      var h = '';
      h += '<div class="drp__head"><span class="drp__icon">' + icon('cal') + '</span>' +
        '<div class="drp__heads"><div class="drp__title">' + title + '</div><div class="drp__sub">Applies to the Accounts pages</div></div>' +
        '<button type="button" class="drp__close" data-act="close" aria-label="Close">' + icon('x') + '</button></div>';
      h += '<div class="drp__tabs" role="tablist">' + [['all', 'All dates'], ['date', 'Date range'], ['month', 'Month'], ['year', 'Year']].map(function (t) {
        return '<button type="button" role="tab" class="drp__tab' + (st.tab === t[0] ? ' is-on' : '') + '" aria-selected="' + (st.tab === t[0]) + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>';

      if (st.tab === 'all') {
        h += '<div class="drp__body drp__body--all"><div class="drp__empty"><b>No date restriction</b><span>Every record is shown, whatever its date. Pick Date range, Month or Year to narrow the Accounts pages.</span></div></div>';
      }

      if (st.tab === 'date') {
        h += '<div class="drp__fields"><label class="drp__field"><span>From</span><input class="drp__input" data-field="from" inputmode="numeric" placeholder="dd/mm/yyyy" value="' + dmy(st.from) + '" aria-label="From date"></label>' +
          '<i class="drp__slash">/</i>' +
          '<label class="drp__field"><span>To</span><input class="drp__input" data-field="to" inputmode="numeric" placeholder="dd/mm/yyyy" value="' + dmy(st.to) + '" aria-label="To date"></label></div>';
        h += '<div class="drp__body"><div class="drp__side"><div class="drp__cap">Presets</div>' +
          [['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'This week'], ['last7', 'Last 7 days'], ['last30', 'Last 30 days'], ['month', 'Whole month']].map(function (p) {
            return '<button type="button" class="drp__chip" data-preset="' + p[0] + '">' + p[1] + '</button>';
          }).join('') + '</div>';
        h += '<div class="drp__main"><div class="drp__nav"><button type="button" class="drp__arrow" data-act="prev" aria-label="Previous month">' + icon('left') + '</button>' +
          '<div class="drp__navt"><b>' + MONTHS[st.viewM] + ' ' + st.viewY + '</b><small>Select a start and an end date</small></div>' +
          '<button type="button" class="drp__arrow" data-act="next" aria-label="Next month">' + icon('right') + '</button></div>';
        h += '<div class="drp__dow">' + DOW.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div><div class="drp__days">';
        var first = new Date(st.viewY, st.viewM, 1).getDay();
        var dim = new Date(st.viewY, st.viewM + 1, 0).getDate();
        var t = today();
        for (var i = 0; i < first; i++) h += '<span class="drp__blank"></span>';
        for (var day = 1; day <= dim; day++) {
          var iso = st.viewY + '-' + pad(st.viewM + 1) + '-' + pad(day);
          var isFrom = iso === st.from;
          var isTo = iso === (st.to || st.from) && !!st.from;
          var inside = st.from && st.to && iso > st.from && iso < st.to;
          h += '<button type="button" class="drp__day' + (isFrom || isTo ? ' is-edge' : '') + (inside ? ' is-in' : '') + (iso === t ? ' is-today' : '') + '" data-day="' + iso + '" aria-pressed="' + (isFrom || isTo) + '">' + day + '</button>';
        }
        h += '</div></div></div>';
      }

      if (st.tab === 'month') {
        h += '<div class="drp__fields"><div class="drp__field"><span>From</span><div class="drp__input drp__input--ro" data-ro="from">' + (st.from ? MONTHS[parse(st.from).getMonth()] + ' ' + parse(st.from).getFullYear() : '—') + '</div></div>' +
          '<i class="drp__slash">/</i>' +
          '<div class="drp__field"><span>To</span><div class="drp__input drp__input--ro" data-ro="to">' + (st.to ? MONTHS[parse(st.to).getMonth()] + ' ' + parse(st.to).getFullYear() : '—') + '</div></div></div>';
        h += '<div class="drp__body"><div class="drp__side"><div class="drp__cap">Quick select</div>' +
          [['cur', 'Current Month'], ['prev', 'Previous Month'], ['q1', 'Q1 (Jan - Mar)'], ['q2', 'Q2 (Apr - Jun)'], ['q3', 'Q3 (Jul - Sep)'], ['q4', 'Q4 (Oct - Dec)'], ['year', 'Full Year ' + st.viewY]].map(function (p) {
            return '<button type="button" class="drp__chip" data-mshort="' + p[0] + '">' + p[1] + '</button>';
          }).join('') + '</div>';
        h += '<div class="drp__main"><div class="drp__nav"><button type="button" class="drp__arrow" data-act="yprev" aria-label="Previous year">' + icon('left') + '</button>' +
          '<button type="button" class="drp__navt drp__navt--btn" data-act="toyear"><b>' + st.viewY + '</b><small>Select the first and last month</small></button>' +
          '<button type="button" class="drp__arrow" data-act="ynext" aria-label="Next year">' + icon('right') + '</button></div><div class="drp__grid">';
        for (var m = 0; m < 12; m++) {
          var ms = monthStart(st.viewY, m);
          var me = monthEnd(st.viewY, m);
          var endStr = st.to || st.from;
          var rangeLast = st.from ? monthEnd(Number(endStr.slice(0, 4)), Number(endStr.slice(5, 7)) - 1) : '';
          var rangeFirst = st.from ? st.from.slice(0, 7) + '-01' : '';
          var on = !!st.from && ms >= rangeFirst && me <= rangeLast;
          var edge = !!st.from && (ms === rangeFirst || me === rangeLast);
          h += '<button type="button" class="drp__cell' + (on ? ' is-in' : '') + (edge ? ' is-edge' : '') + (ms.slice(0, 7) === today().slice(0, 7) ? ' is-today' : '') + '" data-month="' + m + '" aria-pressed="' + !!on + '">' +
            '<b>' + MON[m].toUpperCase() + '</b><sup>Q' + (Math.floor(m / 3) + 1) + '</sup></button>';
        }
        h += '</div></div></div>';
      }

      if (st.tab === 'year') {
        h += '<div class="drp__body drp__body--year"><div class="drp__main"><div class="drp__nav"><button type="button" class="drp__arrow" data-act="bprev" aria-label="Previous years">' + icon('left') + '</button>' +
          '<div class="drp__navt"><b>' + st.yearBlock + ' – ' + (st.yearBlock + 11) + '</b><small>Double-click a year to apply it</small></div>' +
          '<button type="button" class="drp__arrow" data-act="bnext" aria-label="Next years">' + icon('right') + '</button></div><div class="drp__grid">';
        var fy = st.from ? parse(st.from).getFullYear() : null;
        var ty = st.to ? parse(st.to).getFullYear() : fy;
        for (var y = st.yearBlock; y < st.yearBlock + 12; y++) {
          var inY = fy !== null && y >= fy && y <= ty;
          h += '<button type="button" class="drp__cell drp__cell--year' + (inY ? ' is-in' : '') + (y === fy || y === ty ? ' is-edge' : '') + (y === now.getFullYear() ? ' is-today' : '') + '" data-year="' + y + '" aria-pressed="' + inY + '"><b>' + y + '</b></button>';
        }
        h += '</div></div></div>';
      }

      h += '<div class="drp__scope" data-scope role="status">' + esc(scopeText()) + '</div>';
      var quick = st.tab === 'date' ? '<button type="button" class="drp__quick" data-act="selmonth">SELECT ' + MON[st.viewM].toUpperCase() + '</button><button type="button" class="drp__quick" data-act="today">Today</button>'
        : st.tab === 'month' ? '<button type="button" class="drp__quick" data-act="thismonth">This month</button>'
          : st.tab === 'year' ? '<button type="button" class="drp__quick" data-act="thisyear">This year</button>' : '';
      h += '<div class="drp__foot"><button type="button" class="drp__clear" data-act="clear">Clear</button><span class="drp__spacer"></span>' + quick +
        '<button type="button" class="drp__apply" data-act="apply"' + (valid() ? '' : ' disabled') + '>Apply</button></div>';
      el.innerHTML = h;
      position();
    }

    function position() {
      var r = anchor ? anchor.getBoundingClientRect() : { right: window.innerWidth - 16, bottom: 64 };
      var w = el.offsetWidth;
      el.style.top = Math.round(r.bottom + 10) + 'px';
      el.style.left = Math.max(10, Math.min(window.innerWidth - w - 10, Math.round(r.right - w))) + 'px';
      el.style.maxHeight = Math.max(320, window.innerHeight - r.bottom - 22) + 'px';
    }

    function setRange(from, to, pending) { st.from = from; st.to = to; st.pending = !!pending; }
    function apply() {
      if (!valid()) return;
      set({ mode: st.tab, from: st.from, to: st.to || st.from });
      close();
    }

    el.addEventListener('click', function (ev) {
      var t = ev.target.closest('button');
      if (!t || !el.contains(t)) return;
      if (t.dataset.tab) { st.tab = t.dataset.tab; st.pending = false; if (st.tab === 'all') { st.from = ''; st.to = ''; } render(); return; }
      if (t.dataset.day) {
        var d = t.dataset.day;
        if (!st.awaitEnd || !st.from) { st.from = d; st.to = ''; st.awaitEnd = true; }   // 1st click: start
        else if (d < st.from) { st.from = d; st.to = ''; }                               // earlier day: new start
        else { st.to = d; st.awaitEnd = false; }                                          // 2nd click: end (same day = single day)
        render(); return;
      }
      if (t.dataset.preset) {
        var n = new Date();
        var tt = today();
        var map = {
          today: [tt, tt],
          yesterday: [ymd(addDays(n, -1)), ymd(addDays(n, -1))],
          week: [ymd(addDays(n, -((n.getDay() + 6) % 7))), tt],
          last7: [ymd(addDays(n, -6)), tt],
          last30: [ymd(addDays(n, -29)), tt],
          month: [monthStart(st.viewY, st.viewM), monthEnd(st.viewY, st.viewM)]
        }[t.dataset.preset];
        st.from = map[0]; st.to = map[1]; st.awaitEnd = false;
        var f = parse(st.from); st.viewY = f.getFullYear(); st.viewM = f.getMonth();
        render(); return;
      }
      if (t.dataset.month !== undefined) {
        var mm = Number(t.dataset.month);
        var s = monthStart(st.viewY, mm);
        var e2 = monthEnd(st.viewY, mm);
        if (st.pending && st.from) {
          var a = s < st.from ? s : st.from;
          var b = e2 > (st.to || st.from) ? e2 : (st.to || st.from);
          if (s < st.from) { a = s; b = st.to || st.from; }
          setRange(a, b, false);
        } else setRange(s, e2, true);
        render(); return;
      }
      if (t.dataset.year) {
        var yy = Number(t.dataset.year);
        if (st.pending && st.from) {
          var fy2 = parse(st.from).getFullYear();
          var lo = Math.min(fy2, yy);
          var hi = Math.max(fy2, yy);
          setRange(lo + '-01-01', hi + '-12-31', false);
        } else setRange(yy + '-01-01', yy + '-12-31', true);
        render(); return;
      }
      if (t.dataset.mshort) {
        var k = t.dataset.mshort;
        var y = st.viewY;
        var c = new Date();
        var q = { q1: [0, 2], q2: [3, 5], q3: [6, 8], q4: [9, 11] }[k];
        if (k === 'cur') { setRange(monthStart(c.getFullYear(), c.getMonth()), monthEnd(c.getFullYear(), c.getMonth()), false); st.viewY = c.getFullYear(); }
        else if (k === 'prev') { var pm = new Date(c.getFullYear(), c.getMonth() - 1, 1); setRange(monthStart(pm.getFullYear(), pm.getMonth()), monthEnd(pm.getFullYear(), pm.getMonth()), false); st.viewY = pm.getFullYear(); }
        else if (k === 'year') setRange(y + '-01-01', y + '-12-31', false);
        else setRange(monthStart(y, q[0]), monthEnd(y, q[1]), false);
        render(); return;
      }
      switch (t.dataset.act) {
        case 'close': close(); break;
        case 'apply': apply(); break;
        case 'clear': set({ mode: 'all' }); close(); break;
        case 'prev': st.viewM -= 1; if (st.viewM < 0) { st.viewM = 11; st.viewY -= 1; } render(); break;
        case 'next': st.viewM += 1; if (st.viewM > 11) { st.viewM = 0; st.viewY += 1; } render(); break;
        case 'yprev': st.viewY -= 1; render(); break;
        case 'ynext': st.viewY += 1; render(); break;
        case 'toyear': st.tab = 'year'; st.yearBlock = st.viewY - 10; st.pending = false; render(); break;
        case 'bprev': st.yearBlock -= 12; render(); break;
        case 'bnext': st.yearBlock += 12; render(); break;
        case 'selmonth': setRange(monthStart(st.viewY, st.viewM), monthEnd(st.viewY, st.viewM), false); st.awaitEnd = false; render(); break;
        case 'today': var td = parse(today()); st.from = today(); st.to = today(); st.awaitEnd = false; st.viewY = td.getFullYear(); st.viewM = td.getMonth(); render(); break;
        case 'thismonth': var tm = new Date(); setRange(monthStart(tm.getFullYear(), tm.getMonth()), monthEnd(tm.getFullYear(), tm.getMonth()), false); st.viewY = tm.getFullYear(); render(); break;
        case 'thisyear': var ty2 = new Date().getFullYear(); setRange(ty2 + '-01-01', ty2 + '-12-31', false); st.yearBlock = ty2 - 10; render(); break;
        default: break;
      }
    });
    el.addEventListener('dblclick', function (ev) {
      var t = ev.target.closest('[data-year]');
      if (t) { var y = Number(t.dataset.year); st.from = y + '-01-01'; st.to = y + '-12-31'; st.pending = false; apply(); }
    });
    el.addEventListener('change', function (ev) {
      var inp = ev.target.closest('input[data-field]');
      if (!inp) return;
      var v = fromDmy(inp.value);
      if (!inp.value.trim()) v = '';
      if (inp.value.trim() && !v) { inp.classList.add('is-bad'); return; }
      inp.classList.remove('is-bad');
      if (inp.dataset.field === 'from') st.from = v; else st.to = v;
      if (st.from && st.to && st.from > st.to) { var sw = st.from; st.from = st.to; st.to = sw; }
      var base = parse(st.from || st.to);
      if (base) { st.viewY = base.getFullYear(); st.viewM = base.getMonth(); }
      render();
    });

    pop = {
      el: el,
      onDown: function (ev) {
        if (el.contains(ev.target)) return;
        if (anchor && anchor.contains && anchor.contains(ev.target)) return;
        if (ev.target.closest && ev.target.closest('.top__range')) return;
        close();
      },
      onKey: function (ev) {
        if (ev.key === 'Escape') { close(); return; }
        if (ev.key === 'Enter' && el.contains(ev.target) && ev.target.tagName !== 'BUTTON') { ev.preventDefault(); if (ev.target.matches('input[data-field]')) ev.target.dispatchEvent(new Event('change', { bubbles: true })); else apply(); }
      },
      onResize: function () { position(); }
    };
    setTimeout(function () {
      if (!pop) return;
      document.addEventListener('pointerdown', pop.onDown, true);
      document.addEventListener('keydown', pop.onKey, true);
    }, 0);
    window.addEventListener('resize', pop.onResize);
    render();
    try { window.dispatchEvent(new CustomEvent('tessly:daterange-ui', { detail: { open: true } })); } catch (e) { /* ignore */ }
  }

  window.TesslyDateRange = {
    get: snapshot,
    set: set,
    subscribe: subscribe,
    open: open,
    close: close,
    toggle: toggle,
    isOpen: isOpen,
    // exposed for tests
    _label: labelFor
  };
})();
