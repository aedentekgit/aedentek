/**
 * PAGE HEADERS HAVE NO DESCRIPTIVE PARAGRAPH — GLOBAL TEST
 * Visits every main page and checks the title card holds only the breadcrumb,
 * the title and (where a page has them) its action buttons.
 *
 * Run: node test/test-header-no-subtitle.mjs   (backend must be running on :5001)
 */
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8099;
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
  '/today', '/clients', '/deals', '/projects', '/inbox', '/calendar', '/outreach/sequences', '/finance/invoices', '/finance/propagations',
  '/reports', '/team', '/library', '/support', '/profile', '/settings',
  '/accounts/dashboard', '/accounts/sales', '/accounts/expenses', '/accounts/expense-categories', '/accounts/inward-expenses', '/accounts/emi',
  '/accounts/credit-notes', '/accounts/assets', '/accounts/asset-categories', '/accounts/adjustment-entry', '/accounts/reports',
  '/hr/staff', '/hr/branches', '/hr/attendance', '/hr/leave', '/hr/leave-types', '/hr/shifts', '/hr/salary', '/hr/advances', '/hr/adjustments', '/hr/payroll'
];

server.listen(PORT, async () => {
  let passed = 0; let failed = 0;
  const assert = (c, m) => { if (c) { console.log(`  ✓ [PASS] ${m}`); passed++; } else { console.error(`  ✗ [FAIL] ${m}`); failed++; } };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1700, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  console.log('=== 1. NO DESCRIPTIVE PARAGRAPH ON ANY PAGE ===');
  const sizes = {};
  for (const route of ROUTES) {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded' });
    try { await page.waitForSelector('.phead', { timeout: 8000 }); } catch { console.log(`  · ${route}: no .phead header on this page (skipped)`); continue; }
    await sleep(700);
    const r = await page.evaluate(() => {
      const h = document.querySelector('.phead');
      const subs = [...document.querySelectorAll('.phead__sub')].filter((e) => getComputedStyle(e).display !== 'none' && e.offsetHeight > 0);
      return { subs: document.querySelectorAll('.phead__sub').length, visibleSubs: subs.length, paras: h.querySelectorAll('p').length, title: h.querySelector('.ttl, h1')?.textContent?.trim(), crumbs: !!h.querySelector('.crumbs'), h: Math.round(h.getBoundingClientRect().height) };
    });
    sizes[route] = r.h;
    assert(r.subs === 0 && r.visibleSubs === 0 && r.paras === 0, `${route}: header has no paragraph (title "${r.title}", ${r.h}px)`);
  }

  console.log('\n=== 2. WHAT STAYS IN THE HEADER ===');
  await page.goto(`http://localhost:${PORT}/accounts/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.phead'); await sleep(900);
  const ov = await page.evaluate(() => ({ actions: [...document.querySelectorAll('.phead__actions button, .phead__actions a')].map((b) => b.innerText.trim()), crumbs: !!document.querySelector('.phead .crumbs'), title: document.querySelector('.phead .ttl')?.textContent?.trim() }));
  assert(ov.crumbs && ov.title === 'Accounts Overview' && ov.actions.includes('Add expense') && ov.actions.includes('Create invoice'), `Overview keeps breadcrumb, title and its buttons (${ov.actions.join(', ')})`);
  await page.goto(`http://localhost:${PORT}/accounts/emi`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.phead'); await sleep(900);
  const emi = await page.evaluate(() => ({ text: document.querySelector('.phead').innerText.replace(/\s+/g, ' '), h: Math.round(document.querySelector('.phead').getBoundingClientRect().height) }));
  assert(/EMI/.test(emi.text) && !/calculated automatically/.test(emi.text), `EMI header is just breadcrumb + title (${emi.text})`);
  assert(emi.h < 150, `the title card is compact now (${emi.h}px)`);
  const body = await page.evaluate(() => document.querySelectorAll('.kpis .kpi').length);
  assert(body === 4, 'the page content below the header is untouched (4 KPI cards)');
  assert(errors.length === 0, `zero uncaught page errors (${errors.length})`);
  errors.slice(0, 5).forEach((e) => console.error('   ->', e));
  console.log(`\nHEADER NO-SUBTITLE TEST RESULT: ${passed} passed, ${failed} failed`);
  await browser.close(); server.close(); process.exit(failed > 0 ? 1 : 0);
});
