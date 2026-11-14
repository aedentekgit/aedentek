// UI E2E for: Login Credentials, Service Type master, Projects CRUD, invoice<->project,
// Register-client page (logo + agreement + dates), Contracts CRUD.
import puppeteer from 'puppeteer';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createFixtureClient } from './helpers/fixture-client.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.join(__dirname, '../test-reports/client-modules');
fs.mkdirSync(OUT, { recursive: true });

const TAG = `ZZUI${Date.now().toString().slice(-6)}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-'));
const logoPath = path.join(tmp, 'logo.png');
fs.writeFileSync(logoPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
const pdfPath = path.join(tmp, 'agreement.pdf');
fs.writeFileSync(pdfPath, '%PDF-1.4\n' + 'sample agreement body\n'.repeat(80));
const pdf2Path = path.join(tmp, 'sow.pdf');
fs.writeFileSync(pdf2Path, '%PDF-1.4\n' + 'sow body\n'.repeat(40));

const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jsErrors = [];

const api = async (method, url, body) => {
  const r = await fetch(BASE + url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
};

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('tessly:formMode', 'all'); } catch (e) {} });
  page.on('pageerror', (e) => jsErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404|Failed to load resource/.test(m.text())) jsErrors.push(m.text()); });

  const shot = (name) => page.screenshot({ path: path.join(OUT, name + '.png') });
  const test = async (id, feature, name, fn) => {
    try { await fn(); results.push({ id, feature, name, status: 'PASS' }); console.log(`✓ [${id}] ${name}`); }
    catch (e) { results.push({ id, feature, name, status: 'FAIL', error: e.message }); console.log(`✗ [${id}] ${name}\n    ${e.message}`); try { await shot('FAIL-' + id); } catch {} }
  };
  const ok = (c, m) => { if (!c) throw new Error(m); };
  const goto = async (p) => { await page.goto(BASE + p, { waitUntil: 'networkidle0' }); await sleep(500); };
  const setVal = async (sel, v) => {
    await page.waitForSelector(sel, { timeout: 4000 });
    await page.evaluate((s, val) => {
      const el = document.querySelector(s);
      const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    }, sel, v);
  };
  const clickText = async (sel, text) => {
    const done = await page.evaluate((s, t) => {
      const el = [...document.querySelectorAll(s)].find((x) => x.textContent.trim().includes(t));
      if (el) el.click();
      return !!el;
    }, sel, text);
    if (!done) throw new Error(`No ${sel} containing "${text}"`);
    await sleep(350);
  };
  const submitClientForm = async () => { await page.evaluate(() => document.querySelector('#client-form').requestSubmit()); await sleep(500); };
  const confirmDialog = async () => { await page.waitForSelector('.tl-dialog [data-act="ok"]', { timeout: 3000 }); await page.click('.tl-dialog [data-act="ok"]'); await sleep(500); };
  const openTab = async (label) => { await clickText('.tabs .tab', label); await sleep(400); };
  const bodyText = () => page.evaluate(() => document.body.innerText);

  const svcA = `${TAG} Azure`;
  const svcB = `${TAG} LegacyFTP`;
  let clientId;
  const fixture = await createFixtureClient(TAG);
  const FIX = fixture.clientId;
  let createdClientName = `${TAG} Industries`;

  try {
    // ================================================= 2. SERVICE TYPE PAGE
    await goto('/clients/companies');
    await test('SVC-01', 'Service Type page', 'sidebar shows a "Service Types" link (now under the Masters group)', async () => {
      await page.evaluate(() => [...document.querySelectorAll('.nav__item')].find((a) => a.textContent.trim().startsWith('Masters')).click()); await sleep(1200);
      const found = await page.evaluate(() => [...document.querySelectorAll('.nav__sub')].some((a) => a.textContent.trim() === 'Service Types' && a.getAttribute('href') === '/clients/service-types'));
      ok(found, 'Service Types sidebar link missing');
    });
    await goto('/clients/service-types');
    await test('SVC-02', 'Service Type page', 'page renders heading, table and seeded types', async () => {
      const t = await bodyText();
      ok(/Service Type Master/.test(t), 'heading missing');
      ok(await page.$('#svc-table'), 'table missing');
      ok((await page.$$('#svc-table tbody tr[data-svc]')).length >= 3, 'expected seeded rows');
      await shot('01-service-types');
    });
    await test('SVC-03', 'Service Type page', 'CREATE active service type through the modal', async () => {
      await page.click('#svc-add'); await sleep(300);
      await setVal('#svc-name', svcA); await setVal('#svc-code', 'AZ'); await setVal('#svc-desc', 'Microsoft Azure');
      await page.click('#svc-save'); await sleep(800);
      ok((await bodyText()).includes(svcA), 'new row not shown');
    });
    await test('SVC-04', 'Service Type page', 'CREATE inactive service type', async () => {
      await page.click('#svc-add'); await sleep(300);
      await setVal('#svc-name', svcB); await setVal('#svc-status-select', 'Inactive');
      await page.click('#svc-save'); await sleep(800);
      ok((await bodyText()).includes(svcB), 'inactive row not shown');
    });
    await test('SVC-05', 'Service Type page', 'validation: empty name shows an error and does not save', async () => {
      await page.click('#svc-add'); await sleep(300);
      await page.click('#svc-save'); await sleep(300);
      ok(await page.$('#svc-error'), 'error message missing');
      await clickText('.card button', 'Cancel');
    });
    await test('SVC-06', 'Service Type page', 'validation: duplicate name is rejected', async () => {
      await page.click('#svc-add'); await sleep(300);
      await setVal('#svc-name', svcA.toLowerCase());
      await page.click('#svc-save'); await sleep(600);
      ok(/already exists/.test(await page.$eval('#svc-error', (e) => e.textContent)), 'duplicate not reported');
      await clickText('.card button', 'Cancel');
    });
    await test('SVC-07', 'Service Type page', 'status filter: Active hides inactive, Inactive hides active', async () => {
      await setVal('#svc-filter', 'Active'); await sleep(700);
      let t = await bodyText(); ok(t.includes(svcA) && !t.includes(svcB), 'Active filter wrong');
      await setVal('#svc-filter', 'Inactive'); await sleep(700);
      t = await bodyText(); ok(t.includes(svcB) && !t.includes(svcA), 'Inactive filter wrong');
      await setVal('#svc-filter', 'All'); await sleep(700);
    });
    await test('SVC-08', 'Service Type page', 'search filters rows', async () => {
      await setVal('#svc-search', TAG); await sleep(700);
      ok((await page.$$('#svc-table tbody tr[data-svc]')).length === 2, 'expected 2 rows for tag search');
      await setVal('#svc-search', 'no-such-type-xyz'); await sleep(700);
      ok(/No service types found/.test(await bodyText()), 'empty state missing');
      await setVal('#svc-search', TAG); await sleep(700);
    });
    await test('SVC-09', 'Service Type page', 'UPDATE: edit description via modal', async () => {
      await page.evaluate((n) => document.querySelector(`tr[data-svc="${n}"] button[title="Edit service type"]`).click(), svcA); await sleep(300);
      await setVal('#svc-desc', 'Azure — updated');
      await page.click('#svc-save'); await sleep(800);
      ok((await bodyText()).includes('Azure — updated'), 'update not reflected');
    });
    await test('SVC-10', 'Service Type page', 'UPDATE: clicking the status pill toggles Active ↔ Inactive', async () => {
      await page.evaluate((n) => document.querySelector(`tr[data-svc="${n}"] .svc-status`).click(), svcB); await sleep(800);
      const st = await page.$eval(`tr[data-svc="${svcB}"] .svc-status`, (e) => e.textContent.trim());
      ok(st === 'Active', `expected Active, got ${st}`);
      await page.evaluate((n) => document.querySelector(`tr[data-svc="${n}"] .svc-status`).click(), svcB); await sleep(800);
    });
    await shot('02-service-types-after-crud');

    // ================================================= 1 + 2. LOGIN CREDENTIALS (active service types only)
    await test('LOG-01', 'Login credentials', 'tab renamed "Login Credentials" (no "Vault" label)', async () => {
      await goto('/clients/c/' + FIX);
      const labels = await page.$$eval('.tabs .tab', (t) => t.map((x) => x.textContent.trim()));
      ok(labels.some((l) => l.includes('Login Credentials')), 'tab label missing: ' + labels);
      ok(!labels.some((l) => /vault/i.test(l)), 'Vault label still present');
    });
    await test('LOG-02', 'Login credentials', 'table shows login columns', async () => {
      await openTab('Login Credentials');
      const t = await bodyText();
      ok(/Login Credentials/.test(t) && /LOGIN LABEL/i.test(t) && /LOGIN URL/i.test(t) && /USERNAME/i.test(t) && /PASSWORD/i.test(t), 'headers missing');
      ok(!/Encrypted Server Vault/.test(t), 'old vault title still present');
      await shot('03-login-credentials');
    });
    await test('LOG-03', 'Login credentials', 'Service Type dropdown lists ACTIVE types only', async () => {
      await clickText('button', 'Add Login');
      const opts = await page.$$eval('.card select.select option', (o) => o.map((x) => x.value));
      ok(opts.includes(svcA), 'active type missing from dropdown');
      ok(!opts.includes(svcB) || false, 'inactive type should not be offered'); // svcB toggled back to Inactive in SVC-10
      ok(!opts.includes('Vimeo Video'), 'seeded inactive type (Vimeo Video) should not be offered');
      await shot('04-login-add-modal');
    });
    await test('LOG-04', 'Login credentials', 'save a new login with an active service type', async () => {
      await page.evaluate((a) => {
        const sel = document.querySelector('.card select.select');
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, a);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }, svcA);
      const fill = async (ph, v) => { const h = await page.$(`.scrim input[placeholder="${ph}"]`); await h.click({ clickCount: 3 }); await h.type(v); };
      await fill('Production DB Replica', `${TAG} Azure Portal`);
      await fill('admin', 'azure-admin');
      await page.type('.scrim input[type="password"]', 'S3cret!pw');
      await page.click('.scrim button[type="submit"]'); await sleep(900);
      const t = await bodyText();
      ok(t.includes(`${TAG} Azure Portal`) && t.includes(svcA), 'new login row missing');
    });
    await test('LOG-05', 'Login credentials', 'edit and delete a login', async () => {
      await page.evaluate((l) => [...document.querySelectorAll('tbody tr')].find((r) => r.textContent.includes(l)).querySelector('button[title="Edit Login"]').click(), `${TAG} Azure Portal`);
      await sleep(300);
      const h = await page.$('.scrim input[placeholder="admin"]'); await h.click({ clickCount: 3 }); await h.type('azure-root');
      await page.click('.scrim button[type="submit"]'); await sleep(900);
      ok((await bodyText()).includes('azure-root'), 'edit not reflected');
      await page.evaluate((l) => [...document.querySelectorAll('tbody tr')].find((r) => r.textContent.includes(l)).querySelector('button[title="Delete Login"]').click(), `${TAG} Azure Portal`);
      await confirmDialog();
      ok(!(await bodyText()).includes(`${TAG} Azure Portal`), 'login not deleted');
    });
    // cleanup of service types made earlier happens in the Service Type delete test below
    await goto('/clients/service-types');
    await setVal('#svc-search', TAG); await sleep(300);
    await test('SVC-11', 'Service Type page', 'DELETE service types with confirmation (cancel keeps, confirm removes)', async () => {
      await page.evaluate((n) => document.querySelector(`tr[data-svc="${n}"] button[title="Delete service type"]`).click(), svcB);
      await page.waitForSelector('.tl-dialog [data-act="cancel"]'); await page.click('.tl-dialog [data-act="cancel"]'); await sleep(500);
      ok((await bodyText()).includes(svcB), 'row should remain after cancel');
      for (const n of [svcA, svcB]) {
        await page.evaluate((x) => document.querySelector(`tr[data-svc="${x}"] button[title="Delete service type"]`).click(), n);
        await confirmDialog();
      }
      ok(!(await bodyText()).includes(TAG + ' '), 'rows still present after delete');
    });

    // ================================================= 5. REGISTER NEW CLIENT AS A PAGE
    await goto('/clients/companies');
    await test('REG-01', 'Register client page', '"Register New Client" navigates to a full page (no popup)', async () => {
      await clickText('button', 'Register New Client'); await sleep(800);
      ok(page.url().endsWith('/clients/new'), 'URL is ' + page.url());
      ok(!(await page.$('.scrim')), 'a modal/scrim is still shown');
      ok(await page.$('#client-form'), 'form page not rendered');
      await shot('05-register-page');
    });
    await test('REG-02', 'Register client page', 'page has logo, agreement From/To and document upload controls', async () => {
      for (const s of ['#logo-input', '#agreement-from', '#agreement-to', '#doc-row-add']) ok(await page.$(s), s + ' missing');
    });
    await test('REG-03', 'Register client page', 'required-field validation blocks submit', async () => {
      await submitClientForm();
      ok(/Company legal name is required/.test(await bodyText()), 'validation message missing');
      ok(page.url().endsWith('/clients/new'), 'should stay on the page');
    });
    await test('REG-04', 'Register client page', 'agreement date calculation updates live (1 year / 365 days)', async () => {
      await setVal('#agreement-from', '2026-04-12'); await setVal('#agreement-to', '2027-04-11'); await sleep(300);
      const t = await bodyText();
      ok(/1 year/.test(t) && /365/.test(t), 'duration not calculated: ' + t.slice(0, 0));
    });
    await test('REG-05', 'Register client page', 'To date before From date shows an error', async () => {
      await setVal('#agreement-to', '2026-01-01'); await sleep(300);
      ok(/valid From date and a To date/.test(await bodyText()), 'calc error missing');
      await submitClientForm();
      ok(/To date cannot be before/.test(await bodyText()), 'submit validation missing');
      await setVal('#agreement-to', '2027-04-11');
    });
    await test('REG-06', 'Register client page', 'logo upload previews the image; document upload shows file name', async () => {
      await (await page.$('#logo-input')).uploadFile(logoPath); await sleep(500);
      ok(await page.$('#logo-preview'), 'logo preview missing');
      await page.click('#doc-row-add'); await sleep(200);
      await (await page.$('#doc-rows .doc-file-input')).uploadFile(pdfPath); await sleep(500);
      ok(/agreement\.pdf/.test(await page.$eval('#doc-rows .doc-file-label', (e) => e.textContent)), 'doc name missing');
      await page.click('#doc-rows .doc-remove'); await sleep(200); // keep this client free of documents for the Contracts tests
    });
    await test('REG-07', 'Register client page', 'submit creates the client and opens its 360 page', async () => {
      await setVal('input[data-field="company"]', createdClientName);
      await setVal('input[data-field="name"]', 'Zed Tester');
      await setVal('input[data-field="email"]', 'zed@zzui.io');
      await setVal('input[data-field="phone"]', '+91 90000 11111');
      await setVal('input[data-field="city"]', 'Pune');
      await shot('06-register-filled');
      await submitClientForm(); await sleep(1200);
      ok(/\/clients\/c\/client-\d+/.test(page.url()), 'did not navigate to client: ' + page.url());
      clientId = page.url().split('/').pop();
    });
    await test('REG-08', 'Register client page', 'GENERAL section shows agreement dates + calculated duration/remaining + document', async () => {
      const t = await page.$eval('#agreement-section', (e) => e.innerText);
      ok(t.includes('2026-04-12') && t.includes('2027-04-11'), 'dates missing');
      ok(/1 year/.test(t) && /365/.test(t), 'duration missing');
      ok(/DAYS ELAPSED/i.test(t) && /DAYS REMAINING|DAYS OVERDUE|STARTS IN/i.test(t), 'elapsed/remaining missing');
      await shot('07-general-agreement');
    });
    await test('REG-09', 'Register client page', 'logo is saved and shown in the Client Directory', async () => {
      await goto('/clients/companies');
      const src = await page.evaluate((n) => { const r = [...document.querySelectorAll('.cl-table tbody tr')].find((x) => x.textContent.includes(n)); return r && r.querySelector('img') ? r.querySelector('img').src : ''; }, createdClientName);
      ok(src.startsWith('data:image/png'), 'logo not shown: ' + src.slice(0, 30));
      await shot('08-directory-logo');
    });
    await test('REG-10', 'Register client page', 'Edit Profile opens the same page prefilled; agreement dates can be changed', async () => {
      await goto('/clients/c/' + clientId);
      await clickText('button', 'Edit Profile'); await sleep(900);
      ok(page.url().endsWith('/clients/edit/' + clientId), 'URL: ' + page.url());
      ok((await page.$eval('input[data-field="company"]', (e) => e.value)) === createdClientName, 'form not prefilled');
      ok((await page.$eval('#agreement-from', (e) => e.value)) === '2026-04-12', 'dates not prefilled');
      await setVal('#agreement-to', '2027-10-11'); await sleep(200);
      await submitClientForm(); await sleep(1200);
      ok((await page.$eval('#agreement-to-val', (e) => e.textContent)) === '2027-10-11', 'updated date not shown');
      ok(/1 year 6 months/.test(await page.$eval('#agreement-section', (e) => e.innerText)), 'recalculated duration wrong');
    });

    // ================================================= 3. PROJECTS CRUD (on the new client)
    await goto('/clients/c/' + clientId);
    await openTab('Projects');
    await test('PRJ-01', 'Projects CRUD', 'empty state + "Add Project" button present', async () => {
      ok(await page.$('#proj-add'), 'Add Project missing');
      ok(/No active projects/.test(await bodyText()), 'empty state missing');
    });
    await test('PRJ-02', 'Projects CRUD', 'validation: title required', async () => {
      await page.click('#proj-add'); await sleep(300);
      await page.click('#proj-save'); await sleep(300);
      ok(/Project title is required/.test(await page.$eval('#form-error', (e) => e.textContent)), 'no error');
    });
    await test('PRJ-03', 'Projects CRUD', 'validation: completed > total milestones', async () => {
      await setVal('#proj-title', 'Alpha'); await setVal('#proj-total', '2'); await setVal('#proj-done', '5');
      await page.click('#proj-save'); await sleep(300);
      ok(/cannot exceed/.test(await page.$eval('#form-error', (e) => e.textContent)), 'no error');
    });
    await test('PRJ-04', 'Projects CRUD', 'CREATE project; progress derived from milestones', async () => {
      await setVal('#proj-title', 'Portal Revamp'); await setVal('#proj-value', '600000'); await setVal('#proj-total', '4'); await setVal('#proj-done', '1');
      await setVal('#proj-lead', 'Hanna'); await setVal('#proj-start', '2026-05-01'); await setVal('#proj-target', '2026-12-31'); await setVal('#proj-status', 'In Progress');
      await page.click('#proj-save'); await sleep(900);
      const row = await page.$eval('#proj-table tbody tr[data-project]', (e) => e.innerText);
      ok(row.includes('Portal Revamp') && row.includes('25%') && row.includes('1 / 4') && row.includes('6,00,000'), 'row: ' + row);
      await shot('09-projects-crud');
    });
    await test('PRJ-05', 'Projects CRUD', 'UPDATE project: milestones to 4/4 marks it Completed (100%)', async () => {
      await page.evaluate(() => document.querySelector('#proj-table button[title="Edit project"]').click()); await sleep(300);
      ok((await page.$eval('#proj-title', (e) => e.value)) === 'Portal Revamp', 'edit modal not prefilled');
      await setVal('#proj-done', '4');
      await page.click('#proj-save'); await sleep(900);
      const row = await page.$eval('#proj-table tbody tr[data-project]', (e) => e.innerText);
      ok(row.includes('100%') && row.includes('Completed'), 'row: ' + row);
    });
    await test('PRJ-06', 'Projects CRUD', 'add a second project then DELETE it (confirm)', async () => {
      await page.click('#proj-add'); await sleep(300);
      await setVal('#proj-title', 'Mobile App'); await page.click('#proj-save'); await sleep(900);
      ok((await page.$$('#proj-table tbody tr[data-project]')).length === 2, 'expected 2 projects');
      await page.evaluate(() => [...document.querySelectorAll('#proj-table tbody tr')].find((r) => r.textContent.includes('Mobile App')).querySelector('button[title="Delete project"]').click());
      await confirmDialog();
      ok((await page.$$('#proj-table tbody tr[data-project]')).length === 1, 'project not deleted');
    });

    // ================================================= 4. INVOICES BY PROJECT ID (seeded Omni Retail)
    await goto('/clients/c/' + FIX);
    await openTab('Invoices');
    const omni = (await api('GET', '/api/clients/' + FIX)).data;
    await test('INV-01', 'Invoices by project', 'table has Project column and each seeded invoice shows its project', async () => {
      const t = await page.$eval('#inv-table', (e) => e.innerText);
      ok(/PROJECT/i.test(t), 'Project column missing');
      for (const inv of omni.invoices) {
        const pj = omni.projects.find((p) => p.id === inv.projectId);
        ok(pj, `invoice ${inv.invoiceNumber} has no project id`);
        const sel = await page.evaluate((n) => { const r = document.querySelector(`tr[data-invoice="${n}"] select`); return r ? r.options[r.selectedIndex].text : ''; }, inv.invoiceNumber);
        ok(sel === pj.title, `${inv.invoiceNumber}: expected "${pj.title}" got "${sel}"`);
      }
      await shot('10-invoices-by-project');
    });
    await test('INV-02', 'Invoices by project', 'project filter shows only that project\'s invoices and its total', async () => {
      for (const p of omni.projects) {
        await setVal('#inv-project-filter', p.id); await sleep(800);
        const expected = omni.invoices.filter((i) => i.projectId === p.id);
        const rows = await page.$$eval('#inv-table tbody tr[data-invoice]', (r) => r.map((x) => x.dataset.invoice));
        ok(rows.length === expected.length && expected.every((i) => rows.includes(i.invoiceNumber)), `filter ${p.title}: ${rows}`);
        const sum = expected.reduce((s, i) => s + i.totalAmount, 0);
        ok((await bodyText()).includes(sum.toLocaleString('en-IN')), `total ${sum} missing`);
      }
      await setVal('#inv-project-filter', 'all'); await sleep(600);
    });
    await test('INV-03', 'Invoices by project', 'reassign an invoice to another project and the filter/Projects-tab totals follow', async () => {
      const inv = omni.invoices[0];
      const other = omni.projects.find((p) => p.id !== inv.projectId);
      await page.evaluate((n, v) => { const s = document.querySelector(`tr[data-invoice="${n}"] select`); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, v); s.dispatchEvent(new Event('change', { bubbles: true })); }, inv.invoiceNumber, other.id);
      await sleep(900);
      await setVal('#inv-project-filter', other.id); await sleep(800);
      ok((await page.$$eval('#inv-table tbody tr[data-invoice]', (r) => r.map((x) => x.dataset.invoice))).includes(inv.invoiceNumber), 'invoice not under new project');
      await openTab('Projects');
      const total = omni.invoices.filter((i) => i.projectId === other.id || i.id === inv.id).reduce((s, i) => s + i.totalAmount, 0);
      const cell = await page.evaluate((id) => document.querySelector(`#proj-table tr[data-project="${id}"] .proj-invoiced`).textContent, other.id);
      ok(cell.replace(/[^\d]/g, '') === String(total), `Projects tab invoiced ${cell} != ${total}`);
      // restore
      await openTab('Invoices');
      await page.evaluate((n, v) => { const s = document.querySelector(`tr[data-invoice="${n}"] select`); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, v); s.dispatchEvent(new Event('change', { bubbles: true })); }, inv.invoiceNumber, inv.projectId);
      await sleep(900);
    });

    // ================================================= 6. CONTRACTS CRUD (on the new client)
    await goto('/clients/c/' + clientId);
    await openTab('Contracts');
    await test('CON-01', 'Contracts CRUD', '"Add Contract" present; validation requires a name', async () => {
      ok(await page.$('#doc-add'), 'Add Contract missing');
      await page.click('#doc-add'); await sleep(300);
      await page.click('#doc-save'); await sleep(300);
      ok(/Contract name is required/.test(await page.$eval('#form-error', (e) => e.textContent)), 'no validation');
    });
    await test('CON-02', 'Contracts CRUD', 'validation: end date before start date', async () => {
      await setVal('#doc-name', 'Master Agreement'); await setVal('#doc-start', '2026-06-01');
      await page.evaluate(() => { document.querySelector('#doc-end').removeAttribute('min'); });
      await setVal('#doc-end', '2026-01-01');
      await page.click('#doc-save'); await sleep(300);
      ok(/End date cannot be before/.test(await page.$eval('#form-error', (e) => e.textContent)), 'no date validation');
    });
    await test('CON-03', 'Contracts CRUD', 'CREATE contract with category, dates, notes and file upload', async () => {
      await setVal('#doc-end', '2027-05-31'); await setVal('#doc-category', 'SOW'); await setVal('#doc-notes', 'Phase 1 scope');
      await (await page.$('#doc-file')).uploadFile(pdf2Path); await sleep(500);
      ok(/sow\.pdf/.test(await page.$eval('#doc-file-name', (e) => e.textContent)), 'file name not shown');
      await page.click('#doc-save'); await sleep(1000);
      const card = await page.$eval('#doc-grid .cd-doc', (e) => e.innerText);
      ok(card.includes('Master Agreement') && card.includes('SOW') && card.includes('2026-06-01') && card.includes('2027-05-31') && card.includes('Phase 1 scope'), card);
      await shot('11-contracts-crud');
    });
    await test('CON-04', 'Contracts CRUD', 'validity badge shows days left', async () => {
      ok(/\d+d left|Expired|Starts in/.test(await page.$eval('#doc-grid .cd-doc', (e) => e.innerText)), 'validity badge missing');
    });
    await test('CON-05', 'Contracts CRUD', 'DOWNLOAD returns the uploaded file bytes (stored in DB)', async () => {
      const c = (await api('GET', '/api/clients/' + clientId)).data;
      const d = c.documents[0];
      ok(d.data && d.data.startsWith('data:application/pdf;base64,'), 'file data not stored');
      ok(Buffer.from(d.data.split(',')[1], 'base64').toString().includes('sow body'), 'stored bytes differ');
      ok(await page.$('#doc-grid .doc-download'), 'download button missing');
    });
    await test('CON-06', 'Contracts CRUD', 'UPDATE contract (rename, category) via edit modal, keeps file', async () => {
      await page.click('#doc-grid .doc-edit'); await sleep(300);
      ok((await page.$eval('#doc-name', (e) => e.value)) === 'Master Agreement', 'edit modal not prefilled');
      await setVal('#doc-name', 'Master Agreement (Signed)'); await setVal('#doc-category', 'MSA');
      await page.click('#doc-save'); await sleep(1000);
      const card = await page.$eval('#doc-grid .cd-doc', (e) => e.innerText);
      ok(card.includes('Master Agreement (Signed)') && card.includes('MSA'), card);
      const c = (await api('GET', '/api/clients/' + clientId)).data;
      ok(c.documents[0].data, 'file lost on update');
    });
    await test('CON-07', 'Contracts CRUD', 'add a second contract then DELETE it (cancel keeps, confirm removes)', async () => {
      await page.click('#doc-add'); await sleep(300);
      await setVal('#doc-name', 'NDA 2026'); await setVal('#doc-category', 'NDA');
      await page.click('#doc-save'); await sleep(1000);
      ok((await page.$$('#doc-grid .cd-doc')).length === 2, 'expected 2 contracts');
      const del = () => page.evaluate(() => [...document.querySelectorAll('#doc-grid .cd-doc')].find((c) => c.textContent.includes('NDA 2026')).querySelector('.doc-delete').click());
      await del(); await page.waitForSelector('.tl-dialog [data-act="cancel"]'); await page.click('.tl-dialog [data-act="cancel"]'); await sleep(500);
      ok((await page.$$('#doc-grid .cd-doc')).length === 2, 'cancel should keep');
      await del(); await confirmDialog();
      ok((await page.$$('#doc-grid .cd-doc')).length === 1, 'not deleted');
    });
    await test('CON-08', 'Contracts CRUD', 'delete last contract shows empty state', async () => {
      await page.click('#doc-grid .doc-delete'); await confirmDialog();
      ok(/No legal documents uploaded/.test(await bodyText()), 'empty state missing');
    });

    await test('GEN-01', 'Console health', 'no JavaScript errors were raised during the run', async () => {
      ok(jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    });
  } finally {
    // cleanup test data
    try {
      if (clientId) await api('DELETE', '/api/clients/' + clientId);
      await fixture.cleanup();
      const list = (await api('GET', '/api/service-types?q=' + TAG)).data || [];
      for (const t of list) await api('DELETE', '/api/service-types/' + t._id);
    } catch {}
    await browser.close();
    const failed = results.filter((r) => r.status === 'FAIL');
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ ranAt: new Date().toISOString(), total: results.length, passed: results.length - failed.length, failed: failed.length, results }, null, 2));
    console.log(`\n${results.length - failed.length}/${results.length} UI tests passed`);
    process.exit(failed.length ? 1 : 0);
  }
})();
