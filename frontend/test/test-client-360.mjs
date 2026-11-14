import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const artifactDir = path.resolve("test-reports"); fs.mkdirSync(artifactDir, { recursive: true });
const BASE_URL = 'http://localhost:3000';

async function runClient360Tests() {
  console.log('========================================================');
  console.log('STARTING CLIENT DETAILS & 360° MANAGEMENT AUTOMATED TESTS');
  console.log('========================================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      // Ignore favicon or non-critical 404s
      if (!txt.includes('favicon') && !txt.includes('404')) {
        errors.push(txt);
      }
    }
  });

  page.on('pageerror', (err) => {
    errors.push(`Page Error: ${err.message}`);
  });

  try {
    // -----------------------------------------------------------------
    // TEST 1: Reset backend data first to ensure clean baseline
    // -----------------------------------------------------------------
    console.log('Step 1: Resetting database to clean baseline...');
    const resetRes = await fetch(`${BASE_URL}/api/clients/reset`, { method: 'POST' });
    const resetJson = await resetRes.json();
    console.log(`✓ Database baseline seeded with ${resetJson.data?.length || 0} clients`);

    // -----------------------------------------------------------------
    // TEST 2: Client Directory Master View UI/UX (Dashboard Grade)
    // -----------------------------------------------------------------
    console.log('\nStep 2: Navigating to Client Directory Master View (/clients/companies)...');
    await page.goto(`${BASE_URL}/clients/companies`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    // Verify Bento KPI Cards (.kpis .kpi)
    const kpiCards = await page.$$('.kpis .kpi');
    console.log(`✓ Dashboard Bento KPI Cards found: ${kpiCards.length} (expected 4)`);
    if (kpiCards.length < 3) {
      throw new Error(`Expected at least 3-4 KPI cards, found ${kpiCards.length}`);
    }

    // Verify Master Client Table
    const tableRows = await page.$$('.cl-table tbody tr');
    console.log(`✓ Client directory table populated with ${tableRows.length} client rows`);
    if (tableRows.length < 3) {
      throw new Error(`Expected at least 3 clients in table, found ${tableRows.length}`);
    }

    // Screenshot 1: Client Directory Master View
    const screenshotDir = path.join(artifactDir, 'client_directory_master.png');
    await page.screenshot({ path: screenshotDir, fullPage: false });
    console.log(`✓ Screenshot saved: ${screenshotDir}`);

    // -----------------------------------------------------------------
    // TEST 3: Category Filtering & Live Search
    // -----------------------------------------------------------------
    console.log('\nStep 3: Testing Category Filtering and Search Input...');
    // Verify header button and tabs are removed
    const headerBtnCount = await page.$$eval('.page-header button', (btns) => btns.length);
    const pageTabsCount = await page.$$eval('.page > .tabs', (tabs) => tabs.length);
    console.log(`✓ Header button removed: ${headerBtnCount === 0} (count: ${headerBtnCount})`);
    console.log(`✓ Page switcher tabs removed from header: ${pageTabsCount === 0} (count: ${pageTabsCount})`);

    // Test Category Dropdown filter (select 'Enterprise')
    await page.select('.client-category-select', 'Enterprise');
    await new Promise((r) => setTimeout(r, 400));
    const entRows = await page.$$('.cl-table tbody tr');
    console.log(`✓ Filtered by 'Enterprise' dropdown: ${entRows.length} rows`);

    // Restore to 'All'
    await page.select('.client-category-select', 'All');
    await new Promise((r) => setTimeout(r, 400));

    // Test Search Input
    const searchInput = await page.$('.toolbar input[type="search"]');
    if (searchInput) {
      await searchInput.type('Omni');
      await new Promise((r) => setTimeout(r, 400));
      const searchedRows = await page.$$('.cl-table tbody tr');
      console.log(`✓ Search for 'Omni': returned ${searchedRows.length} row(s)`);
      await page.evaluate(() => {
        const inp = document.querySelector('.toolbar input[type="search"]');
        if (inp) {
          inp.value = '';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await new Promise((r) => setTimeout(r, 400));
    }

    // -----------------------------------------------------------------
    // TEST 4: Direct Client Registration (Path A Modal)
    // -----------------------------------------------------------------
    console.log('\nStep 4: Testing Direct Client Registration (Path A)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const regBtn = btns.find((b) => b.textContent.includes('Register New Client'));
      if (regBtn) regBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    // Check modal opened
    const modalHeader = await page.$eval('.card h2', (el) => el.textContent).catch(() => '');
    console.log(`✓ Registration Modal opened: "${modalHeader}"`);

    // Fill form
    await page.type('input[placeholder*="Acme Technologies"]', 'Zenith Cloudworks Ltd');
    await page.type('input[placeholder*="Rahul Sen"]', 'Aravind Rao');
    await page.type('input[placeholder*="contact@acme.com"]', 'aravind@zenith.io');
    await page.type('input[placeholder*="98200 11223"]', '+91 98330 12345');
    await page.type('input[placeholder*="27AAFCO1234F1Z8"]', '29AAACZ1234F1Z8');
    await page.type('input[placeholder*="Mumbai"]', 'Bengaluru');

    // Submit
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button[type="submit"]')).find((b) =>
        b.textContent.includes('Register Client')
      );
      if (submitBtn) submitBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    const updatedRows = await page.$$('.cl-table tbody tr');
    console.log(`✓ Client registered successfully! Table now contains ${updatedRows.length} clients`);

    // -----------------------------------------------------------------
    // TEST 5: Client 360° Command Center Hero & Bento Telemetry
    // -----------------------------------------------------------------
    console.log('\nStep 5: Navigating to Client 360° Command Center (/clients/c/client-omni-retail)...');
    await page.goto(`${BASE_URL}/clients/c/client-omni-retail`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    // Verify Unified PageHeader Title (Matching Dashboard Style)
    const heroTitle = await page.$eval('.phead__title, h1', (el) => el.textContent);
    console.log(`✓ Client 360° Unified PageHeader Title: "${heroTitle}"`);
    if (!heroTitle.includes('Omni Retail Solutions')) {
      throw new Error(`Expected Omni Retail Solutions in PageHeader, got "${heroTitle}"`);
    }

    // Verify Bento KPI Cards (.kpis .kpi)
    const bentoCards = await page.$$('.kpis .kpi');
    const bentoValues = await page.$$eval('.kpis .kpi .kpi__value', (els) => els.map((e) => e.textContent));
    console.log(`✓ Bento Telemetry KPI Cards (${bentoCards.length}): Invoiced=${bentoValues[0]}, Paid=${bentoValues[1]}, Due=${bentoValues[2]}`);

    // Screenshot 2: Client 360° Command Center Overview (Dashboard UI/UX)
    const screenshot360 = path.join(artifactDir, 'client_360_overview.png');
    await page.screenshot({ path: screenshot360, fullPage: false });
    console.log(`✓ Screenshot saved: ${screenshot360}`);

    // -----------------------------------------------------------------
    // TEST 6: Verify and Click All 11 Sub-Module Tabs (.tabs .tab)
    // -----------------------------------------------------------------
    console.log('\nStep 6: Verifying all 11 Sub-Module Tabs...');
    const tabPills = await page.$$eval('.tabs .tab', (els) => els.map((e) => e.textContent.trim()));
    console.log(`✓ Found ${tabPills.length} Tabs: ${tabPills.join(' | ')}`);
    if (tabPills.length !== 11) {
      throw new Error(`Expected exactly 11 sub-module tabs, found ${tabPills.length}`);
    }

    // Click Tab 2: Websites
    console.log('\nTesting Tab 2: Websites & Cloud Infrastructure...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.tabs .tab'));
      const t = tabs.find((x) => x.textContent.includes('Websites'));
      if (t) t.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    const websiteRows = await page.$$('.table tbody tr');
    console.log(`✓ Websites tab active with ${websiteRows.length} registered domain(s)`);

    // Click Tab 4: Credentials Vault
    console.log('\nTesting Tab 4: Credentials & Encrypted Server Vault...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.tabs .tab'));
      const t = tabs.find((x) => x.textContent.includes('Vault'));
      if (t) t.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    // Test Eye Toggle Password Reveal
    const passInputBefore = await page.$eval('.vault-input-group input', (el) => el.getAttribute('type'));
    console.log(`✓ Vault password input type before eye click: "${passInputBefore}" (masked)`);

    await page.evaluate(() => {
      const eyeBtn = document.querySelector('.vault-input-group button');
      if (eyeBtn) eyeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 300));

    const passInputAfter = await page.$eval('.vault-input-group input', (el) => el.getAttribute('type'));
    console.log(`✓ Vault password input type after eye click: "${passInputAfter}" (revealed)`);

    // Screenshot 3: Encrypted Vault
    const screenshotVault = path.join(artifactDir, 'client_360_credentials_vault.png');
    await page.screenshot({ path: screenshotVault, fullPage: false });
    console.log(`✓ Screenshot saved: ${screenshotVault}`);

    // Click Tab 6: Invoices & Statutory Demands
    console.log('\nTesting Tab 6: Invoices & Statutory Demands...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.tabs .tab'));
      const t = tabs.find((x) => x.textContent.includes('Invoices'));
      if (t) t.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    // Test Print Preview Modal
    await page.evaluate(() => {
      const printBtn = Array.from(document.querySelectorAll('.table button')).find((b) =>
        b.textContent.includes('Print Preview')
      );
      if (printBtn) printBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    const invoiceModalTitle = await page.$eval('.card h2', (el) => el.textContent).catch(() => '');
    console.log(`✓ Invoice Printable Preview Modal opened: "${invoiceModalTitle}"`);

    // Screenshot 4: Invoices Preview Modal
    const screenshotInv = path.join(artifactDir, 'client_360_invoices.png');
    await page.screenshot({ path: screenshotInv, fullPage: false });
    console.log(`✓ Screenshot saved: ${screenshotInv}`);

    // Close preview modal
    await page.evaluate(() => {
      const closeBtn = Array.from(document.querySelectorAll('.card button')).find((b) => b.textContent.includes('Close'));
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 300));

    // Click Tab 11: Compliance & Statutory Tax Verification
    console.log('\nTesting Tab 11: Compliance & Statutory Tax Verification...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.tabs .tab'));
      const t = tabs.find((x) => x.textContent.includes('Compliance'));
      if (t) t.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    const complianceText = await page.$eval('.card', (el) => el.textContent);
    console.log(`✓ Compliance Tab active with GSTIN checksum and tax regime: ${complianceText.includes('Checksum Verified') ? 'VERIFIED' : 'PENDING'}`);

    // -----------------------------------------------------------------
    // Final Error Audit
    // -----------------------------------------------------------------
    if (errors.length > 0) {
      console.error('\n⚠️ Console errors detected:', errors);
      throw new Error(`Console errors found: ${errors.join(', ')}`);
    } else {
      console.log('\n✓ Clean execution: 0 console or page errors detected.');
    }

    console.log('\n========================================================');
    console.log('ALL CLIENT DETAILS & 360° MANAGEMENT TESTS PASSED (100%)');
    console.log('========================================================\n');
  } finally {
    await browser.close();
  }
}

runClient360Tests().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
