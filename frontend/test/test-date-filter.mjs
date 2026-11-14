/**
 * HEADER DATE FILTER (ALL DATES · BY DATE · BY MONTH · BY YEAR) — END-TO-END TEST
 * ------------------------------------------------------------------
 * Headless Chrome against the real backend. Verifies the theme-based popover that
 * opens from the header chip, each of its four tabs, the shortcuts, the scope line,
 * persistence, the pages that use the range, light/dark and mobile.
 *
 * Run: node test/test-date-filter.mjs   (backend must be running on :5001)
 */
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8096;
const API_TARGET = { host: 'localhost', port: 5001 };
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};
const appDir = path.resolve(process.cwd().endsWith('frontend') ? '.' : 'frontend');

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const proxied = http.request(
      { host: API_TARGET.host, port: API_TARGET.port, path: req.url, method: req.method, headers: req.headers },
      (up) => { res.writeHead(up.statusCode, up.headers); up.pipe(res); }
    );
    proxied.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Backend unreachable' }));
    });
    req.pipe(proxied);
    return;
  }
  const reqPath = req.url.split('?')[0];
  let filePath = path.join(appDir, reqPath === '/' ? 'index.html' : reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = path.join(appDir, 'index.html');
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(500); res.end('Server Error'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(PORT, async () => {
  console.log(`[TEST-DATE-FILTER] Listening on http://localhost:${PORT}`);
  let passed = 0;
  let failed = 0;
  const assert = (c, m) => {
    if (c) { console.log(`  ✓ [PASS] ${m}`); passed++; } else { console.error(`  ✗ [FAIL] ${m}`); failed++; }
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1700, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const load = async (route) => {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.phead', { timeout: 15000 });
    await sleep(1300);
  };
  const R = (fn, ...args) => page.evaluate(fn, ...args);
  const state = () => R(() => window.TesslyDateRange.get());
  const chip = () => R(() => ({
    label: document.querySelector('.top__range-label')?.innerText.trim(),
    badge: document.querySelector('.top__range-badge')?.innerText.trim() || '',
    hasX: !!document.querySelector('.top__range-x'),
    set: document.querySelector('.top__range').classList.contains('is-set')
  }));
  const isOpen = () => R(() => !!document.querySelector('.drp'));
  const openPop = async () => { if (!(await isOpen())) { await page.click('.top__range-main'); await sleep(350); } };
  const tab = async (t) => { await R((x) => document.querySelector(`.drp__tab[data-tab="${x}"]`).click(), t); await sleep(200); };
  const click = async (sel) => { await R((s) => document.querySelector(s).click(), sel); await sleep(150); };
  const scope = () => R(() => document.querySelector('[data-scope]')?.innerText.trim());
  const apply = async () => { await click('.drp__apply'); await sleep(450); };
  const reset = async () => { await R(() => window.TesslyDateRange.set({ mode: 'all' })); await sleep(250); };
  const dmy = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const now = new Date();

  // ------------------------------------------------------------------ 1
  console.log('=== 1. THE HEADER CHIP ===');
  await load('/accounts/dashboard');
  await R(() => localStorage.removeItem('tessly.dateRange'));
  await load('/accounts/dashboard');
  const hdr = await R(() => {
    const c = document.querySelector('header.top .top__range');
    const bell = document.querySelector('header.top .top__bell');
    const cr = c?.getBoundingClientRect();
    const br = bell?.getBoundingClientRect();
    const probeBg = (v) => { const d = document.createElement('span'); d.style.backgroundColor = `var(${v})`; document.body.appendChild(d); const x = getComputedStyle(d).backgroundColor; d.remove(); return x; };
    return {
      exists: !!c, leftOfBell: !!cr && cr.right <= br.left, sameRow: !!cr && Math.abs((cr.top + cr.height / 2) - (br.top + br.height / 2)) < 3,
      h: cr && Math.round(cr.height), bellH: Math.round(br.height),
      bg: c && getComputedStyle(c).backgroundColor, card: probeBg('--card'),
      icon: !!c?.querySelector('.top__range-ico svg'), chev: !!c?.querySelector('.top__range-chev svg'),
      aria: c?.querySelector('.top__range-main')?.getAttribute('aria-label')
    };
  });
  assert(hdr.exists && hdr.leftOfBell && hdr.sameRow, 'chip sits in the header row, left of the notification bell');
  assert(hdr.h === hdr.bellH, `same height as the other header buttons (${hdr.h}px)`);
  assert(hdr.bg === hdr.card, 'chip surface is the theme --card colour');
  assert(hdr.icon && hdr.chev, 'calendar icon tile + chevron');
  let c0 = await chip();
  assert(c0.label === 'All Dates' && c0.badge === '' && !c0.hasX && !c0.set, 'default: "All Dates", no badge, no clear (✕) button');
  assert(/Date filter/.test(hdr.aria || ''), `accessible name (${hdr.aria})`);

  // ------------------------------------------------------------------ 2
  console.log('\n=== 2. THE POPOVER ===');
  await openPop();
  const pop = await R(() => {
    const p = document.querySelector('.drp');
    const probeBg = (v) => { const d = document.createElement('span'); d.style.backgroundColor = `var(${v})`; document.body.appendChild(d); const x = getComputedStyle(d).backgroundColor; d.remove(); return x; };
    const r = p?.getBoundingClientRect();
    const b = document.querySelector('.top__range').getBoundingClientRect();
    const on = p?.querySelector('.drp__tab.is-on');
    const ap = p?.querySelector('.drp__apply');
    return {
      open: !!p, title: p?.querySelector('.drp__title')?.innerText, sub: p?.querySelector('.drp__sub')?.innerText,
      tabs: [...(p?.querySelectorAll('.drp__tab') || [])].map((t) => t.innerText.trim()), on: on?.innerText.trim(),
      bg: p && getComputedStyle(p).backgroundColor, raised: probeBg('--raised'),
      onBg: on && getComputedStyle(on).backgroundColor, primary: probeBg('--primary'), applyBg: ap && getComputedStyle(ap).backgroundColor,
      below: r && r.top >= b.bottom, right: r && Math.abs(r.right - b.right) < 30, inView: r && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
      foot: [...(p?.querySelectorAll('.drp__foot button') || [])].map((x) => x.innerText.trim()),
      scope: p?.querySelector('[data-scope]')?.innerText.trim(), expanded: document.querySelector('.top__range-main').getAttribute('aria-expanded'), chipOpen: document.querySelector('.top__range').classList.contains('is-open')
    };
  });
  assert(pop.open && /SELECT DATE FILTER/.test(pop.title) && /GLOBAL FILTER/.test(pop.sub), `header block: "${pop.title}" / "${pop.sub}"`);
  assert(pop.tabs.join('|') === 'ALL DATES|BY DATE|BY MONTH|BY YEAR' && pop.on === 'BY DATE', `four tabs; BY DATE is the default tab (${pop.on})`);
  assert(pop.bg === pop.raised, 'popover surface is the theme --raised colour');
  assert(pop.onBg === pop.primary && pop.applyBg === pop.primary, 'active tab and APPLY use the theme primary colour');
  assert(pop.below && pop.right && pop.inView, 'anchored under the chip, right-aligned, inside the viewport');
  assert(pop.foot.includes('CLEAR') && pop.foot.includes('APPLY'), `footer has CLEAR and APPLY (${pop.foot.join(', ')})`);
  assert(/Pick a start and an end date/.test(pop.scope), `scope line asks for a range: "${pop.scope}"`);
  assert(pop.expanded === 'true' && pop.chipOpen, 'chip shows the open state');
  const def = await R(() => ({ from: document.querySelector('[data-field="from"]')?.value, to: document.querySelector('[data-field="to"]')?.value, head: document.querySelector('.drp__navt b')?.innerText, today: !!document.querySelector('.drp__day.is-today'), picked: document.querySelectorAll('.drp__day.is-edge, .drp__day.is-in').length, applyOff: document.querySelector('.drp__apply').disabled, presets: document.querySelectorAll('[data-preset]').length }));
  const monthNow = new Date().toLocaleString('en-US', { month: 'long' }).toUpperCase() + ' ' + new Date().getFullYear();
  assert(def.from === '' && def.to === '' && def.head === monthNow && def.today && def.picked === 0 && def.applyOff && def.presets === 6, `default view: calendar on ${def.head} with today outlined, empty FROM / TO, 6 presets, APPLY disabled`);
  await click('.drp__close');
  assert(!(await isOpen()), '✕ closes the popover');
  await openPop(); await page.keyboard.press('Escape'); await sleep(250);
  assert(!(await isOpen()), 'Esc closes it');
  await openPop(); await page.mouse.click(300, 700); await sleep(250);
  assert(!(await isOpen()), 'clicking outside closes it');
  await openPop(); await page.click('.top__range-main'); await sleep(250);
  assert(!(await isOpen()), 'clicking the chip again toggles it shut');
  await openPop(); await page.click('.top__range-chev'); await sleep(250);
  assert(!(await isOpen()), 'the chevron toggles it too');

  // ------------------------------------------------------------------ 3
  console.log('\n=== 3. BY DATE ===');
  await openPop(); await tab('date');
  const dt = await R(() => ({
    title: document.querySelector('.drp__title').innerText, inputs: document.querySelectorAll('.drp__input[data-field]').length,
    presets: [...document.querySelectorAll('[data-preset]')].map((b) => b.innerText.trim()), dow: [...document.querySelectorAll('.drp__dow span')].map((s) => s.innerText),
    days: document.querySelectorAll('.drp__day').length, head: document.querySelector('.drp__navt b').innerText, quick: [...document.querySelectorAll('.drp__quick')].map((b) => b.innerText.trim()),
    applyOff: document.querySelector('.drp__apply').disabled
  }));
  const monthName = now.toLocaleString('en-US', { month: 'long' }).toUpperCase();
  assert(dt.inputs === 2 && dt.presets.join('|') === 'Today|Yesterday|This Week|Last 7 Days|Last 30 Days|Whole Month', `FROM / TO fields and 6 presets (${dt.presets.length})`);
  assert(dt.dow.join() === 'Sun,Mon,Tue,Wed,Thu,Fri,Sat' && dt.head === `${monthName} ${now.getFullYear()}`, `calendar opens on the current month (${dt.head})`);
  assert(dt.days === new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(), `calendar shows every day of the month (${dt.days})`);
  assert(dt.quick.some((q) => /^SELECT /.test(q)) && dt.quick.includes('TODAY'), `quick buttons: ${dt.quick.join(', ')}`);
  assert(dt.applyOff, 'APPLY is disabled until something is picked');
  const preset = async (id) => { await click(`[data-preset="${id}"]`); return R(() => ({ from: document.querySelector('[data-field="from"]').value, to: document.querySelector('[data-field="to"]').value, scope: document.querySelector('[data-scope]').innerText })); };
  let pr = await preset('today');
  assert(pr.from === dmy(now) && pr.to === dmy(now) && /1 Day Selected/.test(pr.scope), `Today → ${pr.from} (1 Day)`);
  const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  pr = await preset('yesterday');
  assert(pr.from === dmy(yest) && pr.to === dmy(yest), `Yesterday → ${pr.from}`);
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  pr = await preset('week');
  assert(pr.from === dmy(monday) && pr.to === dmy(now), `This Week → Monday ${pr.from} … today`);
  pr = await preset('last7');
  assert(pr.from === dmy(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)) && /7 Days Selected/.test(pr.scope), `Last 7 Days = 7 days inclusive (${pr.scope})`);
  pr = await preset('last30');
  assert(/30 Days Selected/.test(pr.scope) && pr.to === dmy(now), `Last 30 Days = 30 days inclusive (${pr.scope})`);
  const shownMonth = await R(() => document.querySelector('.drp__navt b').innerText);
  pr = await preset('month');
  const [sMon, sYear] = shownMonth.split(' ');
  const sIdx = new Date(`${sMon} 1, ${sYear}`).getMonth();
  const sDim = new Date(Number(sYear), sIdx + 1, 0).getDate();
  assert(pr.from === dmy(new Date(Number(sYear), sIdx, 1)) && pr.to === dmy(new Date(Number(sYear), sIdx, sDim)) && new RegExp(`${sDim} Days`).test(pr.scope), `Whole Month → the displayed month (${shownMonth}): 1st … ${sDim}th`);
  // calendar clicks (use November 2026 for deterministic dates)
  const goto = async (y, m) => {
    for (let i = 0; i < 80; i++) {
      const cur = await R(() => document.querySelector('.drp__navt b').innerText);
      const [mn, yr] = cur.split(' ');
      const idx = new Date(`${mn} 1, ${yr}`).getMonth();
      const diff = (Number(yr) - y) * 12 + (idx - m);
      if (diff === 0) return;
      await click(diff > 0 ? '[data-act="prev"]' : '[data-act="next"]');
    }
  };
  await goto(2026, 10);
  assert((await R(() => document.querySelector('.drp__navt b').innerText)) === 'NOVEMBER 2026', 'month arrows navigate (→ November 2026)');
  await click('[data-day="2026-11-10"]');
  let cal = await R(() => ({ edges: document.querySelectorAll('.drp__day.is-edge').length, from: document.querySelector('[data-field="from"]').value, to: document.querySelector('[data-field="to"]').value }));
  assert(cal.edges === 1 && cal.from === '10/11/2026' && cal.to === '', '1st click sets the start only');
  await click('[data-day="2026-11-14"]');
  cal = await R(() => ({ edges: document.querySelectorAll('.drp__day.is-edge').length, inRange: document.querySelectorAll('.drp__day.is-in').length, to: document.querySelector('[data-field="to"]').value, scope: document.querySelector('[data-scope]').innerText }));
  assert(cal.to === '14/11/2026' && cal.edges === 2 && cal.inRange === 3 && /5 Days Selected/.test(cal.scope), `2nd click sets the end: 10–14 Nov, 3 days highlighted between (${cal.scope})`);
  await click('[data-day="2026-11-20"]');
  assert((await R(() => document.querySelector('[data-field="from"]').value)) === '20/11/2026' && (await R(() => document.querySelector('[data-field="to"]').value)) === '', 'clicking again after a full range starts a new range');
  await click('[data-day="2026-11-05"]');
  assert((await R(() => document.querySelector('[data-field="from"]').value)) === '05/11/2026', 'an earlier day while choosing the end moves the start');
  await click('[data-day="2026-11-05"]');
  assert(/1 Day Selected/.test(await scope()), 'clicking the same day twice selects a single day');
  await R(() => { const i = document.querySelector('[data-field="from"]'); i.value = '01/10/2026'; i.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(200);
  await R(() => { const i = document.querySelector('[data-field="to"]'); i.value = '31/10/2026'; i.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(200);
  assert((await R(() => document.querySelector('.drp__navt b').innerText)) === 'OCTOBER 2026' && /31 Days Selected/.test(await scope()), 'typing dates in FROM / TO moves the calendar and updates the scope (31 days)');
  await R(() => { const i = document.querySelector('[data-field="to"]'); i.value = '31/02/2026'; i.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(200);
  assert(await R(() => document.querySelector('[data-field="to"]').classList.contains('is-bad')), 'an impossible date (31/02/2026) is flagged');
  await R(() => { const i = document.querySelector('[data-field="from"]'); i.value = '20/10/2026'; i.dispatchEvent(new Event('change', { bubbles: true })); });
  await R(() => { const i = document.querySelector('[data-field="to"]'); i.value = '10/10/2026'; i.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(200);
  assert((await R(() => document.querySelector('[data-field="from"]').value)) === '10/10/2026' && (await R(() => document.querySelector('[data-field="to"]').value)) === '20/10/2026', 'FROM later than TO is swapped automatically');
  await click('[data-act="selmonth"]');
  assert(/31 Days Selected/.test(await scope()) && (await R(() => document.querySelector('[data-field="from"]').value)) === '01/10/2026', 'SELECT <MONTH> picks the whole displayed month');
  await goto(2028, 1);
  await click('[data-act="selmonth"]');
  assert(/29 Days Selected/.test(await scope()), 'February 2028 (leap year) = 29 days');
  await goto(2026, 11);
  await click('[data-act="next"]');
  assert((await R(() => document.querySelector('.drp__navt b').innerText)) === 'JANUARY 2027', 'December → January rolls the year');
  await goto(2026, 10);
  await click('[data-day="2026-11-01"]'); await click('[data-day="2026-11-30"]');
  await apply();
  let st = await state(); let ch = await chip();
  assert(!(await isOpen()), 'APPLY closes the popover');
  assert(st.mode === 'date' && st.from === '2026-11-01' && st.to === '2026-11-30', `state = date ${st.from} → ${st.to}`);
  assert(ch.label === '1 Nov – 30 Nov 2026' && ch.badge === '(DATE)' && ch.hasX && ch.set, `chip: "${ch.label}" ${ch.badge}, ✕ shown, highlighted`);

  // ------------------------------------------------------------------ 4
  console.log('\n=== 4. BY MONTH ===');
  await openPop();
  assert((await R(() => document.querySelector('.drp__tab.is-on').innerText)) === 'BY DATE', 'reopening starts on the tab of the saved mode');
  await tab('month');
  const mo = await R(() => ({
    title: document.querySelector('.drp__title').innerText, cells: [...document.querySelectorAll('.drp__cell')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()),
    shorts: [...document.querySelectorAll('[data-mshort]')].map((b) => b.innerText.trim()), head: document.querySelector('.drp__navt b').innerText, ro: [...document.querySelectorAll('.drp__input--ro')].map((x) => x.innerText.trim())
  }));
  assert(/SELECT MONTH FILTER/.test(mo.title) && mo.cells.length === 12, 'month grid with 12 months, titled SELECT MONTH FILTER');
  assert(mo.cells[0].startsWith('JAN') && mo.cells[0].includes('Q1') && mo.cells[3].includes('Q2') && mo.cells[6].includes('Q3') && mo.cells[11].includes('Q4'), 'each month carries its quarter badge');
  assert(mo.shorts.join('|').startsWith('Current Month|Previous Month|Q1 (Jan - Mar)|Q2 (Apr - Jun)|Q3 (Jul - Sep)|Q4 (Oct - Dec)|Full Year'), `quick shortcuts (${mo.shorts.length})`);
  assert(mo.ro.join('|') === 'November 2026|November 2026', `FROM / TO show month names carried over from the date range (${mo.ro.join(' / ')})`);
  await click('[data-act="clear"]');
  assert(!(await isOpen()) && (await state()).mode === 'all', 'CLEAR resets to all dates and closes');
  await openPop(); await tab('month');
  await goto2026();
  async function goto2026() {
    for (let i = 0; i < 30; i++) {
      const y = Number((await R(() => document.querySelector('.drp__navt b').innerText)).replace(/\D/g, ''));
      if (y === 2026) return;
      await click(y > 2026 ? '[data-act="yprev"]' : '[data-act="ynext"]');
    }
  }
  await click('[data-month="9"]');
  assert(/Full Calendar Month/.test(await scope()) && /01\/10\/2026 — 31\/10\/2026/.test(await scope()), `1st click: one whole month (${await scope()})`);
  await click('[data-month="11"]');
  assert(/3 Calendar Months/.test(await scope()) && /01\/10\/2026 — 31\/12\/2026/.test(await scope()), `2nd click extends to a range (${await scope()})`);
  assert((await R(() => document.querySelectorAll('.drp__cell.is-in').length)) === 3 && (await R(() => document.querySelectorAll('.drp__cell.is-edge').length)) === 2, 'three months highlighted, two edges');
  await click('[data-month="1"]');
  assert(/01\/02\/2026 — 28\/02\/2026/.test(await scope()), 'a 3rd click starts a fresh selection (Feb 2026 = 28 days)');
  await click('[data-month="0"]');
  assert(/01\/01\/2026 — 28\/02\/2026/.test(await scope()), 'an earlier 2nd click extends backwards (Jan–Feb)');
  await click('[data-mshort="q2"]');
  assert(/01\/04\/2026 — 30\/06\/2026/.test(await scope()), 'Q2 shortcut → Apr–Jun');
  await click('[data-mshort="q4"]');
  assert(/01\/10\/2026 — 31\/12\/2026/.test(await scope()), 'Q4 shortcut → Oct–Dec');
  await click('[data-mshort="q1"]'); await click('[data-mshort="q3"]');
  assert(/01\/07\/2026 — 30\/09\/2026/.test(await scope()), 'Q1 and Q3 shortcuts work (Jul–Sep)');
  await click('[data-mshort="year"]');
  assert(/01\/01\/2026 — 31\/12\/2026/.test(await scope()) && /12 Calendar Months/.test(await scope()), 'Full Year 2026 shortcut');
  await click('[data-mshort="cur"]');
  const curStart = new Date(now.getFullYear(), now.getMonth(), 1); const curEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  assert(new RegExp(`${dmy(curStart).replace(/\//g, '\\/')} — ${dmy(curEnd).replace(/\//g, '\\/')}`).test(await scope()), 'Current Month shortcut');
  await click('[data-mshort="prev"]');
  const pStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); const pEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  assert(new RegExp(`${dmy(pStart).replace(/\//g, '\\/')} — ${dmy(pEnd).replace(/\//g, '\\/')}`).test(await scope()), 'Previous Month shortcut (handles a January → December rollover)');
  await click('[data-act="thismonth"]');
  assert(new RegExp(dmy(curStart).replace(/\//g, '\\/')).test(await scope()), 'THIS MONTH button');
  await click('[data-act="ynext"]');
  assert((await R(() => document.querySelector('.drp__navt b').innerText)) === `YEAR ${now.getFullYear() + 1}`, 'year arrows change the grid year');
  await click('[data-act="yprev"]'); await goto2026();
  await click('[data-month="10"]'); await click('[data-month="10"]');
  await apply();
  st = await state(); ch = await chip();
  assert(st.mode === 'month' && st.from === '2026-11-01' && st.to === '2026-11-30', `applied: month ${st.from} → ${st.to}`);
  assert(ch.label === 'Nov 2026' && ch.badge === '(MONTH)', `chip: "${ch.label}" ${ch.badge}`);
  const labs = await R(() => { const L = window.TesslyDateRange._label; return [L('month', '2026-10-01', '2026-12-31').label, L('month', '2025-11-01', '2026-02-28').label, L('year', '2026-01-01', '2026-12-31').label, L('year', '2025-01-01', '2026-12-31').label, L('date', '2026-11-07', '2026-11-07').label, L('date', '2025-12-30', '2026-01-02').label, L('all', '', '').label]; });
  assert(labs.join(' | ') === 'Oct – Dec 2026 | Nov 2025 – Feb 2026 | 2026 | 2025 – 2026 | 7 Nov 2026 | 30 Dec 2025 – 2 Jan 2026 | All Dates', `chip labels for every kind of range (${labs.join(' | ')})`);
  await openPop(); await tab('month'); await goto2026();
  await click('[data-month="1"]');
  await click('[data-act="ynext"]'); await click('[data-act="ynext"]');
  await click('[data-month="1"]');
  assert(/01\/02\/2026 — 29\/02\/2028/.test(await scope()), 'a range can span years — Feb 2026 … Feb 2028 (leap-day end)');

  // ------------------------------------------------------------------ 5
  console.log('\n=== 5. BY YEAR ===');
  await tab('year');
  const yr = await R(() => ({ title: document.querySelector('.drp__title').innerText, sub: document.querySelector('.drp__navt small').innerText, years: [...document.querySelectorAll('[data-year]')].map((b) => b.innerText.trim()), head: document.querySelector('.drp__navt b').innerText }));
  assert(/SELECT YEAR FILTER/.test(yr.title) && yr.years.length === 12 && /DOUBLE-CLICK/.test(yr.sub), `year grid of 12 (${yr.head}), "${yr.sub}"`);
  assert(yr.years.includes(String(now.getFullYear())), 'the current year is in the grid');
  await click('[data-act="bnext"]');
  const yr2 = await R(() => [...document.querySelectorAll('[data-year]')].map((b) => Number(b.innerText)));
  assert(yr2[0] === Number(yr.years[0]) + 12, 'arrows move 12 years at a time');
  await click('[data-act="bprev"]');
  await click('[data-year="2026"]');
  assert(/01\/01\/2026 — 31\/12\/2026/.test(await scope()) && /Full Calendar Year/.test(await scope()), `one year: ${await scope()}`);
  await click('[data-year="2024"]');
  assert(/01\/01\/2024 — 31\/12\/2026/.test(await scope()) && /3 Calendar Years/.test(await scope()), 'second click extends to a range (2024–2026)');
  await click('[data-year="2025"]');
  assert(/01\/01\/2025 — 31\/12\/2025/.test(await scope()), 'third click starts afresh');
  await click('[data-act="thisyear"]');
  assert(new RegExp(`01\\/01\\/${now.getFullYear()}`).test(await scope()), 'THIS YEAR button');
  await R(() => document.querySelector('[data-year="2026"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
  await sleep(450);
  st = await state(); ch = await chip();
  assert(!(await isOpen()) && st.mode === 'year' && st.from === '2026-01-01' && st.to === '2026-12-31', 'double-click applies the year instantly and closes');
  assert(ch.label === '2026' && ch.badge === '(YEAR)', `chip: "${ch.label}" ${ch.badge}`);
  await openPop(); await tab('year'); await click('[data-year="2025"]'); await click('[data-year="2026"]'); await apply();
  assert((await chip()).label === '2025 – 2026', 'a two-year range shows "2025 – 2026"');

  // ------------------------------------------------------------------ 6
  console.log('\n=== 6. CLEARING, ALL DATES AND PERSISTENCE ===');
  await page.click('.top__range-x'); await sleep(350);
  st = await state(); ch = await chip();
  assert(st.mode === 'all' && ch.label === 'All Dates' && !ch.hasX && !ch.set, 'the ✕ on the chip clears the filter without opening anything');
  assert(!(await isOpen()), 'popover stayed closed');
  await R(() => window.TesslyDateRange.set({ mode: 'month', from: '2026-10-01', to: '2026-10-31' }));
  await sleep(250);
  await openPop(); await tab('all');
  assert(/All dates/.test(await scope()) && (await R(() => !document.querySelector('.drp__apply').disabled)), 'ALL DATES tab: scope "All dates", APPLY enabled');
  await apply();
  assert((await state()).mode === 'all', 'APPLY on ALL DATES removes the filter');
  await R(() => window.TesslyDateRange.set({ mode: 'month', from: '2026-10-01', to: '2026-10-31' }));
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('.phead'); await sleep(1200);
  ch = await chip();
  assert(ch.label === 'Oct 2026' && ch.badge === '(MONTH)', 'the choice survives a reload');
  await R(() => localStorage.setItem('tessly.dateRange', JSON.stringify({ preset: 'custom', from: '2026-10-01', to: '2026-10-31' })));
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('.phead'); await sleep(1200);
  st = await state();
  assert(st.mode === 'date' && st.from === '2026-10-01' && st.to === '2026-10-31', 'a range saved by the previous version of the filter is migrated');
  await R(() => window.TesslyDateRange.set({ mode: 'date', from: '2026-12-01', to: '2026-11-01' }));
  st = await state();
  assert(st.from === '2026-11-01' && st.to === '2026-12-01', 'set() swaps a reversed range');
  await R(() => window.TesslyDateRange.set({ mode: 'month', from: 'junk', to: '' }));
  assert((await state()).mode === 'all', 'set() ignores invalid input (falls back to all dates)');
  await openPop(); await tab('date'); await click('.drp__apply');
  assert(await R(() => document.querySelector('.drp__apply').disabled) && (await isOpen()), 'APPLY stays disabled with nothing picked');
  await click('.drp__close');

  // ------------------------------------------------------------------ 7
  console.log('\n=== 7. THE RANGE DRIVES THE ACCOUNTS PAGES ===');
  const allKpis = await R(async () => (await (await fetch('/api/accounts/dashboard')).json()).data.kpis);
  await load('/accounts/dashboard');
  await openPop(); await tab('month'); await goto2026(); await click('[data-month="10"]'); await click('[data-month="10"]'); await apply();
  await sleep(2600);
  const exp = await R(async () => (await (await fetch('/api/accounts/dashboard?from=2026-11-01&to=2026-11-30')).json()).data.kpis);
  const shown = await R(() => Object.fromEntries([...document.querySelectorAll('.acct-bento-kpis .kpi')].map((k) => [k.querySelector('.kpi__label').innerText.trim(), k.querySelector('.kpi__value').innerText.replace(/[^\d-]/g, '')])));
  assert(Number(shown['Operating Expenses']) === Math.round(exp.totalExpenses) && exp.totalExpenses < allKpis.totalExpenses, `Overview "Operating Expenses" follows November (${shown['Operating Expenses']})`);
  assert(Number(shown['Operating Revenue']) === Math.round(exp.totalSales), `Overview "Operating Revenue" follows November (${shown['Operating Revenue']})`);
  await load('/accounts/expenses');
  assert((await chip()).label === 'Nov 2026', 'the chip is also in the header of the next page');
  const inputs = await R(() => [...document.querySelectorAll('input[aria-label="From date"], input[aria-label="To date"]')].map((i) => i.value));
  assert(inputs[0] === '2026-11-01' && inputs[1] === '2026-11-30', `Expenses date inputs are filled (${inputs.join(' → ')})`);
  assert((await R(() => [...document.querySelectorAll('tr[data-row]')].length)) === 3, 'Expenses shows the three November expenses');
  await load('/accounts/inward-expenses');
  const ie = await R(() => ({ rows: [...document.querySelectorAll('tr[data-row]')].map((r) => r.dataset.kind), controls: document.querySelectorAll('.page input, .page select').length }));
  assert(ie.controls === 0 && ie.rows.length === 3 && ie.rows.every((k) => k === 'Expense'), 'Inward & Expenses (no filter bar of its own): only November expenses listed');
  await R(() => window.TesslyDateRange.set({ mode: 'year', from: '2026-01-01', to: '2026-12-31' }));
  await sleep(500);
  assert((await R(() => document.querySelectorAll('tr[data-row]').length)) >= 6, 'switching to a whole year brings the October inward back');
  await page.click('.top__range-x'); await sleep(500);
  assert((await R(() => document.querySelectorAll('tr[data-row]').length)) >= 6 && (await chip()).label === 'All Dates', 'clearing the chip shows every record again');

  // ------------------------------------------------------------------ 8
  console.log('\n=== 8. THEMES AND MOBILE ===');
  await load('/clients');
  assert(await R(() => !!document.querySelector('header.top .top__range')), 'chip is in the header on every page (Clients)');
  await openPop();
  await R(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await sleep(500);
  const dark = await R(() => {
    const probeBg = (v) => { const d = document.createElement('span'); d.style.backgroundColor = `var(${v})`; document.body.appendChild(d); const x = getComputedStyle(d).backgroundColor; d.remove(); return x; };
    const p = document.querySelector('.drp');
    return { bg: getComputedStyle(p).backgroundColor, raised: probeBg('--raised'), tab: getComputedStyle(p.querySelector('.drp__tab.is-on')).backgroundColor, primary: probeBg('--primary') };
  });
  await R(() => document.documentElement.setAttribute('data-theme', 'light'));
  await sleep(500);
  const lightBg = await R(() => getComputedStyle(document.querySelector('.drp')).backgroundColor);
  assert(dark.bg === dark.raised && dark.tab === dark.primary && dark.bg !== lightBg, 'popover follows the theme: dark and light use different tokens, both from --raised / --primary');
  await click('.drp__close');
  await page.setViewport({ width: 390, height: 800 });
  await sleep(500);
  const mob = await R(() => { const b = document.querySelector('.top__range'); const r = b.getBoundingClientRect(); return { fits: r.left >= 0 && r.right <= innerWidth, noLabel: getComputedStyle(document.querySelector('.top__range-label')).display === 'none' }; });
  assert(mob.fits && mob.noLabel, 'phone: the chip shrinks to its icon and fits');
  await openPop();
  const mp = await R(() => { const r = document.querySelector('.drp').getBoundingClientRect(); return { fits: r.left >= 0 && r.right <= innerWidth, noScroll: document.documentElement.scrollWidth <= innerWidth }; });
  assert(mp.fits && mp.noScroll, 'phone: the popover fits the screen with no horizontal scroll');
  await click('.drp__close');
  await page.setViewport({ width: 1700, height: 1000 });
  await reset();

  assert(errors.length === 0, `zero uncaught page errors (${errors.length})`);
  errors.slice(0, 5).forEach((e) => console.error('   ->', e));
  console.log(`\nDATE FILTER TEST RESULT: ${passed} passed, ${failed} failed`);
  await browser.close();
  server.close();
  process.exit(failed > 0 ? 1 : 0);
});
