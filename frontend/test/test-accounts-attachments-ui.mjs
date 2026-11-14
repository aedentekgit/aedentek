/**
 * ACCOUNTS ATTACHMENTS (IMAGE & PDF) UI END-TO-END TEST SUITE
 * ------------------------------------------------------------------
 * Verifies that all transaction forms across the Accounts module support
 * multiple Image (PNG, JPG, JPEG, WEBP) and PDF uploading:
 *   1. Form Presence Tests:
 *      - Inward / Sales Invoice Drawer (/accounts/sales)
 *      - Expenses Drawer (/accounts/expenses)
 *      - EMI Plan Drawer (/accounts/emi)
 *      - Credit Note Drawer (/accounts/credit-notes)
 *      - Asset Drawer (/accounts/assets)
 *      - Adjustment Entry / Journal Voucher Form (/accounts/adjustment-entry)
 *   2. File Upload & Multiple Selection Test:
 *      - Upload multiple files (PDF invoice + PNG receipt)
 *      - Verify file badges, file sizes, and metadata
 *      - Verify file removal functionality
 *   3. Persistence & View Drawer Test:
 *      - Submit expense with multiple attachments
 *      - Open expense view drawer
 *      - Verify documents are listed and downloadable
 *   4. Invalid File Type Validation Test:
 *      - Reject unsupported file extensions with user notification
 */
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const PORT = 8092;
const API_TARGET = { host: 'localhost', port: 5001 };

const MIME_TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.pdf': 'application/pdf'
};

const appDir = path.resolve(process.cwd().endsWith('frontend') ? '.' : 'frontend');

// Create test fixture files in temporary directory
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acct-attach-test-'));
const samplePdf = path.join(tmpDir, 'invoice_receipt.pdf');
const samplePng = path.join(tmpDir, 'scan_receipt.png');
const sampleJpg = path.join(tmpDir, 'equipment_photo.jpg');
const sampleTxt = path.join(tmpDir, 'unsupported.txt');

fs.writeFileSync(samplePdf, '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000109 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n185\n%%EOF');
fs.writeFileSync(samplePng, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));
fs.writeFileSync(sampleJpg, Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64'));
fs.writeFileSync(sampleTxt, 'This is a test plain text file that should be rejected');

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const proxied = http.request(
      { host: API_TARGET.host, port: API_TARGET.port, path: req.url, method: req.method, headers: req.headers },
      (upstream) => {
        res.writeHead(upstream.statusCode, upstream.headers);
        upstream.pipe(res);
      }
    );
    proxied.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Backend unreachable' }));
    });
    req.pipe(proxied);
    return;
  }
  let reqPath = req.url.split('?')[0];
  let filePath = path.join(appDir, reqPath === '/' ? 'index.html' : reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(appDir, 'index.html');
  }
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(500); res.end('Server Error'); }
    else {
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

server.listen(PORT, async () => {
  console.log(`[TEST-ACCOUNTS-ATTACHMENTS-UI] Test server listening on http://localhost:${PORT}`);
  console.log('--- STARTING ACCOUNTS MULTIPLE IMAGE/PDF UPLOAD UI TEST SUITE ---\n');

  let passed = 0;
  let failed = 0;
  const assert = (condition, msg) => {
    if (condition) { console.log(`  ✓ [PASS] ${msg}`); passed++; }
    else { console.error(`  ✗ [FAIL] ${msg}`); failed++; }
  };

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const closeOpenDrawer = async () => {
    await page.evaluate(() => {
      const cancelBtn = document.querySelector('.drawer button.btn--ghost, [data-drawer-close], .drawer__close');
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));
  };

  try {
    // -------------------------------------------------------------
    // TEST SECTION 1: INWARD / SALES INVOICE FORM ATTACHMENTS
    // -------------------------------------------------------------
    console.log('=== TEST 1: Inward / Sales Invoice Drawer Multiple Upload ===');
    await page.goto(`http://localhost:${PORT}/accounts/sales`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.page.accounts', { timeout: 10000 });

    // Open Drawer
    const inwardAddBtn = await page.waitForSelector('button.btn--primary', { timeout: 5000 });
    await inwardAddBtn.click();
    await page.waitForSelector('.acct-attach-field', { timeout: 5000 });

    const inwardUploadField = await page.$('.acct-attach-field');
    assert(inwardUploadField !== null, 'Inward drawer displays .acct-attach-field component');

    const inwardAccept = await page.$eval('.acct-attach-field input[type="file"]', (el) => ({
      multiple: el.multiple,
      accept: el.accept
    }));
    assert(inwardAccept.multiple === true, 'Inward file input allows multiple file selection');
    assert(inwardAccept.accept.includes('image') && inwardAccept.accept.includes('pdf'), 'Inward file input accepts PDF and image files');

    await closeOpenDrawer();

    // -------------------------------------------------------------
    // TEST SECTION 2: EXPENSES FORM ATTACHMENTS & FULL FLOW
    // -------------------------------------------------------------
    console.log('\n=== TEST 2: Expenses Drawer Upload & View Full Workflow ===');
    await page.goto(`http://localhost:${PORT}/accounts/expenses`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.page.accounts', { timeout: 10000 });

    // Click Add Expense
    const expenseAddBtn = await page.waitForSelector('button.btn--primary', { timeout: 5000 });
    await expenseAddBtn.click();
    await page.waitForSelector('.acct-attach-field', { timeout: 5000 });

    const expenseUploadField = await page.$('.acct-attach-field');
    assert(expenseUploadField !== null, 'Expense drawer displays .acct-attach-field component');

    // Upload 2 files: PDF and PNG
    const fileInput = await page.$('.acct-attach-field input[type="file"]');
    assert(fileInput !== null, 'Found file input in expense drawer');
    await fileInput.uploadFile(samplePdf, samplePng);
    await new Promise((r) => setTimeout(r, 600));

    // Verify 2 badges rendered
    const badges = await page.$$eval('.acct-file-badge', (nodes) =>
      nodes.map((n) => ({
        name: n.querySelector('.acct-file-badge__name')?.innerText,
        size: n.querySelector('.acct-file-badge__size')?.innerText,
        hasRemove: !!n.querySelector('.acct-file-badge__remove')
      }))
    );
    assert(badges.length === 2, `Uploaded 2 files, badges rendered: ${badges.length}`);
    assert(badges.some((b) => b.name && b.name.includes('invoice_receipt.pdf')), 'PDF badge rendered with filename');
    assert(badges.some((b) => b.name && b.name.includes('scan_receipt.png')), 'PNG badge rendered with filename');
    assert(badges.every((b) => b.hasRemove), 'Every badge has a remove button');

    // Test removing 1 file
    const removeBtns = await page.$$('.acct-file-badge__remove');
    if (removeBtns.length > 0) {
      await removeBtns[0].click();
      await new Promise((r) => setTimeout(r, 300));
    }
    const badgesAfterRemove = await page.$$eval('.acct-file-badge', (nodes) => nodes.length);
    assert(badgesAfterRemove === 1, `Removed 1 file, remaining badge count: ${badgesAfterRemove}`);

    // Add back PNG and JPG so we have multiple files
    await fileInput.uploadFile(samplePdf, sampleJpg);
    await new Promise((r) => setTimeout(r, 600));

    const badgesFinal = await page.$$eval('.acct-file-badge', (nodes) => nodes.length);
    assert(badgesFinal >= 2, `Multiple attachments added: ${badgesFinal}`);

    // Fill out required expense fields
    const testTitle = `Test Expense ${Date.now()}`;
    await page.$eval('#acct-expense-form input[placeholder="Monthly rent"]', (el, val) => {
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, testTitle);

    await page.$eval('#acct-expense-form input[type="number"]', (el) => {
      el.value = '4500';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Submit expense form
    const submitExpenseBtn = await page.$('.drawer button[type="submit"]');
    await submitExpenseBtn.click();
    await new Promise((r) => setTimeout(r, 1500));

    // Verify expense appears in table and click view drawer
    await page.waitForSelector('table.table tbody tr', { timeout: 8000 });
    const viewBtn = await page.$('table.table tbody tr:first-child button[title="View details"]');
    assert(viewBtn !== null, 'View details button present on newly created expense record');

    if (viewBtn) {
      await viewBtn.click();
      await page.waitForSelector('.acct-view-attachments', { timeout: 6000 });
      await new Promise((r) => setTimeout(r, 500));

      const viewAttachments = await page.$('.acct-view-attachments');
      assert(viewAttachments !== null, 'Expense view drawer renders .acct-view-attachments section');

      const viewItems = await page.$$eval('.acct-view-attachments__item', (nodes) =>
        nodes.map((n) => ({
          name: n.querySelector('.acct-view-attachments__name')?.innerText,
          size: n.querySelector('.acct-view-attachments__size')?.innerText,
          hasDownload: !!n.querySelector('button[title^="Download"]')
        }))
      );
      assert(viewItems.length >= 2, `View drawer lists ${viewItems.length} attached documents with download buttons`);
      assert(viewItems.every((item) => item.hasDownload), 'All attached items in view drawer have a download button');

      await closeOpenDrawer();
    }

    // -------------------------------------------------------------
    // TEST SECTION 3: EMI PLAN FORM ATTACHMENTS
    // -------------------------------------------------------------
    console.log('\n=== TEST 3: EMI Plan Drawer Multiple Upload ===');
    await page.goto(`http://localhost:${PORT}/accounts/emi`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.page.accounts', { timeout: 10000 });

    const emiAddBtn = await page.waitForSelector('button.btn--primary', { timeout: 5000 });
    await emiAddBtn.click();
    await page.waitForSelector('.acct-attach-field', { timeout: 5000 });

    const emiUploadField = await page.$('.acct-attach-field');
    assert(emiUploadField !== null, 'EMI drawer displays .acct-attach-field component');

    const emiFileInput = await page.$('.acct-attach-field input[type="file"]');
    assert(emiFileInput !== null, 'EMI drawer has file input for agreements and sanction slips');
    await emiFileInput.uploadFile(samplePdf, samplePng);
    await new Promise((r) => setTimeout(r, 500));

    const emiBadges = await page.$$eval('.acct-file-badge', (nodes) => nodes.length);
    assert(emiBadges === 2, `EMI drawer holds multiple files: ${emiBadges}`);

    await closeOpenDrawer();

    // -------------------------------------------------------------
    // TEST SECTION 4: CREDIT NOTE FORM ATTACHMENTS
    // -------------------------------------------------------------
    console.log('\n=== TEST 4: Credit Note Drawer Multiple Upload ===');
    await page.goto(`http://localhost:${PORT}/accounts/credit-notes`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.page.accounts', { timeout: 10000 });

    const creditAddBtn = await page.waitForSelector('button.btn--primary', { timeout: 5000 });
    await creditAddBtn.click();
    await page.waitForSelector('.acct-attach-field', { timeout: 5000 });

    const creditUploadField = await page.$('.acct-attach-field');
    assert(creditUploadField !== null, 'Credit Note drawer displays .acct-attach-field component');

    const creditFileInput = await page.$('.acct-attach-field input[type="file"]');
    await creditFileInput.uploadFile(samplePdf, samplePng);
    await new Promise((r) => setTimeout(r, 500));

    const creditBadges = await page.$$eval('.acct-file-badge', (nodes) => nodes.length);
    assert(creditBadges === 2, `Credit Note drawer holds multiple files: ${creditBadges}`);

    await closeOpenDrawer();

    // -------------------------------------------------------------
    // TEST SECTION 5: ASSET RECORD FORM ATTACHMENTS
    // -------------------------------------------------------------
    console.log('\n=== TEST 5: Asset Record Drawer Multiple Upload ===');
    await page.goto(`http://localhost:${PORT}/accounts/assets`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.page.accounts', { timeout: 10000 });

    const assetAddBtn = await page.waitForSelector('button.btn--primary', { timeout: 5000 });
    await assetAddBtn.click();
    await page.waitForSelector('.acct-attach-field', { timeout: 5000 });

    const assetUploadField = await page.$('.acct-attach-field');
    assert(assetUploadField !== null, 'Asset drawer displays .acct-attach-field component');

    const assetFileInput = await page.$('.acct-attach-field input[type="file"]');
    await assetFileInput.uploadFile(samplePdf, sampleJpg);
    await new Promise((r) => setTimeout(r, 500));

    const assetBadges = await page.$$eval('.acct-file-badge', (nodes) => nodes.length);
    assert(assetBadges === 2, `Asset drawer holds multiple files: ${assetBadges}`);

    await closeOpenDrawer();

    // -------------------------------------------------------------
    // TEST SECTION 6: ADJUSTMENT ENTRY FORM ATTACHMENTS
    // -------------------------------------------------------------
    console.log('\n=== TEST 6: Adjustment Entry / Journal Voucher Multiple Upload ===');
    await page.goto(`http://localhost:${PORT}/accounts/adjustment-entry`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.page.accounts', { timeout: 10000 });

    const jvUploadField = await page.$('.acct-attach-field');
    assert(jvUploadField !== null, 'Adjustment Entry page displays .acct-attach-field component in voucher form');

    const jvFileInput = await page.$('.acct-attach-field input[type="file"]');
    assert(jvFileInput !== null, 'Adjustment Entry file input exists');
    await jvFileInput.uploadFile(samplePdf, samplePng);
    await new Promise((r) => setTimeout(r, 500));

    const jvBadges = await page.$$eval('.acct-file-badge', (nodes) => nodes.length);
    assert(jvBadges === 2, `Adjustment Entry form holds multiple files: ${jvBadges}`);

    // -------------------------------------------------------------
    // TEST SECTION 7: UNSUPPORTED FILE TYPE REJECTION
    // -------------------------------------------------------------
    console.log('\n=== TEST 7: Unsupported File Type Rejection ===');
    await jvFileInput.uploadFile(sampleTxt);
    await new Promise((r) => setTimeout(r, 500));

    const jvBadgesAfterTxt = await page.$$eval('.acct-file-badge', (nodes) => nodes.length);
    assert(jvBadgesAfterTxt === 2, 'Unsupported file (.txt) was rejected and not added to attachment list');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await browser.close();
    server.close();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}

    console.log('\n===========================================');
    console.log(`UI ATTACHMENTS TEST RESULT: ${passed} passed, ${failed} failed`);
    console.log('===========================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
});
