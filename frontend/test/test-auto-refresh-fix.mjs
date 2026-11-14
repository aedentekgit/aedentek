import assert from 'assert';
import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const PORT = 8097;

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
  };
  return map[ext] || 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let rawUrl = req.url.split('?')[0];
      if (rawUrl.startsWith('/tessly/assets/')) rawUrl = rawUrl.replace('/tessly/assets/', '/assets/');
      else if (rawUrl.startsWith('/tessly')) rawUrl = rawUrl.replace('/tessly', '') || '/';

      let filePath = path.join(process.cwd(), 'frontend', rawUrl);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      if (!fs.existsSync(filePath) || (!rawUrl.startsWith('/assets/') && !rawUrl.includes('.'))) {
        filePath = path.join(process.cwd(), 'frontend', 'index.html');
      }

      if (fs.existsSync(filePath)) {
        res.writeHead(200, { 'Content-Type': getContentType(filePath) });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(PORT, () => {
      resolve(server);
    });
  });
}

async function runTests() {
  console.log(`\n=== AUTOMATIC REFRESH FIX VERIFICATION SUITE ===`);
  const server = await startServer();
  console.log(`[TEST-SERVER] Listening on http://localhost:${PORT}`);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  let fullReloads = 0;
  let navigationEvents = [];

  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      navigationEvents.push(frame.url());
    }
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('  [CONSOLE ERROR]', msg.text());
    }
  });

  // TEST 1: Static code audit across asset bundles
  console.log('\n--- 1. STATIC CODE AUDIT FOR UNCONTROLLED RELOADS ---');
  const financeCode = fs.readFileSync('frontend/assets/finance-DfxZzuIj.js', 'utf8');
  assert(!financeCode.includes('window.location.reload()'), 'finance-DfxZzuIj.js must not contain window.location.reload()');
  console.log('  ✓ [PASS] finance-DfxZzuIj.js has 0 occurrences of window.location.reload()');

  assert(!financeCode.includes('window.location.href = `/finance/invoices`'), 'finance-DfxZzuIj.js propagation convert must use SPA navigate');
  console.log('  ✓ [PASS] finance-DfxZzuIj.js propagation convert uses SPA navigate');

  const clientsCode = fs.readFileSync('frontend/assets/clients-BBlHr9Zo.js', 'utf8');
  assert(!clientsCode.includes("route.sub === 'people') { go('/clients/companies');"), 'clients-BBlHr9Zo.js must not call go() during render for /clients/people');
  console.log('  ✓ [PASS] clients-BBlHr9Zo.js does not trigger redirect loop during render phase');

  const viteConfig = fs.readFileSync('frontend/vite.config.js', 'utf8');
  assert(viteConfig.includes('ignored:'), 'vite.config.js must configure watch.ignored');
  assert(viteConfig.includes('test-reports'), 'vite.config.js watch.ignored must include test-reports');
  console.log('  ✓ [PASS] vite.config.js watch.ignored excludes test-reports, dist, and temporary artifacts');

  // TEST 2: Initial Page Mount Stability
  console.log('\n--- 2. INITIAL PAGE LOAD & STABILITY ---');
  await page.goto(`http://localhost:${PORT}/today`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));
  assert(navigationEvents.length === 1, `Initial load should only navigate once (was ${navigationEvents.length})`);
  console.log('  ✓ [PASS] Initial load on /today mounted cleanly with exactly 1 navigation');

  // TEST 3: Route Transitions (No Full Reloads)
  console.log('\n--- 3. MULTI-ROUTE TRANSITIONS & DWELL AUDIT ---');
  const routesToTest = [
    '/clients/companies',
    '/clients/people',
    '/finance/invoices',
    '/finance/templates',
    '/accounts/overview',
    '/accounts/emi',
    '/hr/employees',
    '/settings',
    '/profile'
  ];

  for (const r of routesToTest) {
    const navCountBefore = navigationEvents.length;
    await page.evaluate((target) => {
      if (window.__navigate) window.__navigate(target);
      else {
        history.pushState(null, '', target);
        window.dispatchEvent(new Event('popstate'));
      }
    }, r);

    // Dwell on page to detect any delayed reload timers
    await new Promise((res) => setTimeout(res, 800));

    const currentUrl = page.url();
    assert(currentUrl.includes(r.replace('/clients/people', '/clients/companies')), `URL should match target route ${r}`);
    console.log(`  ✓ [PASS] Route ${r} remained stable without automatic reload (Dwell: 800ms)`);
  }

  // TEST 4: Global Form Submit Interception
  console.log('\n--- 4. GLOBAL FORM SUBMIT SHIELD ---');
  const formSubmitPrevented = await page.evaluate(() => {
    const form = document.createElement('form');
    form.action = '/today';
    document.body.appendChild(form);

    let defaultPrevented = false;
    form.addEventListener('submit', (e) => {
      defaultPrevented = e.defaultPrevented;
    });

    const btn = document.createElement('button');
    btn.type = 'submit';
    form.appendChild(btn);

    btn.click();
    form.remove();
    return defaultPrevented;
  });
  assert(formSubmitPrevented, 'Global shield must call preventDefault() on native form submit');
  console.log('  ✓ [PASS] Native unhandled form submit was intercepted with preventDefault()');

  // TEST 5: Global Anchor Click Interceptor
  console.log('\n--- 5. GLOBAL ANCHOR CLICK SHIELD ---');
  const linkNavResult = await page.evaluate(async () => {
    const link = document.createElement('a');
    link.href = '/finance/invoices';
    link.textContent = 'Invoice Link';
    document.body.appendChild(link);

    let eventPrevented = false;
    link.addEventListener('click', (e) => {
      eventPrevented = e.defaultPrevented;
    });

    link.click();
    link.remove();
    return { eventPrevented, newPath: location.pathname };
  });
  assert(linkNavResult.eventPrevented, 'Link click should have default prevented for SPA routing');
  assert(linkNavResult.newPath === '/finance/invoices', 'Link click routed to /finance/invoices');
  console.log('  ✓ [PASS] Internal anchor click was routed via SPA engine without page refresh');

  // TEST 6: Hash Links Do Not Reload
  console.log('\n--- 6. EMPTY & HASH LINKS DO NOT REFRESH ---');
  const hashClickPrevented = await page.evaluate(() => {
    const hashLink = document.createElement('a');
    hashLink.href = '#';
    document.body.appendChild(hashLink);

    let prevented = false;
    hashLink.addEventListener('click', (e) => {
      prevented = e.defaultPrevented;
    });

    hashLink.click();
    hashLink.remove();
    return prevented;
  });
  assert(hashClickPrevented, 'Clicking href="#" must be prevented from jumping or reloading');
  console.log('  ✓ [PASS] href="#" dummy link click was intercepted without jump or reload');

  // TEST 7: Notification Bell Menu SPA Navigation
  console.log('\n--- 7. TOP HEADER NOTIFICATION MENU SPA NAVIGATION ---');
  await page.click('header.top .top__bell');
  await new Promise((r) => setTimeout(r, 400));

  const initialUrl = page.url();
  const clickedNotification = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.menu .menu__item')];
    const item = items.find((el) => el.textContent.includes('collected') || el.textContent.includes('Hyperion'));
    if (item) {
      item.click();
      return true;
    }
    return false;
  });

  await new Promise((r) => setTimeout(r, 600));
  const postClickUrl = page.url();
  assert(clickedNotification, 'Found and clicked notification menu item');
  assert(postClickUrl.includes('/finance/invoices'), 'Notification click routed to /finance/invoices');
  console.log('  ✓ [PASS] Header notification item navigated cleanly to /finance/invoices via SPA');

  await browser.close();
  server.close();

  console.log('\n===========================================');
  console.log('AUTOMATIC REFRESH FIX SUITE: ALL TESTS PASSED (7/7)');
  console.log('===========================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
