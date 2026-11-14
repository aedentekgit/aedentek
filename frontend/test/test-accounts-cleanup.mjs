/**
 * ACCOUNTS CLEAN-UP TEST
 * ------------------------------------------------------------------
 *  1. Accounts Overview: the count-up numbers and the small trend graph stay,
 *     the yellow-green highlight ("shade") painted behind the numbers is gone.
 *  2. Banking & Payments page is gone: no sidebar entry, no route, no page
 *     code, no requests to the banking API from the UI, no dead links.
 *
 * Run: node test/test-accounts-cleanup.mjs   (backend must be running on :5001)
 */
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8095;
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
    proxied.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Backend unreachable' }));
    });
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
  console.log(`[TEST-ACCOUNTS-CLEANUP] Listening on http://localhost:${PORT}`);
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
  const apiCalls = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (r.url().includes('/api/')) apiCalls.push(r.url()); });

  const readKpis = () => page.evaluate(() =>
    [...document.querySelectorAll('.acct-bento-kpis .kpi')].map((k) => ({
      label: k.querySelector('.kpi__label')?.innerText.trim(),
      value: k.querySelector('.kpi__value')?.innerText.trim(),
      svgCount: [...k.querySelectorAll('svg')].filter((v) => !v.closest('.kpi__icon') && !v.closest('.kpi__foot')).length,
      shapes: k.querySelectorAll('path[fill]:not([fill="none"]), linearGradient, polyline, .spark, [class*="spark"]').length
    })));

  // ------------------------------------------------------------------ 1
  console.log('=== 1. OVERVIEW: COUNT-UP + GRAPH KEPT, YELLOW-GREEN SHADE GONE ===');
  await page.goto(`http://localhost:${PORT}/accounts/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.acct-bento-kpis .kpi__value', { timeout: 15000 });
  const dash = await page.evaluate(async () => (await (await fetch('/api/accounts/dashboard')).json()).data.kpis);
  const inr = (n) => '₹ ' + Number(n || 0).toLocaleString('en-IN');
  const expected = {
    'Operating Revenue': inr(dash.totalSales),
    'Operating Expenses': inr(dash.totalExpenses),
    'Liquid Treasury': inr(Number(dash.cashBalance || 0) + Number(dash.bankBalance || 0)),
    'Net Position': inr(dash.netProfit)
  };
  // sample the cards every ~60 ms through the animation window; record number text, the
  // background colour painted on the number, and whether a flash animation is running
  const frames = await page.evaluate(async () => {
    const out = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 2600) {
      out.push([...document.querySelectorAll('.acct-bento-kpis .kpi')].map((k) => {
        const v = k.querySelector('.kpi__value');
        const cs = getComputedStyle(v);
        return {
          label: k.querySelector('.kpi__label')?.innerText.trim(),
          text: v.innerText.trim(),
          bg: cs.backgroundColor,
          flash: v.classList.contains('is-flash'),
          anim: cs.animationName
        };
      }));
      await new Promise((r) => setTimeout(r, 60));
    }
    return out;
  });
  const labelOf = (l) => Object.keys(expected).find((x) => (l || '').includes(x));
  const last = frames[frames.length - 1];
  assert(last.length === 4, `four headline cards render (${last.length})`);
  assert(last.every((c) => c.text.replace(/\s/g, '') === expected[labelOf(c.label)].replace(/\s/g, '')),
    `numbers settle on the final server values (${last.map((c) => c.text).join(' | ')})`);
  const distinct = (i) => new Set(frames.map((f) => f[i].text)).size;
  assert([0, 1, 2, 3].filter((i) => distinct(i) > 3).length >= 3, `the count-up animation is back: numbers pass through many values (${[0, 1, 2, 3].map(distinct).join(', ')} distinct per card)`);
  const everFlash = frames.some((f) => f.some((c) => c.flash && c.anim !== 'none'));
  assert(!everFlash, 'the flash animation never runs on a number');
  const transparent = (c) => c === 'rgba(0, 0, 0, 0)' || c === 'transparent';
  const shaded = frames.flatMap((f) => f.filter((c) => !transparent(c.bg)));
  assert(shaded.length === 0, `no background shade is ever painted behind a number in ${frames.length} frames (${shaded.length} shaded)`);
  const spark = await page.evaluate(() => [...document.querySelectorAll('.acct-bento-kpis .kpi')].map((k) => ({
    paths: k.querySelectorAll('svg.kpi__spark path').length,
    d: k.querySelector('svg.kpi__spark path')?.getAttribute('d')?.length || 0
  })));
  assert(spark.every((x) => x.paths >= 1 && x.d > 20), `the small trend graph is back in all four cards (${spark.map((x) => x.paths).join(', ')} line(s))`);
  const area = await page.evaluate(() => document.querySelectorAll('.acct-bento-kpis .kpi svg.kpi__spark [fill]:not([fill="none"])').length);
  assert(area === 0, 'the graph is a plain line — no filled area');
  const chart = await page.evaluate(() => !!document.querySelector('.acct-stack svg path[d]') && document.body.innerText.includes('Income vs Expense Dynamics'));
  assert(chart, 'the Income vs Expense chart is still there');
  const colour = await page.evaluate(() => getComputedStyle([...document.querySelectorAll('.acct-bento-kpis .kpi')].find((k) => /Net Position/.test(k.innerText)).querySelector('.kpi__value')).color);
  assert(/^rgb/.test(colour), `Net Position keeps its colour (${colour})`);
  const flashRule = fs.readFileSync(path.join(appDir, 'assets/index-B3aW9d7K.css'), 'utf8');
  assert(/\.is-flash\{animation:none\}/.test(flashRule) && !/\.is-flash\{[^}]*animation:1s ease-out flash/.test(flashRule), 'stylesheet: the flash highlight rule is disabled globally');

  // ------------------------------------------------------------------ 2
  console.log('\n=== 2. BANKING & PAYMENTS PAGE IS GONE ===');
  const nav = await page.evaluate(() => ({
    links: [...document.querySelectorAll('a')].map((a) => `${a.textContent.trim()}|${a.getAttribute('href') || ''}`),
    text: document.body.innerText
  }));
  assert(!nav.links.some((l) => /Banking/i.test(l) || /accounts\/banking/.test(l)), 'no Banking link anywhere on the Overview (sidebar or cards)');
  assert(!/Banking & Payments/i.test(nav.text), 'no "Banking & Payments" text on the Overview');
  const bankCard = await page.evaluate(() => {
    const item = [...document.querySelectorAll('.acct-telemetry-item')].find((i) => /primary bank/i.test(i.innerText));
    return item ? { tag: item.tagName, href: item.getAttribute('href') } : null;
  });
  assert(bankCard && bankCard.tag === 'DIV' && !bankCard.href, 'the "Primary Bank" card stays but is no longer a link');
  const calls = apiCalls.filter((u) => /\/api\/accounts\/banking/.test(u));
  assert(calls.length === 0, `the UI makes no requests to the banking API (${calls.length})`);

  await page.goto(`http://localhost:${PORT}/accounts/banking`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.phead', { timeout: 15000 });
  await sleep(1200);
  const gone = await page.evaluate(() => ({
    title: document.querySelector('.phead .ttl, .phead h1')?.textContent?.trim(),
    text: document.body.innerText,
    seg: document.querySelectorAll('.acct-seg').length,
    tabs: [...document.querySelectorAll('.acct-seg button, .acct-seg [role="tab"]')].map((t) => t.innerText.trim())
  }));
  assert(gone.title !== 'Banking & Payments', `/accounts/banking no longer renders the page (shows "${gone.title}")`);
  assert(gone.seg === 0 && !/Transactions|Transfers/.test(gone.tabs.join('|')) && !/The cash book/i.test(gone.text), `no Transactions / Transfers / Accounts tabs and no cash-book page (${gone.tabs.join(',') || 'none'})`);
  assert(apiCalls.filter((u) => /\/api\/accounts\/banking/.test(u)).length === 0, 'visiting the old URL still triggers no banking API calls');

  const src = fs.readFileSync(path.join(appDir, 'assets/accounts-Acc7mK2p.js'), 'utf8');
  assert(!/BankingPage|BankTransferDrawer|BankingTransactionsTab|BankingTransfersTab|BANK_ACCOUNT_CONFIG/.test(src), 'page code removed from the Accounts bundle');
  assert(!/accounts\/banking/.test(src), 'no reference to /accounts/banking left in the Accounts bundle');
  const idx = fs.readFileSync(path.join(appDir, 'assets/index-DG0_cRQu.js'), 'utf8');
  assert(!/Banking & Payments/.test(idx), 'sidebar definition no longer lists Banking & Payments');

  console.log('\n=== 3. BACKEND DATA IS UNTOUCHED ===');
  const live = await page.evaluate(async () => {
    const d = await (await fetch('/api/accounts/dashboard')).json();
    const b = await fetch('/api/accounts/banking/accounts');
    return { ok: d.success, bank: d.data.kpis.bankBalance, bankApi: b.status };
  });
  assert(live.ok && Number(live.bank) > 0, `dashboard still reports the bank balance (${live.bank})`);
  assert(live.bankApi === 200, 'banking API still responds (ledger and dashboard depend on it)');

  assert(errors.length === 0, `zero uncaught page errors (${errors.length})`);
  errors.slice(0, 5).forEach((e) => console.error('   ->', e));

  console.log(`\nACCOUNTS CLEAN-UP TEST RESULT: ${passed} passed, ${failed} failed`);
  await browser.close();
  server.close();
  process.exit(failed > 0 ? 1 : 0);
});
