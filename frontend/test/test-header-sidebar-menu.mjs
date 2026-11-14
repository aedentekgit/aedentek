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

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath.startsWith('/tessly/assets/')) {
    reqPath = reqPath.replace('/tessly/assets/', '/assets/');
  }
  const baseDir = fs.existsSync(path.join(process.cwd(), 'frontend/index.html'))
    ? path.join(process.cwd(), 'frontend')
    : process.cwd();
  let cleanPath = reqPath.startsWith('/') ? reqPath.slice(1) : reqPath;
  let filePath = path.join(baseDir, !cleanPath || cleanPath.startsWith('tessly') && !cleanPath.includes('.') ? 'index.html' : cleanPath);
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
  console.log(`[TEST-SERVER] Listening on http://localhost:${PORT}`);
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

  await page.goto(`http://localhost:${PORT}/inbox`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  // 1. Verify header search shortcut (⌘K) is removed
  const searchKbd = await page.evaluate(() => {
    return document.querySelector('header.top .search .kbd');
  });
  assert(searchKbd === null, 'Search bar shortcut key (⌘K) is completely removed');

  // 2. Verify sidebar open/close menu button is on the header left side
  const toggleBtn = await page.evaluate(() => {
    const btn = document.querySelector('header.top .top__sidebar-toggle');
    if (!btn) return null;
    const header = document.querySelector('header.top');
    const hRect = header ? header.getBoundingClientRect() : null;
    const bRect = btn.getBoundingClientRect();
    return {
      exists: true,
      isOnLeft: hRect ? bRect.left < (hRect.left + hRect.width / 2) : true,
      width: bRect.width,
      height: bRect.height,
      iconName: btn.querySelector('svg') ? 'svg present' : 'none'
    };
  });
  assert(toggleBtn && toggleBtn.exists, 'Sidebar open/close menu button exists in header');
  assert(toggleBtn.isOnLeft, 'Sidebar toggle is positioned on left side of header');
  assert(toggleBtn && toggleBtn.width >= 36 && toggleBtn.height >= 36, `Button size is standard 40px icon button (${toggleBtn?.width}x${toggleBtn?.height})`);

  // 3. Test clicking sidebar toggle menu button to collapse/expand sidebar
  const initialRail = await page.evaluate(() => document.documentElement.classList.contains('is-rail'));
  console.log(`Initial sidebar rail state: ${initialRail}`);

  // Click menu button
  await page.click('header.top .top__sidebar-toggle');
  await new Promise((r) => setTimeout(r, 800));
  const afterClickRail = await page.evaluate(() => document.documentElement.classList.contains('is-rail'));
  assert(afterClickRail !== initialRail, `Clicking header menu button toggled sidebar rail (was ${initialRail}, now ${afterClickRail})`);

  // Screenshot collapsed sidebar
  const artifactDir = path.resolve('test-reports');
  fs.mkdirSync(artifactDir, { recursive: true });
  await page.screenshot({ path: path.join(artifactDir, 'sidebar_collapsed_via_menu.png') });

  // Click again to restore/expand
  await page.click('header.top .top__sidebar-toggle');
  await new Promise((r) => setTimeout(r, 800));
  const restoredRail = await page.evaluate(() => document.documentElement.classList.contains('is-rail'));
  assert(restoredRail === initialRail, `Clicking header menu button again restored sidebar (now ${restoredRail})`);

  // 4. Test account dropdown menu: verify 'Keyboard shortcuts' is removed
  await page.click('header.top .me-btn');
  await new Promise((r) => setTimeout(r, 600));

  const menuItems = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.menu .menu__item')].map((el) => el.textContent.trim());
    return items;
  });
  console.log('Account dropdown menu items:', menuItems);
  assert(!menuItems.includes('Keyboard shortcuts'), "'Keyboard shortcuts' is completely removed from account dropdown menu");
  assert(menuItems.includes('Profile & settings'), "'Profile & settings' remains in menu");
  assert(menuItems.some((i) => i.includes('theme')), "Theme toggle remains in menu");
  assert(menuItems.includes('Help center'), "'Help center' remains in menu");
  assert(menuItems.includes('Sign out'), "'Sign out' remains in menu");

  // Screenshot user account dropdown
  await page.screenshot({ path: `${artifactDir}/account_menu_no_shortcuts.png` });

  // Crop header section
  const headerClip = await page.evaluate(() => {
    const el = document.querySelector('header.top');
    const rect = el.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  await page.screenshot({
    path: `${artifactDir}/header_sidebar_toggle_no_cmd_k.png`,
    clip: { x: Math.max(0, headerClip.x - 10), y: Math.max(0, headerClip.y - 10), width: headerClip.width + 20, height: headerClip.height + 20 }
  });

  console.log(`\n===========================================`);
  console.log(`HEADER SIDEBAR MENU & SHORTCUTS TEST RESULT: ${passed} passed, ${failed} failed`);
  console.log(`===========================================\n`);

  await browser.close();
  server.close();
  process.exit(failed > 0 ? 1 : 0);
});
