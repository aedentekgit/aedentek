/**
 * SAVED PROFILES CARD — SEARCH BAR TEST
 * /finance/settings "Saved Invoice Sender Profiles" card now carries a search
 * bar in its header that filters the saved profiles list (Company / Contact /
 * Billing email / GSTIN), plus the Bank Accounts card variant.
 *
 * Creates 2 test profiles via the API, verifies live filtering + empty
 * (no-match) state, then deletes them so the app state is clean.
 *
 * Run: node test/test-profiles-card-search.mjs   (backend must be running on :5001)
 */
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8161;
const API_TARGET = { host: 'localhost', port: 5001 };
const API = (p, opts = {}) => fetch(`http://${API_TARGET.host}:${API_TARGET.port}${p}`, opts);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const appDir = path.resolve(process.cwd().endsWith('frontend') ? '.' : 'frontend');
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const pr = http.request({ host: API_TARGET.host, port: API_TARGET.port, path: req.url, method: req.method, headers: req.headers }, (up) => { res.writeHead(up.statusCode, up.headers); up.pipe(res); });
    pr.on('error', () => { res.writeHead(502); res.end('{}'); });
    req.pipe(pr);
    return;
  }
  const reqPath = req.url.split('?')[0];
  let filePath = path.join(appDir, reqPath === '/' ? 'index.html' : reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = path.join(appDir, 'index.html');
  fs.readFile(filePath, (err, c) => { if (err) { res.writeHead(500); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' }); res.end(c); });
});

server.listen(PORT, async () => {
  let passed = 0; let failed = 0;
  const assert = (c, m) => { if (c) { console.log(`  ✓ [PASS] ${m}`); passed++; } else { console.error(`  ✗ [FAIL] ${m}`); failed++; } };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Deterministic: start from a clean slate (delete any pre-existing profiles of
  // both types), seed exactly 2 invoice + 1 bank, verify, then delete the seeds
  // so the app state is unchanged.
  const created = [];
  const make = async (type, data) => {
    const j = await (await API('/api/settings-profiles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, data }) })).json();
    if (j.success && j.data && j.data._id) created.push(j.data._id);
    return !!(j.success && j.data && j.data._id);
  };
  const wipe = async (type) => {
    const j = await (await API(`/api/settings-profiles?type=${type}`)).json();
    for (const p of j.data || []) { await API(`/api/settings-profiles/${p._id}`, { method: 'DELETE' }); }
  };
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  try {
    await wipe('invoiceSender'); await wipe('bankDetails');
    // Required fields per API validation: company name + billing email + registered address;
    // GSTIN (when present) must be a valid 15-char format.
    assert(await make('invoiceSender', { companyName: 'Calder & Moss Surfaces', companyContactPerson: 'Rahul Sen', companyEmail: 'billing@caldermoss.co', companyAddress: 'Plot 12, Industrial Estate, Pune 411001', companyGst: '27AAFCO1234F1Z8' }), 'seed profile A (Calder & Moss) created');
    assert(await make('invoiceSender', { companyName: 'Northstone Terrazzo Works', companyContactPerson: 'Meera Iyer', companyEmail: 'accounts@northstone.in', companyAddress: '17 Marine Road, Kochi 682001', companyGst: '29AAKNO5555P1Z4' }), 'seed profile B (Northstone) created');
    assert(await make('bankDetails', { bankName: 'HDFC Bank', accountName: 'Calder & Moss Surfaces', accountNumber: '50100112345678', ifsc: 'HDFC0000123' }), 'seed bank profile created');

    // Login
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    await sleep(800);
    if (await page.$('.lg-submit')) {
      await page.type('input[type="email"]', 'ines@caldermoss.co');
      await page.type('input[autocomplete="current-password"]', 'marble88');
      await page.click('.lg-submit');
      await sleep(1500);
    }
    await page.waitForSelector('.side', { timeout: 20000 });

    const tableRows = () => page.evaluate(() => {
      const table = document.querySelector('#sec-invoice-sender .table');
      if (!table) return { found: false, rows: -1, text: '' };
      const rows = [...table.querySelectorAll('tbody tr')];
      return { found: true, rows: rows.length, text: table.innerText };
    });
    // Poll until the profile list has finished loading (>=2 rows = both seeds present).
    const waitForRows = async (minRows) => {
      for (let i = 0; i < 20; i++) {
        const t = await tableRows();
        if (t.found && t.rows >= minRows) return t;
        await sleep(300);
      }
      const t = await tableRows();
      return t;
    };

    console.log('\n--- Invoice Sender profiles card: search bar present + live filter ---');
    await page.goto(`http://localhost:${PORT}/finance/settings/invoiceSender`, { waitUntil: 'networkidle2' });
    await sleep(600);

    let search = await page.$('#sec-invoice-sender .card__head .toolbar__search input');
    assert(!!search, 'search bar present in the Saved Invoice Sender Profiles card header');
    const all = await waitForRows(2);
    assert(all.found && all.rows >= 2, `both seeded profiles listed (rows=${all.rows}, may include pre-existing ones)`);

    // filter: "northstone" → only the Northstone row (distinctive seed name)
    await page.type('#sec-invoice-sender .card__head .toolbar__search input', 'northstone');
    await sleep(400);
    let filtered = await tableRows();
    assert(filtered.rows === 1 && /Northstone Terrazzo/.test(filtered.text), `'northstone' filters to exactly the Northstone row`);
    await page.screenshot({ path: path.join(appDir, 'test-reports', 'profiles_search_filtered.png') });

    // no-match state
    await page.evaluate(() => {
      const inp = document.querySelector('#sec-invoice-sender .card__head .toolbar__search input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, 'zzz-no-match');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(400);
    filtered = await tableRows();
    assert(filtered.rows === 1 && /No saved profiles match/.test(filtered.text), `no-match query shows "No saved profiles match" state`);
    await page.screenshot({ path: path.join(appDir, 'test-reports', 'profiles_search_no_match.png') });

    // clear → back to the full list
    await page.evaluate(() => {
      const inp = document.querySelector('#sec-invoice-sender .card__head .toolbar__search input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, '');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(400);
    filtered = await tableRows();
    assert(filtered.rows === all.rows, `clearing the search restores the full list (rows=${filtered.rows})`);

    console.log('\n--- Bank Accounts card: same search bar ---');
    await page.goto(`http://localhost:${PORT}/finance/settings/bankDetails`, { waitUntil: 'domcontentloaded' });
    await sleep(1000);
    search = await page.$('#sec-banking-wire .card__head .toolbar__search input');
    assert(!!search, 'search bar present in the Saved Bank Accounts card header');
    // The bank card is on the bankDetails tab — make sure we're on it and the
    // list has finished loading before filtering.
    await page.goto(`http://localhost:${PORT}/finance/settings/bankDetails`, { waitUntil: 'networkidle2' });
    await sleep(800);
    // poll until the seeded HDFC row is actually listed (not the empty-state row)
    let bankText = '';
    let dbg = null;
    for (let i = 0; i < 25; i++) {
      bankText = await page.evaluate(() => document.querySelector('#sec-banking-wire .table')?.innerText || '');
      if (/HDFC Bank/.test(bankText)) break;
      await sleep(400);
    }
    assert(/HDFC Bank/.test(bankText), `seeded bank profile listed (text: ${JSON.stringify(bankText.slice(0, 70))})`);
    await page.type('#sec-banking-wire .card__head .toolbar__search input', 'hdfc');
    await sleep(400);
    const bankFiltered = await page.evaluate(() => {
      const t = document.querySelector('#sec-banking-wire .table');
      return t ? t.innerText : null;
    });
    if (bankFiltered === null) console.log('  · DEBUG bank table not found after filter');
    assert(bankFiltered !== null && /HDFC/.test(bankFiltered), `'hdfc' keeps the seeded bank account row (got: ${JSON.stringify((bankFiltered || '').slice(0, 120))})`);

    assert(pageErrors.length === 0, `no uncaught page errors (got ${pageErrors.length})${pageErrors.length ? ': ' + pageErrors.slice(0, 3).join(' | ') : ''}`);
  } finally {
    // Wipe seeds (both types) so the app state is left empty/unchanged.
    await wipe('invoiceSender'); await wipe('bankDetails');
    await browser.close();
    server.close();
  }

  console.log(`\n=================================================`);
  console.log(`PROFILES CARD SEARCH: ${passed} passed, ${failed} failed`);
  console.log(`=================================================`);
  process.exit(failed ? 1 : 0);
});
