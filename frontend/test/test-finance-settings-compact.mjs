/**
 * FINANCE SETTINGS 3-SECTION COMPACT LAYOUT TEST
 * /finance/settings — Invoice Sender / Banking & Wire / GST & HSN Slabs:
 *  1. All 3 section cards start COLLAPSED by default (form body hidden, chevron closed)
 *  2. Header row + footer (form-save-row) are compact; chevron icon is reduced
 *  3. Clicking the chevron opens the section (full form visible) and collapses again
 *
 * Run: node test/test-finance-settings-compact.mjs   (backend must be running on :5001)
 */
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8151;
const API_TARGET = { host: 'localhost', port: 5001 };
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

// The 3 sections are TABS (routes /finance/settings/<tab>); only the active
// tab's section is displayed. Tab ids: invoiceSender / bankDetails / gstSettings
const SECTIONS = [
  { id: 'sec-invoice-sender', name: 'Invoice Sender', tab: '/finance/settings/invoiceSender' },
  { id: 'sec-banking-wire', name: 'Banking & Wire', tab: '/finance/settings/bankDetails' },
  { id: 'sec-gst-slabs', name: 'GST & HSN Slabs', tab: '/finance/settings/gstSettings' },
];

server.listen(PORT, async () => {
  let passed = 0; let failed = 0;
  const assert = (c, m) => { if (c) { console.log(`  ✓ [PASS] ${m}`); passed++; } else { console.error(`  ✗ [FAIL] ${m}`); failed++; } };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  const sectionState = async (id) => page.evaluate((id) => {
    const sec = document.getElementById(id);
    if (!sec) return null;
    const card = sec.querySelector('.card');
    const head = card?.querySelector(':scope > .card__head') || card?.querySelector('.card__head');
    const hr = head ? head.getBoundingClientRect() : null;
    const chevron = sec.querySelector('.btn.tl-chev');
    const cr = chevron ? chevron.getBoundingClientRect() : null;
    const ico = chevron ? chevron.querySelector('.ico') : null;
    const formSave = sec.querySelector('.form-save-row');
    // visible form fields (label.field inputs that are on screen)
    const inputs = [...sec.querySelectorAll('input, select')].filter((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && el.type !== 'hidden';
    });
    const saveBtn = formSave ? [...formSave.querySelectorAll('button')].filter((b) => b.getBoundingClientRect().height > 0) : [];
    return {
      found: !!sec,
      headH: hr ? Math.round(hr.height) : null,
      formOpen: inputs.length > 0,
      fieldCount: inputs.length,
      chevronW: cr ? Math.round(cr.width) : null,
      chevronH: cr ? Math.round(cr.height) : null,
      icoW: ico ? getComputedStyle(ico).width : null,
      saveBtnVisible: saveBtn.length > 0,
      aria: chevron ? chevron.getAttribute('aria-expanded') : null
    };
  }, id);

  try {
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

    // --- DEFAULT STATE: all 3 sections collapsed + compact metrics ---
    console.log('\n--- Default: all 3 sections collapsed & compact (per tab) ---');
    await page.goto(`http://localhost:${PORT}/finance/settings`, { waitUntil: 'networkidle2' });
    await sleep(1200);

    for (const s of SECTIONS) {
      await page.goto(`http://localhost:${PORT}${s.tab}`, { waitUntil: 'domcontentloaded' });
      await sleep(800);
      const st = await sectionState(s.id);
      assert(st && st.found, `${s.name}: section card found`);
      assert(st.aria === 'false', `${s.name}: chevron reports aria-expanded=false (collapsed)`);
      assert(st.formOpen === false, `${s.name}: form body hidden by default (fields visible=${st.fieldCount})`);
      assert(st.saveBtnVisible === false, `${s.name}: footer save row hidden while collapsed`);
      assert(st.chevronW === 28 && st.chevronH === 28, `${s.name}: chevron button reduced to 28x28px (was 34x34)`);
      assert(st.icoW === '14px', `${s.name}: chevron icon reduced to 14px (was 16px)`);
      assert(st.headH !== null && st.headH >= 56 && st.headH <= 66, `${s.name}: compact header row height ${st.headH}px (was ~74px)`);
    }
    await page.screenshot({ path: path.join(appDir, 'test-reports', 'fin_settings_collapsed_default.png'), fullPage: true });

    // --- OPEN: click chevron opens the form; footer row compact ---
    console.log('\n--- Toggle: open/close via chevron ---');
    await page.goto(`http://localhost:${PORT}/finance/settings/invoiceSender`, { waitUntil: 'domcontentloaded' });
    await sleep(800);
    const before = await sectionState('sec-invoice-sender');
    assert(before.formOpen === false, 'Invoice Sender starts closed');
    await page.click('#sec-invoice-sender .btn.tl-chev');
    await sleep(600);
    const open = await sectionState('sec-invoice-sender');
    assert(open.aria === 'true', 'chevron reports aria-expanded=true after click');
    assert(open.formOpen === true && open.fieldCount > 5, `full form visible when opened (fields=${open.fieldCount})`);
    assert(open.saveBtnVisible === true, 'footer Save profile row visible when open');
    const fsCompact = await page.evaluate(() => {
      const row = document.querySelector('#sec-invoice-sender .form-save-row');
      const card = row.closest('.card');
      const btn = row ? [...row.querySelectorAll('button')].find((b) => b.getBoundingClientRect().height > 0) : null;
      return {
        rowPad: row ? getComputedStyle(row).paddingTop : null,
        rowMarginBottom: row ? getComputedStyle(row).marginBottom : null,
        cardBottomPad: card ? getComputedStyle(card).paddingBottom : null,
        btnH: btn ? getComputedStyle(btn).height : null,
        btnFs: btn ? getComputedStyle(btn).fontSize : null
      };
    });
    assert(fsCompact.rowPad === '10px' && fsCompact.btnH === '34px' && fsCompact.btnFs === '12.5px', `compact footer row (padding-top 10px, 34px buttons, 12.5px text)`);
    assert(fsCompact.rowMarginBottom === '0px' && fsCompact.cardBottomPad === '14px', `reduced footer bottom space (row margin-bottom 0, card padding-bottom 14px, was ~24px+24px)`);
    await page.screenshot({ path: path.join(appDir, 'test-reports', 'fin_settings_section_open.png'), fullPage: true });

    // collapse again
    await page.click('#sec-invoice-sender .btn.tl-chev');
    await sleep(500);
    const after = await sectionState('sec-invoice-sender');
    assert(after.formOpen === false && after.aria === 'false', 'section collapses again on second click');

    // other two sections stay independently collapsible
    await page.click('#sec-invoice-sender .btn.tl-chev');
    await sleep(400);
    // Independently: navigate to the GST tab — its section also starts collapsed,
    // and opens on its own chevron click (click the card, no extra navigation after).
    await page.goto(`http://localhost:${PORT}/finance/settings/gstSettings`, { waitUntil: 'domcontentloaded' });
    await sleep(800);
    const gstBefore = await sectionState('sec-gst-slabs');
    assert(gstBefore.formOpen === false, 'GST & HSN Slabs section starts collapsed on its tab');
    await page.click('#sec-gst-slabs .btn.tl-chev');
    await sleep(500);
    const gst = await sectionState('sec-gst-slabs');
    assert(gst.formOpen === true && gst.aria === 'true', `GST & HSN Slabs section opens independently (fields=${gst.fieldCount})`);

    assert(pageErrors.length === 0, `no uncaught page errors (got ${pageErrors.length})${pageErrors.length ? ': ' + pageErrors.slice(0, 3).join(' | ') : ''}`);
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n=================================================`);
  console.log(`FINANCE SETTINGS COMPACT: ${passed} passed, ${failed} failed`);
  console.log(`=================================================`);
  process.exit(failed ? 1 : 0);
});
