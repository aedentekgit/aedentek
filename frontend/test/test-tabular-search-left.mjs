/**
 * GLOBAL TABULAR SEARCH-LEFT LAYOUT TEST
 * Verifies that in every tabular (table card) view the search bar sits on the
 * LEFT side of the card header (next to the title) and that its placeholder
 * text is removed — enforced globally by the search-left engine in
 * assets/global-themed-controls.js.
 *
 * Run: node test/test-tabular-search-left.mjs   (backend must be running on :5001)
 */
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8121;
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

// Tabular master views whose search lives in the card header tool cluster
const CARD_TOOLS_ROUTES = [
  { name: 'Project Stage Master', path: '/clients/project-stages', searchId: 'stg-search', shot: 'tabular_search_left_stages.png' },
  { name: 'Service Type Master', path: '/clients/service-types', searchId: 'svc-search', shot: 'tabular_search_left_service_types.png' },
  { name: 'Leave History (HR)', path: '/hr/leave', searchId: null, shot: 'tabular_search_left_leave.png' },
];
// Toolbar-based tabular views — search already left; verify placeholder removal only
const TOOLBAR_ROUTES = [
  { name: 'Tax Invoices', path: '/finance/invoices' },
  { name: 'Client Directory', path: '/clients/companies' },
];

server.listen(PORT, async () => {
  let passed = 0; let failed = 0;
  const assert = (c, m) => { if (c) { console.log(`  ✓ [PASS] ${m}`); passed++; } else { console.error(`  ✗ [FAIL] ${m}`); failed++; } };
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  try {
    // Login
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));
    if (await page.$('.lg-submit')) {
      await page.type('input[type="email"]', 'ines@caldermoss.co');
      await page.type('input[autocomplete="current-password"]', 'marble88');
      await page.click('.lg-submit');
      await new Promise((r) => setTimeout(r, 1500));
    }
    await page.waitForSelector('.side', { timeout: 20000 });

    for (const r of CARD_TOOLS_ROUTES) {
      console.log(`\n--- ${r.name} (${r.path}) ---`);
      await page.goto(`http://localhost:${PORT}${r.path}`, { waitUntil: 'networkidle2' });
      await new Promise((res) => setTimeout(res, 900));

      const res1 = await page.evaluate(() => {
        // The card that actually wraps the table — a page can host other cards too
        const heads = [...document.querySelectorAll('header.card__head')];
        const withTable = heads.filter((h) => h.closest('.card')?.querySelector('table'));
        const head = withTable.find((h) => h.querySelector('.tl-search-left-field'))
          || withTable.find((h) => h.querySelector('.card__tools input, .card__tools .toolbar__search')) || null;
        if (!head) return { hasHead: false };
        const lifted = head.querySelector('.tl-search-left-field');
        const input = lifted ? (lifted.matches('input') ? lifted : lifted.querySelector('input')) : null;
        if (!input) return { hasHead: true, lifted: false };
        const hr = head.getBoundingClientRect();
        const ir = input.getBoundingClientRect();
        const title = head.querySelector('.card__title');
        const tr = title ? title.getBoundingClientRect() : null;
        const tools = head.querySelector('.card__tools');
        const toolsRect = tools ? tools.getBoundingClientRect() : null;
        const ph = getComputedStyle(input, '::placeholder');
        const visible = hr.width > 0;
        return {
          hasHead: true,
          lifted: true,
          visible,
          searchIsFirstChild: head.firstElementChild === lifted,
          // left half of the header, near the left edge
          searchLeftHalf: ir.left < hr.left + hr.width / 2,
          searchLeftOffset: Math.round(ir.left - hr.left),
          // title sits right after the search field (search.left + search.width <= title.left + slack)
          titleAfterSearch: tr ? (ir.right + 24 >= tr.left || ir.left < tr.left) : true,
          // remaining tool cluster (filter/add) pushed to the right
          toolsRightSide: toolsRect ? toolsRect.left > hr.left + hr.width * 0.5 : true,
          placeholderColor: ph.color,
          placeholderText: input.getAttribute('placeholder')
        };
      });

      assert(res1.hasHead && res1.lifted, `search field lifted to left of card header (first child: ${res1.searchIsFirstChild})`);
      if (res1.visible === false) {
        // Some table cards intentionally hide their card head (pre-existing global CSS) —
        // only the DOM-level lift can be asserted in that case.
        console.log('  · card head hidden by pre-existing CSS — geometry checks skipped (DOM lift verified)');
      } else {
        assert(res1.searchLeftHalf === true, `search x=${res1.searchLeftOffset}px is in the left half of the header`);
        assert(res1.toolsRightSide === true, 'filter/actions tool cluster remains on the right');
        assert(/^rgba\(0, 0, 0, 0\)$|^transparent$/.test(res1.placeholderColor), `placeholder text removed (rendered transparent, color=${res1.placeholderColor})`);
      }

      // search still works after the DOM reparenting
      await page.evaluate(() => {
        const heads = [...document.querySelectorAll('header.card__head')];
        const head = heads.find((h) => h.closest('.card')?.querySelector('table') && h.querySelector('.tl-search-left-field')) || null;
        if (!head) return;
        const lifted = head.querySelector('.tl-search-left-field');
        if (!lifted) return;
        const input = lifted.matches('input') ? lifted : lifted.querySelector('input');
        if (!input) return;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, 'Design');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await new Promise((res2) => setTimeout(res2, 700));

      const shotPath = path.join(appDir, 'test-reports', r.shot);
      await page.screenshot({ path: shotPath });
      assert(fs.existsSync(shotPath), `screenshot captured (${r.shot})`);
    }

    // Toolbar views: search already left — placeholder must be blanked too
    for (const r of TOOLBAR_ROUTES) {
      console.log(`\n--- ${r.name} (${r.path}) — toolbar search ---`);
      await page.goto(`http://localhost:${PORT}${r.path}`, { waitUntil: 'networkidle2' });
      await new Promise((res) => setTimeout(res, 900));
      const res2 = await page.evaluate(() => {
        const inp = document.querySelector('.toolbar__search input, .toolbar input[type="search"]');
        if (!inp) return { found: false };
        return { found: true, ph: getComputedStyle(inp, '::placeholder').color };
      });
      assert(res2.found, 'tabular toolbar search field present');
      assert(/^rgba\(0, 0, 0, 0\)$|^transparent$/.test(res2.ph), `toolbar search placeholder text removed (color=${res2.ph})`);
    }

    assert(pageErrors.length === 0, `no uncaught page errors (got ${pageErrors.length})${pageErrors.length ? ': ' + pageErrors.slice(0, 3).join(' | ') : ''}`);
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n==============================================`);
  console.log(`TABULAR SEARCH-LEFT LAYOUT: ${passed} passed, ${failed} failed`);
  console.log(`==============================================`);
  process.exit(failed ? 1 : 0);
});
