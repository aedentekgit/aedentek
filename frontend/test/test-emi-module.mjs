/**
 * ACCOUNTS → EMI CATEGORIES PAGE — FRONTEND END-TO-END TEST
 * ------------------------------------------------------------------
 * Headless Chrome against the real backend. Verifies:
 *   - Stock Inward is replaced by "EMI" in the sidebar and routes
 *   - the page renders (title, 4 equal KPI cards, seeded plans, derived columns)
 *   - the drawer auto-calculates monthly EMI / end date / end month live
 *   - create, edit (recalculation), mark-paid, filter, search, delete
 *   - the branch field is a master-fed <select>
 *
 * Run: node test/test-emi-module.mjs   (backend must be running on :5001)
 */
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8093;
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
  console.log(`[TEST-EMI] Listening on http://localhost:${PORT}`);
  let passed = 0;
  let failed = 0;
  const assert = (c, m) => {
    if (c) { console.log(`  ✓ [PASS] ${m}`); passed++; } else { console.error(`  ✗ [FAIL] ${m}`); failed++; }
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const NAME = `UI EMI ${Date.now()}`;

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const load = async (route) => {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.phead', { timeout: 15000 });
    await sleep(1300);
  };
  // Set a controlled React input (works for type=date / number as well)
  const setField = (selector, value) => page.evaluate((sel, val) => {
    const el = document.querySelector(sel);
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  }, selector, value);
  const rowOf = (name) => page.evaluate((n) => {
    const tr = [...document.querySelectorAll('tr[data-row]')].find((r) => r.innerText.includes(n));
    return tr ? tr.innerText.replace(/\s+/g, ' ') : null;
  }, name);
  const clickRowAction = (name, title) => page.evaluate((n, t) => {
    const tr = [...document.querySelectorAll('tr[data-row]')].find((r) => r.innerText.includes(n));
    tr.querySelector(`button[title="${t}"]`).click();
  }, name, title);
  const previewText = () => page.evaluate(() => (document.querySelector('[data-emi-preview]')?.innerText || '').replace(/\s+/g, ' '));
  const openNew = async () => {
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /New EMI plan/i.test(b.innerText))?.click());
    await sleep(800);
  };
  const submitDrawer = async () => {
    await page.evaluate(() => document.querySelector('button[form="acct-emi-form"]').click());
    await sleep(1000);
  };
  const fillForm = async (v) => {
    await setField('input[name="productName"]', v.productName);
    await setField('select[name="category"]', v.category);
    await setField('input[name="principal"]', String(v.principal));
    await setField('input[name="emiCount"]', String(v.emiCount));
    await setField('input[name="interestRate"]', String(v.interestRate));
    await setField('input[name="startDate"]', v.startDate);
    await sleep(300);
  };

  // ------------------------------------------------------------------ 1
  console.log('=== 1. STOCK INWARD REPLACED BY EMI CATEGORIES ===');
  await load('/accounts/emi');
  const info = await page.evaluate(() => ({
    title: document.querySelector('.phead .ttl, .phead h1')?.textContent?.trim(),
    kpiLabels: [...document.querySelectorAll('.kpis .kpi')].map((k) => k.innerText.split('\n')[0].trim()),
    kpiW: [...document.querySelectorAll('.kpis .kpi')].map((k) => Math.round(k.getBoundingClientRect().width)),
    headers: [...document.querySelectorAll('table thead th')].map((t) => t.innerText.trim().toLowerCase()),
    rows: document.querySelectorAll('tr[data-row]').length,
    links: [...document.querySelectorAll('a')].map((a) => a.textContent.trim() + '|' + (a.getAttribute('href') || ''))
  }));
  assert(info.title === 'EMI', `page title is "EMI" (${info.title})`);
  assert(info.links.some((l) => l === 'EMI|/accounts/emi'), 'sidebar has EMI → /accounts/emi');
  assert(!info.links.some((l) => /^Stock Inward\|/.test(l)), 'Stock Inward is gone from the sidebar');
  assert(info.kpiW.length === 4 && Math.max(...info.kpiW) - Math.min(...info.kpiW) <= 1, `4 KPI cards, equal width (${info.kpiW.join(', ')})`);
  assert(['EMI plans', 'Running EMIs', 'Monthly EMI outflow', 'Outstanding balance'].every((l) => info.kpiLabels.some((k) => k.includes(l))), `KPI labels (${info.kpiLabels.join(' / ')})`);
  assert(['product', 'category', 'amount', 'interest', 'monthly emi', 'start', 'end month', 'outstanding', 'status'].every((h) => info.headers.includes(h)), 'table shows the derived EMI columns');
  assert(info.rows >= 3, `seeded EMI plans listed (${info.rows})`);
  await load('/accounts/stock-inward');
  const fallback = await page.evaluate(() => document.querySelector('.phead .ttl, .phead h1')?.textContent?.trim());
  assert(fallback && fallback !== 'Stock Inward', `old /accounts/stock-inward route no longer shows Stock Inward (${fallback})`);

  // ------------------------------------------------------------------ 2
  console.log('\n=== 2. LIVE AUTO-CALCULATION IN THE FORM ===');
  await load('/accounts/emi');
  await openNew();
  assert(/Enter the amount/i.test(await page.evaluate(() => document.body.innerText)), 'empty form shows a hint instead of numbers');
  await fillForm({ productName: NAME, category: 'Gym Equipment', principal: 100000, emiCount: 12, interestRate: 12, startDate: '2026-01-15' });
  let pv = await previewText();
  assert(/Monthly EMI\s*₹\s*8,884\.88|Monthly EMI\s*₹\s*8,885/.test(pv), `monthly EMI shown (${pv.slice(0, 40)}…)`);
  assert(/Dec 2026 · 12 months/.test(pv), 'end month = Dec 2026 for 12 EMIs from 15 Jan 2026');
  assert(/Total interest/.test(pv) && /Total payable/.test(pv), 'total interest and total payable shown');
  await setField('input[name="emiCount"]', '24');
  await sleep(300);
  assert(/Dec 2027 · 24 months/.test(await previewText()), 'changing EMI count recalculates the end month live');
  await setField('input[name="startDate"]', '2026-03-31');
  await sleep(300);
  assert(/Feb 2028/.test(await previewText()), 'changing start date recalculates the end month live');
  await setField('input[name="interestRate"]', '0');
  await setField('input[name="principal"]', '24000');
  await sleep(300);
  assert(/Monthly EMI\s*₹\s*1,000/.test(await previewText()), '0% interest → 24000 / 24 = ₹ 1,000');
  const branchSel = await page.evaluate(() => {
    const f = [...document.querySelectorAll('.field')].find((x) => /^\s*Branch/.test(x.innerText));
    const s = f && f.querySelector('select');
    return { isSelect: !!s, opts: s ? [...s.options].map((o) => o.value) : [] };
  });
  assert(branchSel.isSelect && branchSel.opts.includes('Bandra') && branchSel.opts.includes('All Branches'), 'Branch is a master-fed dropdown in the EMI form');

  // ------------------------------------------------------------------ 3
  console.log('\n=== 3. CREATE ===');
  await setField('input[name="productName"]', '');
  await submitDrawer();
  assert(await page.evaluate(() => !!document.querySelector('#acct-emi-form')), 'missing product name keeps the drawer open (validation)');
  await fillForm({ productName: NAME, category: 'Gym Equipment', principal: 60000, emiCount: 6, interestRate: 12, startDate: '2026-12-01' });
  const expectedEmi = await page.evaluate(async () => (await (await fetch('/api/accounts/emi/calculate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productName: 'p', category: 'c', principal: 60000, emiCount: 6, interestRate: 12, startDate: '2026-12-01' })
  })).json()).data.emiAmount);
  const pvText = await previewText();
  const shown = Number((pvText.match(/Monthly EMI\s*₹\s*([\d,]+(?:\.\d+)?)/) || [])[1]?.replace(/,/g, ''));
  assert(Math.abs(shown - expectedEmi) < 0.5, `form preview matches the server calculation (${shown} vs ${expectedEmi})`);
  await submitDrawer();
  let row = await rowOf(NAME);
  assert(row && /May 2027/.test(row), `plan listed with end month May 2027: ${row}`);
  assert(row && /EMI-\d{6}/.test(row) && /0 \/ 6/.test(row) && /Active/.test(row), 'EMI number assigned, 0 / 6 paid, Active');
  assert(row && row.includes('12%') && row.includes('60,000'), 'amount and interest shown');

  // ------------------------------------------------------------------ 4
  console.log('\n=== 4. EDIT RECALCULATES ===');
  await clickRowAction(NAME, 'Edit EMI plan');
  await sleep(800);
  assert(await page.evaluate(() => document.body.innerText.includes('Edit EMI-')), 'edit drawer opens with the plan number');
  assert(await page.evaluate(() => document.querySelector('input[name="productName"]').value) === NAME, 'edit form is pre-filled');
  await setField('input[name="emiCount"]', '12');
  await sleep(300);
  assert(/Nov 2027 · 12 months/.test(await previewText()), 'preview updates to Nov 2027 for 12 EMIs');
  await submitDrawer();
  row = await rowOf(NAME);
  assert(row && /Nov 2027/.test(row) && /0 \/ 12/.test(row), `saved: end month Nov 2027, 0 / 12 (${row})`);

  // ------------------------------------------------------------------ 5
  console.log('\n=== 5. MARK EMI PAID ===');
  await clickRowAction(NAME, 'Mark next EMI paid');
  await sleep(900);
  row = await rowOf(NAME);
  assert(row && /1 \/ 12/.test(row), `paid counter advances (${row})`);

  // ------------------------------------------------------------------ 6
  console.log('\n=== 6. FILTERS + SEARCH ===');
  const search = '.hr-toolbar .toolbar__search input, .acct-toolbar .toolbar__search input, .toolbar .toolbar__search input';
  await page.type(search, 'zzzz-nomatch');
  await sleep(300);
  assert((await rowOf(NAME)) === null, 'search hides non-matching plans');
  await page.focus(search);
  for (let i = 0; i < 12; i++) await page.keyboard.press('Backspace');
  await sleep(300);
  assert((await rowOf(NAME)) !== null, 'clearing search restores the list');
  await page.select('select[aria-label="Filter by category"]', 'Appliances');
  await sleep(300);
  assert((await rowOf(NAME)) === null, 'category filter hides other categories');
  await page.select('select[aria-label="Filter by category"]', 'All');
  await page.select('select[aria-label="Filter by status"]', 'Completed');
  await sleep(300);
  assert((await rowOf(NAME)) === null, 'status filter (Completed) hides running plans');
  await page.select('select[aria-label="Filter by status"]', 'All');
  await sleep(300);

  // ------------------------------------------------------------------ 7
  console.log('\n=== 7. DELETE ===');
  await clickRowAction(NAME, 'Delete EMI plan');
  await sleep(500);
  const modal = await page.evaluate(() => document.querySelector('.modal__title')?.innerText || '');
  assert(/Delete this EMI plan/i.test(modal), `confirm dialog (${modal})`);
  await page.evaluate(() => [...document.querySelectorAll('.modal__foot button')].find((b) => /^Delete$/i.test(b.innerText.trim()))?.click());
  await sleep(900);
  assert((await rowOf(NAME)) === null, 'plan removed from the list');
  const gone = await page.evaluate(async (n) => !(await (await fetch('/api/accounts/emi')).json()).data.some((d) => d.productName === n), NAME);
  assert(gone, 'plan removed from the API');

  // ------------------------------------------------------------------ 8
  console.log('\n=== 8. OVERVIEW + RUNTIME HEALTH ===');
  await load('/accounts/dashboard');
  const dash = await page.evaluate(() => document.body.innerText);
  assert(/Running EMIs/.test(dash) && !/Stock inward batches/.test(dash), 'Overview shows "Running EMIs" instead of "Stock inward batches"');
  assert(errors.length === 0, `zero uncaught page errors (${errors.length})`);
  errors.slice(0, 5).forEach((e) => console.error('   ->', e));

  console.log(`\nEMI FRONTEND TEST RESULT: ${passed} passed, ${failed} failed`);
  await browser.close();
  server.close();
  process.exit(failed > 0 ? 1 : 0);
});
