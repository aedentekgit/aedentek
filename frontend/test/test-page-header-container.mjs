import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 8094;
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
  let filePath = path.join(appDir, reqPath === '/' || reqPath.startsWith('/tessly') && !reqPath.includes('.') ? 'index.html' : reqPath);
  if (!fs.existsSync(filePath)) filePath = path.join(appDir, 'index.html');
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, async () => {
  console.log(`[TEST-PHEAD-CONTAINER] Listening on http://localhost:${PORT}`);
  console.log('[TEST-RUNNER] Verifying Global Theme-Based Page Header & Tabs Container UI/UX...');

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

  // 1. Audit /finance/invoices (Header Container with Tabs Removed Globally)
  await page.goto(`http://localhost:${PORT}/finance/invoices`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.phead');
  await new Promise(r => setTimeout(r, 600));

  const pheadStyles = await page.evaluate(() => {
    const phead = document.querySelector('.phead');
    const tabs = document.querySelector('.tabs');
    const csPhead = window.getComputedStyle(phead);
    const csTabs = tabs ? window.getComputedStyle(tabs) : null;
    return {
      pheadBg: csPhead.backgroundColor,
      pheadBorderRadius: csPhead.borderRadius,
      pheadBorderTopLeftRadius: csPhead.borderTopLeftRadius,
      pheadBorderBottomLeftRadius: csPhead.borderBottomLeftRadius,
      pheadBoxShadow: csPhead.boxShadow,
      tabsDisplay: csTabs ? csTabs.display : 'none',
      crumbsDisplay: window.getComputedStyle(document.querySelector('.phead .crumbs')).display
    };
  });

  assert(pheadStyles.pheadBg && pheadStyles.pheadBg !== 'rgba(0, 0, 0, 0)', 'Page header has themed container background');
  assert(parseInt(pheadStyles.pheadBorderTopLeftRadius, 10) >= 20, `Page header has rounded top corners (${pheadStyles.pheadBorderTopLeftRadius})`);
  assert(parseInt(pheadStyles.pheadBorderBottomLeftRadius, 10) >= 20, `Page header has complete rounded bottom corners (${pheadStyles.pheadBorderBottomLeftRadius})`);
  assert(pheadStyles.pheadBoxShadow && pheadStyles.pheadBoxShadow !== 'none', 'Page header has elevated container shadow');
  assert(pheadStyles.crumbsDisplay === 'flex', 'Breadcrumbs are visible and flex-aligned inside page header container');
  assert(pheadStyles.tabsDisplay === 'none', 'In-page section tabs are removed globally (display: none)');

  // 2. Audit /today (Standalone Header Container without Tabs)
  await page.goto(`http://localhost:${PORT}/today`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.phead');
  await new Promise(r => setTimeout(r, 600));

  const todayStyles = await page.evaluate(() => {
    const phead = document.querySelector('.phead');
    const cs = window.getComputedStyle(phead);
    return {
      bg: cs.backgroundColor,
      topLeftRadius: cs.borderTopLeftRadius,
      bottomLeftRadius: cs.borderBottomLeftRadius,
      boxShadow: cs.boxShadow
    };
  });

  assert(parseInt(todayStyles.topLeftRadius, 10) >= 20, `Standalone header has rounded top corners (${todayStyles.topLeftRadius})`);
  assert(parseInt(todayStyles.bottomLeftRadius, 10) >= 20, `Standalone header has rounded bottom corners (${todayStyles.bottomLeftRadius})`);
  assert(todayStyles.boxShadow && todayStyles.boxShadow !== 'none', 'Standalone header has elevated container shadow');

  // 3. Dark Mode Verification
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await new Promise(r => setTimeout(r, 300));

  const darkStyles = await page.evaluate(() => {
    const phead = document.querySelector('.phead');
    const cs = window.getComputedStyle(phead);
    return {
      bg: cs.backgroundColor,
      borderColor: cs.borderColor
    };
  });

  assert(darkStyles.bg.includes('21, 26, 34'), `Dark mode container background active (${darkStyles.bg})`);

  console.log(`\n===========================================`);
  console.log(`GLOBAL CONTAINER TEST RESULT: ${passed} passed, ${failed} failed`);
  console.log(`===========================================\n`);

  await browser.close();
  server.close();
  process.exit(failed > 0 ? 1 : 0);
});
