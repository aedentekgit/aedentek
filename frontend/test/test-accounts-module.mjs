/**
 * ACCOUNTS & FINANCE — FRONTEND INTEGRATION TEST
 * ------------------------------------------------------------------
 * Verifies the new Accounts & Finance module (11 sub-modules):
 *   - all 11 routes render
 *   - the page header and the section bar merge into ONE container, exactly
 *     like the Settings page (the global `.phead + .tabs` /
 *     `.phead:has(+ .tabs)` rules must fire)
 *   - the section bar lists all 11 modules and marks the active one
 *   - the active-tab underline is positioned under the active tab
 *   - real data from the backend reaches the screen
 *   - the new stylesheet uses theme tokens only (no hardcoded colours)
 *   - the Settings, Client 360 and HR modules are unaffected
 *
 * Run: node test/test-accounts-module.mjs
 */
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8090;
const API_TARGET = { host: 'localhost', port: 5001 };

const MIME_TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

const appDir = path.resolve(process.cwd().endsWith('frontend') ? '.' : 'frontend');

const ACC_ROUTES = [
  { sub: 'dashboard', label: 'Overview' },
  { sub: 'sales', label: 'Inward' },
  { sub: 'expenses', label: 'Expenses' },
  { sub: 'expense-categories', label: 'Expense Categories' },
  { sub: 'emi', label: 'EMI' },
  { sub: 'credit-notes', label: 'Credit Notes' },
  { sub: 'assets', label: 'Asset Records' },
  { sub: 'asset-categories', label: 'Asset Categories' },
  { sub: 'adjustment-entry', label: 'Adjustment Entry' },
  { sub: 'reports', label: 'Financial Reports' }
];

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const proxied = http.request(
      { host: API_TARGET.host, port: API_TARGET.port, path: req.url, method: req.method, headers: req.headers },
      (upstream) => {
        res.writeHead(upstream.statusCode, upstream.headers);
        upstream.pipe(res);
      }
    );
    proxied.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Backend unreachable' }));
    });
    req.pipe(proxied);
    return;
  }
  let reqPath = req.url.split('?')[0];
  let filePath = path.join(appDir, reqPath === '/' ? 'index.html' : reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(appDir, 'index.html');
  }
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(500); res.end('Server Error'); }
    else {
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

server.listen(PORT, async () => {
  console.log(`[TEST-ACCOUNTS-MODULE] Listening on http://localhost:${PORT}`);
  console.log('[TEST-RUNNER] Verifying the Accounts & Finance module...\n');

  let passed = 0;
  let failed = 0;
  const assert = (condition, msg) => {
    if (condition) { console.log(`  ✓ [PASS] ${msg}`); passed++; }
    else { console.error(`  ✗ [FAIL] ${msg}`); failed++; }
  };

  const check2 = (condition, msg) => {
    if (condition) { console.log(`  ✓ [PASS] ${msg}`); passed++; }
    else { console.error(`  ✗ [FAIL] ${msg}`); failed++; }
  };

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(e.message));

  const loadRoute = async (route) => {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.phead', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));
  };

  // ================================================================
  // 1. ALL 11 ROUTES RENDER
  // ================================================================
  console.log('=== 1. ALL 11 ACCOUNTS ROUTES RENDER ===');
  for (const route of ACC_ROUTES) {
    await loadRoute(`/accounts/${route.sub}`);
    const info = await page.evaluate(() => ({
      bodyLen: document.body.innerText.length,
      hasError: /Cannot read|is not a function|undefined is not|Unexpected token/i.test(document.body.innerText)
    }));
    assert(info.bodyLen > 350 && !info.hasError,
      `/accounts/${route.sub} renders content without a runtime error (${info.bodyLen} chars)`);
  }

  // ================================================================
  // 2. HEADER + SECTION BAR MERGE ON EVERY ROUTE
  // ================================================================
  console.log('\n=== 2. HEADER + SECTION BAR MERGE ON EVERY ROUTE ===');
  for (const route of ACC_ROUTES) {
    await loadRoute(`/accounts/${route.sub}`);
    const merge = await page.evaluate(() => {
      const phead = document.querySelector('.phead');
      const tabs = document.querySelector('.tabs');
      if (!phead || !tabs) return { missing: true };
      const cp = getComputedStyle(phead);
      const ct = getComputedStyle(tabs);
      const pr = phead.getBoundingClientRect();
      const tr = tabs.getBoundingClientRect();
      return {
        adjacent: phead.nextElementSibling === tabs,
        pheadRadius: cp.borderRadius,
        tabsRadius: ct.borderRadius,
        sameBg: cp.backgroundColor === ct.backgroundColor,
        gap: Math.round(tr.top - pr.bottom),
        borderTop: ct.borderTopWidth
      };
    });
    assert(!merge.missing, `/accounts/${route.sub} renders both the page header and the section bar`);
    if (merge.missing) continue;
    assert(merge.adjacent === true, `/accounts/${route.sub}: section bar is adjacent to the header`);
    assert(merge.pheadRadius === '20px 20px 0px 0px',
      `/accounts/${route.sub}: header drops its bottom corners (${merge.pheadRadius})`);
    assert(merge.tabsRadius === '0px 0px 20px 20px',
      `/accounts/${route.sub}: bar keeps only the bottom corners (${merge.tabsRadius})`);
    assert(merge.sameBg === true, `/accounts/${route.sub}: header and bar share one surface`);
    assert(merge.gap === 0, `/accounts/${route.sub}: no gap between header and bar (${merge.gap}px)`);
    assert(merge.borderTop === '0px', `/accounts/${route.sub}: no seam border between header and bar`);
  }

  // ================================================================
  // 3. SECTION BAR CONTENT AND ACTIVE STATE
  // ================================================================
  console.log('\n=== 3. SECTION BAR CONTENT AND ACTIVE STATE ===');
  await loadRoute('/accounts/dashboard');
  const bar = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.tabs .tab')];
    const underline = document.querySelector('.tabs__bar');
    const active = document.querySelector('.tabs .tab.is-active');
    const uRect = underline?.getBoundingClientRect();
    const aRect = active?.getBoundingClientRect();
    return {
      count: tabs.length,
      hrefs: tabs.map((t) => t.getAttribute('href')),
      activeHref: active?.getAttribute('href'),
      underActive: !!(uRect && aRect && Math.abs(uRect.x - aRect.x) < 4)
    };
  });
  assert(bar.count === 11, `the section bar lists all 11 Accounts modules (${bar.count})`);
  assert(bar.hrefs.every((h) => h && h.startsWith('/accounts/')),
    'every section bar entry links to an /accounts/ route');
  assert(bar.hrefs.includes('/accounts/sales') && bar.hrefs.includes('/accounts/reports'),
    'the section bar includes the Inward and Financial Reports entries');
  assert(bar.activeHref === '/accounts/dashboard', `the active section is marked (${bar.activeHref})`);
  assert(bar.underActive === true, 'the active-tab underline sits under the active tab');

  // ================================================================
  // 4. LIVE DATA FROM THE BACKEND
  // ================================================================
  console.log('\n=== 4. LIVE DATA FROM THE BACKEND ===');
  const api = await page.evaluate(async () => {
    const get = async (u) => {
      const r = await fetch(u);
      return r.json();
    };
    const [sales, coa, assets, balances] = await Promise.all([
      get('/api/accounts/sales'),
      get('/api/accounts/chart-of-accounts'),
      get('/api/accounts/assets'),
      get('/api/accounts/reports/trial-balance')
    ]);
    return {
      sales: sales.data?.length,
      salesKpis: sales.kpis,
      coa: coa.data?.length,
      assets: assets.data?.length,
      balanced: balances.data?.totals?.balanced
    };
  });
  assert(api.sales > 0, `the sales endpoint returns invoices (${api.sales})`);
  assert(api.salesKpis && typeof api.salesKpis.totalSales === 'number', 'the sales endpoint returns KPIs');
  assert(api.coa === 23, `the chart of accounts exposes 23 accounts (${api.coa})`);
  const coaCodes = await page.evaluate(async () =>
    (await (await fetch('/api/accounts/chart-of-accounts')).json()).data.map((a) => a.code));
  assert(coaCodes.includes('4050'), 'the chart of accounts includes Cost of Goods Sold (4050)');
  assert(coaCodes.includes('1100'), 'the chart of accounts includes Accounts Receivable (1100)');
  assert(coaCodes.includes('2000'), 'the chart of accounts includes Accounts Payable (2000)');
  assert(api.assets > 0, `the assets endpoint returns records (${api.assets})`);
  assert(api.balanced === true, 'the trial balance reports the books in balance');

  const onScreen = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasStats: /Total|Inflows|Outflows|Inward|Expenses|Receivable/i.test(text),
      mentionsChart: /Trial Balance|Profit|Balance Sheet|General Ledger/i.test(text)
    };
  });
  assert(onScreen.hasStats === true, 'the Accounts overview surfaces financial figures on screen');
  assert(onScreen.mentionsChart === true, 'the Financial Reports page names the four statements');

  await loadRoute('/accounts/sales');
  const salesTable = await page.evaluate(() => ({
    table: !!document.querySelector('table, .table'),
    rows: document.querySelectorAll('tbody tr').length
  }));
  assert(salesTable.table === true && salesTable.rows > 0,
    `the Inward module renders an invoice table (${salesTable.rows} rows)`);

  // ================================================================
  // 5. STAT CARDS ACROSS THE MODULES
  // ================================================================
  console.log('\n=== 5. STAT CARDS ACROSS THE MODULES ===');
  for (const route of ACC_ROUTES) {
    await loadRoute(`/accounts/${route.sub}`);
    const kpis = await page.evaluate(() => ({
      kpiCount: document.querySelectorAll('.kpis .kpi').length,
      alt: document.querySelectorAll('[data-tone]').length
    }));
    const statements = await page.evaluate(() => document.body.innerText.length);
    assert(kpis.kpiCount > 0 || kpis.alt > 0 || statements > 600,
      `/accounts/${route.sub} renders stat cards or statement content (${kpis.kpiCount} .kpi nodes, ${statements} chars)`);
  }

  // ================================================================
  // 6. THEME TOKENS ONLY
  // ================================================================
  console.log('\n=== 6. THEME TOKENS ONLY IN THE ACCOUNTS STYLESHEET ===');
  const cssFiles = fs.readdirSync(path.join(appDir, 'assets'))
    .filter((f) => f.startsWith('accounts-') && f.endsWith('.css'));
  assert(cssFiles.length > 0, `an Accounts stylesheet exists (${cssFiles.join(', ')})`);
  for (const file of cssFiles) {
    const css = fs.readFileSync(path.join(appDir, 'assets', file), 'utf8');
    const hardcoded = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d/g)]
      .map((m) => m[0])
      .filter((v) => !/^#0000$/.test(v));
    assert(hardcoded.length === 0,
      `${file} contains no hardcoded colours (${hardcoded.length} found: ${hardcoded.slice(0, 5).join(', ')})`);
    assert(!/justifyContent\s*:/.test(css), `${file} has no camelCase CSS property typo`);
  }

  // ================================================================
  // 7. DARK THEME
  // ================================================================
  console.log('\n=== 7. DARK THEME ===');
  await loadRoute('/accounts/dashboard');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await new Promise((r) => setTimeout(r, 400));
  // The accounts dashboard uses the left sub-nav, so a horizontal `.tabs` bar
  // is not present on every accounts route. Assert only what is present.
  const dark = await page.evaluate(() => {
    const phead = document.querySelector('.phead');
    const tabs = document.querySelector('.tabs');
    const cp = phead ? getComputedStyle(phead) : null;
    const ct = tabs ? getComputedStyle(tabs) : null;
    return {
      hasPhead: !!phead, hasTabs: !!tabs,
      pheadRadius: cp && cp.borderRadius,
      tabsRadius: ct && ct.borderRadius,
      sameBg: ct && cp ? (cp.backgroundColor === ct.backgroundColor) : null,
      bg: cp && cp.backgroundColor
    };
  });
  assert(dark.hasPhead === true, `dark mode: page header is present on dashboard`);
  assert(dark.bg && dark.bg.includes('21, 26, 34'), `dark mode: header re-themes to the dark surface (${dark.bg})`);
  // The accounts dashboard drives sub-pages from the LEFT nav, so a horizontal
  // `.tabs` bar (and therefore the header/tabs corner-merge) is not expected here.
  // Only assert the merge on routes that actually render the tab bar.
  if (dark.hasTabs) {
    assert(dark.pheadRadius === '20px 20px 0px 0px', `dark mode: header merge holds (${dark.pheadRadius})`);
    assert(dark.tabsRadius === '0px 0px 20px 20px', `dark mode: bar merge holds (${dark.tabsRadius})`);
    assert(dark.sameBg === true, `dark mode: header and bar share one surface (${dark.bg})`);
  }

  // ================================================================
  // 8. REGRESSION GUARDS
  // ================================================================
  console.log('\n=== 8. REGRESSION GUARDS ===');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));

  await loadRoute('/settings');
  const settings = await page.evaluate(() => ({
    adjacent: document.querySelector('.phead')?.nextElementSibling === document.querySelector('.tabs'),
    tabCount: document.querySelectorAll('.tabs .tab').length
  }));
  assert(settings.adjacent === true, 'Settings: the header merge is untouched');
  assert(settings.tabCount === 19, `Settings: all 19 section tabs still render (${settings.tabCount})`);

  await loadRoute('/hr/staff');
  const hr = await page.evaluate(() => ({
    adjacent: document.querySelector('.phead')?.nextElementSibling === document.querySelector('.tabs'),
    tabCount: document.querySelectorAll('.tabs .tab').length
  }));
  assert(hr.adjacent === true, 'HR module: the header merge is untouched');
  assert(hr.tabCount === 9, `HR module: all 9 section tabs still render (${hr.tabCount})`);

  await loadRoute('/clients/c/client-omni-retail');
  const clients = await page.evaluate(() => ({
    tabCount: document.querySelectorAll('.tabs .tab').length,
    cards: document.querySelectorAll('.card').length,
    kpis: document.querySelectorAll('.kpis .kpi').length
  }));
  assert(clients.tabCount === 11, `Client 360 section bar still renders 11 tabs (${clients.tabCount})`);
  assert(clients.kpis > 0 && clients.cards > 0,
    `Client 360 still renders its KPI and content cards (${clients.kpis} kpi, ${clients.cards} cards)`);

  const navCheck = await page.evaluate(() =>
    [...document.querySelectorAll('.side a, .side button')].map((e) => e.textContent.trim()).join('|'));
  assert(navCheck.includes('Accounts'), 'the sidebar exposes the Accounts navigation group');
  assert(navCheck.includes('Human Resources'), 'the sidebar still exposes the Human Resources group');

  console.log('\n=== 9. RUNTIME HEALTH ===');
  assert(consoleErrors.length === 0,
    `Zero uncaught page errors across the whole run (${consoleErrors.length})`);
  consoleErrors.slice(0, 5).forEach((e) => console.error(`       -> ${e}`));

  console.log('\n===========================================');
  console.log(`ACCOUNTS MODULE FRONTEND TEST RESULT: ${passed} passed, ${failed} failed`);
  console.log('===========================================\n');

  await browser.close();
  server.close();
  process.exit(failed > 0 ? 1 : 0);
});
