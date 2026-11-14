import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const appDir = path.resolve(process.cwd().endsWith('frontend') ? '.' : 'frontend');
const artifactDir = path.resolve("test-reports"); fs.mkdirSync(artifactDir, { recursive: true });

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];

  // Mock API fallback if backend not running on same port
  if (reqPath.startsWith('/api/invoices/next-number')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, nextNumber: 'INV-2026-0119' }));
  }
  if (reqPath.startsWith('/api/propagations') && req.method === 'POST' && reqPath.includes('/convert')) {
    res.writeHead(201, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: true,
      message: 'Converted successfully',
      invoice: { invoiceNumber: 'INV-2026-0119' }
    }));
  }

  let filePath = path.join(appDir, reqPath === '/' ? 'index.html' : reqPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(appDir, 'index.html');
  }

  const ext = path.extname(filePath);
  const mimeMap = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.woff2': 'font/woff2',
    '.json': 'application/json'
  };

  res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

const PORT = 8097;

server.listen(PORT, async () => {
  console.log(`[TEST-RUNNER] Server listening on http://localhost:${PORT}`);
  console.log('--- STARTING FRONTEND FINANCE & PROPAGATIONS UI/UX TESTS ---');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!txt.includes('net::ERR_INTERNET_DISCONNECTED') && !txt.includes('fonts.googleapis.com')) {
        errors.push(txt);
      }
    }
  });

  page.on('pageerror', err => errors.push(err.message));

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

  try {
    // -------------------------------------------------------------
    // SECTION 1: TAX INVOICES PAGE (/finance/invoices)
    // -------------------------------------------------------------
    console.log('\n=== 1. TAX INVOICES DIRECTORY (/finance/invoices) ===');
    await page.goto(`http://localhost:${PORT}/finance/invoices`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.phead');
    await new Promise(r => setTimeout(r, 1200));

    // Verify Title & Subtitle
    const titleText = await page.$eval('.phead__title, h1', el => el.textContent.trim());
    assert(titleText.includes('Tax Invoices'), `Header title contains "Tax Invoices" (got: "${titleText}")`);

    const subCount = await page.$$eval('.phead__sub', els => els.length);
    assert(subCount === 0, `Header has no descriptive paragraph under the title (removed globally)`);

    // Verify In-page section tabs are removed globally from directory headers
    const hasTabs = await page.$('.tabs');
    const tabsHidden = !hasTabs || (await page.$eval('.tabs', el => window.getComputedStyle(el).display === 'none'));
    assert(tabsHidden, `In-page section tabs are removed globally from invoices directory header`);

    // Verify KPI Cards
    const kpiLabels = await page.$$eval('.kpis .kpi__label', els => els.map(e => e.textContent.trim()));
    assert(kpiLabels.some(l => l.includes('Total Invoiced')), `KPI for Total Invoiced is displayed`);
    assert(kpiLabels.some(l => l.includes('Inward Collections')), `KPI for Inward Collections is displayed`);
    assert(kpiLabels.some(l => l.includes('Outstanding Balance')), `KPI for Outstanding Balance is displayed`);
    assert(kpiLabels.some(l => l.includes('GST Tax Assessed')), `KPI for GST Tax Assessed is displayed`);

    // Verify Live Records in Table
    const tableText = await page.$eval('.fi-table tbody', el => el.textContent);
    assert(tableText.includes('INV-2026-0081'), 'Live record INV-2026-0081 present in table');
    assert(tableText.includes('INV-2026-0094'), 'Live record INV-2026-0094 present in table');
    assert(tableText.includes('INV-2026-0102'), 'Live record INV-2026-0102 present in table');
    assert(tableText.includes('INV-2026-0118'), 'Live record INV-2026-0118 present in table');

    // Take screenshot of Invoices table
    await page.screenshot({ path: path.join(artifactDir, 'finance_invoices_page.png') });
    console.log('  ✓ Saved screenshot: finance_invoices_page.png');

    // -------------------------------------------------------------
    // SECTION 2: PRINTABLE INVOICE DOCUMENT PREVIEW
    // -------------------------------------------------------------
    console.log('\n=== 2. PRINTABLE TAX INVOICE DOCUMENT PREVIEW ===');
    // Click on INV-2026-0081 row to open drawer
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.fi-table tbody tr'));
      const target = rows.find(r => r.textContent.includes('INV-2026-0081'));
      if (target) target.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Verify Printable Document Sheet exists
    const printableInvDoc = await page.$('#printable-invoice-doc');
    assert(printableInvDoc !== null, 'High-fidelity document element #printable-invoice-doc mounted in DOM');

    const invDocText = await page.$eval('#printable-invoice-doc', el => el.textContent);
    assert(invDocText.includes('TAX INVOICE (B2B)'), 'Document renders statutory TAX INVOICE (B2B) classification');
    assert(invDocText.includes('27AAFCO1234F1Z8'), 'Document includes Buyer statutory GSTIN (27AAFCO1234F1Z8)');
    assert(invDocText.includes('HDFC0000240'), 'Document includes Remittance IFSC (HDFC0000240)');
    assert(invDocText.includes('Rahul Sen'), 'Document includes Authorised Signatory name (Rahul Sen)');

    const hasSlantedSvg = await page.$eval('#printable-invoice-doc svg', el => el !== null);
    assert(hasSlantedSvg, 'Document contains diagonal slanted SVG brand header with navy, cyan & indigo accents');

    // Take screenshot of Invoice Printable Document
    await page.screenshot({ path: path.join(artifactDir, 'printable_invoice_doc.png') });
    console.log('  ✓ Saved screenshot: printable_invoice_doc.png');

    // -------------------------------------------------------------
    // SECTION 3: COMMERCIAL PROPAGATIONS PAGE (/finance/propagations)
    // -------------------------------------------------------------
    console.log('\n=== 3. COMMERCIAL PROPAGATIONS DIRECTORY (/finance/propagations) ===');
    await page.goto(`http://localhost:${PORT}/finance/propagations`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    const propTitleText = await page.$eval('.phead__title, h1', el => el.textContent.trim());
    assert(propTitleText.includes('Commercial Propagations'), `Header title contains "Commercial Propagations" (got: "${propTitleText}")`);

    const propSubCount = await page.$$eval('.phead__sub', els => els.length);
    assert(propSubCount === 0, `Header has no descriptive paragraph under the title (removed globally)`);

    const propKpiLabels = await page.$$eval('.kpis .kpi__label', els => els.map(e => e.textContent.trim()));
    assert(propKpiLabels.some(l => l.includes('Total Scope Value')), `KPI for Total Scope Value is displayed`);
    assert(propKpiLabels.some(l => l.includes('Accepted Commitments')), `KPI for Accepted Commitments is displayed`);
    assert(propKpiLabels.some(l => l.includes('Under Client Review')), `KPI for Under Client Review is displayed`);

    // Verify Live Records in Table
    const propTableText = await page.$eval('.fi-table tbody', el => el.textContent);
    assert(propTableText.includes('PRP-2026-0042'), 'Live proposal PRP-2026-0042 present in table');
    assert(propTableText.includes('PRP-2026-0045'), 'Live proposal PRP-2026-0045 present in table');
    assert(propTableText.includes('Omni Retail Solutions Ltd'), 'Client Omni Retail Solutions Ltd present');
    assert(propTableText.includes('Kavita Edutech'), 'Client Kavita Edutech present');

    // Take screenshot of Propagations table
    await page.screenshot({ path: path.join(artifactDir, 'finance_propagations_page.png') });
    console.log('  ✓ Saved screenshot: finance_propagations_page.png');

    // -------------------------------------------------------------
    // SECTION 4: PRINTABLE PROPAGATION DOCUMENT PREVIEW
    // -------------------------------------------------------------
    console.log('\n=== 4. PRINTABLE PROPAGATION DOCUMENT PREVIEW ===');
    // Click on PRP-2026-0045 row to open drawer
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.fi-table tbody tr'));
      const target = rows.find(r => r.textContent.includes('PRP-2026-0045'));
      if (target) target.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const printablePropDoc = await page.$('#printable-propagation-doc');
    assert(printablePropDoc !== null, 'High-fidelity document element #printable-propagation-doc mounted in DOM');

    const propDocText = await page.$eval('#printable-propagation-doc', el => el.textContent);
    assert(propDocText.includes('COMMERCIAL PROPAGATION'), 'Document renders COMMERCIAL PROPAGATION title');
    assert(propDocText.includes('Offline Video Encryption Module'), 'Document renders scope project title');
    assert(propDocText.includes('DRM License Server'), 'Document renders itemized scope deliverables');
    assert(propDocText.includes('Convert to Tax Invoice (1-Click)'), 'Document contains 1-Click Invoice Conversion button');

    // Take screenshot of Propagation Printable Document
    await page.screenshot({ path: path.join(artifactDir, 'printable_propagation_doc.png') });
    console.log('  ✓ Saved screenshot: printable_propagation_doc.png');

    // -------------------------------------------------------------
    // SECTION 5: TAX, BANKING & INVOICE SETTINGS (SEPARATE SECTIONS WITH TOP TABS)
    // -------------------------------------------------------------
    console.log('\n=== 5. TAX, BANKING & INVOICE SETTINGS (SEPARATE SECTIONS WITH TOP TABS) ===');
    await page.goto(`http://localhost:${PORT}/finance/settings`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1200));

    const settingsHeader = await page.$eval('.phead', el => el.textContent);
    assert(settingsHeader.includes('Tax, Banking & Invoice Settings') || settingsHeader.includes('Finance'), 'Header renders Finance Tax & Banking title');

    const topSectionTabs = await page.$$eval('.tabs .tab', els => els.map(e => e.textContent.trim()));
    assert(topSectionTabs.includes('Invoice Sender'), 'Top section tabs include "Invoice Sender"');
    assert(topSectionTabs.includes('Banking & Wire'), 'Top section tabs include "Banking & Wire"');
    assert(topSectionTabs.includes('GST & HSN Slabs'), 'Top section tabs include "GST & HSN Slabs"');

    // Verify duplicate middle floating bar is removed
    const middleBar = await page.$('.admin-sections-nav');
    assert(middleBar === null, 'Duplicate middle sections nav bar is completely removed');

    // Section 1: Initial active state
    const s1DisplayInitial = await page.$eval('#sec-invoice-sender', el => window.getComputedStyle(el).display);
    const s2DisplayInitial = await page.$eval('#sec-banking-wire', el => window.getComputedStyle(el).display);
    const s3DisplayInitial = await page.$eval('#sec-gst-slabs', el => window.getComputedStyle(el).display);
    assert(s1DisplayInitial === 'block', 'Section 1 (Invoice Sender) is displayed by default');
    assert(s2DisplayInitial === 'none', 'Section 2 (Banking & Wire) is hidden when Section 1 is active');
    assert(s3DisplayInitial === 'none', 'Section 3 (GST Slabs) is hidden when Section 1 is active');

    const sec1Text = await page.$eval('#sec-invoice-sender', el => el.textContent);
    assert(sec1Text.includes('Invoice Sender & Corporate Coordinates'), 'Section 1 renders corporate coordinates header');
    assert(sec1Text.includes('Company / Issuer Legal Name'), 'Section 1 includes Company Name field');
    assert(sec1Text.includes('Corporate Billing Email'), 'Section 1 includes Corporate Email field');
    assert(sec1Text.includes('Statutory GSTIN'), 'Section 1 includes Statutory GSTIN field');
    assert(sec1Text.includes('Registered Corporate Street Address'), 'Section 1 includes Registered Address field');

    // Switch to Section 2: Banking & Wire tab
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.tabs .tab')).find(b => b.textContent.includes('Banking'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    const s1DisplayAfter2 = await page.$eval('#sec-invoice-sender', el => window.getComputedStyle(el).display);
    const s2DisplayAfter2 = await page.$eval('#sec-banking-wire', el => window.getComputedStyle(el).display);
    const s3DisplayAfter2 = await page.$eval('#sec-gst-slabs', el => window.getComputedStyle(el).display);
    assert(s1DisplayAfter2 === 'none', 'Section 1 is hidden when Banking & Wire tab is clicked');
    assert(s2DisplayAfter2 === 'block', 'Section 2 is displayed exclusively when Banking & Wire tab is clicked');
    assert(s3DisplayAfter2 === 'none', 'Section 3 is hidden when Banking & Wire tab is clicked');

    const sec2Text = await page.$eval('#sec-banking-wire', el => el.textContent);
    assert(sec2Text.includes('Banking & Wire Remittance Details'), 'Section 2 renders wire remittance header');
    assert(sec2Text.includes('Clearing Bank Name'), 'Section 2 includes Bank Name field');
    assert(sec2Text.includes('Account Number'), 'Section 2 includes Account Number field');
    assert(sec2Text.includes('IFSC / RTGS Code'), 'Section 2 includes IFSC Code field');

    // Switch to Section 3: GST & HSN Slabs tab
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.tabs .tab')).find(b => b.textContent.includes('GST'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    const s1DisplayAfter3 = await page.$eval('#sec-invoice-sender', el => window.getComputedStyle(el).display);
    const s2DisplayAfter3 = await page.$eval('#sec-banking-wire', el => window.getComputedStyle(el).display);
    const s3DisplayAfter3 = await page.$eval('#sec-gst-slabs', el => window.getComputedStyle(el).display);
    assert(s1DisplayAfter3 === 'none', 'Section 1 is hidden when GST Slabs tab is clicked');
    assert(s2DisplayAfter3 === 'none', 'Section 2 is hidden when GST Slabs tab is clicked');
    assert(s3DisplayAfter3 === 'block', 'Section 3 is displayed exclusively when GST Slabs tab is clicked');

    const sec3Text = await page.$eval('#sec-gst-slabs', el => el.textContent);
    assert(sec3Text.includes('Statutory GST & HSN Tax Slabs'), 'Section 3 renders GST & HSN Slabs header');
    assert(sec3Text.includes('Default HSN / SAC Code'), 'Section 3 includes Default HSN field');
    assert(sec3Text.includes('Default Statutory GST Rate'), 'Section 3 includes Default GST Rate field');
    assert(sec3Text.includes('Active Statutory GST Tax Slabs'), 'Section 3 includes active slabs directory table');
    assert(sec3Text.includes('+ Add New Statutory GST Tax Slab'), 'Section 3 includes inline slab creation form');

    // -------------------------------------------------------------
    // SECTION 5B: INPUT ENTRY & LIVE KEYBOARD TYPING AUDIT (BUGFIX)
    // -------------------------------------------------------------
    console.log('\n=== 5B. INPUT ENTRY & LIVE KEYBOARD TYPING AUDIT ===');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.tabs .tab')).find(b => b.textContent.includes('Invoice Sender'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 300));

    const nameField = await page.$('input[placeholder="Registered business legal name"]');
    await nameField.click({ clickCount: 3 });
    await nameField.press('Backspace');
    await nameField.type('Tessly Surfaces & Studio Ltd');
    await new Promise(r => setTimeout(r, 200));

    const enteredName = await page.evaluate(el => el.value, nameField);
    assert(enteredName === 'Tessly Surfaces & Studio Ltd', `User can type into Company Name input without state wipeout (got: "${enteredName}")`);

    const gstinField = await page.$('input[placeholder="15-character GSTIN (e.g. 27AAFCO1234F1Z8)"]');
    await gstinField.click({ clickCount: 3 });
    await gstinField.press('Backspace');
    await gstinField.type('33AABCA9988C1Z4');
    await new Promise(r => setTimeout(r, 200));

    const enteredGstin = await page.evaluate(el => el.value, gstinField);
    assert(enteredGstin === '33AABCA9988C1Z4', `User can type into GSTIN input without state wipeout (got: "${enteredGstin}")`);

    // Take screenshot of Finance Settings page
    await page.screenshot({ path: path.join(artifactDir, 'finance_settings_page.png') });
    console.log('  ✓ Saved screenshot: finance_settings_page.png');

    // -------------------------------------------------------------
    // SECTION 6: ZERO RUNTIME CONSOLE ERRORS AUDIT
    // -------------------------------------------------------------
    console.log('\n=== 6. CONSOLE AUDIT ===');
    assert(errors.length === 0, `Zero uncaught JavaScript console errors (count: ${errors.length}, errors: ${JSON.stringify(errors)})`);

    console.log('\n===========================================');
    console.log(`FINANCE UI TEST RESULT: ${passed} passed, ${failed} failed`);
    console.log('===========================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed with unhandled error:', err);
    process.exit(1);
  } finally {
    await browser.close();
    server.close();
  }
});
