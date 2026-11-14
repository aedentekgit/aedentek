/**
 * CLIENT 360° — SECTION BAR INTEGRATION TEST
 * ------------------------------------------------------------------
 * Verifies that the Client 360° detail page renders its 11-section
 * navigation exactly like the Settings page does: the section bar is
 * merged into the page header container rather than floating as a
 * detached strip.
 *
 * The merge is driven by two global rules that already exist in
 * signin-styles.css:
 *
 *     .phead:has(+ .tabs) { border-bottom-left-radius:0; margin-bottom:0; ... }
 *     .phead + .tabs, .tabs { border-top:none; border-radius:0 0 20px 20px; ... }
 *
 * They only fire when .tabs is the IMMEDIATE next sibling of .phead.
 * The Client page previously had the KPI row (.kpis) in between, so the
 * section bar rendered as a separate floating card.
 *
 * Run: node test/test-client-section-bar.mjs
 */
import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 8093;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const appDir = path.resolve(process.cwd().endsWith('frontend') ? '.' : 'frontend');

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath.startsWith('/tessly/assets/')) {
    reqPath = reqPath.replace('/tessly/assets/', '/assets/');
  }
  let filePath = path.join(
    appDir,
    reqPath === '/' || (reqPath.startsWith('/tessly') && !reqPath.includes('.')) ? 'index.html' : reqPath
  );
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
  console.log(`[TEST-CLIENT-SECTION-BAR] Listening on http://localhost:${PORT}`);
  console.log('[TEST-RUNNER] Verifying Settings-style section bar integration on Client 360°...\n');

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

  // ================================================================
  // 1. CLIENT 360° — header + section bar integration
  // ================================================================
  await page.goto(`http://localhost:${PORT}/clients/c/client-hyperion-media`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabs .tab', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 900));

  console.log('=== 1. CLIENT 360° :: HEADER + SECTION BAR MERGE ===');
  const m = await page.evaluate(() => {
    const phead = document.querySelector('.phead');
    const tabs = document.querySelector('.tabs');
    const cp = getComputedStyle(phead);
    const ct = getComputedStyle(tabs);
    const bar = tabs.querySelector('.tabs__bar');
    const active = tabs.querySelector('.tab.is-active');
    const barRect = bar?.getBoundingClientRect();
    const actRect = active?.getBoundingClientRect();
    return {
      adjacent: phead.nextElementSibling === tabs,
      tabsPrevClass: tabs.previousElementSibling?.className,
      pheadRadius: cp.borderRadius,
      pheadMarginBottom: cp.marginBottom,
      pheadBg: cp.backgroundColor,
      pheadBorderBottom: cp.borderBottomWidth,
      tabsRadius: ct.borderRadius,
      tabsMarginTop: ct.marginTop,
      tabsBorderTop: ct.borderTopWidth,
      tabsBg: ct.backgroundColor,
      tabCount: tabs.querySelectorAll('.tab').length,
      activeLabel: active?.textContent.trim(),
      activeColor: active ? getComputedStyle(active).color : null,
      barUnderActive: !!(barRect && actRect && Math.abs(barRect.x - actRect.x) < 4),
      barWidthMatches: !!(barRect && actRect && Math.abs(barRect.width - actRect.width) < 4),
      barWidth: barRect ? Math.round(barRect.width) : 0,
      activeWidth: actRect ? Math.round(actRect.width) : 0,
      barOpacity: bar ? getComputedStyle(bar).opacity : null,
      kpiCount: document.querySelectorAll('.kpis .kpi').length,
      // vertical gap between the header block and the KPI row
      gapTabsToKpi: (() => {
        const k = document.querySelector('.kpis');
        if (!k) return null;
        const kr = k.getBoundingClientRect();
        const tr = tabs.getBoundingClientRect();
        return Math.round(kr.top - tr.bottom);
      })(),
      gapPheadToTabs: (() => {
        const pr = phead.getBoundingClientRect();
        const tr = tabs.getBoundingClientRect();
        return Math.round(tr.top - pr.bottom);
      })(),
    };
  });

  assert(m.adjacent === true,
    `Section bar is the immediate next sibling of the page header (prev = ${m.tabsPrevClass})`);
  assert(m.gapPheadToTabs === 0,
    `Header and section bar touch with no gap (gap = ${m.gapPheadToTabs}px)`);
  assert(m.pheadRadius === '20px 20px 0px 0px',
    `Header drops its bottom corners to merge with the bar (${m.pheadRadius})`);
  assert(m.tabsRadius === '0px 0px 20px 20px',
    `Section bar keeps only the bottom corners (${m.tabsRadius})`);
  assert(m.pheadMarginBottom === '0px',
    `Header has no bottom margin so the bar sits flush (${m.pheadMarginBottom})`);
  assert(m.tabsMarginTop === '0px',
    `Section bar has no top margin (${m.tabsMarginTop})`);
  assert(m.tabsBorderTop === '0px',
    `No double border between header and bar (border-top = ${m.tabsBorderTop})`);
  assert(m.pheadBg === m.tabsBg,
    `Header and bar share one surface colour, reading as one card (${m.pheadBg})`);
  assert(m.tabCount >= 9,
    `Client sections render in the bar (${m.tabCount})`);

  console.log('\n=== 2. CLIENT 360° :: ACTIVE TAB UNDERLINE ===');
  assert(m.barUnderActive === true,
    `Active-tab underline is positioned under the active tab (${m.activeLabel})`);
  assert(m.barWidthMatches === true,
    `Underline width matches the active tab (${m.barWidth}px vs ${m.activeWidth}px)`);
  assert(m.barOpacity === '1',
    `Underline is visible (opacity ${m.barOpacity})`);
  assert(m.activeColor === 'rgb(44, 82, 207)',
    `Active tab uses the theme primary colour (${m.activeColor})`);

  console.log('\n=== 3. CLIENT 360° :: CONTENT ORDERING PRESERVED ===');
  assert(m.kpiCount === 4,
    `Bento KPI cards still render below the merged header (${m.kpiCount})`);
  assert(m.gapTabsToKpi > 0,
    `KPI row is separated from the merged header block (gap = ${m.gapTabsToKpi}px)`);

  // ---- tab switching drives the underline ----
  console.log('\n=== 4. CLIENT 360° :: TAB SWITCHING MOVES THE UNDERLINE ===');
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('.tabs .tab')].find((x) => x.textContent.includes('Login Credentials'));
    t?.click();
  });
  await new Promise((r) => setTimeout(r, 800));
  const afterClick = await page.evaluate(() => {
    const tabs = document.querySelector('.tabs');
    const bar = tabs.querySelector('.tabs__bar');
    const active = tabs.querySelector('.tab.is-active');
    const barRect = bar?.getBoundingClientRect();
    const actRect = active?.getBoundingClientRect();
    return {
      activeLabel: active?.textContent.trim(),
      underActive: !!(barRect && actRect && Math.abs(barRect.x - actRect.x) < 4),
      widthMatches: !!(barRect && actRect && Math.abs(barRect.width - actRect.width) < 4),
      panelRendered: !!document.querySelector('.card') && document.body.innerText.includes('Login Credentials'),
    };
  });
  assert(/Login Credentials$/.test(afterClick.activeLabel),
    `Clicking a section switches the active tab (${afterClick.activeLabel})`);
  assert(afterClick.underActive === true,
    `Underline follows the newly activated tab`);
  assert(afterClick.widthMatches === true,
    `Underline re-measures to the new tab width`);
  assert(afterClick.panelRendered === true,
    `Login Credentials panel content renders after the switch`);

  // ================================================================
  // 5. DARK THEME — merge must hold in both themes
  // ================================================================
  console.log('\n=== 5. DARK THEME :: MERGE HOLDS ===');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await new Promise((r) => setTimeout(r, 400));
  const dark = await page.evaluate(() => {
    const phead = document.querySelector('.phead');
    const tabs = document.querySelector('.tabs');
    const cp = getComputedStyle(phead);
    const ct = getComputedStyle(tabs);
    return {
      pheadRadius: cp.borderRadius,
      tabsRadius: ct.borderRadius,
      sameBg: cp.backgroundColor === ct.backgroundColor,
      pheadBg: cp.backgroundColor,
      tabsBg: ct.backgroundColor,
      tabsBorderTop: ct.borderTopWidth,
    };
  });
  assert(dark.pheadRadius === '20px 20px 0px 0px',
    `Dark mode: header drops its bottom corners (${dark.pheadRadius})`);
  assert(dark.tabsRadius === '0px 0px 20px 20px',
    `Dark mode: bar keeps only the bottom corners (${dark.tabsRadius})`);
  assert(dark.sameBg === true,
    `Dark mode: header and bar share one surface (${dark.pheadBg})`);
  assert(dark.tabsBorderTop === '0px',
    `Dark mode: no double border between header and bar (${dark.tabsBorderTop})`);

  // ================================================================
  // 6. REGRESSION GUARD — Settings page must be unchanged
  // ================================================================
  console.log('\n=== 6. REGRESSION GUARD :: SETTINGS PAGE UNAFFECTED ===');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await page.goto(`http://localhost:${PORT}/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabs .tab', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 800));

  const settings = await page.evaluate(() => {
    const phead = document.querySelector('.phead');
    const tabs = document.querySelector('.tabs');
    const cp = getComputedStyle(phead);
    const ct = getComputedStyle(tabs);
    const bar = tabs.querySelector('.tabs__bar');
    const active = tabs.querySelector('.tab.is-active');
    const barRect = bar?.getBoundingClientRect();
    const actRect = active?.getBoundingClientRect();
    return {
      adjacent: phead.nextElementSibling === tabs,
      pheadRadius: cp.borderRadius,
      tabsRadius: ct.borderRadius,
      sameBg: cp.backgroundColor === ct.backgroundColor,
      tabCount: tabs.querySelectorAll('.tab').length,
      underActive: !!(barRect && actRect && Math.abs(barRect.x - actRect.x) < 4),
    };
  });
  assert(settings.adjacent === true, `Settings: bar still adjacent to its header`);
  assert(settings.pheadRadius === '20px 20px 0px 0px', `Settings: header merge intact (${settings.pheadRadius})`);
  assert(settings.tabsRadius === '0px 0px 20px 20px', `Settings: bar merge intact (${settings.tabsRadius})`);
  assert(settings.sameBg === true, `Settings: header and bar still one surface`);
  assert(settings.tabCount >= 10, `Settings: all section tabs still render (${settings.tabCount})`);
  assert(settings.underActive === true, `Settings: active-tab underline still positioned`);

  console.log('\n=== 7. RUNTIME HEALTH ===');
  assert(consoleErrors.length === 0,
    `Zero uncaught page errors during the run (${consoleErrors.length})`);
  consoleErrors.forEach((e) => console.error(`       -> ${e}`));

  console.log('\n===========================================');
  console.log(`CLIENT SECTION BAR TEST RESULT: ${passed} passed, ${failed} failed`);
  console.log('===========================================\n');

  await browser.close();
  server.close();
  process.exit(failed > 0 ? 1 : 0);
});
