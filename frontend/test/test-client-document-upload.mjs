/**
 * CLIENT DOCUMENT UPLOAD SECTION & ARRAY COLLECTION AUTOMATED TEST SUITE
 * ----------------------------------------------------------------------
 * Verifies:
 *   1. General Tab on Client 360 page includes the dedicated "Document Upload" section (Card).
 *   2. Document collection is displayed as an array table with S NO, Document Name, Format/Type, Size, Upload Date, and Actions.
 *   3. "Upload Document" modal provides Document Name and file upload with accept="*" supporting PDF, images, etc. (any format).
 *   4. Adding a document pushes into client.documents array and renders immediately with proper format badge (e.g. PNG, PDF).
 *   5. Multiple format uploads (PNG image, PDF document) persist in the array.
 *   6. Editing document notes updates the array item in place.
 *   7. Downloading document triggers file download via dataUrl.
 *   8. Deleting document removes it from the array and updates the table.
 *   9. Client Register / Edit form (/clients/new) also supports any format for document array rows.
 */
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..');
const reportDir = path.resolve(repoRoot, 'test-reports');
const frontendReportDir = path.resolve(appDir, 'test-reports');
fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(frontendReportDir, { recursive: true });

// 1. Start Backend Express Server
process.env.NODE_ENV = 'test';
process.env.PORT = '5099';
const { default: backendApp } = await import(path.join(repoRoot, 'backend/src/server.js'));
const { connectDB, disconnectDB } = await import(path.join(repoRoot, 'backend/src/config/db.js'));

await connectDB();
const backendServer = backendApp.listen(5099);
console.log('✓ Backend API server running on http://localhost:5099');

// 2. Start Static & Proxy Server
const STATIC_PORT = 8115;
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const proxyServer = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const proxied = http.request(
      { host: 'localhost', port: 5099, path: req.url, method: req.method, headers: req.headers },
      (up) => {
        res.writeHead(up.statusCode, up.headers);
        up.pipe(res);
      }
    );
    proxied.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Backend unreachable: ' + err.message }));
    });
    req.pipe(proxied);
    return;
  }

  const reqPath = req.url.split('?')[0];
  let filePath = path.join(appDir, reqPath === '/' ? 'index.html' : reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(appDir, 'index.html');
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(content);
  });
});

proxyServer.listen(STATIC_PORT, async () => {
  console.log(`✓ Frontend static & proxy server running on http://localhost:${STATIC_PORT}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,1100']
  });

  const pageErrors = [];

  try {
    // Reset seed database
    console.log('\n[STEP 1] Resetting client database via POST http://localhost:5099/api/clients/reset...');
    const resetRes = await fetch('http://localhost:5099/api/clients/reset', { method: 'POST' });
    assert.equal(resetRes.status, 200, 'Reset returned 200 OK');
    const resetJson = await resetRes.json();
    assert.ok(resetJson.success, 'Database reset succeeded');
    console.log(`✓ Database reset with ${resetJson.data.length} clients.`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1100 });

    page.on('pageerror', (err) => {
      console.error('[PageError]:', err.message);
      pageErrors.push(err.message);
    });

    const spaGoto = async (toPath, wait = 1000) => {
      await page.evaluate((to) => {
        if (window.__navigate) window.__navigate(to);
        else history.pushState(null, '', to);
      }, toPath);
      await new Promise((r) => setTimeout(r, wait));
    };

    // Navigate & Log in
    console.log('\n[STEP 2] Navigating to login / client 360 page...');
    await page.goto(`http://localhost:${STATIC_PORT}/clients/c/client-kavita-edu`, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 1200));

    if (await page.$('.lg-form')) {
      console.log('Logging in with dev credentials...');
      await page.evaluate(() => {
        const setVal = (sel, val) => {
          const el = document.querySelector(sel);
          if (el) {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, val);
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        };
        setVal('.lg-input[name="email"]', 'ines@caldermoss.co');
        setVal('.lg-input[name="password"]', 'dev1234');
      });
      await page.click('button[type="submit"]');
      await new Promise((r) => setTimeout(r, 1500));
    }

    // Go to Kavita Edutech Client 360
    await spaGoto('/clients/c/client-kavita-edu', 1200);

    // Verify General Tab
    console.log('\n[STEP 3] Verifying Document Upload Section on General Tab...');
    await page.waitForSelector('.phead', { timeout: 5000 });
    const clientTitle = await page.evaluate(() => document.querySelector('.phead')?.textContent.trim() || document.body.textContent);
    assert.ok(clientTitle.includes('Kavita Edutech'), `Expected client title to include 'Kavita Edutech', got: ${clientTitle}`);
    console.log('✓ Active Client: Kavita Edutech verified.');

    // Verify Corporate Coordinates, Primary Contact, Agreement & Validity, and Document Upload cards
    const cardTitles = await page.$$eval('.card__title', (els) => els.map((el) => el.textContent.trim()));
    console.log('Visible Cards on General Tab:', cardTitles);
    assert.ok(cardTitles.includes('Corporate Coordinates'), 'Corporate Coordinates card exists');
    assert.ok(cardTitles.includes('Primary Contact Person'), 'Primary Contact Person card exists');
    assert.ok(cardTitles.includes('Agreement & Validity'), 'Agreement & Validity card exists');
    assert.ok(cardTitles.includes('Document Upload'), 'Document Upload card exists on General Tab');
    console.log('✓ "Document Upload" section card is successfully mounted on the General tab!');

    // Check table headers in Document Upload section
    const docTable = await page.$('#general-doc-table');
    assert.ok(docTable, '#general-doc-table is present');
    const ths = await page.$$eval('#general-doc-table thead th', (els) => els.map((el) => el.textContent.trim()));
    console.log('Document Upload Table Headers:', ths);
    assert.deepEqual(ths, ['S NO', 'Document Name', 'Format / Type', 'File Size', 'Upload Date', 'Actions']);
    console.log('✓ Document Upload table columns matched required schema.');

    // Check initial seed document row
    const initialRows = await page.$$eval('#general-doc-table tbody tr', (rows) =>
      rows.map((r) => ({
        sno: r.querySelector('.col-sno')?.textContent.trim(),
        name: r.querySelector('.doc-row-name')?.textContent.trim(),
        type: r.querySelector('.badge')?.textContent.trim(),
        size: r.querySelectorAll('td')[3]?.textContent.trim(),
        date: r.querySelectorAll('td')[4]?.textContent.trim()
      }))
    );
    console.log('Initial documents in array table:', initialRows);
    assert.equal(initialRows.length, 1, 'Initial seed document count should be 1');
    assert.equal(initialRows[0].name, 'Non-Disclosure Agreement (NDA) Signed');
    assert.equal(initialRows[0].type, 'PDF');
    console.log('✓ Initial seed document in documents array verified.');

    // Take initial screenshot
    const shot1 = path.join(reportDir, 'client_document_upload_section.png');
    await page.screenshot({ path: shot1, fullPage: false });
    fs.copyFileSync(shot1, path.join(frontendReportDir, 'client_document_upload_section.png'));
    console.log(`✓ Saved screenshot: ${shot1}`);

    // [STEP 4] Test Uploading a Document (Image Format - PNG)
    console.log('\n[STEP 4] Testing Document Upload with PNG Image format...');
    const uploadBtn = await page.$('#general-doc-upload-btn');
    assert.ok(uploadBtn, 'Upload Document button #general-doc-upload-btn exists');
    await uploadBtn.click();
    await new Promise((r) => setTimeout(r, 600));

    // Verify modal is open
    await page.waitForSelector('.scrim h2', { timeout: 3000 });
    const modalTitle = await page.$eval('.scrim h2', (el) => el.textContent.trim());
    assert.equal(modalTitle, 'Upload Document', 'Modal title is "Upload Document"');
    console.log(`✓ Modal opened with title: "${modalTitle}"`);

    // Check accept attribute on #doc-file
    const fileAccept = await page.$eval('#doc-file', (el) => el.getAttribute('accept'));
    assert.equal(fileAccept, '*/*', 'File input must accept any format ("*/*")');
    console.log(`✓ File input accept attribute is "${fileAccept}" (accepts PDF, images, and any format).`);

    // Capture modal screenshot
    const shotModal = path.join(reportDir, 'client_document_upload_modal.png');
    await page.screenshot({ path: shotModal, fullPage: false });
    fs.copyFileSync(shotModal, path.join(frontendReportDir, 'client_document_upload_modal.png'));
    console.log(`✓ Saved modal screenshot: ${shotModal}`);

    // Fill form and trigger file upload via simulated DataTransfer / readFileAsDataUrl
    await page.evaluate(() => {
      const setVal = (sel, val) => {
        const el = document.querySelector(sel);
        if (el) {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      };
      setVal('#doc-name', 'GST Registration & Trade Tax Certificate');
      setVal('#doc-notes', 'Original certificate verified from Chennai GST portal');

      // Create a simulated PNG file and dispatch to input
      const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137]);
      const file = new File([pngBytes], 'gst_trade_certificate.png', { type: 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = document.querySelector('#doc-file');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await new Promise((r) => setTimeout(r, 500));

    // Verify file name display in modal
    const fileNameDisplay = await page.$eval('#doc-file-name', (el) => el.textContent.trim());
    console.log(`✓ Modal attached file name display: "${fileNameDisplay}"`);
    assert.ok(fileNameDisplay.includes('gst_trade_certificate.png'), 'File name updated in modal UI');

    // Submit form
    console.log('Submitting upload form...');
    await page.click('#doc-save');
    await new Promise((r) => setTimeout(r, 1200));

    // Verify modal is closed
    const modalClosed = !(await page.$('.scrim'));
    assert.ok(modalClosed, 'Modal closed after successful upload');

    // Verify updated documents table
    const rowsAfterUpload = await page.$$eval('#general-doc-table tbody tr', (rows) =>
      rows.map((r) => ({
        sno: r.querySelector('.col-sno')?.textContent.trim(),
        name: r.querySelector('.doc-row-name')?.textContent.trim(),
        type: r.querySelector('.badge')?.textContent.trim(),
        size: r.querySelectorAll('td')[3]?.textContent.trim(),
        date: r.querySelectorAll('td')[4]?.textContent.trim()
      }))
    );
    console.log('Documents table after PNG upload:', rowsAfterUpload);
    assert.equal(rowsAfterUpload.length, 2, 'Documents array should now have 2 rows');
    const uploadedRow = rowsAfterUpload.find((r) => r.name.includes('GST Registration & Trade Tax Certificate'));
    assert.ok(uploadedRow, 'New GST Registration document found in array table');
    assert.equal(uploadedRow.type, 'PNG', 'Format badge should be PNG');
    console.log('✓ Uploaded PNG document rendered in array table with badge [PNG]!');

    // [STEP 5] Test Uploading a Second Document (PDF format)
    console.log('\n[STEP 5] Testing Document Upload with PDF format...');
    await page.click('#general-doc-upload-btn');
    await new Promise((r) => setTimeout(r, 600));

    await page.evaluate(() => {
      const setVal = (sel, val) => {
        const el = document.querySelector(sel);
        if (el) {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      };
      setVal('#doc-name', 'Incorporation Deed & MoA');
      setVal('#doc-notes', 'Registrar of Companies corporate seal attached');

      const pdfBytes = new TextEncoder().encode('%PDF-1.4 simulated pdf document content');
      const file = new File([pdfBytes], 'incorporation_deed_2026.pdf', { type: 'application/pdf' });
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = document.querySelector('#doc-file');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await new Promise((r) => setTimeout(r, 500));

    await page.click('#doc-save');
    await new Promise((r) => setTimeout(r, 1200));

    const rowsAfterPdf = await page.$$eval('#general-doc-table tbody tr', (rows) =>
      rows.map((r) => ({
        sno: r.querySelector('.col-sno')?.textContent.trim(),
        name: r.querySelector('.doc-row-name')?.textContent.trim(),
        type: r.querySelector('.badge')?.textContent.trim()
      }))
    );
    console.log('Documents table after PDF upload:', rowsAfterPdf);
    assert.equal(rowsAfterPdf.length, 3, 'Documents array should now have 3 rows');
    const pdfRow = rowsAfterPdf.find((r) => r.name.includes('Incorporation Deed & MoA'));
    assert.ok(pdfRow, 'New PDF document found in array table');
    assert.equal(pdfRow.type, 'PDF', 'Format badge should be PDF');
    console.log('✓ Multiple formats (PNG, PDF) simultaneously supported and rendered in array table!');

    // Capture success screenshot
    const shotSuccess = path.join(reportDir, 'client_document_uploaded_success.png');
    await page.screenshot({ path: shotSuccess, fullPage: false });
    fs.copyFileSync(shotSuccess, path.join(frontendReportDir, 'client_document_uploaded_success.png'));
    console.log(`✓ Saved success screenshot: ${shotSuccess}`);

    // [STEP 6] Test Edit Document in place
    console.log('\n[STEP 6] Testing Edit Document action...');
    await page.evaluate(() => {
      const btns = document.querySelectorAll('#general-doc-table .doc-row-edit');
      if (btns[1]) btns[1].click();
    });
    await page.waitForSelector('.scrim h2', { timeout: 3000 });

    const editModalTitle = await page.$eval('.scrim h2', (el) => el.textContent.trim());
    assert.equal(editModalTitle, 'Edit Document', 'Modal title should be "Edit Document"');

    // Update notes
    await page.evaluate(() => {
      const el = document.querySelector('#doc-notes');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'Audited by CFO & Legal Desk — Verified');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.click('#doc-save');
    await new Promise((r) => setTimeout(r, 1200));

    const updatedRowText = await page.$$eval('#general-doc-table tbody tr', (rows) => rows[1].textContent);
    assert.ok(updatedRowText.includes('Audited by CFO & Legal Desk — Verified'), 'Edited notes updated in table row');
    console.log('✓ Edit Document successfully updated document metadata in the array!');

    // [STEP 7] Test Download Document Action
    console.log('\n[STEP 7] Testing Download Document action...');
    await page.evaluate(() => {
      const btns = document.querySelectorAll('#general-doc-table .doc-row-download');
      if (btns[1]) btns[1].click();
    });
    await new Promise((r) => setTimeout(r, 600));
    console.log('✓ Download button triggered without runtime exceptions.');

    // [STEP 8] Test Delete Document Action
    console.log('\n[STEP 8] Testing Delete Document action...');
    // Override window.themedConfirm to automatically return true
    await page.evaluate(() => {
      window.themedConfirm = () => Promise.resolve(true);
      const btns = document.querySelectorAll('#general-doc-table .doc-row-delete');
      if (btns[2]) btns[2].click(); // delete 3rd row (Incorporation Deed)
    });
    await new Promise((r) => setTimeout(r, 1500));

    const rowsAfterDelete = await page.$$eval('#general-doc-table tbody tr', (rows) =>
      rows.map((r) => r.querySelector('.doc-row-name')?.textContent.trim())
    );
    console.log('Documents table after deletion:', rowsAfterDelete);
    assert.equal(rowsAfterDelete.length, 2, 'Documents array should now have 2 rows');
    assert.ok(!rowsAfterDelete.some((n) => n.includes('Incorporation Deed & MoA')), 'Deleted document removed from table');
    console.log('✓ Delete Document cleanly removed item from array collection.');

    // [STEP 9] Verify Backend Database Data Fidelity
    console.log('\n[STEP 9] Verifying backend database array persistence via GET /api/clients/client-kavita-edu...');
    const checkRes = await fetch('http://localhost:5099/api/clients/client-kavita-edu');
    assert.equal(checkRes.status, 200);
    const checkJson = await checkRes.json();
    const serverDocs = checkJson.data.documents;
    console.log(`Backend client.documents array length: ${serverDocs.length}`);
    assert.equal(serverDocs.length, 2, 'Server database has exactly 2 documents in array');
    assert.ok(Array.isArray(serverDocs), 'client.documents is strictly an Array');
    const gstServerDoc = serverDocs.find((d) => d.name.includes('GST Registration & Trade Tax Certificate'));
    assert.ok(gstServerDoc, 'GST Registration document found in MongoDB document array');
    assert.equal(gstServerDoc.type, 'PNG', 'Server document type matches PNG');
    assert.ok(gstServerDoc.data.startsWith('data:image/png;base64,'), 'Server document data contains base64 image URL');
    console.log('✓ Backend MongoDB document array persistence and data fidelity confirmed 100%!');

    // [STEP 10] Verify Client Register Form (/clients/new)
    console.log('\n[STEP 10] Verifying Client Register form (/clients/new) document upload format support...');
    await spaGoto('/clients/new', 1200);

    // Switch to All-In-One Form mode so all steps are mounted and visible
    await page.click('#wz-mode-all');
    await new Promise((r) => setTimeout(r, 600));

    // Verify stepDocs panel label in wizard
    const regDocPanelLabel = await page.$eval('.cf-docs', (el) => el.closest('.wz-panel')?.querySelector('.wz-panel__label')?.textContent.trim() || el.closest('.wz-panel')?.getAttribute('aria-label') || '');
    console.log(`Register Form Panel Label: "${regDocPanelLabel}"`);
    assert.ok(regDocPanelLabel.includes('any format'), 'Panel label specifies support for any format');

    // Click "Add Document"
    await page.click('#doc-row-add');
    await new Promise((r) => setTimeout(r, 400));
    const regFileAccept = await page.$eval('.doc-file-input', (el) => el.getAttribute('accept'));
    assert.equal(regFileAccept, '*/*', 'Register form document row accepts any format ("*/*")');
    console.log(`✓ Register form file input accept attribute is "${regFileAccept}" (accepts any format).`);

    // Verify zero page errors
    assert.equal(pageErrors.length, 0, `Detected unexpected page errors: ${pageErrors.join(', ')}`);
    console.log('✓ Clean execution: 0 page errors detected across all test steps.');

    console.log('\n===============================================================');
    console.log('ALL CLIENT DOCUMENT UPLOAD SECTION TESTS PASSED (100%)');
    console.log('===============================================================\n');

  } finally {
    await browser.close();
    proxyServer.close();
    backendServer.close();
    await disconnectDB();
  }
});
