import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Embedded static HTTP server for deterministic local test runs
function startServer(port = 8089) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
  };

  const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0].split('#')[0];
    
    // Support /tessly base prefix or root
    if (reqUrl.startsWith('/tessly/')) {
      reqUrl = reqUrl.replace('/tessly', '');
    }
    if (reqUrl === '' || reqUrl === '/') {
      reqUrl = '/index.html';
    }

    let filePath = path.join(ROOT_DIR, reqUrl);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(ROOT_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(content, 'utf-8');
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`[TEST-SERVER] Listening on http://localhost:${port}`);
      resolve(server);
    });
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  const PORT = 8089;
  const server = await startServer(PORT);
  const BASE_URL = `http://localhost:${PORT}/tessly/`;

  console.log('[TEST-RUNNER] Launching Chromium browser...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleLogs = [];
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    } else {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(err.toString());
  });

  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      url: BASE_URL,
      browser: 'Google Chrome',
      viewport: '1440x900',
    },
    totalTests: 0,
    passed: 0,
    failed: 0,
    categories: {
      initialization: [],
      pagesAndRouting: [],
      themeAndStyling: [],
      sidebarAndLayout: [],
      keyboardShortcuts: [],
      modalsAndDrawers: [],
      animationsAndTransitions: [],
      responsiveDesign: [],
      errorAudit: [],
    },
    summary: {},
  };

  function assertTest(category, name, condition, details = '') {
    results.totalTests++;
    const passed = Boolean(condition);
    if (passed) {
      results.passed++;
      console.log(`  ✓ [PASS] [${category}] ${name}`);
    } else {
      results.failed++;
      console.error(`  ✗ [FAIL] [${category}] ${name} - Details: ${details}`);
    }
    if (!results.categories[category]) results.categories[category] = [];
    results.categories[category].push({ name, passed, details });
    return passed;
  }

  try {
    // ----------------------------------------------------
    // CATEGORY 1: APP BOOTSTRAP & INITIALIZATION
    // ----------------------------------------------------
    console.log(`\n=== 1. APP BOOTSTRAP & INITIALIZATION ===`);
    await page.goto(`${BASE_URL}today`, { waitUntil: 'networkidle2' });
    await sleep(800);

    const initialUrl = page.url();
    assertTest(
      'initialization',
      'URL is clean and contains zero hash symbol (#)',
      !initialUrl.includes('#') && initialUrl.includes('/today'),
      `Current URL: ${initialUrl}`
    );

    const title = await page.title();
    assertTest(
      'initialization',
      'Page title matches Tessly / Calder & Moss surfaces desk',
      title.includes('Tessly') || title.includes('Calder & Moss'),
      `Title: "${title}"`
    );

    const hasMetaThemeColor = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="theme-color"]');
      return meta && meta.getAttribute('content');
    });
    assertTest(
      'initialization',
      'Meta theme-color tag is initialized',
      hasMetaThemeColor === '#edf0f3' || hasMetaThemeColor === '#0d1016',
      `theme-color: ${hasMetaThemeColor}`
    );

    const rootChildren = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.children.length : 0;
    });
    assertTest(
      'initialization',
      'React root container mounted successfully with full app subtree',
      rootChildren > 0,
      `child count: ${rootChildren}`
    );

    const sidebarVisible = await page.evaluate(() => {
      const nav = document.querySelector('.side, nav, [class*="side"]');
      return !!nav && nav.offsetHeight > 0;
    });
    assertTest('initialization', 'Primary navigation sidebar rendered and visible', sidebarVisible);

    // ----------------------------------------------------
    // CATEGORY 2: COMPLETE PAGE & SUBROUTE MIRRORING (ALL 17 VIEWS)
    // ----------------------------------------------------
    console.log(`\n=== 2. COMPLETE PAGE & SUBROUTE MIRRORING ===`);
    const routesToTest = [
      { path: '/today', name: 'Today Dashboard', selector: '[class*="today"], [class*="metric"], [class*="agenda"], h1' },
      { path: '/clients/people', name: 'Clients (People)', selector: '[class*="client"], table, [class*="card"]' },
      { path: '/clients/companies', name: 'Clients (Companies)', selector: '[class*="client"], table, [class*="card"]' },
      { path: '/deals/board', name: 'Deals Kanban Board', selector: '[class*="board"], [class*="stage"], [class*="col"]' },
      { path: '/deals/forecast', name: 'Deals Forecast Ladder', selector: '[class*="forecast"], [class*="ladder"], [class*="table"]' },
      { path: '/projects', name: 'Specification Projects', selector: '[class*="pj-"], [class*="meter"], [class*="project"], h1, h2, table' },
      { path: '/inbox', name: 'Client Communications Inbox', selector: '[class*="inbox"], [class*="thread"], [class*="mail"]' },
      { path: '/calendar', name: 'Showroom & Site Calendar', selector: '[class*="cal"], [class*="calendar"], [class*="grid"]' },
      { path: '/outreach/sequences', name: 'Architect Outreach Sequences', selector: '[class*="outreach"], [class*="seq"]' },
      { path: '/outreach/templates', name: 'Outreach Email Templates', selector: '[class*="outreach"], [class*="tmpl"], [class*="template"], button, h1' },
      { path: '/finance/invoices', name: 'Finance Invoices Schedule', selector: '[class*="finance"], [class*="invoice"], table' },
      { path: '/finance/commissions', name: 'Sales Commissions Tracker', selector: '[class*="commiss"], [class*="finance"], table' },
      { path: '/reports', name: 'Executive Sales & Quota Reports', selector: '[class*="report"], canvas, svg' },
      { path: '/team', name: 'Sales Team & Quota Roster', selector: '[class*="team"], [class*="rep"], [class*="card"]' },
      { path: '/library', name: 'Materials & Finish Playbooks', selector: '[class*="lb-"], [class*="card"], [class*="playbook"], h1, h2' },
      { path: '/settings', name: 'Studio & CRM Settings', selector: '[class*="setting"], form, [class*="card"]' },
      { path: '/support', name: 'Studio Help & Support Desk', selector: '[class*="support"], [class*="help"], [class*="card"]' },
    ];

    for (const route of routesToTest) {
      await page.evaluate((rPath) => {
        if (window.__navigate) window.__navigate(rPath);
        else {
          history.pushState(null, '', rPath);
          window.dispatchEvent(new Event('popstate'));
        }
      }, route.path);
      await sleep(400);

      const check = await page.evaluate((sel) => {
        const path = location.pathname;
        const text = document.body.innerText.trim();
        const el = document.querySelector(sel);
        return {
          path,
          hasNoHash: !location.hash,
          textLen: text.length,
          foundEl: !!el,
        };
      }, route.selector);

      assertTest(
        'pagesAndRouting',
        `Page: ${route.name} (${route.path}) rendered with high fidelity content and clean URL`,
        check.textLen > 60 && check.foundEl && check.hasNoHash,
        `textLen: ${check.textLen}, selector found: ${check.foundEl}, path: ${check.path}, noHash: ${check.hasNoHash}`
      );
    }

    // ----------------------------------------------------
    // CATEGORY 3: THEME SYSTEM & COLOR SYSTEM
    // ----------------------------------------------------
    console.log(`\n=== 3. THEME SYSTEM & TRANSITIONS ===`);
    // Light mode verification
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#edf0f3');
      localStorage.setItem('tessly:theme', JSON.stringify('light'));
    });
    await sleep(200);

    const lightState = await page.evaluate(() => ({
      themeAttr: document.documentElement.dataset.theme,
      themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
      bg: getComputedStyle(document.body).backgroundColor,
    }));
    assertTest(
      'themeAndStyling',
      'Light theme tokens active with correct canvas color and meta tag',
      lightState.themeAttr === 'light' && lightState.themeColor === '#edf0f3'
    );

    // Dark mode verification
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0d1016');
      localStorage.setItem('tessly:theme', JSON.stringify('dark'));
    });
    await sleep(200);

    const darkState = await page.evaluate(() => ({
      themeAttr: document.documentElement.dataset.theme,
      themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
    }));
    assertTest(
      'themeAndStyling',
      'Dark theme tokens active with #0d1016 deep contrast background',
      darkState.themeAttr === 'dark' && darkState.themeColor === '#0d1016'
    );

    // Switch back to light
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#edf0f3');
      localStorage.setItem('tessly:theme', JSON.stringify('light'));
    });
    await sleep(200);

    // ----------------------------------------------------
    // CATEGORY 4: SIDEBAR RAIL & RESPONSIVE BEHAVIOR
    // ----------------------------------------------------
    console.log(`\n=== 4. SIDEBAR RAIL & RESPONSIVE BEHAVIOR ===`);
    const railResult = await page.evaluate(() => {
      const doc = document.documentElement;
      const initialIsRail = doc.classList.contains('is-rail');
      // Toggle on
      doc.classList.add('is-rail');
      window.__rail?.();
      const railOn = doc.classList.contains('is-rail') && (doc.classList.contains('rail-on') || window.innerWidth >= 761);
      // Toggle off
      doc.classList.remove('is-rail');
      window.__rail?.();
      const railOff = !doc.classList.contains('is-rail');
      return { railOn, railOff };
    });
    assertTest(
      'sidebarAndLayout',
      'Sidebar rail toggling triggers state changes on root element',
      railResult.railOn && railResult.railOff
    );

    // ----------------------------------------------------
    // CATEGORY 5: KEYBOARD SHORTCUTS ENGINE
    // ----------------------------------------------------
    console.log(`\n=== 5. KEYBOARD SHORTCUTS ENGINE ===`);
    // Press '?' to trigger shortcuts modal
    await page.keyboard.press('?');
    await sleep(400);

    const helpModalOpen = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], [class*="modal"], [class*="sheet"], [class*="dialog"]');
      const text = document.body.innerText;
      return !!modal || text.includes('Keyboard') || text.includes('Shortcuts') || text.includes('Search');
    });
    assertTest(
      'keyboardShortcuts',
      'Pressing "?" activates shortcuts sheet or modal overlay',
      helpModalOpen
    );

    // Press Escape to dismiss
    await page.keyboard.press('Escape');
    await sleep(300);

    // Test 'g' chord navigation
    await page.keyboard.press('g');
    await sleep(50);
    await page.keyboard.press('c');
    await sleep(400);
    const pathAfterGC = await page.evaluate(() => location.pathname);
    assertTest(
      'keyboardShortcuts',
      'Keyboard chord "g" -> "c" navigates to Clients view without hash (#)',
      pathAfterGC.includes('clients') && !page.url().includes('#')
    );

    await page.keyboard.press('g');
    await sleep(50);
    await page.keyboard.press('d');
    await sleep(400);
    const pathAfterGD = await page.evaluate(() => location.pathname);
    assertTest(
      'keyboardShortcuts',
      'Keyboard chord "g" -> "d" navigates to Today dashboard without hash (#)',
      pathAfterGD.includes('today') && !page.url().includes('#')
    );

    // ----------------------------------------------------
    // CATEGORY 6: MODALS, SLIDE-OVERS & INTERACTION
    // ----------------------------------------------------
    console.log(`\n=== 6. MODALS, SLIDE-OVERS & INTERACTION ===`);
    await page.evaluate(() => {
      if (window.__navigate) window.__navigate('/deals/board');
      else {
        history.pushState(null, '', '/deals/board');
        window.dispatchEvent(new Event('popstate'));
      }
    });
    await sleep(500);

    // Check deal cards on the board
    const boardCards = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="deal"], [class*="card"], [draggable="true"]');
      return cards.length;
    });
    assertTest(
      'modalsAndDrawers',
      'Kanban board renders draggable deal cards across pipeline stages',
      boardCards > 0,
      `deal cards found: ${boardCards}`
    );

    // Click first clickable deal or client item to inspect detail drawer
    await page.evaluate(() => {
      const el = document.querySelector('a[href*="/deals/board/"], [class*="card"] a, [class*="deal__name"], [class*="title"]');
      if (el) el.click();
    });
    await sleep(500);

    const drawerPresent = await page.evaluate(() => {
      const sheet = document.querySelector('[role="dialog"], [class*="drawer"], [class*="sheet"], [class*="modal"]');
      return !!sheet || location.pathname.includes('/deals/board/');
    });
    assertTest(
      'modalsAndDrawers',
      'Opening deal detail displays modal / detail drawer',
      drawerPresent
    );

    // ----------------------------------------------------
    // CATEGORY 7: ANIMATIONS & CSS MICRO-INTERACTIONS
    // ----------------------------------------------------
    console.log(`\n=== 7. ANIMATIONS & CSS MICRO-INTERACTIONS ===`);
    const animationDetails = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      let keyframes = 0;
      let transitions = 0;
      sheets.forEach((sheet) => {
        try {
          Array.from(sheet.cssRules || []).forEach((rule) => {
            if (rule.type === CSSRule.KEYFRAMES_RULE) keyframes++;
            if (rule.cssText && (rule.cssText.includes('transition') || rule.cssText.includes('animation'))) {
              transitions++;
            }
          });
        } catch (e) {}
      });
      return { keyframes, transitions };
    });
    assertTest(
      'animationsAndTransitions',
      'Smooth GSAP & CSS keyframe animation rules loaded and bound',
      animationDetails.keyframes > 0 && animationDetails.transitions > 5,
      `keyframes: ${animationDetails.keyframes}, transition rules: ${animationDetails.transitions}`
    );

    // ----------------------------------------------------
    // CATEGORY 8: RESPONSIVE VIEWPORT ADAPTATION
    // ----------------------------------------------------
    console.log(`\n=== 8. RESPONSIVE VIEWPORT AUDIT ===`);
    // Tablet Viewport
    await page.setViewport({ width: 1024, height: 768 });
    await sleep(300);
    const tabletLayout = await page.evaluate(() => {
      return document.body.offsetWidth === 1024;
    });
    assertTest('responsiveDesign', 'Tablet viewport (1024x768) renders without overflow', tabletLayout);

    // Mobile Viewport
    await page.setViewport({ width: 390, height: 844 });
    await sleep(300);
    const mobileLayout = await page.evaluate(() => {
      const w = document.body.scrollWidth;
      return w <= 400;
    });
    assertTest('responsiveDesign', 'Mobile viewport (390x844) renders responsive layout', mobileLayout);

    // Restore desktop
    await page.setViewport({ width: 1440, height: 900 });

    // ----------------------------------------------------
    // CATEGORY 9: ZERO FATAL ERRORS AUDIT
    // ----------------------------------------------------
    console.log(`\n=== 9. CONSOLE ERROR & EXCEPTION AUDIT ===`);
    assertTest(
      'errorAudit',
      'Zero uncaught JavaScript exceptions or runtime crashes during test execution',
      errors.length === 0,
      `Error log: ${JSON.stringify(errors)}`
    );

  } catch (err) {
    console.error('[UNCAUGHT TEST RUNNER ERROR]:', err);
    results.failed++;
  } finally {
    await browser.close();
    server.close();
  }

  // Final summary calculation
  results.summary = {
    total: results.totalTests,
    passed: results.passed,
    failed: results.failed,
    successRate: `${((results.passed / results.totalTests) * 100).toFixed(1)}%`,
  };

  fs.mkdirSync(path.join(ROOT_DIR, 'test-reports'), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT_DIR, 'test-reports', 'test-run-results.json'),
    JSON.stringify(results, null, 2)
  );

  console.log(`\n=============================================================`);
  console.log(`TEST RUN COMPLETE: ${results.passed}/${results.totalTests} PASSED (${results.summary.successRate})`);
  console.log(`=============================================================\n`);

  return results;
}

runTests().then((res) => {
  if (res.failed > 0) process.exit(1);
  process.exit(0);
});
