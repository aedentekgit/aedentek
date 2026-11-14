/**
 * HR BRANCHES PAGE — FRONTEND CRUD + THEMED DROPDOWN TEST
 * ------------------------------------------------------------------
 * Verifies, in a real headless browser against the real backend:
 *   - /hr/branches renders (title, 3 equal-width KPI cards, seeded rows, sidebar link)
 *   - Create / Edit / Search / Delete through the UI
 *   - every branch field in the app is a <select> fed by the branch master
 *     (Leave Types, Employee drawer, Expense drawer) and opens the
 *     theme-based dropdown
 *   - the delete guard for branches that still have employees
 *
 * Run: node test/test-branches-module.mjs   (backend must be running on :5001)
 */
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8092;
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
  console.log(`[TEST-BRANCHES] Listening on http://localhost:${PORT}`);
  let passed = 0;
  let failed = 0;
  const assert = (c, m) => {
    if (c) { console.log(`  ✓ [PASS] ${m}`); passed++; } else { console.error(`  ✗ [FAIL] ${m}`); failed++; }
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const NAME = `UI Branch ${Date.now()}`;

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const load = async (route) => {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.phead', { timeout: 15000 });
    await sleep(1200);
  };
  const rowOf = (name) => page.evaluate((n) => {
    const tr = [...document.querySelectorAll('tr[data-row]')].find((r) => r.innerText.includes(n));
    return tr ? tr.innerText.replace(/\s+/g, ' ') : null;
  }, name);
  const clickRowAction = (name, title) => page.evaluate((n, t) => {
    const tr = [...document.querySelectorAll('tr[data-row]')].find((r) => r.innerText.includes(n));
    tr.querySelector(`button[title="${t}"]`).click();
  }, name, title);
  const confirmDelete = () => page.evaluate(() => {
    [...document.querySelectorAll('.modal__foot button')].find((b) => /^Delete$/i.test(b.innerText.trim()))?.click();
  });

  // ---------------------------------------------------------------- 1
  console.log('=== 1. BRANCHES PAGE RENDERS ===');
  await load('/hr/branches');
  const info = await page.evaluate(() => ({
    title: document.querySelector('.phead .ttl, .phead h1')?.textContent?.trim(),
    kpis: [...document.querySelectorAll('.kpis .kpi')].map((k) => Math.round(k.getBoundingClientRect().width)),
    rows: document.querySelectorAll('tr[data-row]').length,
    text: document.body.innerText,
    side: [...document.querySelectorAll('a')].some((a) => a.textContent.trim() === 'Branches' && /\/hr\/branches/.test(a.getAttribute('href') || ''))
  }));
  assert(info.title === 'Branches', `page title is "Branches" (${info.title})`);
  assert(info.kpis.length === 3, `3 KPI cards render (${info.kpis.length})`);
  assert(Math.max(...info.kpis) - Math.min(...info.kpis) <= 1, `KPI cards are equal width (${info.kpis.join(', ')})`);
  assert(info.rows >= 2 && info.text.includes('Bandra') && info.text.includes('Andheri'), `seeded branches listed (${info.rows} rows)`);
  assert(info.side, 'sidebar exposes Branches under Human Resources');

  // ---------------------------------------------------------------- 2
  console.log('\n=== 2. CREATE ===');
  await page.click('form button[type="submit"]');
  await sleep(500);
  assert((await rowOf(NAME)) === null, 'submitting an empty form creates nothing (name required)');
  const inputs = await page.$$('form .form-grid input.input');
  await inputs[0].type(NAME);
  await inputs[1].type('ui1');
  await inputs[2].type('Thane');
  await page.click('form button[type="submit"]');
  await sleep(900);
  let row = await rowOf(NAME);
  assert(row && row.includes('UI1') && row.includes('Thane'), `new branch appears in the list: ${row}`);
  assert(row && row.includes('Active'), 'new branch defaults to Active');

  // ---------------------------------------------------------------- 3
  console.log('\n=== 3. EDIT ===');
  await clickRowAction(NAME, 'Edit');
  await sleep(400);
  assert(await page.evaluate(() => document.body.innerText.includes('Edit branch')), 'form switches to "Edit branch"');
  const cityInput = (await page.$$('form .form-grid input.input'))[2];
  await cityInput.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await cityInput.type('Navi Mumbai');
  await page.click('form button[type="submit"]');
  await sleep(900);
  row = await rowOf(NAME);
  assert(row && row.includes('Navi Mumbai'), 'edited city is saved and shown');

  // ---------------------------------------------------------------- 4
  console.log('\n=== 4. SEARCH ===');
  const searchSel = '.hr-split .hr-toolbar .toolbar__search input';
  await page.type(searchSel, 'zzzz-nomatch');
  await sleep(300);
  assert((await rowOf(NAME)) === null, 'search hides non-matching rows');
  await page.focus(searchSel);
  for (let i = 0; i < 'zzzz-nomatch'.length; i++) await page.keyboard.press('Backspace');
  await sleep(300);
  assert((await rowOf(NAME)) !== null, 'clearing search restores rows');

  // ---------------------------------------------------------------- 5
  console.log('\n=== 5. THEMED BRANCH DROPDOWNS (new branch is selectable everywhere) ===');
  const themedCheck = async (label, fn) => {
    const res = await page.evaluate(fn, NAME);
    assert(res && res.isSelect, `${label}: branch is a <select>`);
    assert(res && res.hasNew && res.hasBandra, `${label}: options come from the branch master (incl. new branch)`);
  };

  await load('/hr/leave-types');
  await themedCheck('Leave Types form', (n) => {
    const f = [...document.querySelectorAll('.field')].find((x) => /Branch scope/.test(x.innerText));
    const s = f && f.querySelector('select');
    const o = s ? [...s.options].map((x) => x.value) : [];
    return { isSelect: !!s, hasNew: o.includes(n), hasBandra: o.includes('Bandra') && o.includes('All Branches') };
  });
  const sel = await page.evaluateHandle(() => {
    const f = [...document.querySelectorAll('.field')].find((x) => /Branch scope/.test(x.innerText));
    return f.querySelector('select');
  });
  await sel.asElement().click();
  await sleep(400);
  const themed = await page.evaluate(() => ({
    panel: !!document.querySelector('.theme-dropdown'),
    items: document.querySelectorAll('.theme-dropdown-item').length
  }));
  assert(themed.panel && themed.items >= 3, `clicking opens the theme-based dropdown (${themed.items} items)`);
  await page.keyboard.press('Escape');

  await load('/hr/staff');
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /Add employee|Add staff|New employee|Add/i.test(b.innerText))?.click();
  });
  await sleep(900);
  await themedCheck('Employee drawer', (n) => {
    const f = [...document.querySelectorAll('.field')].find((x) => /^\s*Branch/.test(x.innerText));
    const s = f && f.querySelector('select');
    const o = s ? [...s.options].map((x) => x.value) : [];
    return { isSelect: !!s, hasNew: o.includes(n), hasBandra: o.includes('Bandra') };
  });

  await load('/accounts/expenses');
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /Add expense/i.test(b.innerText))?.click();
  });
  await sleep(900);
  await themedCheck('Expense drawer', (n) => {
    const f = [...document.querySelectorAll('.field, label')].find((x) => /^\s*Branch/.test(x.innerText));
    const s = f && f.querySelector('select');
    const o = s ? [...s.options].map((x) => x.value) : [];
    return { isSelect: !!s, hasNew: o.includes(n), hasBandra: o.includes('Bandra') && o.includes('All Branches') };
  });

  // ---------------------------------------------------------------- 6
  console.log('\n=== 6. DELETE ===');
  await load('/hr/branches');
  await clickRowAction(NAME, 'Delete');
  await sleep(500);
  const modal = await page.evaluate(() => document.querySelector('.modal__title')?.innerText || '');
  assert(/Delete this branch/i.test(modal), `confirm dialog appears (${modal})`);
  await confirmDelete();
  await sleep(900);
  assert((await rowOf(NAME)) === null, 'branch removed from the list after confirming');
  const stillInApi = await page.evaluate(
    async (n) => (await (await fetch('/api/hr/branches')).json()).data.some((b) => b.name === n), NAME);
  assert(stillInApi === false, 'branch removed from the API');

  // ---------------------------------------------------------------- 7
  console.log('\n=== 7. IN-USE DELETE GUARD ===');
  await clickRowAction('Bandra', 'Delete');
  await sleep(500);
  await confirmDelete();
  await sleep(900);
  assert((await rowOf('Bandra')) !== null, 'a branch with employees cannot be deleted from the UI');

  // ---------------------------------------------------------------- 8
  console.log('\n=== 8. RUNTIME HEALTH ===');
  assert(errors.length === 0, `zero uncaught page errors (${errors.length})`);
  errors.slice(0, 5).forEach((e) => console.error('   ->', e));

  console.log(`\nBRANCHES FRONTEND TEST RESULT: ${passed} passed, ${failed} failed`);
  await browser.close();
  server.close();
  process.exit(failed > 0 ? 1 : 0);
});
