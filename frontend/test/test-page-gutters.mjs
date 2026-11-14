/**
 * PAGE SIDE GAPS — GLOBAL TEST
 * The gap between the sidebar and the content (left) and between the content and
 * the window edge (right) must be small and equal, on every page and layout state.
 *
 * Run: node test/test-page-gutters.mjs   (backend must be running on :5001)
 */
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8100;
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

const ROUTES = ['/today', '/clients', '/deals', '/accounts/dashboard', '/accounts/expenses', '/accounts/inward-expenses', '/accounts/emi', '/hr/staff', '/hr/branches', '/reports', '/settings'];

server.listen(PORT, async () => {
  let passed = 0; let failed = 0;
  const assert = (c, m) => { if (c) { console.log(`  ✓ [PASS] ${m}`); passed++; } else { console.error(`  ✗ [FAIL] ${m}`); failed++; } };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const gaps = () => page.evaluate(() => {
    const side = document.querySelector('.side').getBoundingClientRect();
    const card = document.querySelector('.page .phead, .page .card, .page > *');
    const cards = [...document.querySelectorAll('.page .phead, .page .card, .page .kpi')];
    const left = Math.min(...cards.map((c) => c.getBoundingClientRect().left));
    const right = Math.max(...cards.map((c) => c.getBoundingClientRect().right));
    const vw = document.documentElement.clientWidth;
    const top = document.querySelector('header.top .top__sidebar-toggle').getBoundingClientRect();
    return { left: Math.round(left - side.right), right: Math.round(vw - right), gutter: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 0, scroll: document.documentElement.scrollWidth - vw, topLeft: Math.round(top.left - side.right), vw };
  });

  for (const vw of [1100, 1440, 1700]) {
    console.log(`\n=== VIEWPORT ${vw}px ===`);
    await page.setViewport({ width: vw, height: 900 });
    for (const route of ROUTES) {
      await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded' });
      try { await page.waitForSelector('.page', { timeout: 8000 }); } catch { console.log(`  · ${route}: no .page (skipped)`); continue; }
      await sleep(500);
      const g = await gaps();
      const eq = Math.abs(g.left - g.right) <= 1;
      assert(g.left <= 17 && g.right <= 17 && eq && g.scroll <= 0, `${route}: left gap ${g.left}px = right gap ${g.right}px (≤ 17px), no sideways scroll`);
    }
  }
  console.log('\n=== COLLAPSED SIDEBAR + MOBILE + OLD SPACING ===');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}/accounts/emi`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.page'); await sleep(600);
  const before = await gaps();
  await page.click('.top__sidebar-toggle'); await sleep(900);
  const rail = await gaps();
  assert(rail.left === rail.right && rail.left <= 17, `collapsed (icon-only) sidebar: left ${rail.left}px = right ${rail.right}px`);
  assert(rail.left === before.left, 'both layouts use the same gap');
  await page.click('.top__sidebar-toggle'); await sleep(700);
  const old = 14 + 1.8 * 1440 / 100 - 8;
  assert(before.left < old - 8, `the gap shrank (was about ${Math.round(old)}px on the left, now ${before.left}px)`);
  await page.setViewport({ width: 390, height: 800 });
  await page.goto(`http://localhost:${PORT}/accounts/emi`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.page'); await sleep(600);
  const mob = await page.evaluate(() => { const c = document.querySelector('.page .phead').getBoundingClientRect(); return { l: Math.round(c.left), r: Math.round(innerWidth - c.right), scroll: document.documentElement.scrollWidth - innerWidth }; });
  assert(mob.l >= 8 && mob.l <= 17 && mob.r >= 8 && mob.l === mob.r && mob.scroll <= 0, `phone (no sidebar): ${mob.l}px each side, no sideways scroll`);
  assert(errors.length === 0, `zero uncaught page errors (${errors.length})`);
  console.log(`\nPAGE GUTTERS TEST RESULT: ${passed} passed, ${failed} failed`);
  await browser.close(); server.close(); process.exit(failed > 0 ? 1 : 0);
});
