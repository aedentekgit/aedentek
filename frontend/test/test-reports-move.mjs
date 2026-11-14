/**
 * REPORTS MOVED UNDER ACCOUNTS — SIDEBAR + ROUTING TEST
 * ------------------------------------------------------------------
 *  - the top-level "Reports" entry (Money group) is gone
 *  - "Reports" now sits inside the Accounts menu, next to "Financial Reports"
 *  - the Reports page still opens, with the Accounts menu open and "Reports" highlighted
 *  - Financial Reports is unaffected
 *
 * Run: node test/test-reports-move.mjs   (backend must be running on :5001)
 */
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8098;
const API_TARGET = { host: 'localhost', port: 5001 };
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};
const appDir = path.resolve(process.cwd().endsWith('frontend') ? '.' : 'frontend');

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const proxied = http.request(
      { host: API_TARGET.host, port: API_TARGET.port, path: req.url, method: req.method, headers: req.headers },
      (up) => { res.writeHead(up.statusCode, up.headers); up.pipe(res); }
    );
    proxied.on('error', () => { res.writeHead(502); res.end('{}'); });
    req.pipe(proxied);
    return;
  }
  const reqPath = req.url.split('?')[0];
  let filePath = path.join(appDir, reqPath === '/' ? 'index.html' : reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = path.join(appDir, 'index.html');
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(500); res.end('Server Error'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(PORT, async () => {
  console.log(`[TEST-REPORTS-MOVE] Listening on http://localhost:${PORT}`);
  let passed = 0;
  let failed = 0;
  const assert = (c, m) => {
    if (c) { console.log(`  ✓ [PASS] ${m}`); passed++; } else { console.error(`  ✗ [FAIL] ${m}`); failed++; }
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1700, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const load = async (route) => {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.phead', { timeout: 15000 });
    await sleep(1400);
  };
  const side = () => page.evaluate(() => {
    const groups = [...document.querySelectorAll('.side__group')].map((g) => ({
      label: g.getAttribute('aria-label'),
      items: [...g.querySelectorAll('.nav__item')].map((a) => ({ text: (a.querySelector(':scope > span')?.textContent || a.textContent).trim(), href: a.getAttribute('href'), active: a.classList.contains('is-active'), open: a.classList.contains('is-open') })),
      subs: [...g.querySelectorAll('.nav__sub')].map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href'), active: a.classList.contains('is-active') }))
    }));
    return groups;
  });

  console.log('=== 1. SIDEBAR STRUCTURE ===');
  await load('/accounts/dashboard');
  let g = await side();
  const money = g.find((x) => x.label === 'Money');
  const acc = g.find((x) => x.label === 'Accounts');
  assert(money && money.items.map((i) => i.text).join('|') === 'Invoice', `Money group now holds only "Invoice" (${money && money.items.map((i) => i.text).join('|')})`);
  assert(!g.some((x) => x.items.some((i) => i.text === 'Reports' && i.href === '/reports')), 'there is no top-level "Reports" entry any more');
  assert(acc && acc.items[0].text === 'Accounts' && acc.items[0].open, 'Accounts menu is open on an Accounts page');
  const subs = acc ? acc.subs.map((s) => s.text) : [];
  assert(subs.includes('Reports') && subs.includes('Financial Reports'), `Accounts menu contains "Reports" and "Financial Reports" (${subs.length} items)`);
  assert(subs.indexOf('Reports') < subs.indexOf('Financial Reports') && subs.indexOf('Reports') > subs.indexOf('Adjustment Entry'), 'order: … Adjustment Entry, Reports, Financial Reports');
  const rep = acc.subs.find((s) => s.text === 'Reports');
  assert(rep && rep.href === '/reports', `"Reports" links to /reports (${rep && rep.href})`);
  const fin = acc.subs.find((s) => s.text === 'Financial Reports');
  assert(fin && fin.href === '/accounts/reports', `"Financial Reports" still links to /accounts/reports (${fin && fin.href})`);
  assert(!acc.subs.some((s) => s.active && s.text === 'Reports'), 'Reports is not highlighted while on the Overview');

  console.log('\n=== 2. THE MOVED PAGE ===');
  await page.evaluate(() => [...document.querySelectorAll('.nav__sub')].find((a) => a.textContent.trim() === 'Reports').click());
  await sleep(1800);
  const url = page.url();
  assert(/\/reports$/.test(url) && !url.includes('#'), `clicking it opens ${new URL(url).pathname}`);
  const content = await page.evaluate(() => ({ text: document.body.innerText, hasChart: !!document.querySelector('svg path[d]'), phead: !!document.querySelector('.phead'), label: document.querySelector('.top__page')?.innerText }));
  assert(/Won revenue/.test(content.text) && /Touchpoints logged/.test(content.text) && /Saved views/.test(content.text), 'the analytics report renders (metrics, saved views)');
  assert(content.hasChart && content.phead, 'chart and page header are present');
  g = await side();
  const acc2 = g.find((x) => x.label === 'Accounts');
  assert(acc2.items[0].active && acc2.items[0].open, 'on /reports the Accounts item is highlighted and its menu is open');
  assert(acc2.subs.filter((s) => s.active).map((s) => s.text).join() === 'Reports', `exactly "Reports" is the active sub-item (${acc2.subs.filter((s) => s.active).map((s) => s.text).join()})`);
  assert(!g.find((x) => x.label === 'Money').items.some((i) => i.active), 'nothing in the Money group is highlighted');
  assert(content.label === 'Reports', `header shows the page name (${content.label})`);

  console.log('\n=== 3. DIRECT LINK + FINANCIAL REPORTS UNAFFECTED ===');
  await load('/reports');
  assert(/Won revenue/.test(await page.evaluate(() => document.body.innerText)), 'opening /reports directly still works (old bookmarks / links)');
  g = await side();
  assert(g.find((x) => x.label === 'Accounts').subs.some((s) => s.active && s.text === 'Reports'), 'direct link also highlights Accounts → Reports');
  await load('/accounts/reports');
  g = await side();
  const act = g.find((x) => x.label === 'Accounts').subs.filter((s) => s.active).map((s) => s.text);
  assert(act.join() === 'Financial Reports', `/accounts/reports highlights only "Financial Reports" (${act.join()})`);
  assert(/Financial Reports/.test(await page.evaluate(() => document.querySelector('.phead')?.innerText || '')), 'Financial Reports page renders');

  console.log('\n=== 4. OTHER NAVIGATION INTACT ===');
  await load('/clients');
  g = await side();
  const all = g.flatMap((x) => x.items.map((i) => i.text));
  assert(['Today', 'Clients', 'Deals', 'Projects', 'Inbox', 'Calendar', 'Outreach', 'Invoice', 'Accounts', 'Human Resources', 'Profile', 'Team', 'Playbooks', 'Settings', 'Support'].every((n) => all.includes(n)), `every other sidebar entry is still there (${all.length})`);
  assert(errors.length === 0, `zero uncaught page errors (${errors.length})`);
  errors.slice(0, 5).forEach((e) => console.error('   ->', e));

  console.log(`\nREPORTS MOVE TEST RESULT: ${passed} passed, ${failed} failed`);
  await browser.close();
  server.close();
  process.exit(failed > 0 ? 1 : 0);
});
