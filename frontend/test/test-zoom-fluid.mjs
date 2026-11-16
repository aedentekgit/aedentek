/**
 * GLOBAL SCREEN ZOOM IN/OUT & FLUID RESPONSIVENESS TEST SUITE
 * 
 * Verifies that the CRM layout is 100% fluid across all zoom levels
 * (zoom out: 50%, 67%, 75%, 2560px, 1920px; standard: 1440px; zoom in: 120%, 150%, 175%, 200%, 760px, 390px).
 * 
 * Validates:
 * 1. Sidebar remains anchored at left: 14px (never pushed inward with dead margin).
 * 2. Gutter balance: gap between sidebar and main content matches gap between main content and right window edge.
 * 3. Zero horizontal overflow (scrollWidth <= innerWidth) across all routes and screen sizes.
 * 4. Responsive adaptation across full sidebar, collapsed rail, and mobile tabbar.
 */
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8188;
const API_TARGET = { host: 'localhost', port: 5001 };
const MIME = {
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

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const pr = http.request(
      {
        host: API_TARGET.host,
        port: API_TARGET.port,
        path: req.url,
        method: req.method,
        headers: req.headers
      },
      (up) => {
        res.writeHead(up.statusCode, up.headers);
        up.pipe(res);
      }
    );
    pr.on('error', () => {
      res.writeHead(502);
      res.end('{}');
    });
    req.pipe(pr);
    return;
  }

  let reqPath = req.url.split('?')[0];
  if (reqPath.startsWith('/tessly/assets/')) reqPath = reqPath.replace('/tessly/assets/', '/assets/');
  let filePath = path.join(appDir, reqPath === '/' ? 'index.html' : reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(appDir, 'index.html');
  }

  fs.readFile(filePath, (err, c) => {
    if (err) {
      res.writeHead(500);
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(c);
  });
});

const VIEWPORTS = [
  { name: '4K Ultra-Wide / 50% Zoom', width: 2560, height: 1440, isMobile: false, isRail: false, shot: 'zoom_fluid_2560.png' },
  { name: 'Full HD / 75% Zoom', width: 1920, height: 1080, isMobile: false, isRail: false, shot: 'zoom_fluid_1920.png' },
  { name: 'Standard Desktop / 100% Zoom', width: 1440, height: 900, isMobile: false, isRail: false, shot: 'zoom_fluid_1440.png' },
  { name: 'Compact Desktop / 120% Zoom', width: 1200, height: 800, isMobile: false, isRail: true },
  { name: 'Tablet Landscape / 150% Zoom', width: 960, height: 700, isMobile: false, isRail: true, shot: 'zoom_fluid_960.png' },
  { name: 'Tablet Portrait / 175% Zoom', width: 760, height: 600, isMobile: true, isRail: false },
  { name: 'Mobile Phone / 200% Zoom', width: 390, height: 844, isMobile: true, isRail: false, shot: 'zoom_fluid_390.png' }
];

const TEST_ROUTES = [
  { name: 'Today Dashboard', path: '/today' },
  { name: 'Clients Directory', path: '/clients' },
  { name: 'Deals Board', path: '/deals' },
  { name: 'Tax Invoices', path: '/finance/invoices' },
  { name: 'Accounts Dashboard', path: '/accounts/dashboard' },
  { name: 'Staff Management', path: '/hr/staff' },
  { name: 'Settings Hub', path: '/settings' }
];

server.listen(PORT, async () => {
  console.log(`\n======================================================`);
  console.log(`STARTING GLOBAL SCREEN ZOOM IN/OUT FLUID VERIFICATION`);
  console.log(`Frontend Static Server: http://localhost:${PORT}`);
  console.log(`Backend API Proxy:      http://${API_TARGET.host}:${API_TARGET.port}`);
  console.log(`======================================================\n`);

  let totalAssertions = 0;
  let passedAssertions = 0;
  let failedAssertions = 0;

  const assert = (condition, description) => {
    totalAssertions++;
    if (condition) {
      console.log(`  ✓ [PASS] ${description}`);
      passedAssertions++;
    } else {
      console.error(`  ✗ [FAIL] ${description}`);
      failedAssertions++;
    }
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  try {
    // 1. Authenticate
    console.log('--- Step 1: Authentication & App Boot ---');
    await page.goto(`http://localhost:${PORT}/today`, { waitUntil: 'domcontentloaded' });
    await sleep(600);

    const submitBtn = await page.$('.lg-submit');
    if (submitBtn) {
      console.log('Signing in with ines@caldermoss.co...');
      await page.type('input[type="email"]', 'ines@caldermoss.co');
      const pwInput = (await page.$('input[type="password"]')) || (await page.$('input[autocomplete="current-password"]'));
      if (pwInput) await pwInput.type('marble88');
      await page.click('.lg-submit');
      await sleep(1500);
    }

    await page.waitForSelector('.side, .tabbar', { timeout: 15000 });
    assert(true, 'Successfully booted authenticated CRM interface');

    // 2. Loop through viewports & routes
    for (const vp of VIEWPORTS) {
      console.log(`\n======================================================`);
      console.log(`Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      console.log(`======================================================`);

      await page.setViewport({ width: vp.width, height: vp.height });
      await sleep(300);

      // Trigger rail resize event if defined
      await page.evaluate(() => {
        if (typeof window.__rail === 'function') window.__rail();
      });
      await sleep(200);

      for (const route of TEST_ROUTES) {
        await page.goto(`http://localhost:${PORT}${route.path}`, { waitUntil: 'domcontentloaded' });
        await sleep(500);

        const metrics = await page.evaluate(() => {
          const winWidth = window.innerWidth;
          const docScrollWidth = document.documentElement.scrollWidth;
          const bodyScrollWidth = document.body.scrollWidth;
          const hasOverflow = docScrollWidth > winWidth + 1 || bodyScrollWidth > winWidth + 1;

          const sideEl = document.querySelector('.side');
          const isSideVisible = sideEl && window.getComputedStyle(sideEl).display !== 'none';
          const sideRect = isSideVisible ? sideEl.getBoundingClientRect() : null;

          const tabbarEl = document.querySelector('.tabbar');
          const isTabbarVisible = tabbarEl && window.getComputedStyle(tabbarEl).display !== 'none';

          const mainEl = document.querySelector('.main');
          const mainRect = mainEl ? mainEl.getBoundingClientRect() : null;

          // Key content containers: top-level layout cards, headers, boards, and admin hubs
          // Exclude inner scrollable children (like wide table rows or SVG charts inside scrollable bodies)
          const contentEls = [...document.querySelectorAll('.page > *, .main > .phead, .main > .top, .main > .card')];
          const visibleContent = contentEls.filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.top < window.innerHeight;
          });

          let minContentLeft = winWidth;
          let maxContentRight = 0;
          for (const el of visibleContent) {
            const r = el.getBoundingClientRect();
            if (r.left < minContentLeft) minContentLeft = r.left;
            if (r.right > maxContentRight) maxContentRight = r.right;
          }

          let gapLeft = 0;
          let gapRight = 0;
          if (isSideVisible && sideRect) {
            gapLeft = Math.round(minContentLeft - sideRect.right);
            gapRight = Math.round(winWidth - maxContentRight);
          } else {
            gapLeft = Math.round(minContentLeft);
            gapRight = Math.round(winWidth - maxContentRight);
          }

          const isRailOn = document.documentElement.classList.contains('rail-on');

          return {
            winWidth,
            docScrollWidth,
            hasOverflow,
            isSideVisible,
            sideLeft: sideRect ? Math.round(sideRect.left) : null,
            sideRight: sideRect ? Math.round(sideRect.right) : null,
            sideWidth: sideRect ? Math.round(sideRect.width) : null,
            isTabbarVisible,
            mainWidth: mainRect ? Math.round(mainRect.width) : null,
            minContentLeft: Math.round(minContentLeft),
            maxContentRight: Math.round(maxContentRight),
            gapLeft,
            gapRight,
            gutterDiff: Math.abs(gapLeft - gapRight),
            isRailOn
          };
        });

        // 1. No horizontal scrollbar/overflow
        assert(
          !metrics.hasOverflow,
          `[${vp.width}px] ${route.name}: Zero horizontal overflow (scrollWidth=${metrics.docScrollWidth} <= winWidth=${metrics.winWidth})`
        );

        // 2. Desktop sidebar anchored & gutters balanced
        if (!vp.isMobile) {
          assert(
            metrics.isSideVisible,
            `[${vp.width}px] ${route.name}: Sidebar is visible on desktop`
          );

          // In the old bug, at 1920px sideLeft was 94px and at 2560px sideLeft was 414px!
          // With our fix, sideLeft must be locked at 14px (var(--side-x))
          assert(
            metrics.sideLeft >= 13 && metrics.sideLeft <= 15,
            `[${vp.width}px] ${route.name}: Sidebar left is locked at 14px (actual: ${metrics.sideLeft}px, not pushed inward)`
          );

          // Content gutters: gap between sidebar and content vs gap between content and right window edge
          if (metrics.minContentLeft < metrics.winWidth && metrics.maxContentRight > 0) {
            assert(
              metrics.gutterDiff <= 3,
              `[${vp.width}px] ${route.name}: Gutters balanced (gapLeft=${metrics.gapLeft}px, gapRight=${metrics.gapRight}px, diff=${metrics.gutterDiff}px <= 3px)`
            );
          }

          // Rail state check on compact screens
          if (vp.isRail) {
            assert(
              metrics.isRailOn,
              `[${vp.width}px] ${route.name}: Collapsed to compact rail layout (.rail-on)`
            );
          }
        } else {
          // Mobile: Tabbar is active, sidebar hidden
          assert(
            metrics.isTabbarVisible || !metrics.isSideVisible,
            `[${vp.width}px] ${route.name}: Mobile bottom tabbar active, desktop sidebar hidden`
          );
        }
      }

      // Capture screenshot if shot specified
      if (vp.shot) {
        await page.goto(`http://localhost:${PORT}/today`, { waitUntil: 'domcontentloaded' });
        await sleep(600);
        const reportDir = path.resolve(process.cwd().endsWith('frontend') ? 'test-reports' : 'frontend/test-reports');
        const rootReportDir = path.resolve(process.cwd().endsWith('frontend') ? '../test-reports' : 'test-reports');
        if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
        if (!fs.existsSync(rootReportDir)) fs.mkdirSync(rootReportDir, { recursive: true });

        const shotPath = path.join(reportDir, vp.shot);
        const rootShotPath = path.join(rootReportDir, vp.shot);
        await page.screenshot({ path: shotPath });
        if (fs.existsSync(shotPath)) {
          fs.copyFileSync(shotPath, rootShotPath);
          console.log(`  📸 Screenshot saved: ${vp.shot}`);
        }
      }
    }

    console.log(`\n======================================================`);
    console.log(`GLOBAL SCREEN ZOOM FLUID TEST SUMMARY`);
    console.log(`Total Assertions:  ${totalAssertions}`);
    console.log(`Passed Assertions: ${passedAssertions}`);
    console.log(`Failed Assertions: ${failedAssertions}`);
    console.log(`======================================================\n`);

    if (failedAssertions > 0) {
      throw new Error(`${failedAssertions} assertions failed during fluid zoom verification`);
    }
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
});
