import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 8092;
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

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath.startsWith('/tessly/assets/')) {
    reqPath = reqPath.replace('/tessly/assets/', '/assets/');
  }
  const baseDir = fs.existsSync(path.join(process.cwd(), 'frontend')) ? path.join(process.cwd(), 'frontend') : process.cwd();
  let filePath = path.join(baseDir, reqPath === '/' || reqPath.startsWith('/tessly') && !reqPath.includes('.') ? 'index.html' : reqPath);
  if (!fs.existsSync(filePath)) filePath = path.join(baseDir, 'index.html');
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
  console.log(`[TEST-HEADER-SERVER] Listening on http://localhost:${PORT}`);
  console.log('[TEST-RUNNER] Verifying Header Container UI/UX (Matching Sidebar Aesthetic)...');

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

  await page.goto(`http://localhost:${PORT}/today`, { waitUntil: 'networkidle0' });

  assert(!page.url().includes('#'), `URL contains zero hash symbol (#): ${page.url()}`);

  // 1. Container Positioning & Layout
  const topStyles = await page.evaluate(() => {
    const el = document.querySelector('header.top');
    const cs = window.getComputedStyle(el);
    return {
      position: cs.position,
      top: cs.top,
      marginTop: cs.marginTop,
      marginLeft: cs.marginLeft,
      marginRight: cs.marginRight,
      borderRadius: cs.borderRadius,
      backgroundColor: cs.backgroundColor,
      boxShadow: cs.boxShadow,
      border: cs.border,
      height: cs.height,
    };
  });

  assert(topStyles.position === 'sticky', 'Header has sticky positioning');
  assert(parseInt(topStyles.top, 10) === 14, `Header top offset is 14px floating (${topStyles.top})`);
  assert(parseInt(topStyles.marginTop, 10) === 14, `Header top margin is 14px (${topStyles.marginTop})`);
  assert(parseInt(topStyles.marginLeft, 10) === 0, 'Header sits contained without negative left margin bleed');
  assert(parseInt(topStyles.marginRight, 10) === 0, 'Header sits contained without negative right margin bleed');
  assert(parseInt(topStyles.borderRadius, 10) >= 20, `Header has rounded container corners (${topStyles.borderRadius})`);
  assert(topStyles.boxShadow && topStyles.boxShadow !== 'none', 'Header has floating container elevation shadow');

  // 2. Inner Elements Test
  const elementsPresent = await page.evaluate(() => {
    return {
      sidebarToggle: !!document.querySelector('header.top .top__sidebar-toggle'),
      search: !!document.querySelector('header.top .search'),
      searchKbd: !!document.querySelector('header.top .search .kbd'),
      clock: !!document.querySelector('header.top .top__clock'),
      liveDot: !!document.querySelector('header.top .top__clock .live-dot'),
      newBtn: !!document.querySelector('header.top .btn--primary.top__new'),
      bell: !!document.querySelector('header.top .top__bell'),
      themeToggle: !!document.querySelector('header.top .ibtn.top__theme'),
      meBtn: !!document.querySelector('header.top .me-btn'),
    };
  });

  assert(elementsPresent.sidebarToggle, 'Sidebar open/close menu button is present on the header left side');
  assert(!elementsPresent.search, 'Search input container pill has been removed from the header');
  assert(!elementsPresent.searchKbd, 'Search bar shortcut key (⌘K) has been removed from the header');
  assert(!elementsPresent.clock && !elementsPresent.liveDot, 'Live clock badge has been removed from the header');
  assert(!elementsPresent.newBtn, '+ New action button has been removed from the header');
  assert(elementsPresent.bell, 'Notification bell icon is present in the header in place of + New');
  assert(!elementsPresent.themeToggle, 'Theme switch button has been removed from the header');
  assert(elementsPresent.meBtn, 'Account avatar profile container is present');

  // 3. Dark Mode Test
  await page.evaluate(() => {
    const themeBtn = document.querySelector('header.top .ibtn.top__theme');
    if (themeBtn) {
      themeBtn.click();
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.dataset.theme = 'dark';
    }
  });
  // Wait for the theme transition to settle rather than relying on a fixed
  // sleep — under load the header background can still be mid-transition.
  await page.waitForFunction(() => {
    const el = document.querySelector('header.top');
    if (!el) return false;
    const bg = window.getComputedStyle(el).backgroundColor;
    return bg.includes('rgba(21, 26, 34') || bg.includes('rgb(21, 26, 34)');
  }, { timeout: 5000 }).catch(() => {});
  const darkStyles = await page.evaluate(() => {
    const el = document.querySelector('header.top');
    const cs = window.getComputedStyle(el);
    return {
      backgroundColor: cs.backgroundColor,
      borderRadius: cs.borderRadius,
      boxShadow: cs.boxShadow,
      borderColor: cs.borderColor,
    };
  });
  assert(darkStyles.backgroundColor.includes('rgba(21, 26, 34') || darkStyles.backgroundColor.includes('rgb(21, 26, 34)'), `Header dark theme background token active (${darkStyles.backgroundColor})`);
  assert(darkStyles.borderColor.includes('rgba(255, 255, 255, 0.1)'), `Header dark theme border token active (${darkStyles.borderColor})`);

  console.log(`\n===========================================`);
  console.log(`HEADER CONTAINER TEST RESULT: ${passed} passed, ${failed} failed`);
  console.log(`===========================================\n`);

  await browser.close();
  server.close();
  process.exit(failed > 0 ? 1 : 0);
});
