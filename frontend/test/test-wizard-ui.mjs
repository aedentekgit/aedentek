// UI E2E: step-wizard form layout (step header, progress, step chips, sectioned cards, live preview,
// Wizard / All-in-one toggle) on the Register-client and Add-employee pages.
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.join(__dirname, '../test-reports/wizard');
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.startsWith('FAIL-')) fs.unlinkSync(path.join(OUT, f));
const TAG = `ZZW${Date.now().toString().slice(-6)}`;
const results = []; const jsErrors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const api = async (m, u, b) => (await fetch(BASE + u, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined })).json();

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  page.on('pageerror', (e) => jsErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404|Failed to load resource/.test(m.text())) jsErrors.push(m.text()); });
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const test = async (id, feature, name, fn) => {
    try { await fn(); results.push({ id, feature, name, status: 'PASS' }); console.log(`✓ [${id}] ${name}`); }
    catch (e) { results.push({ id, feature, name, status: 'FAIL', error: e.message }); console.log(`✗ [${id}] ${name}\n    ${e.message}`); try { await shot('FAIL-' + id); } catch {} }
  };
  const ok = (c, m) => { if (!c) throw new Error(m); };
  const goto = async (p, wait = 900) => { await page.goto(BASE + p, { waitUntil: 'networkidle0' }); await sleep(wait); };
  const setVal = async (sel, v) => {
    await page.waitForSelector(sel, { timeout: 5000 });
    await page.evaluate((s, val) => {
      const el = document.querySelector(s);
      const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    }, sel, v);
  };
  const info = () => page.evaluate(() => ({
    stepTitle: document.querySelector('#wz-step-title')?.textContent,
    head: document.querySelector('.wz-progress__title')?.textContent.replace(/\s+/g, ' ').trim(),
    pct: document.querySelector('#wz-pct')?.textContent,
    barWidth: document.querySelector('.wz-progress__bar i')?.style.width,
    visible: [...document.querySelectorAll('.wz-sec')].filter((s) => !s.hidden && s.offsetParent).map((s) => s.getAttribute('data-wz-section')),
    chips: [...document.querySelectorAll('.wz-step')].map((c) => c.className.replace('wz-step', '').trim() || 'todo'),
    next: document.querySelector('#wz-next')?.textContent.trim() || null,
    hasSubmit: !!document.querySelector('#wz-submit'), hasPrev: !!document.querySelector('#wz-prev'),
    previewTitle: document.querySelector('#wz-preview-title')?.textContent
  }));
  const next = async () => { await page.click('#wz-next'); await sleep(450); };
  const bodyText = () => page.evaluate(() => document.body.innerText);
  let clientId; let staffId;

  try {
    await page.evaluateOnNewDocument(() => { try { if (!sessionStorage.getItem('wz-test-init')) { localStorage.removeItem('tessly:formMode'); sessionStorage.setItem('wz-test-init', '1'); } } catch (e) {} });

    // ===================================================== CLIENT WIZARD
    await goto('/clients/new');
    await test('WZ-01', 'Wizard shell', 'defaults to Wizard Mode with the step header, progress bar and three step chips', async () => {
      const i = await info();
      ok(/STEP 1 OF 3/.test(i.head) && i.stepTitle === 'Company Identity', JSON.stringify(i));
      ok(i.pct === '33% Completed' && i.barWidth === '33%', i.pct + ' ' + i.barWidth);
      ok(i.chips.join() === 'is-current,todo,todo', i.chips.join());
      ok(JSON.stringify(i.visible) === '["1"]', 'only step 1 visible: ' + i.visible);
      ok(await page.$('#wz-mode-wizard.is-on') && await page.$('#wz-mode-all'), 'mode toggle');
      await shot('01-client-step1');
    });
    await test('WZ-02', 'Wizard shell', 'sections are cards with a coloured edge, uppercase heading and tinted sub-panels', async () => {
      const st = await page.evaluate(() => {
        const sec = document.querySelector('.wz-sec:not([hidden])');
        const c = getComputedStyle(sec);
        return { left: c.borderLeftWidth, leftColor: c.borderLeftColor, title: sec.querySelector('.wz-sec__title').textContent, panels: sec.querySelectorAll('.wz-panel').length, labelUpper: getComputedStyle(sec.querySelector('.wz-panel__label')).textTransform };
      });
      ok(parseFloat(st.left) >= 3 && st.leftColor !== 'rgba(0, 0, 0, 0)', JSON.stringify(st));
      ok(st.title === 'SECTION 1: COMPANY IDENTITY', st.title);
      ok(st.panels === 4 && st.labelUpper === 'uppercase', JSON.stringify(st));
    });
    await test('WZ-03', 'Live preview', 'live preview updates as you type (name, contact, GSTIN, tabs)', async () => {
      ok((await info()).previewTitle === 'New Client', 'initial title');
      await setVal('input[data-field="company"]', `${TAG} Industries`); await setVal('input[data-field="name"]', 'Wiz Tester'); await setVal('input[data-field="gstNumber"]', '27ABCDE1234F1Z5'); await sleep(300);
      ok((await info()).previewTitle === `${TAG} Industries`, 'title not live');
      const rows = await page.$eval('.wz-preview__rows', (e) => e.innerText);
      ok(/Wiz Tester/.test(rows) && /27ABCDE1234F1Z5/.test(rows), rows);
      const initials = await page.$eval('.wz-preview__avatar', (e) => e.textContent);
      ok(initials === 'ZZ' || initials.length === 2, 'initials ' + initials);
      await page.evaluate(() => [...document.querySelectorAll('.wz-preview__tab')].find((t) => t.textContent === 'Agreement').click()); await sleep(200);
      ok(/Duration/.test(await page.$eval('.wz-preview__rows', (e) => e.innerText)), 'agreement tab');
      await page.evaluate(() => document.querySelector('.wz-preview__tab').click());
    });
    await test('WZ-04', 'Wizard steps', 'Next is blocked until the step is valid (required fields highlighted)', async () => {
      await setVal('input[data-field="email"]', ''); await setVal('input[data-field="phone"]', ''); await sleep(150);
      await next();
      ok(/STEP 1 OF 3/.test((await info()).head), 'should stay on step 1');
      ok(/A valid corporate email is required/.test(await bodyText()) && /Phone \/ hotline is required/.test(await bodyText()), 'errors not shown');
    });
    await test('WZ-05', 'Wizard steps', 'pressing Enter inside a field advances (validates) instead of submitting the form', async () => {
      await setVal('input[data-field="email"]', 'w@zz.io'); await setVal('input[data-field="phone"]', '9990001111'); await sleep(150);
      await page.focus('input[data-field="city"]'); await page.keyboard.press('Enter'); await sleep(500);
      const i = await info(); ok(/STEP 2 OF 3/.test(i.head), i.head);
      ok(page.url().endsWith('/clients/new'), 'must not have submitted');
    });
    await test('WZ-06', 'Wizard steps', 'step 2 header, 67 %, previous chip marked completed (✓), only section 2 visible', async () => {
      const i = await info();
      ok(i.stepTitle === 'Agreement & Billing' && i.pct === '67% Completed' && i.barWidth === '67%', JSON.stringify(i));
      ok(i.chips.join() === 'is-done,is-current,todo', i.chips.join());
      ok(JSON.stringify(i.visible) === '["2"]' && i.hasPrev && i.next === 'Next: Documents', JSON.stringify(i));
      await shot('02-client-step2');
    });
    await test('WZ-07', 'Wizard steps', 'agreement dates + monthly billing preview work inside the wizard', async () => {
      await setVal('#agreement-from', '2026-04-12'); await setVal('#agreement-to', '2027-04-11'); await setVal('#bill-amount-input', '10000'); await setVal('#bill-gst-select', 'With GST'); await sleep(300);
      ok(/12 monthly bills × ₹ 11,800/.test(await page.$eval('#bill-summary', (e) => e.textContent)), 'summary');
      await page.evaluate(() => [...document.querySelectorAll('.wz-preview__tab')].find((t) => t.textContent === 'Agreement').click()); await sleep(200);
      const rows = await page.$eval('.wz-preview__rows', (e) => e.innerText.replace(/\n/g, ' '));
      ok(/1 year/.test(rows) && /11,800/.test(rows), rows);
    });
    await test('WZ-08', 'Wizard steps', 'invalid agreement dates block Next on step 2', async () => {
      await setVal('#agreement-to', '2026-01-01'); await sleep(150); await next();
      ok(/STEP 2 OF 3/.test((await info()).head), 'should stay');
      ok(/To date cannot be before/.test(await bodyText()), 'message');
      await setVal('#agreement-to', '2027-04-11'); await sleep(150);
    });
    await test('WZ-09', 'Wizard steps', 'last step shows Submit (no Next) and the Documents table', async () => {
      await next();
      const i = await info();
      ok(/STEP 3 OF 3/.test(i.head) && i.pct === '100% Completed' && i.hasSubmit && !i.next, JSON.stringify(i));
      ok(i.chips.join() === 'is-done,is-done,is-current', i.chips.join());
      ok(await page.$('#doc-rows') && await page.$('#doc-row-add'), 'documents table');
    });
    await test('WZ-10', 'Wizard steps', 'step chips and Previous move backwards freely; forward chips are validated', async () => {
      await page.click('.wz-step[data-wz-step="1"]'); await sleep(400);
      ok(/STEP 1 OF 3/.test((await info()).head), 'chip back');
      await page.click('.wz-step[data-wz-step="3"]'); await sleep(500);
      ok(/STEP 3 OF 3/.test((await info()).head), 'chip forward (valid data)');
      await page.click('#wz-prev'); await sleep(400);
      ok(/STEP 2 OF 3/.test((await info()).head), 'previous');
      await page.click('#wz-next'); await sleep(400);
    });
    await test('WZ-11', 'Wizard steps', 'completing the wizard creates the client (agreement, billing and documents saved)', async () => {
      await page.click('#doc-row-add'); await sleep(200);
      const tmp = path.join(OUT, 'wz-doc.pdf'); fs.writeFileSync(tmp, '%PDF-1.4\n' + 'x\n'.repeat(80));
      await (await page.$('#doc-rows .doc-file-input')).uploadFile(tmp); await sleep(500);
      await page.click('#wz-submit'); await sleep(2200);
      ok(/\/clients\/c\/client-\d+/.test(page.url()), page.url());
      clientId = page.url().split('/').pop();
      const c = (await api('GET', '/api/clients/' + clientId)).data;
      ok(c.company === `${TAG} Industries` && c.agreementTo === '2027-04-11' && c.monthlySchedule.length === 12 && c.documents.length === 1, 'saved data');
      fs.unlinkSync(tmp);
    });
    await test('WZ-12', 'Wizard steps', 'Edit opens the wizard at step 1 prefilled with the live preview populated', async () => {
      await goto('/clients/edit/' + clientId, 1000);
      const i = await info(); ok(/STEP 1 OF 3/.test(i.head) && i.previewTitle === `${TAG} Industries`, JSON.stringify(i));
      ok((await page.$eval('input[data-field="name"]', (e) => e.value)) === 'Wiz Tester', 'prefill');
    });

    // ===================================================== MODE TOGGLE
    await test('WZ-13', 'Mode toggle', 'All-In-One Form shows every section, hides the step header and keeps the live preview', async () => {
      await page.click('#wz-mode-all'); await sleep(500);
      ok(!(await page.$('.wz-progress')), 'progress should be hidden');
      const i = await info(); ok(i.visible.join() === '1,2,3', i.visible.join());
      ok(await page.$('.wz-preview'), 'preview kept');
      ok(!i.next && i.hasSubmit, 'submit button shown');
      await shot('03-client-all-in-one');
    });
    await test('WZ-14', 'Mode toggle', 'the chosen mode is remembered after a reload; switching back restores the wizard', async () => {
      await goto('/clients/new', 900);
      ok(!(await page.$('.wz-progress')) && (await info()).visible.length === 3, 'not remembered');
      await page.click('#wz-mode-wizard'); await sleep(400);
      ok(!!(await page.$('.wz-progress')) && (await info()).visible.length === 1, 'wizard not restored');
    });

    // ===================================================== EMPLOYEE WIZARD
    await goto('/hr/staff/new', 1000);
    await test('WZ-15', 'Employee wizard', 'five-step wizard (Personal → Portal access) with preview "New Employee"', async () => {
      const i = await info();
      ok(/STEP 1 OF 5/.test(i.head) && i.stepTitle === 'Personal' && i.pct === '20% Completed', JSON.stringify(i));
      ok((await page.$$('.wz-step')).length === 5 && i.previewTitle === 'New Employee', 'chips/preview');
      await shot('04-employee-step1');
    });
    await test('WZ-16', 'Employee wizard', 'first name is required to leave step 1; typing updates the preview', async () => {
      await next();
      ok(/STEP 1 OF 5/.test((await info()).head) && /First name is required/.test(await bodyText()), 'should be blocked');
      await setVal('input[name="firstName"]', `${TAG}Emp`); await setVal('input[name="lastName"]', 'Wizard'); await sleep(300);
      ok((await info()).previewTitle === `${TAG}Emp Wizard`, 'preview title: ' + (await info()).previewTitle);
      await next();
      ok(/STEP 2 OF 5/.test((await info()).head), 'advanced');
    });
    await test('WZ-17', 'Employee wizard', 'branch + joining date required on step 2; preview shows Employment details', async () => {
      await next();
      ok(/STEP 2 OF 5/.test((await info()).head) && /Branch is required/.test(await bodyText()), 'branch');
      await page.evaluate(() => { const s = document.querySelector('select[name="branch"]'); s.selectedIndex = 1; s.dispatchEvent(new Event('change', { bubbles: true })); });
      await next();
      ok(/Joining date is required/.test(await bodyText()), 'joining');
      await setVal('input[name="joiningDate"]', '2026-11-01'); await setVal('input[name="role"]', 'Analyst'); await setVal('input[name="department"]', 'Quality'); await sleep(300);
      const sub = await page.$eval('.wz-preview__who small', (e) => e.textContent); ok(sub === 'Analyst · Quality', sub);
      const rows = await page.$eval('.wz-preview__rows', (e) => e.innerText.replace(/\n/g, ' ')); ok(/2026-11-01/.test(rows), rows);
      await next(); ok(/STEP 3 OF 5/.test((await info()).head), 'to step 3');
    });
    await test('WZ-18', 'Employee wizard', 'salary step: preview Salary tab totals earnings and net', async () => {
      await setVal('input[name="basic"]', '30000'); await setVal('input[name="hra"]', '10000'); await setVal('input[name="otherDeductions"]', '2000'); await sleep(300);
      await page.evaluate(() => [...document.querySelectorAll('.wz-preview__tab')].find((t) => t.textContent === 'Salary').click()); await sleep(200);
      const rows = await page.$eval('.wz-preview__rows', (e) => e.innerText.replace(/\n/g, ' '));
      ok(/Total earnings\s*₹ 40,000/.test(rows) && /Net monthly\s*₹ 38,000/.test(rows), rows);
      await next(); await next(); ok(/STEP 5 OF 5/.test((await info()).head), 'to last step');
    });
    await test('WZ-19', 'Employee wizard', 'portal login: a password mismatch is caught on the step; then Create employee saves', async () => {
      await page.evaluate(() => document.querySelector('input[name="createLogin"]').click());
      await setVal('input[name="username"]', `${TAG.toLowerCase()}u`); await setVal('input[name="password"]', 'secret123'); await setVal('input[name="confirmPassword"]', 'nope');
      await page.click('#wz-submit'); await sleep(700);
      ok(/do not match/.test(await bodyText()) && page.url().endsWith('/hr/staff/new'), 'mismatch not caught');
      await setVal('input[name="confirmPassword"]', 'secret123');
      await page.click('#wz-submit'); await sleep(2000);
      ok(page.url().endsWith('/hr/staff'), page.url());
      const list = (await api('GET', `/api/staff?q=${TAG}`)).data;
      ok(list.length === 1 && list[0].basic === 30000 && list[0].role === 'Analyst', JSON.stringify(list[0]));
      staffId = list[0]._id;
    });
    await test('WZ-20', 'Employee wizard', 'Edit opens the wizard prefilled; all-in-one mode keeps all five sections reachable', async () => {
      await goto('/hr/staff/' + staffId, 1100);
      ok((await page.$eval('input[name="firstName"]', (e) => e.value)) === `${TAG}Emp`, 'prefill');
      ok((await info()).previewTitle.includes(TAG), 'preview prefilled: ' + (await info()).previewTitle);
      await page.click('#wz-mode-all'); await sleep(400);
      ok((await info()).visible.join() === '1,2,3,4,5', 'all sections');
      await page.click('#wz-mode-wizard'); await sleep(300);
    });
    await test('WZ-21', 'Responsive', 'on a narrow screen the preview stacks under the form and chips stack', async () => {
      await page.setViewport({ width: 900, height: 900 }); await sleep(500);
      const cols = await page.$eval('.wz-body', (e) => getComputedStyle(e).gridTemplateColumns.split(' ').length);
      ok(cols === 1, 'columns ' + cols);
      await page.setViewport({ width: 1500, height: 1000 });
    });
    // ===================================================== SPEC: Add New Client
    await goto('/clients/new', 1000);
    await test('SP-01', 'Add New Client spec', 'hero bar: "Add New Client" + "Client & Agreement Setup" pill, Back, Auto-Fill Demo Data and the mode toggle', async () => {
      const h = await page.evaluate(() => ({ t: document.querySelector('.wz-top__title')?.textContent, badge: document.querySelector('.wz-top__badge')?.textContent, back: !!document.querySelector('#wz-back'), demo: document.querySelector('#wz-demo')?.textContent.trim(), modes: [...document.querySelectorAll('.wz-modes__btn')].map((b) => b.textContent) }));
      ok(/^Add New Client/.test(h.t) && h.badge === 'Client & Agreement Setup' && h.back && /Auto-Fill Demo Data/.test(h.demo) && h.modes.length === 2, JSON.stringify(h));
      await shot('05-spec-header');
    });
    await test('SP-02', 'Add New Client spec', 'sections are colour-coded (primary / emerald / rose left accent bars)', async () => {
      const cols = await page.evaluate(() => [...document.querySelectorAll('.wz-sec')].map((s) => ({ a: s.getAttribute('data-accent'), c: getComputedStyle(s).borderLeftColor })));
      ok(cols.map((c) => c.a).join() === 'primary,emerald,rose', JSON.stringify(cols));
      ok(new Set(cols.map((c) => c.c)).size === 3, 'three distinct colours: ' + JSON.stringify(cols));
    });
    await test('SP-03', 'Add New Client spec', 'section 1 shows an auto-generated read-only reference badge (REF-####)', async () => {
      const b = await page.$eval('.wz-sec[data-wz-section="1"] .wz-sec__badge', (e) => e.textContent);
      ok(/^Ref: REF-\d{4}$/.test(b), b);
    });
    await test('SP-04', 'Add New Client spec', 'Auto-Fill Demo Data populates every step and the live preview', async () => {
      await page.click('#wz-demo'); await sleep(500);
      ok((await page.$eval('input[data-field="company"]', (e) => e.value)) === 'Apex Tech Solutions Pvt Ltd', 'company');
      ok((await page.$eval('input[data-field="email"]', (e) => e.value)).includes('@'), 'email');
      ok((await info()).previewTitle === 'Apex Tech Solutions Pvt Ltd', 'preview');
      ok((await page.$eval('#agreement-from', (e) => e.value)).length === 10 && (await page.$eval('#bill-amount-input', (e) => e.value)) === '25000', 'agreement/billing');
      await next(); ok(/STEP 2 OF 3/.test((await info()).head), 'valid demo data passes step 1');
      ok(/12 monthly bills × ₹ 29,500/.test(await page.$eval('#bill-summary', (e) => e.textContent)), await page.$eval('#bill-summary', (e) => e.textContent));
    });
    await test('SP-05', 'Add New Client spec', 'step badges: agreement duration, and KYC "Pending verification" → "✓ Verified" once a document is attached', async () => {
      ok(/1 year/.test(await page.$eval('.wz-sec[data-wz-section="2"] .wz-sec__badge', (e) => e.textContent)), 'duration badge');
      await next();
      ok(/Pending verification/.test(await page.$eval('.wz-sec[data-wz-section="3"] .wz-sec__badge', (e) => e.textContent)), 'pending');
      await page.click('#doc-row-add'); await sleep(200);
      const tmp = path.join(OUT, 'kyc.pdf'); fs.writeFileSync(tmp, '%PDF-1.4\n' + 'k\n'.repeat(40));
      await (await page.$('#doc-rows .doc-file-input')).uploadFile(tmp); await sleep(500); fs.unlinkSync(tmp);
      ok(/Verified/.test(await page.$eval('.wz-sec[data-wz-section="3"] .wz-sec__badge', (e) => e.textContent)), 'verified badge');
      await page.evaluate(() => [...document.querySelectorAll('.wz-preview__tab')].find((t) => t.textContent === 'Documents').click()); await sleep(200);
      ok(/Verification\s*Verified/.test(await page.$eval('.wz-preview__rows', (e) => e.innerText.replace(/\n/g, ' '))), 'preview verification');
    });
    await test('SP-06', 'Add New Client spec', 'no top error-summary box is shown; invalid fields are flagged inline only', async () => {
      await goto('/clients/new', 900);
      await page.click('#wz-mode-all'); await sleep(300);
      await page.evaluate(() => document.querySelector('#client-form').requestSubmit()); await sleep(500);
      ok(!(await page.$('#wz-error-summary')), 'summary box should not exist');
      ok((await page.$$('.field.is-bad')).length === 4, 'inline errors');
      await page.click('#wz-mode-wizard'); await sleep(300);
    });
    await test('SP-07', 'Add New Client spec', 'step redirect: submitting from the last step with an error on step 1 jumps back to step 1 (wizard mode)', async () => {
      await page.click('#wz-demo'); await sleep(300);
      await setVal('input[data-field="email"]', 'bad'); await sleep(150);
      await page.click('.wz-step[data-wz-step="2"]'); await sleep(300);   // forward chip blocked? step1 invalid → stays
      ok(/STEP 1 OF 3/.test((await info()).head) && /valid corporate email/.test(await bodyText()), 'forward navigation blocked on invalid step');
      await setVal('input[data-field="email"]', 'ok@zz.io'); await sleep(150);
      await page.click('.wz-step[data-wz-step="3"]'); await sleep(400);
      ok(/STEP 3 OF 3/.test((await info()).head), 'reached last step');
      await page.click('.wz-step[data-wz-step="1"]'); await sleep(300);
      await setVal('input[data-field="email"]', 'bad2'); await sleep(150);
      await page.click('.wz-step[data-wz-step="3"]'); await sleep(300);
      ok(/STEP 1 OF 3/.test((await info()).head), 'stays on step 1');
    });
    await test('SP-08', 'Add New Client spec', 'inline errors, fieldset-style groups with accessible names and labelled inputs', async () => {
      ok((await page.$$('.wz-panel[role="group"][aria-label]')).length >= 4, 'panel groups');
      const unlabelled = await page.evaluate(() => [...document.querySelectorAll('#client-form input:not([type="file"]):not([type="hidden"]), #client-form select')].filter((i) => !i.closest('label') && !i.getAttribute('aria-label')).length);
      ok(unlabelled === 0, unlabelled + ' unlabelled inputs');
    });
    await test('SP-09', 'Add New Client spec', 'demo client saves end-to-end and lands on the new client page', async () => {
      await goto('/clients/new', 900);
      await page.click('#wz-demo'); await sleep(300);
      await setVal('input[data-field="company"]', `${TAG} Spec Co`); await sleep(150);
      await next(); await next();
      await page.click('#wz-submit'); await sleep(2200);
      ok(/\/clients\/c\/client-\d+/.test(page.url()), page.url());
      const cid = page.url().split('/').pop();
      const c = (await api('GET', '/api/clients/' + cid)).data;
      ok(c.company === `${TAG} Spec Co` && c.monthlySchedule.length === 12 && c.monthlyBilling.gstMode === 'With GST', 'saved');
      await api('DELETE', '/api/clients/' + cid);
    });
    await test('GEN-01', 'Console health', 'no JavaScript errors were raised during the run', async () => { ok(jsErrors.length === 0, jsErrors.slice(0, 3).join(' | ')); });
  } catch (fatal) {
    console.log('FATAL:', fatal.message); results.push({ id: 'FATAL', feature: 'Harness', name: 'run aborted', status: 'FAIL', error: fatal.message });
  } finally {
    try {
      if (clientId) await api('DELETE', '/api/clients/' + clientId);
      for (const st of (await api('GET', `/api/staff?q=${TAG}`)).data || []) await api('DELETE', '/api/staff/' + st._id);
      await page.evaluate(() => localStorage.removeItem('tessly:formMode')).catch(() => {});
    } catch (e) { console.log('cleanup', e.message); }
    await browser.close();
    const failed = results.filter((r) => r.status === 'FAIL');
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ ranAt: new Date().toISOString(), total: results.length, passed: results.length - failed.length, failed: failed.length, results }, null, 2));
    console.log(`\n${results.length - failed.length}/${results.length} UI tests passed`);
    process.exit(failed.length ? 1 : 0);
  }
})();
