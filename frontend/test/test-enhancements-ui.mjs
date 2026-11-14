// UI E2E: themed Projects page, header date filter (hidden + classic look), EMI initial payment,
// server-side pagination (10 / page), Project Stage master CRUD, per-project stage timeline,
// client registration + Monthly Billing (with / without GST).
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createFixtureClient } from './helpers/fixture-client.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.join(__dirname, '../test-reports/enhancements');
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.startsWith('FAIL-')) fs.unlinkSync(path.join(OUT, f));

const TAG = `ZZE${Date.now().toString().slice(-6)}`;
const results = [];
const jsErrors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const api = async (method, url, body) => {
  const r = await fetch(BASE + url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
};

(async () => {
  const fixture = await createFixtureClient(TAG);
  const FIX = fixture.clientId;
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('tessly:formMode', 'all'); } catch (e) {} });
  page.on('pageerror', (e) => jsErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404|Failed to load resource/.test(m.text())) jsErrors.push(m.text()); });
  // record every paged API call the UI makes: proves paging happens on the SERVER
  const paged = [];
  page.on('response', async (r) => {
    const u = r.url();
    if (/\/api\/.*[?&]page=\d+/.test(u) && r.request().method() === 'GET') {
      try { const j = await r.json(); paged.push({ url: u, rows: Array.isArray(j.data) ? j.data.length : -1, pagination: j.pagination }); } catch {}
    }
  });

  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const test = async (id, feature, name, fn) => {
    try { await fn(); results.push({ id, feature, name, status: 'PASS' }); console.log(`✓ [${id}] ${name}`); }
    catch (e) { results.push({ id, feature, name, status: 'FAIL', error: e.message }); console.log(`✗ [${id}] ${name}\n    ${e.message}`); try { await shot('FAIL-' + id); } catch {} }
  };
  const ok = (c, m) => { if (!c) throw new Error(m); };
  const goto = async (p, wait = 700) => { await page.goto(BASE + p, { waitUntil: 'networkidle0' }); await sleep(wait); };
  const setVal = async (sel, v) => {
    await page.waitForSelector(sel, { timeout: 5000 });
    await page.evaluate((s, val) => {
      const el = document.querySelector(s);
      const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    }, sel, v);
  };
  const clickText = async (sel, text, wait = 400) => {
    const done = await page.evaluate((s, t) => { const el = [...document.querySelectorAll(s)].find((x) => x.textContent.trim().includes(t)); if (el) el.click(); return !!el; }, sel, text);
    if (!done) throw new Error(`No ${sel} containing "${text}"`);
    await sleep(wait);
  };
  const confirmDialog = async () => { await page.waitForSelector('.tl-dialog [data-act="ok"]', { timeout: 3000 }); await page.click('.tl-dialog [data-act="ok"]'); await sleep(600); };
  const openTab = async (label) => { await clickText('.tabs .tab', label, 700); };
  const bodyText = () => page.evaluate(() => document.body.innerText);
  const pagerText = () => page.evaluate(() => (document.querySelector('.pager') ? document.querySelector('.pager').innerText.replace(/\n/g, ' ') : ''));
  const snos = () => page.$$eval('tbody tr .sno-pill', (e) => e.map((x) => Number(x.textContent)));
  const clickPager = async (sel) => { await page.evaluate((s) => document.querySelector(s).click(), sel); await sleep(900); };

  let createdClientId;
  const emiTag = `${TAG} Treadmill`;

  try {
    // ================================================================ 1. THEMED PROJECTS PAGE
    await goto('/projects', 5000);
    await test('THM-01', 'Projects page theme', 'summary uses the shared themed KPI tiles (4 × .kpi with tones + icons)', async () => {
      const info = await page.evaluate(() => ({
        kpis: document.querySelectorAll('.kpis .kpi').length,
        tones: [...document.querySelectorAll('.kpis .kpi')].map((k) => k.getAttribute('data-tone')),
        labels: [...document.querySelectorAll('.kpis .kpi .kpi__label')].map((k) => k.textContent.trim()),
        icons: document.querySelectorAll('.kpis .kpi .kpi__icon svg').length,
        oldTiles: document.querySelectorAll('.pj-sum').length,
        values: document.querySelectorAll('.kpis .kpi .kpi__value').length
      }));
      ok(info.kpis === 4 && info.oldTiles === 0, JSON.stringify(info));
      ok(new Set(info.tones).size === 4 && info.tones.every(Boolean), 'tones: ' + info.tones);
      ok(info.icons === 4 && info.values === 4, 'icons/values');
      ok(['In progress', 'Square metres', 'Value on site', 'Finishing in 2 weeks'].every((l) => info.labels.some((x) => x.includes(l))), info.labels.join('|'));
    });
    await test('THM-02', 'Projects page theme', 'stage filter sits inside a themed card and still filters', async () => {
      ok(await page.$('.pj-filter.card'), 'filter card missing');
      const chips = await page.$$eval('.pj-filter .chip', (c) => c.length);
      ok(chips === 6, 'chips ' + chips);
      await clickText('.pj-filter .chip', 'Delivering', 900);
      const rows = await page.$$eval('.pj-row', (r) => r.length);
      ok(rows === 2, 'delivering rows ' + rows);
      await clickText('.pj-filter .chip', 'All', 600);
    });
    await test('THM-03', 'Projects page theme', 'uses the global KPI card style: white card, coloured left edge per tone, tinted icon tile', async () => {
      const cards = await page.$$eval('.kpis .kpi', (k) => k.map((x) => { const c = getComputedStyle(x); const ic = getComputedStyle(x.querySelector('.kpi__icon')); return { bg: c.backgroundColor, edge: c.borderLeftColor, w: c.borderLeftWidth, icon: ic.backgroundColor }; }));
      ok(cards.every((c) => parseFloat(c.w) >= 3), 'left edge ' + JSON.stringify(cards));
      ok(new Set(cards.map((c) => c.edge)).size >= 3, 'edge colours differ per tone: ' + cards.map((c) => c.edge));
      ok(cards.every((c) => c.icon !== 'rgba(0, 0, 0, 0)'), 'icon tile tinted');
      await shot('01-projects-themed');
    });

    // ================================================================ 4. DATE FILTER HIDDEN
    await test('DF-01', 'Date filter', 'header date-filter button is removed from non-accounts pages', async () => {
      for (const u of ['/clients/companies', '/projects', '/hr/staff', '/finance/invoices', '/today']) {
        await goto(u, 500);
        ok(!(await page.$('.top__range')), `date filter still shown on ${u}`);
      }
    });
    await test('DF-02', 'Date filter', 'it remains on the Accounts pages where it is used', async () => {
      await goto('/accounts/expenses', 700);
      ok(await page.$('.top__range'), 'missing on accounts');
    });
    // ================================================================ 5. DATE FILTER LOOK
    await test('DF-03', 'Date filter', 'popup opens with classic sentence-case labels (no ALL-CAPS tracking)', async () => {
      await page.click('.top__range-main'); await sleep(500);
      const info = await page.evaluate(() => {
        const q = (s) => document.querySelector(s);
        const tabs = [...document.querySelectorAll('.drp__tab')].map((t) => t.textContent.trim());
        return {
          title: q('.drp__title').textContent, sub: q('.drp__sub').textContent, tabs,
          tabTransform: getComputedStyle(q('.drp__tab')).textTransform, tabSpacing: getComputedStyle(q('.drp__tab')).letterSpacing,
          radius: parseFloat(getComputedStyle(q('.drp')).borderTopLeftRadius), foot: [...document.querySelectorAll('.drp__foot button')].map((b) => b.textContent.trim())
        };
      });
      ok(info.title === 'Select date range', info.title);
      ok(info.tabs.join() === 'All dates,Date range,Month,Year', info.tabs.join());
      ok(info.foot.includes('Apply') && info.foot.includes('Clear'), info.foot.join());
      ok(info.radius <= 12, 'radius ' + info.radius);
      ok(info.tabTransform === 'none' && (info.tabSpacing === 'normal' || parseFloat(info.tabSpacing) === 0), `${info.tabTransform} ${info.tabSpacing}`);
      ok(!/[A-Z]{4,}/.test(info.sub), info.sub);
      await shot('02-date-filter-classic');
    });
    await test('DF-04', 'Date filter', 'active tab is a flat underline (no filled pill)', async () => {
      const st = await page.evaluate(() => { const t = document.querySelector('.drp__tab.is-on'); const c = getComputedStyle(t); return { bg: c.backgroundColor, border: c.borderBottomWidth, color: c.borderBottomColor }; });
      ok(st.bg === 'rgba(0, 0, 0, 0)' && parseFloat(st.border) >= 2, JSON.stringify(st));
    });
    await test('DF-05', 'Date filter', 'applying a range updates the header label; Clear restores "All Dates"; popup works functionally', async () => {
      await clickText('.drp__chip', 'Today', 400);
      await page.click('.drp__apply'); await sleep(700);
      const label = await page.$eval('.top__range-label', (e) => e.textContent.trim());
      ok(label !== 'All Dates', 'label ' + label);
      await page.evaluate(() => window.TesslyDateRange.set({ mode: 'all', from: '', to: '' })); await sleep(500);
      ok((await page.$eval('.top__range-label', (e) => e.textContent.trim())) === 'All Dates', 'not cleared');
    });

    // ================================================================ 3. EMI INITIAL PAYMENT
    await goto('/accounts/emi', 900);
    await test('EMI-01', 'EMI initial payment', 'form has an "Initial payment" field and the table an "Initial" column', async () => {
      ok(/initial/i.test(await page.$eval('table thead', (e) => e.innerText)), 'Initial column missing');
      await clickText('button', 'New EMI plan', 700);
      ok(await page.$('input[name="initialPayment"]'), 'initialPayment input missing');
      ok(/Initial payment/.test(await bodyText()), 'label missing');
    });
    await test('EMI-02', 'EMI initial payment', 'preview deducts the initial payment (financed amount + smaller EMI)', async () => {
      await setVal('input[name="productName"]', emiTag);
      await page.evaluate(() => { const s = document.querySelector('select[name="category"]'); s.selectedIndex = 1; s.dispatchEvent(new Event('change', { bubbles: true })); });
      await setVal('input[name="principal"]', '120000'); await setVal('input[name="emiCount"]', '12'); await setVal('input[name="interestRate"]', '0');
      await setVal('input[name="startDate"]', '2026-12-05'); await setVal('input[name="initialPayment"]', '20000'); await sleep(400);
      const t = await page.$eval('[data-emi-preview]', (e) => e.innerText.replace(/\n/g, ' '));
      ok(/Initial payment \(upfront\).*20,000/.test(t), t);
      ok(/Amount financed.*1,00,000/.test(t), t);
      ok(/Monthly EMI.*8,333/.test(t), t);
      ok(/Total cost incl\. charges.*1,20,000/.test(t), t);
      await shot('03-emi-initial-payment');
    });
    await test('EMI-03', 'EMI initial payment', 'validation: initial payment must be less than the product amount', async () => {
      await setVal('input[name="initialPayment"]', '120000'); await sleep(300);
      await page.evaluate(() => document.querySelector('#acct-emi-form').requestSubmit()); await sleep(500);
      ok(/must be less than the product amount/.test(await bodyText()), 'no validation toast');
      await setVal('input[name="initialPayment"]', '20000'); await sleep(200);
    });
    await test('EMI-04', 'EMI initial payment', 'CREATE saves it; list shows ₹ 20,000 in the Initial column and EMI on the financed amount', async () => {
      await page.evaluate(() => document.querySelector('#acct-emi-form').requestSubmit()); await sleep(1200);
      await setVal('input[placeholder^="Search product"]', TAG); await sleep(1000);
      const row = await page.evaluate((n) => { const r = [...document.querySelectorAll('tbody tr[data-row]')].find((x) => x.textContent.includes(n)); return r ? r.innerText.replace(/\n/g, ' ') : ''; }, emiTag);
      ok(/20,000/.test(row) && /8,333/.test(row), row);
      const list = (await api('GET', `/api/accounts/emi?q=${TAG}`)).data;
      ok(list.length === 1 && list[0].initialPayment === 20000 && list[0].financedAmount === 100000, JSON.stringify(list[0]));
    });
    await test('EMI-05', 'EMI initial payment', 'EDIT opens prefilled with the initial payment and updating it recalculates', async () => {
      await page.evaluate((n) => [...document.querySelectorAll('tbody tr[data-row]')].find((x) => x.textContent.includes(n)).querySelector('button[title="Edit EMI plan"]').click(), emiTag);
      await sleep(600);
      ok((await page.$eval('input[name="initialPayment"]', (e) => e.value)) === '20000', 'not prefilled');
      await setVal('input[name="initialPayment"]', '60000'); await sleep(200);
      await page.evaluate(() => document.querySelector('#acct-emi-form').requestSubmit()); await sleep(1200);
      const e = (await api('GET', `/api/accounts/emi?q=${TAG}`)).data[0];
      ok(e.financedAmount === 60000 && Math.abs(e.emiAmount - 5000) < 0.01, JSON.stringify(e));
    });
    await test('EMI-06', 'EMI initial payment', 'DELETE removes the plan', async () => {
      await page.evaluate((n) => [...document.querySelectorAll('tbody tr[data-row]')].find((x) => x.textContent.includes(n)).querySelector('button[title="Delete EMI plan"]').click(), emiTag);
      await sleep(500);
      const dlg = await page.$('.tl-dialog [data-act="ok"]');
      if (dlg) { await dlg.click(); } else { await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^(Delete|Yes)/.test(x.textContent.trim())); if (b) b.click(); }); }
      await sleep(1000);
      ok(((await api('GET', `/api/accounts/emi?q=${TAG}`)).data || []).length === 0, 'EMI still present');
    });

    // ================================================================ 7. PROJECT STAGE MASTER + 6. PAGINATION UI
    for (let i = 1; i <= 25; i += 1) await api('POST', '/api/project-stages', { name: `${TAG} Stage ${String(i).padStart(2, '0')}`, sequence: 2000 + i, status: i % 5 === 0 ? 'Inactive' : 'Active' });
    await goto('/clients/project-stages', 900);
    await test('SM-01', 'Project stage master', 'sidebar link + page render with seeded stages', async () => {
      ok(await page.evaluate(() => [...document.querySelectorAll('.nav__sub')].some((a) => a.textContent.trim() === 'Project Stages' && a.getAttribute('href') === '/clients/project-stages')), 'sidebar link missing');
      ok(/Project Stage Master/.test(await bodyText()) && (await page.$('#stg-table')), 'page');
      await shot('04-project-stages');
    });
    await setVal('#stg-search', TAG); await sleep(900);
    await test('PGN-01', 'Pagination (UI → server)', 'first page shows exactly 10 rows and "Showing 1–10 of 25"', async () => {
      ok((await page.$$('#stg-table tbody tr[data-stage]')).length === 10, 'rows != 10');
      ok(/Showing 1–10 of 25 stages/.test(await pagerText()), await pagerText());
      ok(JSON.stringify(await snos()) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), 'S No');
      const last = [...paged].reverse().find((p) => p.url.includes('project-stages') && p.url.includes(TAG));
      ok(last && last.rows === 10 && last.pagination.total === 25, 'server did not page: ' + JSON.stringify(last));
      await shot('05-pagination-page1');
    });
    await test('PGN-02', 'Pagination (UI → server)', 'Next fetches page 2 from the server; S No continues at 11', async () => {
      const before = paged.length;
      await clickPager('.pager__next');
      ok((await page.$$('#stg-table tbody tr[data-stage]')).length === 10, 'page 2 rows');
      ok(JSON.stringify(await snos()) === JSON.stringify([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]), 'S No ' + (await snos()));
      ok(/Showing 11–20 of 25/.test(await pagerText()), await pagerText());
      const req = paged.slice(before).find((p) => /[?&]page=2/.test(p.url));
      ok(req && req.rows === 10 && req.pagination.page === 2, 'no page=2 request: ' + JSON.stringify(paged.slice(before)));
    });
    await test('PGN-03', 'Pagination (UI → server)', 'last page shows the remaining 5 rows and disables Next', async () => {
      await clickPager('.pager__btn[data-page="3"]');
      ok((await page.$$('#stg-table tbody tr[data-stage]')).length === 5, 'rows');
      ok(await page.$eval('.pager__next', (b) => b.disabled), 'Next not disabled');
      ok(/Showing 21–25 of 25/.test(await pagerText()), await pagerText());
      ok(await page.$eval('.pager__btn.is-current', (b) => b.textContent === '3'), 'current page highlight');
    });
    await test('PGN-04', 'Pagination (UI → server)', 'Previous works and page 1 disables Previous', async () => {
      await clickPager('.pager__prev'); ok(/Showing 11–20/.test(await pagerText()), 'prev');
      await clickPager('.pager__btn[data-page="1"]'); ok(await page.$eval('.pager__prev', (b) => b.disabled), 'Previous should be disabled on page 1');
    });
    await test('PGN-05', 'Pagination (UI → server)', 'changing a filter returns to page 1 and re-pages the filtered set on the server', async () => {
      await clickPager('.pager__btn[data-page="2"]');
      await setVal('#stg-filter', 'Active'); await sleep(1000);
      ok(/Showing 1–10 of 20 stages/.test(await pagerText()), await pagerText());
      ok((await page.$$eval('#stg-table .stg-status', (e) => e.every((x) => /Active/.test(x.textContent)))), 'non-active rows');
      await setVal('#stg-filter', 'All'); await sleep(900);
    });
    await test('PGN-06', 'Pagination (UI → server)', 'searching resets paging; fewer than 10 results hides page buttons but keeps the count', async () => {
      await setVal('#stg-search', `${TAG} Stage 07`); await sleep(900);
      ok((await page.$$('#stg-table tbody tr[data-stage]')).length === 1, 'search rows');
      ok(/Showing 1–1 of 1 stages/.test(await pagerText()) && !(await page.$('.pager__nav')), await pagerText());
      await setVal('#stg-search', TAG); await sleep(900);
    });
    await test('PGN-07', 'Pagination (UI → server)', 'pager is themed (uses the primary colour token for the current page)', async () => {
      const c = await page.evaluate(() => { const b = document.querySelector('.pager__btn.is-current'); const root = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(); return { bg: getComputedStyle(b).backgroundColor, radius: getComputedStyle(b).borderTopLeftRadius, root }; });
      ok(c.bg !== 'rgba(0, 0, 0, 0)' && parseFloat(c.radius) >= 6, JSON.stringify(c));
    });
    await test('PGN-08', 'Pagination (UI → server)', 'pager is present and server-paged on Accounts (expenses), HR (attendance, leave), Clients, Finance', async () => {
      const probes = [['/accounts/expenses', 'accounts/expenses'], ['/hr/attendance', 'staff-attendance'], ['/hr/leave', 'hr/leave'], ['/clients/companies', 'api/clients'], ['/finance/invoices', 'api/invoices']];
      for (const [u, needle] of probes) {
        const before = paged.length;
        await goto(u, 900);
        const hits = paged.slice(before).filter((p) => p.url.includes(needle));
        ok(hits.length > 0, `${u}: no paged request to ${needle}`);
        ok(hits.every((h) => h.rows <= 10), `${u}: server returned more than 10 rows`);
        ok(await page.$('.pager'), `${u}: pager not rendered`);
      }
    });
    await test('PGN-09', 'Pagination (UI → server)', 'Expenses: Next loads page 2 from the server (23+ seeded rows)', async () => {
      await goto('/accounts/expenses', 900);
      const total = Number((/of (\d+)/.exec(await pagerText()) || [])[1]);
      if (total <= 10) return; // fewer than 11 records in this database
      const before = paged.length;
      await clickPager('.pager__next');
      ok(paged.slice(before).some((p) => /accounts\/expenses.*page=2/.test(p.url) && p.rows <= 10), 'no page=2 request');
      ok((await snos())[0] === 11, 'S No should continue at 11');
      await shot('06-expenses-page2');
    });

    // ---- stage master CRUD
    await goto('/clients/project-stages', 800);
    const sName = `${TAG} QA Review`;
    await test('SM-02', 'Project stage master', 'CREATE via modal; validation (empty, duplicate)', async () => {
      await page.click('#stg-add'); await sleep(300); await page.click('#stg-save'); await sleep(300);
      ok(/Stage name is required/.test(await page.$eval('#stg-error', (e) => e.textContent)), 'empty validation');
      await setVal('#stg-name', `${TAG} Stage 01`); await page.click('#stg-save'); await sleep(600);
      ok(/already exists/.test(await page.$eval('#stg-error', (e) => e.textContent)), 'duplicate validation');
      await setVal('#stg-name', sName); await setVal('#stg-seq', '3000'); await setVal('#stg-desc', 'Quality gate'); await page.click('#stg-save'); await sleep(900);
      await setVal('#stg-search', sName); await sleep(900);
      ok(await page.$(`#stg-table tr[data-stage="${sName}"]`), 'row not created');
    });
    await test('SM-03', 'Project stage master', 'UPDATE via modal and toggle Active ↔ Inactive by clicking the badge', async () => {
      await page.evaluate((n) => document.querySelector(`#stg-table tr[data-stage="${n}"] button[title="Edit stage"]`).click(), sName); await sleep(300);
      ok((await page.$eval('#stg-desc', (e) => e.value)) === 'Quality gate', 'prefill');
      await setVal('#stg-desc', 'Quality gate v2'); await page.click('#stg-save'); await sleep(900);
      ok((await bodyText()).includes('Quality gate v2'), 'update');
      await page.evaluate((n) => document.querySelector(`#stg-table tr[data-stage="${n}"] .stg-status`).click(), sName); await sleep(900);
      ok(/Inactive/.test(await page.$eval(`#stg-table tr[data-stage="${sName}"] .stg-status`, (e) => e.textContent)), 'toggle');
      await page.evaluate((n) => document.querySelector(`#stg-table tr[data-stage="${n}"] .stg-status`).click(), sName); await sleep(800);
    });

    // ================================================================ 7. PER-PROJECT STAGE TIMELINE
    await goto('/clients/c/' + FIX, 900);
    await openTab('Projects');
    await test('TLN-01', 'Project timeline', 'project form lists ACTIVE stages only (inactive ones are not offered)', async () => {
      await page.click('#proj-add'); await sleep(400);
      const names = await page.$$eval('#proj-stages .stage-picker__opt', (o) => o.map((x) => x.textContent.trim()));
      ok(names.includes(`${TAG} Stage 01`) && names.includes('Requirement Analysis'), 'active stages missing: ' + names.slice(0, 5));
      ok(!names.includes(`${TAG} Stage 05`), 'inactive stage offered');
      ok(!names.includes('Support & Maintenance'), 'inactive seeded stage offered');
      await shot('07-project-stage-picker');
    });
    await test('TLN-02', 'Project timeline', 'CREATE a project with its own selected stages', async () => {
      await setVal('#proj-title', 'Web Portal'); await setVal('#proj-start', '2026-11-01'); await setVal('#proj-target', '2027-03-01');
      for (const n of ['Requirement Analysis', 'Design', 'Development']) {
        await page.evaluate((nm) => { const o = [...document.querySelectorAll('#proj-stages .stage-picker__opt')].find((x) => x.textContent.trim() === nm); o.querySelector('input').click(); }, n);
      }
      await sleep(200);
      await page.click('#proj-save'); await sleep(1200);
      const row = await page.evaluate(() => { const r = [...document.querySelectorAll('#proj-table tbody tr')].find((x) => x.textContent.includes('Web Portal')); return r ? r.innerText.replace(/\n/g, ' ') : ''; });
      ok(/0 \/ 3 Stages/.test(row), row);
    });
    await test('TLN-03', 'Project timeline', 'a second project can use a different set of stages', async () => {
      await page.click('#proj-add'); await sleep(300);
      await setVal('#proj-title', 'Mobile App');
      for (const n of ['Design', 'Testing']) await page.evaluate((nm) => { [...document.querySelectorAll('#proj-stages .stage-picker__opt')].find((x) => x.textContent.trim() === nm).querySelector('input').click(); }, n);
      await page.click('#proj-save'); await sleep(1200);
      const c = (await api('GET', '/api/clients/' + FIX)).data;
      const a = c.projects.find((p) => p.title === 'Web Portal'); const b = c.projects.find((p) => p.title === 'Mobile App');
      ok(a.stages.map((s) => s.name).join() === 'Requirement Analysis,Design,Development', a.stages.map((s) => s.name).join());
      ok(b.stages.map((s) => s.name).join() === 'Design,Testing', b.stages.map((s) => s.name).join());
    });
    await test('TLN-04', 'Project timeline', 'timeline modal shows a stepper; completing stages updates progress and status', async () => {
      await page.evaluate(() => [...document.querySelectorAll('#proj-table tbody tr')].find((x) => x.textContent.includes('Web Portal')).querySelector('.proj-timeline').click()); await sleep(600);
      ok((await page.$$('#timeline-modal .tl-stage')).length === 3, 'stepper');
      await shot('08-project-timeline');
      const setStatus = async (i, v) => {
        await page.evaluate((idx, val) => { const sel = document.querySelectorAll('#timeline-modal .tl-status')[idx]; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, val); sel.dispatchEvent(new Event('change', { bubbles: true })); }, i, v);
        await sleep(900);
      };
      await setStatus(0, 'Completed');
      ok((await page.$eval('#timeline-progress', (e) => e.textContent)) === '33%', 'progress 33');
      await setStatus(1, 'In Progress');
      await setStatus(1, 'Completed'); await setStatus(2, 'Completed');
      ok((await page.$eval('#timeline-progress', (e) => e.textContent)) === '100%', 'progress 100');
      const c = (await api('GET', '/api/clients/' + FIX)).data.projects.find((p) => p.title === 'Web Portal');
      ok(c.status === 'Completed' && c.progress === 100, `${c.status} ${c.progress}`);
      await setStatus(2, 'Pending');
      ok((await page.$eval('#timeline-progress', (e) => e.textContent)) === '67%', 'progress back to 67');
    });
    await test('TLN-05', 'Project timeline', 'stage dates can be set; adding and removing a stage from the timeline works', async () => {
      await setVal('#timeline-modal .tl-start', '2026-11-05'); await sleep(900);
      await setVal('#timeline-modal .tl-due', '2026-11-20'); await sleep(900);
      let c = (await api('GET', '/api/clients/' + FIX)).data.projects.find((p) => p.title === 'Web Portal');
      ok(c.stages.find((s) => s.dueDate === '2026-11-20' && s.startDate === '2026-11-05'), 'dates not saved');
      const opts = await page.$$eval('#tl-add-select option', (o) => o.map((x) => x.textContent));
      ok(opts.includes('Testing') && !opts.includes('Design'), 'add list should only offer active stages not yet in the project: ' + opts.join());
      await page.evaluate(() => { const sel = document.querySelector('#tl-add-select'); const opt = [...sel.options].find((o) => o.textContent === 'Testing'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, opt.value); sel.dispatchEvent(new Event('change', { bubbles: true })); });
      await sleep(1000);
      ok((await page.$$('#timeline-modal .tl-stage')).length === 4, 'stage not added');
      await page.evaluate(() => document.querySelectorAll('#timeline-modal .tl-remove')[3].click()); await sleep(1000);
      ok((await page.$$('#timeline-modal .tl-stage')).length === 3, 'stage not removed');
      c = (await api('GET', '/api/clients/' + FIX)).data.projects.find((p) => p.title === 'Web Portal');
      ok(c.stages.length === 3, 'server stage count');
    });
    await test('TLN-06', 'Project timeline', 'editing the project preselects its stages; unticking one removes it', async () => {
      await page.evaluate(() => document.querySelector('#timeline-modal').closest('.scrim').click()); await sleep(400);
      await page.evaluate(() => [...document.querySelectorAll('#proj-table tbody tr')].find((x) => x.textContent.includes('Web Portal')).querySelector('button[title="Edit project"]').click()); await sleep(500);
      const on = await page.$$eval('#proj-stages .stage-picker__opt.is-on', (o) => o.map((x) => x.textContent.trim()));
      ok(on.join() === 'Requirement Analysis,Design,Development', on.join());
      await page.evaluate(() => [...document.querySelectorAll('#proj-stages .stage-picker__opt')].find((x) => x.textContent.trim() === 'Development').querySelector('input').click());
      await page.click('#proj-save'); await sleep(1200);
      const c = (await api('GET', '/api/clients/' + FIX)).data.projects.find((p) => p.title === 'Web Portal');
      ok(c.stages.length === 2 && c.stages[0].status === 'Completed', 'stage removed but progress kept: ' + JSON.stringify(c.stages.map((s) => [s.name, s.status])));
    });
    await test('TLN-07', 'Project timeline', 'DELETE the project', async () => {
      await page.evaluate(() => [...document.querySelectorAll('#proj-table tbody tr')].find((x) => x.textContent.includes('Mobile App')).querySelector('button[title="Delete project"]').click());
      await confirmDialog();
      ok(!(await bodyText()).includes('Mobile App'), 'not deleted');
    });
    await test('TLN-08', 'Project stage master', 'DELETE stages from the master (confirm required)', async () => {
      await goto('/clients/project-stages', 800);
      await setVal('#stg-search', sName); await sleep(900);
      await page.evaluate((n) => document.querySelector(`#stg-table tr[data-stage="${n}"] button[title="Delete stage"]`).click(), sName);
      await page.waitForSelector('.tl-dialog [data-act="cancel"]'); await page.click('.tl-dialog [data-act="cancel"]'); await sleep(500);
      ok(await page.$(`#stg-table tr[data-stage="${sName}"]`), 'cancel should keep');
      await page.evaluate((n) => document.querySelector(`#stg-table tr[data-stage="${n}"] button[title="Delete stage"]`).click(), sName);
      await confirmDialog();
      await sleep(500);
      ok(!(await page.$(`#stg-table tr[data-stage="${sName}"]`)), 'not deleted');
    });

    // ================================================================ 2. REGISTER + MONTHLY BILLING
    await goto('/clients/new', 800);
    const co = `${TAG} Billing Co`;
    await test('BIL-01', 'Monthly billing', 'register page has monthly amount + GST option; summary calculates months × amount', async () => {
      for (const s of ['#bill-amount-input', '#bill-gst-select']) ok(await page.$(s), s + ' missing');
      await setVal('#agreement-from', '2026-04-12'); await setVal('#agreement-to', '2027-04-11');
      await setVal('#bill-amount-input', '10000'); await sleep(300);
      ok(/12 monthly bills × ₹ 10,000 = ₹ 1,20,000/.test(await page.$eval('#bill-summary', (e) => e.textContent)), await page.$eval('#bill-summary', (e) => e.textContent));
      await setVal('#bill-gst-select', 'With GST'); await sleep(300);
      ok(await page.$('#bill-rate-input'), 'GST rate input should appear');
      ok(/12 monthly bills × ₹ 11,800 \(incl\. GST ₹ 1,800\) = ₹ 1,41,600/.test(await page.$eval('#bill-summary', (e) => e.textContent)), await page.$eval('#bill-summary', (e) => e.textContent));
      await shot('09-register-billing');
    });
    await test('BIL-02', 'Monthly billing', 'validation: monthly amount needs agreement dates', async () => {
      await setVal('#agreement-from', ''); await setVal('#agreement-to', ''); await sleep(200);
      await page.evaluate(() => document.querySelector('#client-form').requestSubmit()); await sleep(500);
      ok(/Set the agreement From and To dates to bill monthly|Provide both|required/.test(await bodyText()), 'no validation');
      await setVal('#agreement-from', '2026-04-12'); await setVal('#agreement-to', '2027-04-11');
    });
    await test('BIL-03', 'Monthly billing', 'CREATE client with monthly billing — schedule generated', async () => {
      await setVal('input[data-field="company"]', co); await setVal('input[data-field="name"]', 'Bill Tester'); await setVal('input[data-field="email"]', 'b@zz.io'); await setVal('input[data-field="phone"]', '1234');
      await page.evaluate(() => document.querySelector('#client-form').requestSubmit()); await sleep(1500);
      ok(/\/clients\/c\/client-\d+/.test(page.url()), page.url());
      createdClientId = page.url().split('/').pop();
      const c = (await api('GET', '/api/clients/' + createdClientId)).data;
      ok(c.monthlySchedule.length === 12 && c.monthlySchedule[0].totalAmount === 11800, 'schedule');
    });
    await test('BIL-04', 'Monthly billing', 'tab lists months paged 10 + 2 with GST math, KPIs and agreement total', async () => {
      await openTab('Monthly Billing'); await sleep(500);
      ok((await page.$$('#bill-table tbody tr[data-month]')).length === 10, 'page 1 rows');
      ok(/Showing 1–10 of 12 months/.test(await pagerText()), await pagerText());
      const first = await page.$eval('#bill-table tbody tr[data-month]', (e) => e.innerText.replace(/\n/g, ' '));
      ok(/Apr 2026/.test(first) && /10,000/.test(first) && /1,800/.test(first) && /11,800/.test(first) && /Pending/.test(first), first);
      ok(/12 months · Total ₹ 1,41,600 · Paid ₹ 0 · Pending ₹ 1,41,600/.test(await bodyText()), 'schedule subtitle');
      ok(await page.$eval('#bill-amount', (e) => e.value) === '10000', 'settings prefilled');
      await shot('10-monthly-billing');
    });
    await test('BIL-05', 'Monthly billing', 'Next loads months 11–12 from the server', async () => {
      const before = paged.length;
      await clickPager('.pager__next');
      ok((await page.$$('#bill-table tbody tr[data-month]')).length === 2, 'page 2 rows');
      ok(JSON.stringify(await snos()) === '[11,12]', 'S No');
      ok(paged.slice(before).some((p) => /billing.*page=2/.test(p.url) && p.rows === 2), 'server paging');
      await clickPager('.pager__btn[data-page="1"]');
    });
    await test('BIL-06', 'Monthly billing', 'mark a month PAID then PENDING; totals update', async () => {
      await page.evaluate(() => document.querySelector('#bill-table tbody tr[data-month] .bill-toggle').click()); await sleep(1000);
      ok(/Paid ₹ 11,800 · Pending ₹ 1,29,800/.test(await bodyText()), 'totals after paid');
      ok(/Paid/.test(await page.$eval('#bill-table tbody tr[data-month]', (e) => e.innerText)), 'row status');
      await setVal('#bill-filter', 'Paid'); await sleep(900);
      ok((await page.$$('#bill-table tbody tr[data-month]')).length === 1, 'paid filter');
      await setVal('#bill-filter', 'All'); await sleep(900);
      await page.evaluate(() => document.querySelector('#bill-table tbody tr[data-month] .bill-toggle').click()); await sleep(1000);
      ok(/Paid ₹ 0 · Pending ₹ 1,41,600/.test(await bodyText()), 'totals after pending');
    });
    await test('BIL-07', 'Monthly billing', 'switching to WITHOUT GST re-prices every month (₹ 1,20,000)', async () => {
      await setVal('#bill-gst-mode', 'Without GST'); await sleep(300);
      ok(/Not applied/.test(await page.$eval('#bill-preview', (e) => e.innerText)), 'preview');
      await page.click('#bill-save'); await sleep(1500);
      ok(/Total ₹ 1,20,000/.test(await bodyText()), 'total ' );
      const first = await page.$eval('#bill-table tbody tr[data-month]', (e) => e.innerText.replace(/\n/g, ' '));
      ok(/10,000/.test(first) && !/1,800/.test(first), first);
    });
    await test('BIL-08', 'Monthly billing', 'edit a month amount via modal; add an extra month; delete it', async () => {
      await page.evaluate(() => document.querySelector('#bill-table tbody tr[data-month] button[title="Edit billing month"]').click()); await sleep(400);
      ok((await page.$eval('#bill-row-amount', (e) => e.value)) === '10000', 'prefill');
      await setVal('#bill-row-amount', '7500'); await setVal('#bill-row-notes', 'discount'); await page.click('#bill-row-save'); await sleep(1000);
      ok(/7,500/.test(await page.$eval('#bill-table tbody tr[data-month]', (e) => e.innerText)), 'edit');
      await page.click('#bill-add'); await sleep(400);
      await page.click('#bill-row-save'); await sleep(300);
      ok(/Pick the billing month/.test(await page.$eval('#form-error', (e) => e.textContent)), 'month required');
      await setVal('#bill-row-month', '2027-06'); await setVal('#bill-row-amount', '2000'); await page.click('#bill-row-save'); await sleep(1200);
      ok(/13 months/.test(await bodyText()), '13 months');
      await clickPager('.pager__btn[data-page="2"]');
      const extra = await page.$$eval('#bill-table tbody tr[data-month]', (r) => r.map((x) => x.dataset.month));
      ok(extra.includes('2027-06'), 'extra month on page 2: ' + extra);
      await page.evaluate(() => document.querySelector('#bill-table tbody tr[data-month="2027-06"] button[title="Delete billing month"]').click());
      await confirmDialog();
      ok(/12 months/.test(await bodyText()), 'back to 12');
    });
    await test('BIL-09', 'Monthly billing', 'Edit Profile → change agreement dates regenerates months; billing fields are prefilled', async () => {
      await openTab('General');
      await clickText('button', 'Edit Profile', 0); await sleep(900);
      ok((await page.$eval('#bill-amount-input', (e) => e.value)) === '10000', 'prefilled amount');
      await setVal('#agreement-to', '2027-07-11'); await sleep(200);
      ok(/15 monthly bills/.test(await page.$eval('#bill-summary', (e) => e.textContent)), 'summary');
      await page.evaluate(() => document.querySelector('#client-form').requestSubmit()); await sleep(1500);
      const c = (await api('GET', '/api/clients/' + createdClientId)).data;
      ok(c.monthlySchedule.length === 15, 'regenerated ' + c.monthlySchedule.length);
    });
    await test('BIL-10', 'Monthly billing', 'Clear Setup removes the unpaid schedule', async () => {
      await goto('/clients/c/' + createdClientId, 800); await openTab('Monthly Billing');
      await page.click('#bill-clear'); await confirmDialog();
      ok(/No monthly billing yet/.test(await bodyText()), 'empty state');
    });

    await test('GEN-01', 'Console health', 'no JavaScript errors were raised during the run', async () => {
      ok(jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    });
  } catch (fatal) {
    console.log('FATAL (outside a test):', fatal.message);
    results.push({ id: 'FATAL', feature: 'Harness', name: 'run aborted', status: 'FAIL', error: fatal.message });
    try { await shot('FAIL-FATAL'); } catch {}
  } finally {
    try {
      if (createdClientId) await api('DELETE', '/api/clients/' + createdClientId);
      const list = (await api('GET', '/api/project-stages?q=' + TAG)).data || [];
      for (const t of list) await api('DELETE', '/api/project-stages/' + t._id);
      for (const e of (await api('GET', '/api/accounts/emi?q=' + TAG)).data || []) await api('DELETE', '/api/accounts/emi/' + e._id);
      await fixture.cleanup();
    } catch (e) { console.log('cleanup:', e.message); }
    await browser.close();
    const failed = results.filter((r) => r.status === 'FAIL');
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ ranAt: new Date().toISOString(), total: results.length, passed: results.length - failed.length, failed: failed.length, results }, null, 2));
    console.log(`\n${results.length - failed.length}/${results.length} UI tests passed`);
    process.exit(failed.length ? 1 : 0);
  }
})();
