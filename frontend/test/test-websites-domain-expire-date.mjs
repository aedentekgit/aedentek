import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:1234';
const OUT = path.resolve('test-reports');
fs.mkdirSync(OUT, { recursive: true });

async function run() {
  console.log('===============================================================');
  console.log('WEBSITES TABLE: DOMAIN EXPIRE DATE VERIFICATION TEST SUITE');
  console.log('===============================================================\n');

  // STEP 1: Reset database
  console.log('[STEP 1] Resetting database via POST /api/clients/reset...');
  const resetRes = await fetch(`${BASE_URL}/api/clients/reset`, { method: 'POST' });
  assert.equal(resetRes.status, 200, 'Reset returned 200 OK');
  console.log('✓ Database reset successfully.\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1400,960']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 960 });

  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  try {
    // STEP 2: Login
    console.log(`[STEP 2] Logging in at ${BASE_URL}/login...`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));
    await page.type('input[type="email"]', 'ines.okafor@aedentek.com');
    await page.type('input[autocomplete="current-password"]', 'password123');
    await page.click('.lg-submit');
    await new Promise((r) => setTimeout(r, 1200));

    // STEP 3: Navigate to Kavita Edutech Profile
    console.log(`[STEP 3] Navigating to ${BASE_URL}/clients/c/client-kavita-edu...`);
    await page.goto(`${BASE_URL}/clients/c/client-kavita-edu`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    // Switch to Websites Tab
    console.log('Switching to "Websites" tab...');
    await page.evaluate(() => {
      const t = Array.from(document.querySelectorAll('.tabs .tab')).find((el) => el.textContent.includes('Websites'));
      if (t) t.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // STEP 4: Verify Table Headers
    console.log('[STEP 4] Verifying Table Headers in Websites & Cloud Infrastructure card...');
    const tableHeaders = await page.evaluate(() => {
      const ths = Array.from(document.querySelectorAll('.cd-table thead tr th'));
      return ths.map((th) => th.textContent.trim());
    });
    console.log('Table Headers Found:', tableHeaders);

    assert.ok(
      tableHeaders.includes('Domain Expire Date'),
      'Table MUST contain "Domain Expire Date" column header'
    );
    assert.ok(
      !tableHeaders.includes('SSL Certificate Expiry'),
      'Table MUST NOT contain old "SSL Certificate Expiry" column header'
    );
    assert.ok(
      !tableHeaders.includes('Domain Expiry'),
      'Table MUST NOT contain duplicate "Domain Expiry" column header'
    );
    assert.deepEqual(
      tableHeaders,
      ['S NO', 'Domain / FQDN', 'Status', 'Hosting Provider', 'Domain Expire Date', 'Actions'],
      'Exact header layout must be: S NO | Domain / FQDN | Status | Hosting Provider | Domain Expire Date | Actions'
    );
    console.log('✓ Table headers successfully updated to single "Domain Expire Date" column!\n');

    // STEP 5: Verify Kavita Edutech Row Data
    console.log('[STEP 5] Verifying row data for app.kavitaedutech.io...');
    const rowData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.cd-table tbody tr'));
      return rows.map((tr) => {
        const cells = Array.from(tr.querySelectorAll('td'));
        return {
          sno: cells[0]?.textContent.trim(),
          domain: cells[1]?.textContent.trim(),
          status: cells[2]?.textContent.trim(),
          hosting: cells[3]?.textContent.trim(),
          expireDate: cells[4]?.textContent.trim()
        };
      });
    });
    console.log('Row Data:', rowData);
    assert.equal(rowData.length, 1);
    assert.equal(rowData[0].domain, 'app.kavitaedutech.io');
    assert.equal(rowData[0].hosting, 'DigitalOcean Bangalore');
    assert.equal(rowData[0].expireDate, '2028-05-20', 'Domain Expire Date must display 2028-05-20');
    console.log('✓ Row data correctly displays Domain Expire Date: 2028-05-20\n');

    // Take screenshot of table
    const shotTable = path.join(OUT, 'websites_domain_expire_date_table.png');
    await page.screenshot({ path: shotTable, fullPage: false });
    console.log(`✓ Screenshot captured: ${shotTable}\n`);

    // STEP 6: Open Add Domain Modal and Verify Field Label
    console.log('[STEP 6] Opening "+ Add Domain" modal...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Add Domain'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const modalInfo = await page.evaluate(() => {
      const modal = document.querySelector('.scrim .card');
      if (!modal) return null;
      const title = modal.querySelector('h2')?.textContent.trim();
      const labels = Array.from(modal.querySelectorAll('label span')).map((s) => s.textContent.trim());
      return { title, labels };
    });
    console.log('Modal Info:', modalInfo);
    assert.ok(modalInfo, 'Modal should be open');
    assert.equal(modalInfo.title, 'Add Domain / Application');
    assert.ok(
      modalInfo.labels.includes('Domain Expire Date'),
      'Modal form must have "Domain Expire Date" field label'
    );
    assert.ok(
      !modalInfo.labels.includes('SSL Expiry Date'),
      'Modal form must NOT have old "SSL Expiry Date" field label'
    );
    console.log('✓ Modal form field successfully labeled "Domain Expire Date"!\n');

    // Take screenshot of modal
    const shotModal = path.join(OUT, 'websites_domain_expire_date_modal.png');
    await page.screenshot({ path: shotModal, fullPage: false });
    console.log(`✓ Screenshot captured: ${shotModal}\n`);

    // STEP 7: Add a New Domain via Modal
    console.log('[STEP 7] Submitting new domain with Domain Expire Date...');
    await page.type('.scrim input[placeholder="api.domain.com"]', 'learn.kavitaedutech.io');
    await page.evaluate(() => {
      const dateInput = document.querySelector('.scrim input[type="date"]');
      if (dateInput) {
        // Use native setter so React state updates
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(dateInput, '2029-12-31');
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 400));
    await page.click('.scrim button.btn--primary');
    await page.waitForFunction(() => document.querySelectorAll('.cd-table tbody tr').length >= 2, { timeout: 6000 });
    await new Promise((r) => setTimeout(r, 500));

    // Verify both rows in table
    const updatedRows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.cd-table tbody tr'));
      return rows.map((tr) => {
        const cells = Array.from(tr.querySelectorAll('td'));
        return {
          domain: cells[1]?.textContent.trim(),
          expireDate: cells[4]?.textContent.trim()
        };
      });
    });
    console.log('Updated Rows after adding domain:', updatedRows);
    assert.equal(updatedRows.length, 2);
    const newRow = updatedRows.find((r) => r.domain === 'learn.kavitaedutech.io');
    assert.ok(newRow, 'New domain must be rendered in table');
    assert.equal(newRow.expireDate, '2029-12-31', 'New domain must have expireDate 2029-12-31');
    console.log('✓ New domain successfully saved and rendered with Domain Expire Date: 2029-12-31\n');

    // STEP 8: Check Console Errors
    const criticalErrors = pageErrors.filter((e) => !e.includes('favicon') && !e.includes('ResizeObserver'));
    console.log(`Total critical browser errors encountered: ${criticalErrors.length}`);
    assert.equal(criticalErrors.length, 0, 'No critical errors should occur');
    console.log('✓ 0 browser errors detected.\n');

    console.log('===============================================================');
    console.log('ALL TESTS PASSED: DOMAIN EXPIRE DATE VERIFIED');
    console.log('===============================================================');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
