/**
 * GLOBAL CARD LEFT-ACCENT BORDER TEST
 * Verifies the theme-colour left accent border on every .card, driven by
 * the global controls engine (assets/global-themed-controls.js):
 *  - 4px left border in the live --primary colour (light: #7627c4)
 *  - follows dark mode (--primary becomes #b88bf8)
 *  - follows a custom primary applied via __tlApplyTheme
 *
 * Run: node test/test-card-accent-border.mjs   (backend must be running on :5001)
 */
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8141;
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

const ROUTES = [
  { name: 'Project Stage Master', path: '/clients/project-stages', shot: 'card_accent_stages.png' },
  { name: 'Tax Invoices', path: '/finance/invoices', shot: 'card_accent_invoices.png' },
];

server.listen(PORT, async () => {
  let passed = 0; let failed = 0;
  const assert = (c, m) => { if (c) { console.log(`  ✓ [PASS] ${m}`); passed++; } else { console.error(`  ✗ [FAIL] ${m}`); failed++; } };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  const cardMetrics = () => {
    const cards = [...document.querySelectorAll('.card')].filter((c) => c.getBoundingClientRect().width > 0);
    if (!cards.length) return { count: 0 };
    const cs = cards.map((c) => getComputedStyle(c));
    return {
      count: cards.length,
      all4px: cs.every((s) => s.borderLeftWidth === '4px'),
      allSolid: cs.every((s) => s.borderLeftStyle === 'solid'),
      colors: [...new Set(cs.map((s) => s.borderLeftColor))],
      primary: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
    };
  };

  try {
    // Login
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    await sleep(800);
    if (await page.$('.lg-submit')) {
      await page.type('input[type="email"]', 'ines@caldermoss.co');
      await page.type('input[autocomplete="current-password"]', 'marble88');
      await page.click('.lg-submit');
      await sleep(1500);
    }
    await page.waitForSelector('.side', { timeout: 20000 });

    // --- LIGHT THEME: accent border present & equals --primary ---
    for (const r of ROUTES) {
      console.log(`\n--- ${r.name} (${r.path}) — light theme ---`);
      await page.goto(`http://localhost:${PORT}${r.path}`, { waitUntil: 'networkidle2' });
      await sleep(900);
      const m = await page.evaluate(cardMetrics);
      assert(m.count > 0, `cards present (count=${m.count})`);
      assert(m.all4px && m.allSolid, `every card has a 4px solid left accent border`);
      assert(m.colors.length === 1 && /^rgb\(118, 39, 196\)$/.test(m.colors[0]), `accent colour = light primary #7627c4 (got ${m.colors.join(', ')})`);
      await page.screenshot({ path: path.join(appDir, 'test-reports', r.shot) });
      assert(fs.existsSync(path.join(appDir, 'test-reports', r.shot)), `screenshot captured (${r.shot})`);
    }

    // --- DARK MODE: accent follows dark primary #b88bf8 ---
    console.log('\n--- Dark mode — accent follows #b88bf8 ---');
    await page.goto(`http://localhost:${PORT}/clients/project-stages`, { waitUntil: 'networkidle2' });
    await sleep(600);
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await sleep(600);
    const dm = await page.evaluate(cardMetrics);
    assert(dm.count > 0, `cards present in dark mode (count=${dm.count})`);
    assert(dm.all4px && dm.allSolid, `4px solid left border persists in dark mode`);
    assert(dm.colors.length === 1 && /^rgb\(184, 139, 248\)$/.test(dm.colors[0]), `accent colour = dark primary #b88bf8 (got ${dm.colors.join(', ')})`);
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));

    // --- CUSTOM PRIMARY: accent follows __tlApplyTheme ---
    console.log('\n--- Custom primary (#0ea5e9) — accent follows theme engine ---');
    await page.evaluate(() => window.__tlApplyTheme({ primaryColor: '#0ea5e9', secondaryColor: '#4d33b6', headerFont: 'Plus Jakarta Sans', paragraphFont: 'Plus Jakarta Sans' }));
    await sleep(400);
    const cm = await page.evaluate(cardMetrics);
    assert(cm.all4px, `4px left border still applies after theme change`);
    assert(cm.colors.length === 1 && /^rgb\(14, 165, 233\)$/.test(cm.colors[0]), `accent colour = custom primary #0ea5e9 (got ${cm.colors.join(', ')})`);
    await page.screenshot({ path: path.join(appDir, 'test-reports', 'card_accent_custom_primary.png') });
    // restore default
    await page.evaluate(() => window.__tlApplyTheme({ primaryColor: '#7627c4', secondaryColor: '#4d33b6', headerFont: 'Plus Jakarta Sans', paragraphFont: 'Plus Jakarta Sans' }));
    await sleep(300);

    assert(pageErrors.length === 0, `no uncaught page errors (got ${pageErrors.length})${pageErrors.length ? ': ' + pageErrors.slice(0, 3).join(' | ') : ''}`);
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n================================================`);
  console.log(`CARD ACCENT BORDER: ${passed} passed, ${failed} failed`);
  console.log(`================================================`);
  process.exit(failed ? 1 : 0);
});
