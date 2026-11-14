import puppeteer from 'puppeteer';
import path from 'path';

const artifactDir = path.resolve("test-reports"); fs.mkdirSync(artifactDir, { recursive: true });

(async () => {
  console.log('--- STARTING VERIFICATION: ZERO DEFAULT VALUES ON NEW FORMS ---');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      failed++;
    }
  }

  // =========================================================================
  // TEST 1: Expense Category Form (User's Exact Uploaded Screenshot)
  // =========================================================================
  console.log('\n=== 1. ADD EXPENSE CATEGORY FORM (SCREENSHOT CASE) ===');
  await page.goto('http://localhost:3000/accounts/expense-categories', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.top', { timeout: 8000 });

  // Click "Add expense category" button
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add expense category'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const modalMounted = await page.$('.modal, .drawer');
  assert(!!modalMounted, 'Expense Category modal/drawer mounted on screen');

  const expCatValues = await page.evaluate(() => {
    const code = document.querySelector('input[name="code"]')?.value ?? null;
    const name = document.querySelector('input[name="name"]')?.value ?? null;
    const desc = document.querySelector('textarea[name="description"]')?.value ?? null;
    const accountCode = document.querySelector('input[name="accountCode"]')?.value ?? null;
    const branch = document.querySelector('input[name="branch"]')?.value ?? null;
    const status = document.querySelector('select[name="status"]')?.value ?? null;
    const codePh = document.querySelector('input[name="code"]')?.placeholder ?? '';
    const namePh = document.querySelector('input[name="name"]')?.placeholder ?? '';

    return { code, name, desc, accountCode, branch, status, codePh, namePh };
  });

  assert(expCatValues.code === '', `Category code input is completely empty (got: "${expCatValues.code}")`);
  assert(expCatValues.name === '', `Category name input is completely empty (got: "${expCatValues.name}")`);
  assert(expCatValues.desc === '', `Description textarea is completely empty (got: "${expCatValues.desc}")`);
  assert(expCatValues.accountCode === '', `Account code input is completely empty (got: "${expCatValues.accountCode}")`);
  assert(expCatValues.branch === '', `Branch scope input is completely empty (got: "${expCatValues.branch}")`);
  assert(expCatValues.status === '', `Status dropdown value is empty / unselected (got: "${expCatValues.status}")`);
  assert(expCatValues.codePh === '', `Category code placeholder no longer contains dummy "EXP-001"`);
  assert(expCatValues.namePh === '', `Category name placeholder no longer contains dummy "Rent"`);

  // Capture screenshot of clean empty form
  await page.screenshot({ path: path.join(artifactDir, 'expense_category_form_empty.png') });

  // Close modal
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));

  // =========================================================================
  // TEST 2: Sales Invoice Creation Form (SalesInvoiceDrawer)
  // =========================================================================
  console.log('\n=== 2. CREATE INVOICE FORM (SALES INVOICE DRAWER) ===');
  await page.goto('http://localhost:3000/accounts/sales', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.top', { timeout: 8000 });

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Create invoice'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const invValues = await page.evaluate(() => {
    const customer = document.querySelector('input[placeholder="Search or enter customer legal name…"]')?.value ?? null;
    const date = document.querySelector('input[type="date"]')?.value ?? null;
    const branch = document.querySelector('input[placeholder="All Branches"]')?.value ?? null;
    const selects = Array.from(document.querySelectorAll('.drawer select')).map(s => s.value);
    const lineQty = document.querySelector('.acct-lines input[type="number"]')?.value ?? null;

    return { customer, date, branch, selects, lineQty };
  });

  assert(invValues.customer === '', `Customer name input is empty (got: "${invValues.customer}")`);
  assert(invValues.date === '', `Invoice date input is empty without default date (got: "${invValues.date}")`);
  assert(invValues.branch === '', `Branch input is empty without default "All Branches" (got: "${invValues.branch}")`);
  assert(invValues.selects.every(v => v === ''), `Invoice dropdowns are unselected / empty (got: [${invValues.selects.join(', ')}])`);
  assert(invValues.lineQty === '', `Line item quantity is empty without default 1 (got: "${invValues.lineQty}")`);

  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));

  // =========================================================================
  // TEST 3: Add Expense Form (ExpenseDrawer)
  // =========================================================================
  console.log('\n=== 3. ADD EXPENSE FORM (EXPENSE DRAWER) ===');
  await page.goto('http://localhost:3000/accounts/expenses', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.top', { timeout: 8000 });

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add expense'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const expValues = await page.evaluate(() => {
    const title = document.querySelector('input[name="title"]')?.value ?? document.querySelector('.drawer input[type="text"]')?.value ?? null;
    const amount = document.querySelector('.drawer input[type="number"]')?.value ?? null;
    const date = document.querySelector('.drawer input[type="date"]')?.value ?? null;
    const selects = Array.from(document.querySelectorAll('.drawer select')).map(s => s.value);

    return { title, amount, date, selects };
  });

  assert(expValues.title === '', `Expense title is empty (got: "${expValues.title}")`);
  assert(expValues.amount === '', `Expense amount is empty without default 0 (got: "${expValues.amount}")`);
  assert(expValues.date === '', `Expense date is empty without default date (got: "${expValues.date}")`);
  assert(expValues.selects.every(v => v === ''), `Expense dropdowns (category, mode) are unselected (got: [${expValues.selects.join(', ')}])`);

  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));

  // =========================================================================
  // TEST 4: Register Client Form (clients modal)
  // =========================================================================
  console.log('\n=== 4. REGISTER NEW CLIENT MODAL ===');
  await page.goto('http://localhost:3000/clients', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.top', { timeout: 8000 });

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Register New Client'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const clientCategory = await page.evaluate(() => {
    const sel = document.querySelector('.card select');
    return sel ? sel.value : null;
  });
  assert(clientCategory === '', `Client Category dropdown is unselected / empty (got: "${clientCategory}")`);

  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));

  await browser.close();

  console.log(`\n===========================================`);
  console.log(`ZERO DEFAULT FORM VALUES TEST RESULT: ${passed} passed, ${failed} failed`);
  console.log(`===========================================\n`);

  if (failed > 0) process.exit(1);
})();

