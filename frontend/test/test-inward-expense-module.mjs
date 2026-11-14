/**
 * ACCOUNTS → INWARD & EXPENSES — FRONTEND END-TO-END TEST
 * ------------------------------------------------------------------
 * Headless Chrome against the real backend. Verifies the combined page:
 *   - route, sidebar link, header
 *   - SIDE-BY-SIDE layout: stock inward on the left, expenses on the right
 *   - overall calculation underneath (inward, expense, total spend, paid out, payable)
 *   - no filter container on the page; the header date filter drives both sides and the calculation
 *   - VIEW-ONLY: no add / edit / delete controls, one "View" action per row
 *   - read-only detail drawer for an expense and for a stock inward
 *
 * Run: node test/test-inward-expense-module.mjs   (backend must be running on :5001)
 */
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8094;
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
  console.log(`[TEST-INWARD-EXPENSE] Listening on http://localhost:${PORT}`);
  let passed = 0;
  let failed = 0;
  const assert = (c, m) => {
    if (c) { console.log(`  ✓ [PASS] ${m}`); passed++; } else { console.error(`  ✗ [FAIL] ${m}`); failed++; }
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const TAG = `UI-IE-${Date.now()}`;

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1700, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const load = async () => {
    await page.goto(`http://localhost:${PORT}/accounts/inward-expenses`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.phead', { timeout: 15000 });
    await sleep(1400);
  };
  // set a controlled React input/select/textarea inside a form
  const setIn = (form, sel, idx, value) => page.evaluate((f, s, i, v) => {
    const el = document.querySelectorAll(`${f} ${s}`)[i];
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  }, form, sel, idx, value);
  const rows = () => page.evaluate(() => [...document.querySelectorAll('tr[data-row]')].map((r) => ({ kind: r.dataset.kind, text: r.innerText.replace(/\s+/g, ' ') })));
  const rowOf = async (needle) => (await rows()).find((r) => r.text.includes(needle)) || null;
  const clickRowAction = (needle, title) => page.evaluate((n, t) => {
    const tr = [...document.querySelectorAll('tr[data-row]')].find((r) => r.innerText.includes(n));
    tr.querySelector(`button[title="${t}"]`).click();
  }, needle, title);
  const clickButton = (re) => page.evaluate((src) => {
    [...document.querySelectorAll('button')].find((b) => new RegExp(src, 'i').test(b.innerText))?.click();
  }, re);
  const submit = async (formId) => {
    await page.evaluate((id) => document.querySelector(`button[form="${id}"]`).click(), formId);
    await sleep(1100);
  };
  const confirmDelete = async () => {
    await sleep(500);
    await page.evaluate(() => [...document.querySelectorAll('.modal__foot button')].find((b) => /^Delete$/i.test(b.innerText.trim()))?.click());
    await sleep(1000);
  };
  const filterSel = (label) => `select[aria-label="${label}"]`;

  // ------------------------------------------------------------------ 1
  console.log('=== 1. PAGE AND SIDE-BY-SIDE LAYOUT ===');
  await load();
  const info = await page.evaluate(() => {
    const L = document.querySelector('[data-side="inward"]');
    const R = document.querySelector('[data-side="expense"]');
    const lb = L?.getBoundingClientRect();
    const rb = R?.getBoundingClientRect();
    const sum = document.querySelector('[data-overall]')?.getBoundingClientRect();
    return {
      title: document.querySelector('.phead .ttl, .phead h1')?.textContent?.trim(),
      links: [...document.querySelectorAll('a')].map((a) => a.textContent.trim() + '|' + (a.getAttribute('href') || '')),
      leftHead: L?.querySelector('.inex-head__title')?.innerText,
      rightHead: R?.querySelector('.inex-head__title')?.innerText,
      leftKinds: [...(L?.querySelectorAll('tr[data-row]') || [])].map((r) => r.dataset.kind),
      rightKinds: [...(R?.querySelectorAll('tr[data-row]') || [])].map((r) => r.dataset.kind),
      leftHeaders: [...(L?.querySelectorAll('thead th') || [])].map((t) => t.innerText.trim().toLowerCase()),
      rightHeaders: [...(R?.querySelectorAll('thead th') || [])].map((t) => t.innerText.trim().toLowerCase()),
      sideBySide: !!(lb && rb) && lb.right <= rb.left + 1 && Math.abs(lb.top - rb.top) < 4,
      leftOfRight: !!(lb && rb) && lb.left < rb.left,
      summaryBelow: !!(sum && lb && rb) && sum.top >= Math.max(lb.bottom, rb.bottom) - 1,
      oldTopKpis: document.querySelectorAll('.kpis .kpi').length,
      buttons: [...document.querySelectorAll('button')].map((b) => b.innerText.trim())
    };
  });
  assert(info.title === 'Inward & Expenses', `page title (${info.title})`);
  assert(info.links.some((l) => l === 'Inward & Expenses|/accounts/inward-expenses'), 'sidebar link → /accounts/inward-expenses');
  assert(info.sideBySide && info.leftOfRight, 'two registers sit side by side, inward on the LEFT and expense on the RIGHT');
  assert(info.leftHead === 'Inward' && info.rightHead === 'Expense', `side headings are visible ("${info.leftHead}" / "${info.rightHead}")`);
  assert(info.leftKinds.length > 0 && info.leftKinds.every((k) => k === 'Inward'), `left side lists only stock inward (${info.leftKinds.length})`);
  assert(info.rightKinds.length > 0 && info.rightKinds.every((k) => k === 'Expense'), `right side lists only expenses (${info.rightKinds.length})`);
  assert(['date', 'supplier', 'amount', 'balance due', 'status'].every((h) => info.leftHeaders.includes(h)), 'inward columns: date, supplier, amount, balance due, status');
  assert(['date', 'title', 'payment', 'amount'].every((h) => info.rightHeaders.includes(h)), 'expense columns: date, title, payment, amount');
  assert(info.summaryBelow, 'overall calculation is at the BOTTOM, below both registers');
  assert(info.oldTopKpis === 0, 'the old top KPI row is gone (totals moved to the bottom)');
  assert(!info.buttons.some((b) => /Add expense|New stock inward/i.test(b)), 'still view-only: no add buttons');
  const apiAll = await page.evaluate(async () => (await (await fetch('/api/accounts/inward-expenses')).json()));
  assert(info.leftKinds.length + info.rightKinds.length === apiAll.data.length, `all ${apiAll.data.length} records are shown across the two sides`);
  const noBar = await page.evaluate(() => {
    const page = document.querySelector('.page');
    const split = document.querySelector('.inex-split').getBoundingClientRect().top;
    const phead = document.querySelector('.phead').getBoundingClientRect().bottom;
    return {
      toolbar: page.querySelectorAll('.toolbar, .acct-toolbar, .toolbar__search').length,
      controls: page.querySelectorAll('input, select').length,
      gap: Math.round(split - phead)
    };
  });
  assert(noBar.toolbar === 0 && noBar.controls === 0, `the filter container is gone: no search box, dropdown or date inputs on the page (${noBar.toolbar} bars, ${noBar.controls} controls)`);
  assert(noBar.gap < 40, `the two registers now start straight under the page header (gap ${noBar.gap}px)`);

  // ------------------------------------------------------------------ 2
  console.log('\n=== 2. OVERALL CALCULATION ===');
  const readSum = () => page.evaluate(() => {
    const num = (id) => Number((document.querySelector(`[data-sum="${id}"] .inex-sum__value`)?.innerText || '').replace(/[^\d.]/g, ''));
    return {
      inward: num('inward'), expense: num('expense'), spend: num('spend'), paid: num('paid'), due: num('due'),
      labels: [...document.querySelectorAll('.inex-sum__label')].map((l) => l.innerText.toLowerCase()),
      spendNote: document.querySelector('[data-sum="spend"] .inex-sum__note')?.innerText || ''
    };
  });
  let sm = await readSum();
  assert(['total inward', 'total expense', 'total spend', 'paid out', 'supplier payable'].every((l) => sm.labels.includes(l)), `five summary figures (${sm.labels.join(' / ')})`);
  assert(sm.inward === Math.round(apiAll.kpis.totalInward) && sm.expense === Math.round(apiAll.kpis.totalExpenses), `inward and expense totals match the API (${sm.inward} / ${sm.expense})`);
  assert(sm.spend === sm.inward + sm.expense, `total spend = inward + expense (${sm.spend})`);
  assert(sm.due === Math.round(apiAll.kpis.payable), `supplier payable matches the API (${sm.due})`);
  assert(sm.paid === sm.expense + (sm.inward - sm.due), `paid out = expenses + inward paid (${sm.paid})`);
  assert(sm.spendNote.includes('+'), `total-spend note shows the formula (${sm.spendNote})`);
  const sideTotals = await page.evaluate(() => ({
    l: (document.querySelector('[data-side="inward"] .inex-head__total')?.innerText || '').replace(/[^\d]/g, ''),
    r: (document.querySelector('[data-side="expense"] .inex-head__total')?.innerText || '').replace(/[^\d]/g, '')
  }));
  assert(Number(sideTotals.l) === sm.inward && Number(sideTotals.r) === sm.expense, 'each side header shows its own subtotal');

  console.log('\n=== 2b. THE HEADER DATE FILTER DRIVES BOTH SIDES AND THE CALCULATION ===');
  const setRange = async (mode, from, to) => { await page.evaluate((m, f, t) => window.TesslyDateRange.set({ mode: m, from: f, to: t }), mode, from, to); await sleep(500); };
  const sideCounts = () => page.evaluate(() => ({ L: document.querySelectorAll('[data-side="inward"] tr[data-row]').length, R: document.querySelectorAll('[data-side="expense"] tr[data-row]').length }));
  await setRange('month', '2026-10-01', '2026-10-31');
  let cnt = await sideCounts();
  sm = await readSum();
  assert(cnt.L === 1 && cnt.R === 2, `October: 1 inward on the left, 2 expenses on the right (${cnt.L}/${cnt.R})`);
  assert(sm.expense === 42800 + 185000 && sm.inward === Math.round(apiAll.kpis.totalInward) && sm.spend === sm.expense + sm.inward, `calculation follows October (expense ${sm.expense}, inward ${sm.inward})`);
  assert(/date range selected in the header/i.test(await page.evaluate(() => document.querySelector('[data-overall]').closest('.card')?.innerText || '')), 'summary says it is based on the header date range');
  await setRange('month', '2026-11-01', '2026-11-30');
  cnt = await sideCounts();
  sm = await readSum();
  assert(cnt.L === 0 && cnt.R === 3 && sm.inward === 0 && sm.expense === 12400 + 32000 + 18500 && sm.due === 0, 'November: only the three expenses (62,900); inward 0 and payable 0');
  assert(/No (matching )?stock inward/i.test(await page.evaluate(() => document.querySelector('[data-side="inward"]').innerText)), 'the empty left side shows its own empty message');
  await setRange('date', '2026-10-06', '2026-10-06');
  cnt = await sideCounts();
  assert(cnt.L === 1 && cnt.R === 0, 'a single day (6 Oct) shows just that day\'s inward');
  await setRange('all', '', '');
  sm = await readSum();
  cnt = await sideCounts();
  assert(cnt.L + cnt.R === apiAll.data.length && sm.spend === Math.round(apiAll.kpis.totalSpend), 'All Dates restores every record and the full calculation');

  // ------------------------------------------------------------------ 3
  console.log('\n=== 3. VIEW-ONLY: NO ADD / EDIT / DELETE ===');
  const controls = await page.evaluate(() => ({
    buttons: [...document.querySelectorAll('button')].map((b) => (b.innerText || '').trim()),
    titles: [...document.querySelectorAll('tr[data-row] button')].map((b) => b.getAttribute('title')),
    perRow: [...document.querySelectorAll('tr[data-row]')].map((r) => r.querySelectorAll('button').length),
    trash: document.querySelectorAll('tr[data-row] .action-btn--delete').length
  }));
  assert(!controls.buttons.some((b) => /Add expense|New stock inward|New |Add /i.test(b)), 'no "Add expense" / "New stock inward" buttons');
  assert(!controls.titles.some((t) => /Edit|Delete/i.test(t)), 'no edit or delete action on any row');
  assert(controls.trash === 0, 'no delete (trash) buttons');
  assert(controls.perRow.length > 0 && controls.perRow.every((n) => n === 1), 'every row has exactly one action');
  assert(controls.titles.every((t) => /^View /.test(t)), `the only action is View (${[...new Set(controls.titles)].join(', ')})`);
  const eyeIcon = await page.evaluate(() => !!document.querySelector('tr[data-row] button[title^="View"] svg'));
  assert(eyeIcon, 'View action shows an icon');
  assert((await page.evaluate(() => document.querySelectorAll('#acct-expense-form, #acct-inward-form').length)) === 0, 'no create/edit forms exist on the page');

  // ------------------------------------------------------------------ 4
  console.log('\n=== 4. VIEW AN EXPENSE ===');
  const exp = await page.evaluate(async () => (await (await fetch('/api/accounts/inward-expenses?type=Expense')).json()).data.find((r) => r.raw.notes));
  await clickRowAction(exp.reference, 'View expense');
  await sleep(800);
  const ev = await page.evaluate(() => ({
    open: !!document.querySelector('[data-view-drawer="Expense"]'),
    text: (document.querySelector('[data-view-drawer="Expense"]')?.innerText || '').replace(/\s+/g, ' '),
    drawerTitle: document.querySelector('.drawer__title, .modal__title, .drawer h2')?.innerText || '',
    inputs: document.querySelectorAll('[data-view-drawer] input, [data-view-drawer] select, [data-view-drawer] textarea').length,
    foot: [...document.querySelectorAll('.drawer__foot button, .modal__foot button')].map((b) => b.innerText.trim())
  }));
  assert(ev.open, 'expense detail drawer opens');
  assert(ev.text.includes(exp.reference) && ev.text.includes(exp.category) && ev.text.includes(exp.raw.notes), `drawer shows title, category and notes (${exp.reference})`);
  assert(/payment mode/i.test(ev.text) && /branch/i.test(ev.text) && /balance due/i.test(ev.text), 'drawer shows payment mode, branch and amounts');
  assert(ev.inputs === 0, 'drawer is read-only (no inputs)');
  assert(ev.foot.length === 1 && /Close/.test(ev.foot[0]), `drawer has only a Close button (${ev.foot.join(', ')})`);
  await page.evaluate(() => [...document.querySelectorAll('.drawer__foot button, .modal__foot button')].find((b) => /Close/.test(b.innerText))?.click());
  await sleep(600);
  assert(await page.evaluate(() => !document.querySelector('[data-view-drawer]')), 'Close dismisses the drawer');

  // ------------------------------------------------------------------ 5
  console.log('\n=== 5. VIEW A STOCK INWARD ===');
  const inw = await page.evaluate(async () => (await (await fetch('/api/accounts/inward-expenses?type=Inward')).json()).data[0]);
  await clickRowAction(inw.reference, 'View stock inward');
  await sleep(800);
  const iv = await page.evaluate(() => ({
    open: !!document.querySelector('[data-view-drawer="Inward"]'),
    text: (document.querySelector('[data-view-drawer="Inward"]')?.innerText || '').replace(/\s+/g, ' '),
    rows: document.querySelectorAll('[data-view-drawer="Inward"] table tbody tr').length,
    inputs: document.querySelectorAll('[data-view-drawer] input, [data-view-drawer] select, [data-view-drawer] textarea').length
  }));
  assert(iv.open, 'stock-inward detail drawer opens');
  assert(iv.text.includes(inw.reference) && iv.text.includes(inw.party), 'drawer shows inward number and supplier');
  assert(/procured items/i.test(iv.text) && /Whey Protein/.test(iv.text), 'drawer lists the procured items');
  assert(/payments/i.test(iv.text) && /Bank Transfer/.test(iv.text), 'drawer lists the payments');
  assert(iv.rows >= inw.raw.items.length + 1, `item and payment rows rendered (${iv.rows})`);
  assert(/balance due/i.test(iv.text) && iv.text.includes('30,000'), 'drawer shows totals incl. the 30,000 balance due');
  assert(iv.inputs === 0, 'drawer is read-only (no inputs)');
  await page.keyboard.press('Escape');
  await sleep(500);
  if (await page.evaluate(() => !!document.querySelector('[data-view-drawer]'))) {
    await page.evaluate(() => [...document.querySelectorAll('.drawer__foot button, .modal__foot button')].find((b) => /Close/.test(b.innerText))?.click());
    await sleep(500);
  }

  // ------------------------------------------------------------------ 6
  console.log('\n=== 6. DATE FILTER FROM THE HEADER CHIP ===');
  await page.click('.top__range-main');
  await sleep(400);
  await page.evaluate(() => document.querySelector('.drp__tab[data-tab="month"]').click());
  await sleep(250);
  for (let i = 0; i < 30; i++) {
    const y = Number((await page.evaluate(() => document.querySelector('.drp__navt b').innerText)).replace(/\D/g, ''));
    if (y === 2026) break;
    await page.evaluate((d) => document.querySelector(`[data-act="${d}"]`).click(), y > 2026 ? 'yprev' : 'ynext');
    await sleep(120);
  }
  await page.evaluate(() => { document.querySelector('[data-month="10"]').click(); });
  await sleep(150);
  await page.evaluate(() => { document.querySelector('[data-month="10"]').click(); });
  await sleep(150);
  await page.evaluate(() => document.querySelector('.drp__apply').click());
  await sleep(600);
  const r = await rows();
  assert(r.length === 3 && r.every((x) => x.kind === 'Expense'), `picking November in the header chip leaves only that month's expenses (${r.length})`);
  const novSum = await readSum();
  assert(novSum.inward === 0 && novSum.expense === 12400 + 32000 + 18500, `calculation follows the chip (expense ${novSum.expense})`);
  await page.click('.top__range-x');
  await sleep(500);
  assert((await rows()).length === apiAll.data.length, 'the ✕ on the chip restores every record');

  // ------------------------------------------------------------------ 7
  console.log('\n=== 7. RUNTIME HEALTH ===');
  assert(errors.length === 0, `zero uncaught page errors (${errors.length})`);
  errors.slice(0, 5).forEach((e) => console.error('   ->', e));

  console.log(`\nINWARD & EXPENSES FRONTEND TEST RESULT: ${passed} passed, ${failed} failed`);
  await browser.close();
  server.close();
  process.exit(failed > 0 ? 1 : 0);
});
