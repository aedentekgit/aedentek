// UI E2E: sidebar accordion + scroll + Masters group, 3-column themed Register-client page with a
// Documents container, Profile fields, Employee add/edit page, Template colour + default marker.
import puppeteer from 'puppeteer';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.join(__dirname, '../test-reports/batch3');
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.startsWith('FAIL-')) fs.unlinkSync(path.join(OUT, f));
const TAG = `ZZB${Date.now().toString().slice(-6)}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'b3-'));
const f1 = path.join(tmp, 'agreement.pdf'); fs.writeFileSync(f1, '%PDF-1.4\n' + 'agreement\n'.repeat(60));
const f2 = path.join(tmp, 'nda.pdf'); fs.writeFileSync(f2, '%PDF-1.4\n' + 'nda\n'.repeat(60));
const results = []; const jsErrors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const api = async (m, u, b) => (await fetch(BASE + u, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined })).json();

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 760 });
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('tessly:formMode', 'all'); } catch (e) {} });
  page.on('pageerror', (e) => jsErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404|Failed to load resource/.test(m.text())) jsErrors.push(m.text()); });
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const test = async (id, feature, name, fn) => {
    try { await fn(); results.push({ id, feature, name, status: 'PASS' }); console.log(`✓ [${id}] ${name}`); }
    catch (e) { results.push({ id, feature, name, status: 'FAIL', error: e.message }); console.log(`✗ [${id}] ${name}\n    ${e.message}`); try { await shot('FAIL-' + id); } catch {} }
  };
  const ok = (c, m) => { if (!c) throw new Error(m); };
  const goto = async (p, wait = 800) => { await page.goto(BASE + p, { waitUntil: 'networkidle0' }); await sleep(wait); };
  const setVal = async (sel, v) => {
    await page.waitForSelector(sel, { timeout: 5000 });
    await page.evaluate((s, val) => {
      const el = document.querySelector(s);
      const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    }, sel, v);
  };
  const clickNav = async (label) => { await page.evaluate((l) => [...document.querySelectorAll('.nav__item')].find((a) => a.textContent.trim().startsWith(l)).click(), label); await sleep(1300); };
  const bodyText = () => page.evaluate(() => document.body.innerText);
  const openTab = async (label) => { await page.evaluate((l) => [...document.querySelectorAll('.tabs .tab')].find((x) => x.textContent.includes(l)).click(), label); await sleep(700); };
  const confirmDialog = async () => { await page.waitForSelector('.tl-dialog [data-act="ok"]', { timeout: 3000 }); await page.click('.tl-dialog [data-act="ok"]'); await sleep(600); };
  let clientId; let staffId;

  try {
    // ============================================================ 5. SIDEBAR
    await goto('/accounts/sales', 1500);
    const side = () => page.evaluate(() => {
      const n = document.querySelector('.side__nav');
      const open = [...document.querySelectorAll('.nav__item.is-open')].map((a) => a.textContent.trim().replace(/\d+$/, ''));
      const subs = [...document.querySelectorAll('.nav__subs .nav__sub')];
      const last = subs[subs.length - 1];
      let lastVisible = null;
      if (last) { const r = last.getBoundingClientRect(); const nr = n.getBoundingClientRect(); lastVisible = r.bottom <= nr.bottom + 2 && r.top >= nr.top - 2; }
      return { open, scrollTop: n.scrollTop, scrollable: n.scrollHeight > n.clientHeight, lastVisible, labels: [...document.querySelectorAll('.side__label')].map((x) => x.textContent) };
    });
    await test('SB-01', 'Sidebar', 'only ONE section is open at a time (accordion)', async () => {
      let s = await side(); ok(s.open.length === 1 && s.open[0] === 'Accounts', JSON.stringify(s.open));
      await clickNav('Clients'); s = await side(); ok(s.open.length === 1 && s.open[0] === 'Clients', 'after Clients: ' + s.open);
      await clickNav('Human Resources'); s = await side(); ok(s.open.length === 1 && s.open[0] === 'Human Resources', 'after HR: ' + s.open);
      await clickNav('Accounts'); s = await side(); ok(s.open.length === 1 && s.open[0] === 'Accounts', 'after Accounts: ' + s.open);
    });
    await test('SB-02', 'Sidebar', 'opening a lower section scrolls the sidebar so its whole sub-list is visible', async () => {
      await clickNav('Human Resources'); await sleep(700);
      const s = await side(); ok(s.scrollable, 'sidebar not scrollable in this viewport');
      ok(s.lastVisible === true, 'last HR sub-item is cut off');
      await shot('01-sidebar-hr-open');
    });
    await test('SB-03', 'Sidebar', 'clicking the open section again collapses it', async () => {
      await clickNav('Human Resources'); const s = await side(); ok(s.open.length === 0, JSON.stringify(s.open));
      await clickNav('Human Resources');
    });
    await test('SB-04', 'Sidebar', 'sidebar scroll position survives a page refresh (no jump to top)', async () => {
      await page.mouse.move(120, 350); await page.mouse.wheel({ deltaY: 260 }); await sleep(900);
      const before = (await side()).scrollTop; ok(before > 100, 'could not scroll: ' + before);
      await page.reload({ waitUntil: 'networkidle0' }); await sleep(2800);
      const after = (await side()).scrollTop;
      ok(Math.abs(after - before) <= 20, `scroll ${before} → ${after}`);
    });
    await test('SB-05', 'Sidebar', 'with no saved scroll the active item is brought into view', async () => {
      await page.evaluate(() => sessionStorage.clear());
      await goto('/hr/payroll', 2800);
      const v = await page.evaluate(() => { const a = document.querySelector('.nav__sub.is-active'); const n = document.querySelector('.side__nav'); if (!a) return null; const r = a.getBoundingClientRect(); const nr = n.getBoundingClientRect(); return r.top >= nr.top - 2 && r.bottom <= nr.bottom + 2; });
      ok(v === true, 'active item not visible: ' + v);
    });
    // ============================================================ 2. MASTERS
    await test('MS-01', 'Masters group', 'sidebar has a "Masters" title holding the category pages', async () => {
      await goto('/clients/service-types', 2500);
      const s = await side(); ok(s.labels.includes('Masters'), s.labels.join());
      ok(s.open[0] === 'Masters', 'Masters not open on a master page: ' + s.open);
      const subs = await page.$$eval('.nav__subs .nav__sub', (a) => a.map((x) => x.textContent.trim()));
      ok(subs.join() === 'Service Types,Project Stages,Expense Categories,Asset Categories,Leave Types', subs.join());
      ok(await page.$eval('.nav__sub.is-active', (a) => a.textContent.trim()) === 'Service Types', 'active sub');
      await shot('02-sidebar-masters');
    });
    await test('MS-02', 'Masters group', 'every master link opens its page and highlights itself under Masters', async () => {
      const links = [['Service Types', '/clients/service-types', /Service Type Master/], ['Project Stages', '/clients/project-stages', /Project Stage Master/], ['Expense Categories', '/accounts/expense-categories', /Expense Categories/], ['Asset Categories', '/accounts/asset-categories', /Asset Categories/], ['Leave Types', '/hr/leave-types', /Leave Types/]];
      for (const [label, href, title] of links) {
        await page.evaluate((l) => [...document.querySelectorAll('.nav__sub')].find((a) => a.textContent.trim() === l).click(), label); await sleep(1500);
        ok(page.url().endsWith(href), `${label}: ${page.url()}`);
        ok(title.test(await page.$eval('.top__page', (e) => e.textContent)), label + ' title');
        const s = await side(); ok(s.open.length === 1 && s.open[0] === 'Masters', `${label}: open ${s.open}`);
        ok((await page.$eval('.nav__sub.is-active', (a) => a.textContent.trim())) === label, label + ' not highlighted');
      }
    });
    await test('MS-03', 'Masters group', 'category pages are no longer listed under Clients / Accounts / HR', async () => {
      await goto('/clients/companies', 1200);
      const all = await page.evaluate(() => [...document.querySelectorAll('.nav__sub')].map((a) => a.textContent.trim()));
      ok(!all.includes('Service Types') || all.length === 5, 'Clients still lists master pages: ' + all);
      for (const [nav, bad] of [['Accounts', ['Expense Categories', 'Asset Categories']], ['Human Resources', ['Leave Types']]]) {
        await clickNav(nav);
        const subs = await page.$$eval('.nav__subs .nav__sub', (a) => a.map((x) => x.textContent.trim()));
        ok(!subs.some((x) => bad.includes(x)), `${nav} still lists ${bad}`);
      }
    });

    // ============================================================ 1. REGISTER CLIENT: 3-col + documents
    await goto('/clients/new', 800);
    const co = `${TAG} Docs Co`;
    await test('RC-01', 'Register client page', 'form rows hold 3 values per line (3-column grid, Corporate Details)', async () => {
      const cols = await page.$eval('#cf-corporate', (g) => getComputedStyle(g).gridTemplateColumns.split(' ').length);
      ok(cols === 3, 'columns ' + cols);
      const ys = await page.evaluate(() => ['name', 'email', 'phone'].map((k) => Math.round(document.querySelector(`input[data-field="${k}"]`).getBoundingClientRect().top)));
      ok(ys[0] === ys[1] && ys[1] === ys[2], 'contact/email/phone not on one line: ' + ys);
      const ys2 = await page.evaluate(() => ['gstNumber', 'panNumber', 'city'].map((k) => Math.round(document.querySelector(`input[data-field="${k}"]`).getBoundingClientRect().top)));
      ok(ys2[0] === ys2[1] && ys2[1] === ys2[2], 'GST/PAN/city not on one line: ' + ys2);
      const ys3 = await page.evaluate(() => ['#agreement-from', '#agreement-to'].map((k) => Math.round(document.querySelector(k).getBoundingClientRect().top)));
      ok(ys3[0] === ys3[1], 'agreement dates share a line');
    });
    await test('RC-02', 'Register client page', 'sections are themed cards; "Agreement" upload is replaced by a Documents container', async () => {
      const titles = await page.$$eval('[data-section]', (t) => t.map((x) => x.getAttribute('data-section')));
      ok(titles.join() === 'Company Identity,Agreement & Billing,Documents', titles.join());
      ok(!(await page.$('#agreement-doc-input')), 'old agreement upload still present');
      const heads = await page.$$eval('#doc-rows thead th', (t) => t.map((x) => x.textContent.trim().toLowerCase()));
      ok(heads.join() === 's no,name,upload,action', heads.join());
      ok(/No documents added/.test(await bodyText()), 'empty state');
      await shot('03-register-3col');
    });
    await test('RC-03', 'Register client page', 'Add Document adds Name / Upload / Action rows; upload fills the name; Action removes the row', async () => {
      await page.click('#doc-row-add'); await page.click('#doc-row-add'); await sleep(300);
      ok((await page.$$('#doc-rows tr[data-doc-row]')).length === 2, 'rows');
      const inputs = await page.$$('#doc-rows tr[data-doc-row] .doc-file-input');
      await inputs[0].uploadFile(f1); await sleep(500);
      ok((await page.$eval('#doc-rows tr[data-doc-row] .doc-name-input', (e) => e.value)) === 'agreement', 'name not auto-filled');
      ok(/agreement\.pdf/.test(await page.$eval('#doc-rows tr[data-doc-row] .doc-file-label', (e) => e.textContent)), 'file label');
      await page.evaluate(() => document.querySelectorAll('#doc-rows .doc-remove')[1].click()); await sleep(300);
      ok((await page.$$('#doc-rows tr[data-doc-row]')).length === 1, 'row not removed');
    });
    await test('RC-04', 'Register client page', 'validation: a document needs both a name and a file', async () => {
      await page.click('#doc-row-add'); await sleep(200);
      await page.evaluate(() => { const r = document.querySelectorAll('#doc-rows tr[data-doc-row] .doc-name-input')[1]; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(r, 'Orphan name'); r.dispatchEvent(new Event('input', { bubbles: true })); });
      await setVal('input[data-field="company"]', co); await setVal('input[data-field="name"]', 'Doc Tester'); await setVal('input[data-field="email"]', 'd@zz.io'); await setVal('input[data-field="phone"]', '999');
      await page.evaluate(() => document.querySelector('#client-form').requestSubmit()); await sleep(500);
      ok(/needs both a name and an uploaded file/.test(await page.$eval('#docs-error', (e) => e.textContent)), 'no validation');
      ok(page.url().endsWith('/clients/new'), 'should not navigate');
    });
    await test('RC-05', 'Register client page', 'submit saves the client with its documents (visible under Contracts)', async () => {
      const inputs = await page.$$('#doc-rows tr[data-doc-row] .doc-file-input');
      await inputs[1].uploadFile(f2); await sleep(500);
      await page.evaluate(() => document.querySelector('#client-form').requestSubmit()); await sleep(2000);
      ok(/\/clients\/c\/client-\d+/.test(page.url()), page.url());
      clientId = page.url().split('/').pop();
      const c = (await api('GET', '/api/clients/' + clientId)).data;
      ok(c.documents.length === 2 && c.documents.every((d) => d.data), 'documents stored');
      await openTab('Contracts');
      ok((await page.$$('#doc-grid .cd-doc')).length === 2, 'contracts tab');
    });
    await test('RC-06', 'Register client page', 'Edit opens the existing documents; removing one and saving deletes it', async () => {
      await openTab('General');
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Edit Profile')).click()); await sleep(1100);
      ok((await page.$$('#doc-rows tr[data-doc-row]')).length === 2, 'existing rows');
      ok(/\(PDF/.test(await page.$eval('#doc-rows tr[data-doc-row] .doc-file-label', (e) => e.textContent)), 'existing file label');
      await page.evaluate(() => document.querySelectorAll('#doc-rows .doc-remove')[0].click()); await sleep(200);
      await page.evaluate(() => document.querySelector('#client-form').requestSubmit()); await sleep(1800);
      ok((await api('GET', '/api/clients/' + clientId)).data.documents.length === 1, 'document not deleted');
    });

    // ============================================================ 6. PROFILE
    await goto('/profile', 1200);
    await test('PF-01', 'Profile', 'has Username, Phone number, Password, Confirm password and a view-only Role', async () => {
      for (const n of ['name', 'username', 'email', 'phone', 'password', 'confirm', 'role']) ok(await page.$(`#profile-form input[name="${n}"]`), n + ' missing');
      ok((await page.$eval('input[name="password"]', (e) => e.type)) === 'password' && (await page.$eval('input[name="confirm"]', (e) => e.type)) === 'password', 'password types');
      const role = await page.$eval('input[name="role"]', (e) => ({ ro: e.readOnly, dis: e.disabled, v: e.value }));
      ok(role.dis && role.ro && role.v.length > 0, JSON.stringify(role));
      ok(/Role \(view only\)/.test(await bodyText()), 'role label');
      await shot('04-profile');
    });
    await test('PF-02', 'Profile', 'form uses the 3-column themed grid', async () => {
      const cols = await page.$eval('#profile-form .form-grid', (g) => getComputedStyle(g).gridTemplateColumns.split(' ').length);
      ok(cols === 3, 'columns ' + cols);
    });
    await test('PF-03', 'Profile', 'validation: bad phone, short password and mismatch are rejected', async () => {
      await setVal('input[name="phone"]', '12'); await sleep(200);
      await page.evaluate(() => document.querySelector('#profile-form').requestSubmit()); await sleep(500);
      ok(/valid phone number/.test(await bodyText()), 'phone');
      await setVal('input[name="phone"]', ''); await page.click('input[name="phone"]'); await page.keyboard.type('9820011223'); await setVal('input[name="password"]', 'abc'); await setVal('input[name="confirm"]', 'abc'); await sleep(200);
      await page.evaluate(() => document.querySelector('#profile-form').requestSubmit()); await sleep(500);
      ok(/at least 6 characters/.test(await bodyText()), 'short');
      await setVal('input[name="password"]', 'secret123'); await setVal('input[name="confirm"]', 'secret124'); await sleep(200);
      await page.evaluate(() => document.querySelector('#profile-form').requestSubmit()); await sleep(500);
      ok(/do not match/.test(await bodyText()), 'mismatch');
    });
    await test('PF-04', 'Profile', 'saving updates username & phone, clears the password fields and stamps "Changed" date', async () => {
      await setVal('input[name="username"]', 'ines.okafor'); await setVal('input[name="confirm"]', 'secret123'); await sleep(200);
      await page.evaluate(() => document.querySelector('#profile-form').requestSubmit()); await sleep(900);
      ok(/Profile saved/.test(await bodyText()), 'toast');
      ok((await page.$eval('input[name="password"]', (e) => e.value)) === '' && (await page.$eval('input[name="confirm"]', (e) => e.value)) === '', 'password fields not cleared');
      ok((await page.$eval('input[name="username"]', (e) => e.value)) === 'ines.okafor' && (await page.$eval('input[name="phone"]', (e) => e.value)) === '9820011223', 'values: ' + (await page.$eval('input[name="username"]', (e) => e.value)) + ' / ' + (await page.$eval('input[name="phone"]', (e) => e.value)));
      ok(!/Changed 3 months ago/.test(await bodyText()), 'password-changed text should update');
    });

    // ============================================================ 7. EMPLOYEE PAGE
    await goto('/hr/staff', 1200);
    await test('EM-01', 'Employee page', '"Add employee" opens a full page (no drawer)', async () => {
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Add employee')).click()); await sleep(1100);
      ok(page.url().endsWith('/hr/staff/new'), page.url());
      ok(!(await page.$('.drawer, .modal-drawer, [role="dialog"]')), 'drawer still open');
      ok(await page.$('#hr-staff-form'), 'form');
    });
    await test('EM-02', 'Employee page', 'five themed section cards in 3-column grids', async () => {
      const secs = await page.$$eval('[data-section]', (s) => s.map((x) => x.getAttribute('data-section')));
      ok(secs.join() === 'Personal,Employment,Salary elements,Bank settlement,Portal access', secs.join());
      const cols = await page.$$eval('[data-section] .form-grid', (g) => g.map((x) => getComputedStyle(x).gridTemplateColumns.split(' ').length));
      ok(cols.every((c) => c === 3), cols.join());
      ok(await page.$('input[name="confirmPassword"]'), 'confirm password');
      ok((await page.$eval('input[name="dob"]', (e) => e.type)) === 'date' && (await page.$eval('input[name="joiningDate"]', (e) => e.type)) === 'date', 'date inputs');
      await shot('05-employee-page');
    });
    await test('EM-03', 'Employee page', 'validation: first name, branch and joining date are required', async () => {
      await page.evaluate(() => document.querySelector('#hr-staff-form').requestSubmit()); await sleep(500);
      ok(/First name is required/.test(await bodyText()), 'first name');
      ok(page.url().endsWith('/hr/staff/new'), 'stays on page');
    });
    await test('EM-04', 'Employee page', 'portal login: password and confirm password must match', async () => {
      await setVal('input[name="firstName"]', `${TAG}Emp`); await setVal('input[name="lastName"]', 'Tester'); await setVal('input[name="joiningDate"]', '2026-11-01');
      await page.evaluate(() => { const s = document.querySelector('select[name="branch"]'); s.selectedIndex = 1; s.dispatchEvent(new Event('change', { bubbles: true })); });
      await page.evaluate(() => document.querySelector('input[name="createLogin"]').click());
      await setVal('input[name="username"]', `${TAG.toLowerCase()}u`); await setVal('input[name="password"]', 'secret123'); await setVal('input[name="confirmPassword"]', 'different');
      await page.evaluate(() => document.querySelector('#hr-staff-form').requestSubmit()); await sleep(600);
      ok(/do not match/.test(await bodyText()), 'mismatch not caught');
    });
    await test('EM-05', 'Employee page', 'CREATE saves and returns to the roster', async () => {
      await setVal('input[name="confirmPassword"]', 'secret123');
      await setVal('input[name="role"]', 'QA Analyst'); await setVal('input[name="department"]', 'Quality'); await setVal('input[name="basic"]', '30000');
      await page.evaluate(() => document.querySelector('#hr-staff-form').requestSubmit()); await sleep(1800);
      ok(page.url().endsWith('/hr/staff'), page.url());
      const list = (await api('GET', `/api/staff?q=${TAG}`)).data;
      ok(list.length === 1 && list[0].role === 'QA Analyst' && list[0].basic === 30000, JSON.stringify(list[0]));
      staffId = list[0]._id;
    });
    await test('EM-06', 'Employee page', 'EDIT opens the same page prefilled; saving updates', async () => {
      await page.evaluate(() => document.querySelector('input[placeholder^="Search"]') && null);
      await setVal('input[placeholder^="Search name"]', TAG); await sleep(1100);
      await page.evaluate((t) => [...document.querySelectorAll('tbody tr')].find((r) => r.textContent.includes(t)).querySelector('button[title^="Edit"]').click(), TAG); await sleep(1300);
      ok(page.url().endsWith('/hr/staff/' + staffId), page.url());
      ok((await page.$eval('input[name="firstName"]', (e) => e.value)) === `${TAG}Emp` && (await page.$eval('input[name="role"]', (e) => e.value)) === 'QA Analyst', 'prefill');
      ok((await page.$eval('input[name="joiningDate"]', (e) => e.value)) === '2026-11-01', 'date prefill');
      await setVal('input[name="role"]', 'Senior QA'); await page.evaluate(() => document.querySelector('#hr-staff-form').requestSubmit()); await sleep(1700);
      ok((await api('GET', '/api/staff/' + staffId)).data.role === 'Senior QA', 'not updated');
    });
    await test('EM-07', 'Employee page', 'Cancel returns to the roster without saving', async () => {
      await goto('/hr/staff/new', 800); await setVal('input[name="firstName"]', 'ShouldNotSave');
      await page.click('#wz-cancel'); await sleep(900);
      ok(page.url().endsWith('/hr/staff'), page.url());
      ok(((await api('GET', '/api/staff?q=ShouldNotSave')).data || []).length === 0, 'saved anyway');
    });

    // ============================================================ 3 + 4. TEMPLATES
    await goto('/finance/templates', 1500);
    await page.evaluate(() => { localStorage.removeItem('tessly:templateColors'); localStorage.removeItem('tessly:templateDefault'); });
    await goto('/finance/templates', 1500);
    const hdrColor = () => page.evaluate(() => {
      const stage = document.querySelector('.tmpl-preview__stage');
      const cs = [...stage.querySelectorAll('*')].map((e) => e.getAttribute('fill') || '').concat([...stage.querySelectorAll('*')].map((e) => e.style && e.style.cssText || ''));
      return cs.join(' ').toLowerCase();
    });
    await test('TP-01', 'Template colour', 'a colour picker (presets + custom + reset) sits above the live preview', async () => {
      ok((await page.$$('.tmpl-swatch')).length === 8, 'presets');
      ok(await page.$('#tpl-color-input'), 'custom picker'); ok(await page.$('#tpl-color-reset'), 'reset');
      ok(await page.$eval('#tpl-color-reset', (b) => b.disabled), 'reset should be disabled with the default colour');
      ok((await hdrColor()).includes('#4d33b6') || (await hdrColor()).includes('rgb(77, 51, 182)'), 'base colour in preview');
    });
    await test('TP-02', 'Template colour', 'choosing a colour recolours the live A4 preview and the gallery thumbnail', async () => {
      await page.click('.tmpl-swatch[data-color="#059669"]'); await sleep(600);
      const h = await hdrColor();
      ok(h.includes('#059669') || h.includes('rgb(5, 150, 105)'), 'preview not recoloured');
      ok(!h.includes('#4d33b6') && !h.includes('rgb(77, 51, 182)'), 'old accent still present: ' + (h.match(/rgb\(77, 51, 182\)/g) || []).length);
      const thumb = await page.$eval('[data-template-card="classic"] .tmpl-card__swatch', (e) => e.innerHTML.toLowerCase());
      ok(thumb.includes('#059669'), 'thumbnail not recoloured');
      ok(await page.$eval('.tmpl-swatch[data-color="#059669"]', (b) => b.classList.contains('is-on')), 'swatch not marked');
      await shot('06-template-colour');
    });
    await test('TP-03', 'Template colour', 'custom colour input works and the choice persists after a reload', async () => {
      await setVal('#tpl-color-input', '#aa2288'); await sleep(500);
      ok((await hdrColor()).includes('rgb(170, 34, 136)') || (await hdrColor()).includes('#aa2288'), 'custom colour');
      await goto('/finance/templates', 1500);
      const h = await hdrColor(); ok(h.includes('rgb(170, 34, 136)') || h.includes('#aa2288'), 'not persisted');
      ok(JSON.parse(await page.evaluate(() => localStorage.getItem('tessly:templateColors'))).classic === '#aa2288', 'storage');
    });
    await test('TP-04', 'Template colour', 'colours are per template (Crimson Creative keeps its own colour) and Reset restores the original', async () => {
      await page.click('[data-template-card="retail"]'); await sleep(600);
      ok((await hdrColor()).includes('#e5252a') || (await hdrColor()).includes('rgb(229, 37, 42)'), 'crimson untouched');
      await page.click('.tmpl-swatch[data-color="#2563eb"]'); await sleep(500);
      const all = JSON.parse(await page.evaluate(() => localStorage.getItem('tessly:templateColors')));
      ok(all.classic === '#aa2288' && all.retail === '#2563eb', JSON.stringify(all));
      await page.click('#tpl-color-reset'); await sleep(500);
      ok((await hdrColor()).includes('#e5252a') || (await hdrColor()).includes('rgb(229, 37, 42)'), 'reset');
      await page.click('[data-template-card="classic"]'); await sleep(400);
      await page.click('#tpl-color-reset'); await sleep(500);
      ok(!JSON.parse(await page.evaluate(() => localStorage.getItem('tessly:templateColors')) || '{}').classic, 'classic reset');
    });
    await test('TP-05', 'Default template marker', 'no template is marked before a default is chosen', async () => {
      ok((await page.$$('[data-default-pill]')).length === 0, 'unexpected default pills');
      ok(!/Default - A4/.test(await bodyText()), 'static "Default - A4" label should be gone');
    });
    await test('TP-06', 'Default template marker', 'Set as Default marks that template in the left list', async () => {
      await page.click('[data-template-card="classic"]'); await sleep(300);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /as Default/.test(b.textContent)).click()); await sleep(700);
      ok(await page.$('[data-template-card="classic"] [data-default-pill]'), 'classic not marked');
      ok((await page.$eval('[data-template-card="classic"]', (e) => e.getAttribute('data-default'))) === 'true', 'data-default');
      ok(!(await page.$('[data-template-card="fintech"] [data-default-pill]')), 'fintech wrongly marked');
      await shot('07-template-default');
    });
    await test('TP-07', 'Default template marker', 'default is kept per document type and survives a reload; changing it moves the marker', async () => {
      await page.click('[data-template-card="fintech"]'); await sleep(300);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /as Default/.test(b.textContent)).click()); await sleep(600);
      ok(await page.$('[data-template-card="fintech"] [data-default-pill]') && !(await page.$('[data-template-card="classic"] [data-default-pill]')), 'marker should move to fintech');
      await goto('/finance/templates', 1500);
      ok(await page.$('[data-template-card="fintech"] [data-default-pill]'), 'not persisted');
    });
    await test('TP-08', 'Template colour', 'the chosen colour is used by real documents (invoice preview of the default template)', async () => {
      await page.evaluate(() => localStorage.setItem('tessly:templateColors', JSON.stringify({ fintech: '#059669' })));
      await goto('/finance/invoices', 1500);
      const hasInvoices = await page.$('tbody tr[data-row]');
      if (!hasInvoices) return;
      await page.evaluate(() => document.querySelector('tbody tr[data-row] button[title^="Preview"]').click()); await sleep(1500);
      const html = await page.evaluate(() => document.body.innerHTML.toLowerCase());
      ok(html.includes('#059669') || html.includes('rgb(5, 150, 105)'), 'document not recoloured');
    });

    await test('GEN-01', 'Console health', 'no JavaScript errors were raised during the run', async () => { ok(jsErrors.length === 0, jsErrors.slice(0, 3).join(' | ')); });
  } catch (fatal) {
    console.log('FATAL:', fatal.message); results.push({ id: 'FATAL', feature: 'Harness', name: 'run aborted', status: 'FAIL', error: fatal.message }); try { await shot('FAIL-FATAL'); } catch {}
  } finally {
    try {
      if (clientId) await api('DELETE', '/api/clients/' + clientId);
      if (staffId) await api('DELETE', '/api/staff/' + staffId);
      for (const st of (await api('GET', `/api/staff?q=${TAG}`)).data || []) await api('DELETE', '/api/staff/' + st._id);
      await page.evaluate(() => { localStorage.removeItem('tessly:templateColors'); localStorage.removeItem('tessly:templateDefault'); }).catch(() => {});
    } catch (e) { console.log('cleanup', e.message); }
    await browser.close();
    const failed = results.filter((r) => r.status === 'FAIL');
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ ranAt: new Date().toISOString(), total: results.length, passed: results.length - failed.length, failed: failed.length, results }, null, 2));
    console.log(`\n${results.length - failed.length}/${results.length} UI tests passed`);
    process.exit(failed.length ? 1 : 0);
  }
})();
