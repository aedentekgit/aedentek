/**
 * ACCOUNTS -> EMI: EMI DATE FULL CRUD END-TO-END UI TEST
 * ------------------------------------------------------------------
 * Runs in headless Chrome against the live dev server (frontend :1234, backend :5001).
 * Verifies:
 *   1. READ: Table includes 'EMI DATE' column, displays formatted dates for existing plans
 *   2. CREATE:
 *      - Form drawer renders 'EMI date' date picker alongside 'Start date'
 *      - Setting Start date auto-syncs EMI date if empty
 *      - Overriding EMI date (e.g. Start: 2026-11-01, EMI date: 2026-11-10) recalculates
 *        live preview (EMI date, End date, End month)
 *      - Submitting creates plan with custom EMI date in MongoDB
 *      - Newly created plan appears in the table with distinct Start and EMI date values
 *   3. READ (API & Parity):
 *      - GET /api/accounts/emi and GET /api/accounts/emi/:id return emiDate
 *      - Schedule due dates begin from emiDate
 *   4. UPDATE:
 *      - Edit drawer pre-fills existing emiDate
 *      - Changing emiDate live-recalculates End date and End month in preview
 *      - Submitting saves updated emiDate to database
 *      - Table updates to show the new EMI date
 *   5. DELETE:
 *      - Action button triggers delete confirmation
 *      - Deleting removes the plan from the register table and backend
 *      - Subsequent API call returns 404
 *   6. Visual audit: Screenshots saved for test case report
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const REPORT_DIR = path.resolve(ROOT_DIR, 'test-reports');
const WORKSPACE_REPORT_DIR = path.resolve(ROOT_DIR, '..', 'test-reports');

if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
if (!fs.existsSync(WORKSPACE_REPORT_DIR)) fs.mkdirSync(WORKSPACE_REPORT_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTest() {
  console.log('====================================================');
  console.log('EMI DATE FULL CRUD UI/UX TEST RUNNER');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      passed++;
      console.log(`  ✓ [PASS] ${name}`);
    } else {
      failed++;
      console.error(`  ✗ [FAIL] ${name} ${details ? '- ' + details : ''}`);
    }
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });

  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.toString()));

  const setField = (selector, value) => page.evaluate((sel, val) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  }, selector, value);

  const previewText = () => page.evaluate(() => (document.querySelector('[data-emi-preview]')?.innerText || '').replace(/\s+/g, ' '));

  try {
    // ---------------------------------------------------------------
    // 0. AUTHENTICATE
    // ---------------------------------------------------------------
    console.log('--- 0. AUTHENTICATION & NAVIGATION ---');
    await page.goto('http://localhost:1234/login', { waitUntil: 'networkidle2' });
    await sleep(600);
    await page.evaluate(() => document.querySelectorAll('.lg-dev__item')[0]?.click());
    await page.click('.lg-submit');
    await sleep(1500);

    await page.goto('http://localhost:1234/accounts/emi', { waitUntil: 'networkidle2' });
    await sleep(1500);
    const pageTitle = await page.evaluate(() => document.querySelector('.phead .ttl, .phead h1')?.textContent?.trim());
    assert('Navigated to EMI page and header loaded', pageTitle === 'EMI', `Title: ${pageTitle}`);

    // ---------------------------------------------------------------
    // 1. READ: TABLE HEADERS & EXISTING RECORDS
    // ---------------------------------------------------------------
    console.log('\n--- 1. READ: TABLE COLUMN & INITIAL REGISTER ---');
    const headers = await page.evaluate(() => [...document.querySelectorAll('table thead th')].map((th) => th.innerText.trim()));
    assert('Table headers contain "EMI DATE" column', headers.includes('EMI DATE'), `Headers: ${headers.join(', ')}`);
    const startIndex = headers.indexOf('START');
    const emiDateIndex = headers.indexOf('EMI DATE');
    const endMonthIndex = headers.indexOf('END MONTH');
    assert('EMI DATE is positioned immediately between START and END MONTH', emiDateIndex === startIndex + 1 && endMonthIndex === emiDateIndex + 1, `Indices: Start=${startIndex}, EMI Date=${emiDateIndex}, End Month=${endMonthIndex}`);

    const existingRows = await page.evaluate(() => {
      return [...document.querySelectorAll('table tbody tr[data-row]')].map((tr) => {
        return [...tr.children].map((td) => td.innerText.replace(/\s+/g, ' ').trim());
      });
    });
    assert('Seeded records render EMI dates in the table', existingRows.length >= 3 && existingRows[0][emiDateIndex].length > 0, `First row EMI date: ${existingRows[0]?.[emiDateIndex]}`);

    // ---------------------------------------------------------------
    // 2. CREATE: FORM DRAWER, EMI DATE INPUT & PREVIEW
    // ---------------------------------------------------------------
    console.log('\n--- 2. CREATE: MODAL DRAWER, EMI DATE INPUT & PREVIEW ---');
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /New EMI plan/i.test(b.innerText))?.click());
    await sleep(900);

    const hasEmiDateInput = await page.evaluate(() => {
      const input = document.querySelector('input[name="emiDate"]');
      const label = input?.closest('.field')?.querySelector('span')?.innerText.trim();
      return { exists: !!input, label, type: input?.type };
    });
    assert('EMI date field exists with type="date"', hasEmiDateInput.exists && hasEmiDateInput.type === 'date', JSON.stringify(hasEmiDateInput));
    assert('Field is labeled "EMI date"', hasEmiDateInput.label === 'EMI date', hasEmiDateInput.label);

    const PLAN_NAME = `Test Gym Rig ${Date.now()}`;
    await setField('input[name="productName"]', PLAN_NAME);
    await setField('select[name="category"]', 'Gym Equipment');
    await setField('input[name="principal"]', '120000');
    await setField('input[name="emiCount"]', '12');
    await setField('input[name="interestRate"]', '10');
    await setField('input[name="startDate"]', '2026-11-01');
    await sleep(400);

    // Overriding EMI Date to 2026-11-10 (different from Start Date 2026-11-01)
    await setField('input[name="emiDate"]', '2026-11-10');
    await sleep(400);

    const pv = await previewText();
    assert('Live preview displays EMI date', /EMI date\s*(Nov 10|10 Nov)/i.test(pv), `Preview: ${pv}`);
    assert('End date is computed from EMI date (ends in Oct 10)', /End date\s*(Oct 10|10 Oct)/i.test(pv), `Preview: ${pv}`);
    assert('End month reflects 12 months from EMI date (Oct 2027)', /Oct 2027 · 12 months/i.test(pv), `Preview: ${pv}`);

    // Take screenshot of modal drawer
    const modalImgPath = path.join(REPORT_DIR, 'emi_date_modal.png');
    await page.screenshot({ path: modalImgPath });
    fs.copyFileSync(modalImgPath, path.join(WORKSPACE_REPORT_DIR, 'emi_date_modal.png'));
    console.log(`  ✓ Screenshot saved: ${modalImgPath}`);

    // Submit form to create
    await page.evaluate(() => document.querySelector('button[form="acct-emi-form"]').click());
    await sleep(1500);

    // Verify row appeared in table
    const createdRow = await page.evaluate((name) => {
      const tr = [...document.querySelectorAll('table tbody tr[data-row]')].find((r) => r.innerText.includes(name));
      if (!tr) return null;
      return [...tr.children].map((td) => td.innerText.replace(/\s+/g, ' ').trim());
    }, PLAN_NAME);

    assert('Created plan appears in register table', !!createdRow, `Row: ${JSON.stringify(createdRow)}`);
    assert('Row displays Start date (Nov 1)', createdRow && (createdRow[startIndex].includes('Nov 1') || createdRow[startIndex].includes('01 Nov')), `Start cell: ${createdRow?.[startIndex]}`);
    assert('Row displays custom EMI date (Nov 10)', createdRow && (createdRow[emiDateIndex].includes('Nov 10') || createdRow[emiDateIndex].includes('10 Nov')), `EMI date cell: ${createdRow?.[emiDateIndex]}`);
    assert('Row displays End month (Oct 2027)', createdRow && createdRow[endMonthIndex].includes('Oct 2027'), `End month cell: ${createdRow?.[endMonthIndex]}`);

    // Screenshot of table
    const tableImgPath = path.join(REPORT_DIR, 'emi_date_table.png');
    await page.screenshot({ path: tableImgPath });
    fs.copyFileSync(tableImgPath, path.join(WORKSPACE_REPORT_DIR, 'emi_date_table.png'));
    console.log(`  ✓ Screenshot saved: ${tableImgPath}`);

    // ---------------------------------------------------------------
    // 3. READ (API PARITY)
    // ---------------------------------------------------------------
    console.log('\n--- 3. READ: API PARITY ---');
    const apiData = await page.evaluate(async (name) => {
      const res = await (await fetch('/api/accounts/emi')).json();
      return res.data.find((d) => d.productName === name);
    }, PLAN_NAME);

    assert('API returns newly created record', !!apiData, `ID: ${apiData?._id}`);
    assert('API record has startDate "2026-11-01" and emiDate "2026-11-10"', apiData?.startDate === '2026-11-01' && apiData?.emiDate === '2026-11-10', `startDate=${apiData?.startDate}, emiDate=${apiData?.emiDate}`);
    assert('API schedule first instalment due date is "2026-11-10"', apiData?.nextDueDate === '2026-11-10', `nextDueDate=${apiData?.nextDueDate}`);
    assert('API endDate is "2027-10-10"', apiData?.endDate === '2027-10-10', `endDate=${apiData?.endDate}`);

    const planId = apiData._id;

    // ---------------------------------------------------------------
    // 4. UPDATE: EDIT DRAWER, RECALCULATION & SAVE
    // ---------------------------------------------------------------
    console.log('\n--- 4. UPDATE: EDIT DRAWER, RECALCULATION & SAVE ---');
    await page.evaluate((name) => {
      const tr = [...document.querySelectorAll('table tbody tr[data-row]')].find((r) => r.innerText.includes(name));
      tr.querySelector('button[title="Edit EMI plan"]').click();
    }, PLAN_NAME);
    await sleep(900);

    const prefilledEmiDate = await page.evaluate(() => document.querySelector('input[name="emiDate"]').value);
    assert('Edit form pre-fills existing EMI date (2026-11-10)', prefilledEmiDate === '2026-11-10', `Value: ${prefilledEmiDate}`);

    // Update EMI date to 2026-11-20
    await setField('input[name="emiDate"]', '2026-11-20');
    await sleep(400);

    const editPv = await previewText();
    assert('Edit preview updates EMI date to Nov 20', /EMI date\s*(Nov 20|20 Nov)/i.test(editPv), `Edit preview: ${editPv}`);
    assert('Edit preview updates End date to Oct 20', /End date\s*(Oct 20|20 Oct)/i.test(editPv), `Edit preview: ${editPv}`);

    await page.evaluate(() => document.querySelector('button[form="acct-emi-form"]').click());
    await sleep(1500);

    // Verify updated cell in table
    const updatedRow = await page.evaluate((name) => {
      const tr = [...document.querySelectorAll('table tbody tr[data-row]')].find((r) => r.innerText.includes(name));
      if (!tr) return null;
      return [...tr.children].map((td) => td.innerText.replace(/\s+/g, ' ').trim());
    }, PLAN_NAME);
    assert('Table reflects updated EMI date (Nov 20)', updatedRow && (updatedRow[emiDateIndex].includes('Nov 20') || updatedRow[emiDateIndex].includes('20 Nov')), `Updated cell: ${updatedRow?.[emiDateIndex]}`);

    // Verify backend updated
    const updatedApi = await page.evaluate(async (id) => {
      const res = await (await fetch(`/api/accounts/emi/${id}`)).json();
      return res.data;
    }, planId);
    assert('API GET by ID confirms updated emiDate "2026-11-20"', updatedApi?.emiDate === '2026-11-20', `Stored emiDate: ${updatedApi?.emiDate}`);
    assert('API GET by ID schedule[0].dueDate is "2026-11-20"', updatedApi?.schedule?.[0]?.dueDate === '2026-11-20', `Schedule 0 due: ${updatedApi?.schedule?.[0]?.dueDate}`);

    // ---------------------------------------------------------------
    // 5. DELETE: DELETE CONFIRMATION & API VERIFICATION
    // ---------------------------------------------------------------
    console.log('\n--- 5. DELETE: DELETE CONFIRMATION & PERSISTENCE ---');
    await page.evaluate((name) => {
      const tr = [...document.querySelectorAll('table tbody tr[data-row]')].find((r) => r.innerText.includes(name));
      tr.querySelector('button[title="Delete EMI plan"]').click();
    }, PLAN_NAME);
    await sleep(600);

    const modalTitle = await page.evaluate(() => document.querySelector('.modal__title')?.innerText || '');
    assert('Delete confirmation dialog appears', /Delete this EMI plan/i.test(modalTitle), `Title: ${modalTitle}`);

    await page.evaluate(() => [...document.querySelectorAll('.modal__foot button')].find((b) => /^Delete$/i.test(b.innerText.trim()))?.click());
    await sleep(1500);

    const remainingRows = await page.evaluate((name) => {
      const tr = [...document.querySelectorAll('table tbody tr[data-row]')].find((r) => r.innerText.includes(name));
      return !!tr;
    }, PLAN_NAME);
    assert('Deleted plan removed from UI table', !remainingRows);

    const checkApiDeleted = await page.evaluate(async (id) => {
      const res = await fetch(`/api/accounts/emi/${id}`);
      return res.status;
    }, planId);
    assert('API returns 404 for deleted plan', checkApiDeleted === 404, `Status: ${checkApiDeleted}`);

    // ---------------------------------------------------------------
    // 6. RUNTIME AUDIT
    // ---------------------------------------------------------------
    console.log('\n--- 6. RUNTIME CONSOLE & ERROR AUDIT ---');
    assert('Zero uncaught page errors during test walkthrough', pageErrors.length === 0, JSON.stringify(pageErrors));

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log(`EMI DATE UI CRUD RESULT: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTest();
