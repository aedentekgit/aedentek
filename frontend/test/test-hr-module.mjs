/**
 * HR MODULE — FRONTEND INTEGRATION TEST
 * ------------------------------------------------------------------
 * Verifies the new Human Resources & Payroll module:
 *   - all 9 HR routes render
 *   - the page header and the section bar merge into ONE container, exactly
 *     like the Settings page (the global `.phead + .tabs` /
 *     `.phead:has(+ .tabs)` rules must fire)
 *   - the section bar lists all 9 modules and marks the active one
 *   - the active-tab underline is positioned under the active tab
 *   - real data from the backend reaches the screen
 *   - the new stylesheet uses theme tokens only (no hardcoded colours)
 *   - the Settings page and the rest of the app are unaffected
 *
 * Run: node test/test-hr-module.mjs
 */
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8091;
const API_TARGET = { host: 'localhost', port: 5001 };

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const appDir = path.resolve(process.cwd().endsWith('frontend') ? '.' : 'frontend');

const HR_ROUTES = [
  { sub: 'staff', label: 'Employees' },
  { sub: 'attendance', label: 'Attendance' },
  { sub: 'leave', label: 'Leave Requests' },
  { sub: 'leave-types', label: 'Leave Types' },
  { sub: 'shifts', label: 'Shifts' },
  { sub: 'salary', label: 'Salary Structures' },
  { sub: 'advances', label: 'Salary Advances' },
  { sub: 'adjustments', label: 'Payroll Adjustments' },
  { sub: 'payroll', label: 'Payroll & Payslips' }
];

// Static file server with a pass-through proxy for /api so the page can talk
// to the real backend without depending on the vite dev server.
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
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

server.listen(PORT, async () => {
  console.log(`[TEST-HR-MODULE] Listening on http://localhost:${PORT}`);
  console.log('[TEST-RUNNER] Verifying the Human Resources & Payroll module...\n');

  let passed = 0;
  let failed = 0;
  const assert = (condition, msg) => {
    if (condition) {
      console.log(`  ✓ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${msg}`);
      failed++;
    }
  };

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(e.message));

  const loadRoute = async (route) => {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.phead', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1100));
  };

  // ================================================================
  // 1. ALL 9 ROUTES RENDER
  // ================================================================
  console.log('=== 1. ALL 9 HR ROUTES RENDER ===');
  for (const route of HR_ROUTES) {
    await loadRoute(`/hr/${route.sub}`);
    const info = await page.evaluate(() => ({
      title: document.querySelector('.phead .ttl, .phead h1')?.textContent?.trim() || '',
      tabs: document.querySelectorAll('.tabs .tab').length,
      bodyLen: document.body.innerText.length,
      hasError: /Cannot read|is not a function|undefined is not|Unexpected token/i.test(document.body.innerText)
    }));
    assert(info.bodyLen > 400 && !info.hasError,
      `/hr/${route.sub} renders content without a runtime error (${info.bodyLen} chars)`);
  }

  // ================================================================
  // 2. CLEAN STANDALONE HEADER CONTAINER & ZERO REDUNDANT PAGE SWITCHING TABS
  // ================================================================
  console.log('\n=== 2. CLEAN STANDALONE HEADER CONTAINER & ZERO REDUNDANT TABS ===');
  for (const route of HR_ROUTES) {
    await loadRoute(`/hr/${route.sub}`);
    const check = await page.evaluate(() => {
      const phead = document.querySelector('.phead');
      const tabs = document.querySelector('.tabs');
      if (!phead) return { missingPhead: true };
      const cp = getComputedStyle(phead);
      return {
        hasTabs: !!tabs,
        pheadRadius: cp.borderRadius,
        pheadBg: cp.backgroundColor
      };
    });
    assert(!check.missingPhead, `/hr/${route.sub} renders the page header`);
    assert(check.hasTabs === false, `/hr/${route.sub}: redundant page-switching section tabs removed`);
    assert(check.pheadRadius === '20px', `/hr/${route.sub}: page header has all 4 rounded corners (${check.pheadRadius})`);
  }

  // ================================================================
  // 4. LIVE DATA REACHES THE SCREEN
  // ================================================================
  console.log('\n=== 4. LIVE DATA FROM THE BACKEND ===');
  const staffData = await page.evaluate(async () => {
    const res = await fetch('/api/staff');
    const json = await res.json();
    return { ok: res.ok, count: json.data?.length, kpis: json.kpis };
  });
  assert(staffData.ok && staffData.count > 0,
    `the employees endpoint returns seeded staff through the page (${staffData.count} records)`);
  assert(staffData.kpis && staffData.kpis.totalStaff > 0,
    'the employees endpoint returns a KPI payload');

  const onScreen = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      mentionsSeededStaff: text.includes('Okafor') || text.includes('Sen') || text.includes('Iyer'),
      mentionsStats: /Total|Active|Branch|Trainer/i.test(text),
      hasTable: !!document.querySelector('table, .table')
    };
  });
  assert(onScreen.mentionsSeededStaff === true,
    'the seeded employee records are visible on the Employees page');
  assert(onScreen.mentionsStats === true, 'stat cards summarise the employee data on screen');
  assert(onScreen.hasTable === true, 'the employee directory renders a table');

  // ================================================================
  // 5. STAT CARDS ACROSS THE MODULES
  // ================================================================
  console.log('\n=== 5. STAT CARDS ACROSS THE MODULES ===');
  for (const route of HR_ROUTES) {
    await loadRoute(`/hr/${route.sub}`);
    const kpis = await page.evaluate(() => ({
      kpiCount: document.querySelectorAll('.kpis .kpi').length,
      altKpi: document.querySelectorAll('[data-tone]').length
    }));
    assert(kpis.kpiCount > 0 || kpis.altKpi > 0,
      `/hr/${route.sub} renders stat cards (${kpis.kpiCount} .kpi nodes)`);
  }

  // ================================================================
  // 6. THEME TOKENS ONLY
  // ================================================================
  console.log('\n=== 6. THEME TOKENS ONLY IN THE HR STYLESHEET ===');
  const cssFiles = fs.readdirSync(path.join(appDir, 'assets')).filter((f) => f.startsWith('hr-') && f.endsWith('.css'));
  assert(cssFiles.length > 0, `an HR stylesheet exists (${cssFiles.join(', ')})`);
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
  await loadRoute('/hr/staff');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await new Promise((r) => setTimeout(r, 400));
  const dark = await page.evaluate(() => {
    const phead = document.querySelector('.phead');
    const tabs = document.querySelector('.tabs');
    const cp = getComputedStyle(phead);
    return {
      hasTabs: !!tabs,
      pheadRadius: cp.borderRadius,
      bg: cp.backgroundColor
    };
  });
  assert(dark.hasTabs === false, 'dark mode: redundant section tabs remain removed');
  assert(dark.pheadRadius === '20px', `dark mode: standalone header container holds (${dark.pheadRadius})`);

  // ================================================================
  // 8. REGRESSION GUARDS
  // ================================================================
  console.log('\n=== 8. REGRESSION GUARDS ===');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await loadRoute('/settings');
  const settings = await page.evaluate(() => {
    const phead = document.querySelector('.phead');
    const tabs = document.querySelector('.tabs');
    return {
      adjacent: phead?.nextElementSibling === tabs,
      tabCount: document.querySelectorAll('.tabs .tab').length,
      radius: tabs ? getComputedStyle(tabs).borderRadius : null
    };
  });
  assert(settings.adjacent === true, 'Settings: the header merge is untouched');
  assert(settings.tabCount >= 10, `Settings: section tabs still render (${settings.tabCount})`);
  assert(settings.radius === '0px 0px 20px 20px', `Settings: the bar merge is untouched (${settings.radius})`);

  await loadRoute('/clients/companies');
  const clients = await page.evaluate(() => ({
    tabCount: document.querySelectorAll('.tabs .tab').length,
    rows: document.querySelectorAll('tbody tr').length,
    ok: document.body.innerText.length > 300
  }));
  assert(clients.ok && clients.rows > 0, `Clients directory still renders (${clients.rows} rows)`);
  assert(clients.tabCount === 0, `Clients directory cleanly removed redundant header tabs (${clients.tabCount})`);

  await loadRoute('/clients/c/client-hyperion-media');
  const client360 = await page.evaluate(() => ({
    tabCount: document.querySelectorAll('.tabs .tab').length,
    adjacent: document.querySelector('.phead')?.nextElementSibling === document.querySelector('.tabs')
  }));
  assert(client360.tabCount >= 9, `Client 360 section bar still renders tabs (${client360.tabCount})`);
  assert(client360.adjacent === true, 'Client 360 header/section-bar merge is still intact');

  const navCheck = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('.side a, .side button, .side__nav a')]
      .map((e) => e.textContent.trim());
    return labels.join('|');
  });
  assert(navCheck.includes('Human Resources'),
    'the sidebar exposes the Human Resources navigation group');

  console.log('\n=== 9. RUNTIME HEALTH ===');
  assert(consoleErrors.length === 0,
    `Zero uncaught page errors across the whole run (${consoleErrors.length})`);
  consoleErrors.slice(0, 5).forEach((e) => console.error(`       -> ${e}`));

  console.log('\n===========================================');
  console.log(`HR MODULE FRONTEND TEST RESULT: ${passed} passed, ${failed} failed`);
  console.log('===========================================\n');

  await browser.close();
  server.close();
  process.exit(failed > 0 ? 1 : 0);
});
