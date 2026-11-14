/**
 * EMI — PROCESSING CHARGES + TRANSACTION FEE: FULL CRUD THROUGH THE UI
 * ------------------------------------------------------------------
 * Headless Chrome against the real backend:
 *   CREATE (validation, live preview, saved row) · READ (table columns, KPI, API parity)
 *   UPDATE (pre-filled form, recalculation) · MARK PAID · DELETE
 *
 * Run: node test/test-emi-fees-ui.mjs   (backend must be running on :5001)
 */
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8097;
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
  console.log(`[TEST-EMI-FEES-UI] Listening on http://localhost:${PORT}`);
  let passed = 0;
  let failed = 0;
  const assert = (c, m) => {
    if (c) { console.log(`  ✓ [PASS] ${m}`); passed++; } else { console.error(`  ✗ [FAIL] ${m}`); failed++; }
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const NAME = `UI Fee Plan ${Date.now()}`;

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1900, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const load = async () => {
    await page.goto(`http://localhost:${PORT}/accounts/emi`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.phead', { timeout: 15000 });
    await sleep(1400);
  };
  const setField = (selector, value) => page.evaluate((sel, val) => {
    const el = document.querySelector(sel);
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  }, selector, value);
  const rowCells = (name) => page.evaluate((n) => {
    const tr = [...document.querySelectorAll('tr[data-row]')].find((r) => r.innerText.includes(n));
    if (!tr) return null;
    const heads = [...document.querySelectorAll('table thead th')].map((t) => t.innerText.trim().toLowerCase());
    const cells = [...tr.children].map((c) => c.innerText.replace(/\s+/g, ' ').trim());
    return Object.fromEntries(heads.map((h, i) => [h, cells[i]]));
  }, name);
  const clickRowAction = (name, title) => page.evaluate((n, t) => {
    [...document.querySelectorAll('tr[data-row]')].find((r) => r.innerText.includes(n)).querySelector(`button[title="${t}"]`).click();
  }, name, title);
  const preview = () => page.evaluate(() => (document.querySelector('[data-emi-preview]')?.innerText || '').replace(/\s+/g, ' '));
  const submit = async () => {
    await page.evaluate(() => document.querySelector('button[form="acct-emi-form"]').click());
    await sleep(1100);
  };
  const money = (text, label) => {
    const m = new RegExp(`${label}[^₹]*₹\\s*([\\d,]+(?:\\.\\d+)?)`).exec(text);
    return m ? Number(m[1].replace(/,/g, '')) : NaN;
  };
  const inr = (n) => Number(n).toLocaleString('en-IN');
  const api = (u) => page.evaluate(async (url) => (await (await fetch(url)).json()), u);

  // ------------------------------------------------------------------ READ (before)
  console.log('=== 1. READ: COLUMNS, SEEDED DATA, KPI ===');
  await load();
  const heads = await page.evaluate(() => [...document.querySelectorAll('table thead th')].map((t) => t.innerText.trim().toLowerCase()));
  assert(heads.includes('processing') && heads.includes('txn fee'), `table has "Processing" and "Txn fee" columns (${heads.join(' | ')})`);
  assert(heads.indexOf('processing') > heads.indexOf('interest') && heads.indexOf('txn fee') === heads.indexOf('processing') + 1, 'the two columns sit together right after Interest');
  const overflow = await page.evaluate(() => { const w = document.querySelector('.table-wrap'); return w.scrollWidth - w.clientWidth; });
  assert(overflow <= 2, `the wider table still fits the card with no sideways scroll (${overflow}px)`);
  const before = await api('/api/accounts/emi');
  const seededRows = await page.evaluate(() => document.querySelectorAll('tr[data-row]').length);
  assert(seededRows === before.data.length, `every plan is listed (${seededRows})`);
  const kpiOutflow0 = await page.evaluate(() => [...document.querySelectorAll('.kpis .kpi')].find((k) => /outflow/i.test(k.innerText)).innerText.replace(/[^\d.]/g, ''));
  assert(Math.abs(Number(kpiOutflow0) - before.kpis.monthlyOutflow) < 0.02, `Monthly EMI outflow KPI matches the API (${kpiOutflow0})`);

  // ------------------------------------------------------------------ CREATE
  console.log('\n=== 2. CREATE: FORM, LIVE PREVIEW, VALIDATION ===');
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /New EMI plan/i.test(b.innerText))?.click());
  await sleep(900);
  const labels = await page.evaluate(() => [...document.querySelectorAll('#acct-emi-form .field')].map((f) => f.innerText.split('\n')[0].trim()));
  assert(labels.some((l) => /Processing charges/.test(l)) && labels.some((l) => /Transaction fee/.test(l)), `form has the two new fields (${labels.filter((l) => /Processing|Transaction/.test(l)).join(' / ')})`);
  const order = await page.evaluate(() => [...document.querySelectorAll('#acct-emi-form input, #acct-emi-form select')].map((e) => e.name).filter(Boolean));
  assert(order.indexOf('processingCharges') > order.indexOf('paidCount') && order.indexOf('transactionFee') === order.indexOf('processingCharges') + 1, 'the new fields follow "EMIs already paid"');
  await setField('input[name="productName"]', NAME);
  await setField('select[name="category"]', 'Gym Equipment');
  await setField('input[name="principal"]', '60000');
  await setField('input[name="emiCount"]', '6');
  await setField('input[name="interestRate"]', '12');
  await setField('input[name="startDate"]', '2026-12-01');
  await sleep(300);
  let pv = await preview();
  const emiAmt = money(pv, 'Monthly EMI');
  assert(/Processing charges\s*₹\s*0/.test(pv) && /Transaction fees \(6 × ₹ 0\)\s*₹\s*0/.test(pv), 'with the fields empty the preview shows ₹ 0 charges');
  assert(Math.abs(money(pv, 'Total cost incl\\. charges') - money(pv, 'Total payable \\(all EMIs\\)')) < 0.02, 'with no fees: total cost = total payable');
  await setField('input[name="processingCharges"]', '1200');
  await setField('input[name="transactionFee"]', '50');
  await sleep(300);
  pv = await preview();
  assert(money(pv, 'Processing charges') === 1200, 'preview: Processing charges ₹ 1,200');
  assert(/Transaction fees \(6 × ₹ 50\)\s*₹\s*300/.test(pv), 'preview: Transaction fees (6 × ₹ 50) = ₹ 300');
  assert(Math.abs(money(pv, 'Monthly outflow') - (emiAmt + 50)) < 0.02, `preview: monthly outflow = EMI + fee (${money(pv, 'Monthly outflow')})`);
  const payable = money(pv, 'Total payable \\(all EMIs\\)');
  assert(Math.abs(money(pv, 'Total cost incl\\. charges') - (payable + 1500)) < 0.02, `preview: total cost = payable + 1,200 + 300 (${money(pv, 'Total cost incl\\. charges')})`);
  assert(Math.abs(money(pv, 'Monthly EMI') - emiAmt) < 0.001, 'the fees do not change the monthly EMI');
  await setField('input[name="emiCount"]', '12');
  await sleep(300);
  pv = await preview();
  assert(/Transaction fees \(12 × ₹ 50\)\s*₹\s*600/.test(pv), 'changing the EMI count re-prices the transaction fees live (12 × ₹ 50 = ₹ 600)');
  await setField('input[name="emiCount"]', '6');
  await setField('input[name="processingCharges"]', '-5');
  await setField('input[name="transactionFee"]', '-1');
  const typed = await page.evaluate(() => ({ p: document.querySelector('input[name="processingCharges"]').value, t: document.querySelector('input[name="transactionFee"]').value }));
  assert(typed.p === '5' && typed.t === '1', `a minus sign cannot be entered in either fee field — the page's numeric guard strips it (${typed.p} / ${typed.t})`);
  await setField('input[name="processingCharges"]', '');
  await setField('input[name="transactionFee"]', '');
  await sleep(300);
  pv = await preview();
  assert(money(pv, 'Processing charges') === 0 && /Transaction fees \(6 × ₹ 0\)\s*₹\s*0/.test(pv), 'clearing both fields falls back to ₹ 0');
  assert((await rowCells(NAME)) === null, 'nothing has been saved so far');
  await setField('input[name="processingCharges"]', '1200');
  await setField('input[name="transactionFee"]', '50');
  await submit();
  let row = await rowCells(NAME);
  assert(row !== null, 'valid form saves and the plan appears in the table');
  assert(row && row.processing === '₹ 1,200' && row['txn fee'] === '₹ 50', `row shows Processing ₹ 1,200 and Txn fee ₹ 50 (${row && row.processing} / ${row && row['txn fee']})`);

  // ------------------------------------------------------------------ READ (after)
  console.log('\n=== 3. READ: UI = API ===');
  const created = (await api(`/api/accounts/emi?q=${encodeURIComponent(NAME)}`)).data[0];
  assert(created.processingCharges === 1200 && created.transactionFee === 50 && created.totalCharges === 1500, 'API stored both fees (charges 1,500)');
  assert(row.outstanding === `₹ ${inr(created.outstandingAmount)}`, `Outstanding column includes the fees (${row.outstanding} = EMIs + 6 × ₹ 50)`);
  assert(Math.abs(created.outstandingAmount - (created.totalPayable + 300)) < 0.02, 'outstanding = total payable + 300 transaction fees');
  const after = await api('/api/accounts/emi');
  assert(Math.abs(after.kpis.monthlyOutflow - before.kpis.monthlyOutflow - (created.emiAmount + 50)) < 0.02, 'monthly outflow KPI rose by EMI + fee');
  assert(Math.abs(after.kpis.totalCharges - before.kpis.totalCharges - 1500) < 0.02, 'total charges KPI rose by 1,500');
  const kpiNow = await page.evaluate(() => [...document.querySelectorAll('.kpis .kpi')].find((k) => /outflow/i.test(k.innerText)).innerText.replace(/[^\d.]/g, ''));
  assert(Math.abs(Number(kpiNow) - after.kpis.monthlyOutflow) < 0.02, `the KPI card on screen shows the new outflow (${kpiNow})`);

  // ------------------------------------------------------------------ UPDATE
  console.log('\n=== 4. UPDATE ===');
  await clickRowAction(NAME, 'Edit EMI plan');
  await sleep(900);
  const filled = await page.evaluate(() => ({ p: document.querySelector('input[name="processingCharges"]').value, t: document.querySelector('input[name="transactionFee"]').value }));
  assert(filled.p === '1200' && filled.t === '50', `edit form is pre-filled with the saved fees (${filled.p} / ${filled.t})`);
  assert(money(await preview(), 'Total cost incl\\. charges') > 0, 'edit drawer shows the preview straight away');
  await setField('input[name="processingCharges"]', '0');
  await setField('input[name="transactionFee"]', '75');
  await sleep(300);
  pv = await preview();
  assert(money(pv, 'Processing charges') === 0 && /6 × ₹ 75\)\s*₹\s*450/.test(pv), 'preview follows the edit (processing 0, fees 6 × ₹ 75 = ₹ 450)');
  await submit();
  row = await rowCells(NAME);
  assert(row && row.processing === '₹ 0' && row['txn fee'] === '₹ 75', `table updated (${row && row.processing} / ${row && row['txn fee']})`);
  const updated = (await api(`/api/accounts/emi?q=${encodeURIComponent(NAME)}`)).data[0];
  assert(updated.processingCharges === 0 && updated.transactionFee === 75 && updated.totalCharges === 450 && updated.emiAmount === created.emiAmount, 'API: fees changed, charges 450, EMI unchanged');
  await clickRowAction(NAME, 'Edit EMI plan');
  await sleep(800);
  await setField('input[name="notes"]', 'edited note only');
  await submit();
  const kept = (await api(`/api/accounts/emi?q=${encodeURIComponent(NAME)}`)).data[0];
  assert(kept.transactionFee === 75 && kept.notes === 'edited note only', 'editing another field keeps the fees');

  // ------------------------------------------------------------------ PAY
  console.log('\n=== 5. MARK PAID (fees are part of what is left to pay) ===');
  const outBefore = kept.outstandingAmount;
  await clickRowAction(NAME, 'Mark next EMI paid');
  await sleep(1000);
  const paid = (await api(`/api/accounts/emi?q=${encodeURIComponent(NAME)}`)).data[0];
  assert(paid.paidCount === 1 && Math.abs(outBefore - paid.outstandingAmount - (kept.emiAmount + 75)) < 0.02, `paying one EMI lowers outstanding by EMI + fee (${outBefore} → ${paid.outstandingAmount})`);
  row = await rowCells(NAME);
  assert(row && /1 \/ 6/.test(row.emis), 'counter shows 1 / 6');

  // ------------------------------------------------------------------ DELETE
  console.log('\n=== 6. DELETE ===');
  await clickRowAction(NAME, 'Delete EMI plan');
  await sleep(500);
  assert(/Delete this EMI plan/i.test(await page.evaluate(() => document.querySelector('.modal__title')?.innerText || '')), 'delete asks for confirmation');
  await page.evaluate(() => [...document.querySelectorAll('.modal__foot button')].find((b) => /^Delete$/i.test(b.innerText.trim()))?.click());
  await sleep(1000);
  assert((await rowCells(NAME)) === null, 'plan removed from the table');
  const end = await api('/api/accounts/emi');
  assert(end.data.length === before.data.length && Math.abs(end.kpis.totalCharges - before.kpis.totalCharges) < 0.02, 'list and totals are back to the starting values');

  assert(errors.length === 0, `zero uncaught page errors (${errors.length})`);
  errors.slice(0, 5).forEach((e) => console.error('   ->', e));

  console.log(`\nEMI FEES UI TEST RESULT: ${passed} passed, ${failed} failed`);
  await browser.close();
  server.close();
  process.exit(failed > 0 ? 1 : 0);
});
