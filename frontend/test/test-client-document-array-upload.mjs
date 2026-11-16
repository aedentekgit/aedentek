/**
 * AUTOMATED TEST SUITE: MULTI-DOCUMENT ARRAY UPLOAD FOR CLIENT CONTRACTS REPOSITORY
 * ---------------------------------------------------------------------------------
 * Verifies:
 *   1. Client 360° Profile (Kavita Edutech) Contracts tab loads "Contracts & Document Repository".
 *   2. "+ Add Contract" button triggers the Document Upload Modal.
 *   3. File input supports multiple file selection (input[type="file"][multiple]).
 *   4. Selecting multiple files renders the Document Array container (.doc-files-array-container).
 *   5. Each document item in the array has an editable "Name" input (#doc-name-0, #doc-name-1, etc.).
 *   6. Submitting dispatches payload as an array type:
 *      { category, startDate, endDate, notes, documents: [{ name, fileName, size, type, data }, ...] }
 *   7. Backend API validates and stores all documents in Mongoose client.documents array.
 *   8. Contracts repository grid (#doc-grid) immediately reloads and displays all uploaded documents.
 *   9. Database state confirms document array persistence and data integrity.
 *  10. Captures visual screenshots for test case report verification.
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..');
const reportDir = path.resolve(appDir, 'test-reports');
fs.mkdirSync(reportDir, { recursive: true });

const TARGET_URL = 'http://localhost:1234';

async function runTest() {
  console.log('======================================================================');
  console.log('STARTING PUPPETEER TEST: CLIENT CONTRACTS MULTI-DOCUMENT ARRAY UPLOAD');
  console.log('======================================================================\n');

  // Discover Kavita Edutech client ID dynamically from live database
  const clRes = await fetch(`${TARGET_URL}/api/clients`);
  const clJson = await clRes.json();
  const kavitaClient = clJson.data.find((c) => c.company && c.company.includes('Kavita')) || clJson.data[1];
  const CLIENT_ID = kavitaClient ? (kavitaClient.id || kavitaClient._id) : 'client-kavita-edu';
  console.log(`[INIT] Target Client: "${kavitaClient?.company}" (ID: ${CLIENT_ID})`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,1100']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100 });

  const pageErrors = [];
  page.on('pageerror', (err) => {
    console.error('[PAGE ERROR]:', err.message);
    pageErrors.push(err.message);
  });

  let capturedUploadRequest = null;
  let capturedUploadResponse = null;

  page.on('request', (req) => {
    if (req.url().includes('/documents') && req.method() === 'POST') {
      try {
        capturedUploadRequest = {
          url: req.url(),
          method: req.method(),
          headers: req.headers(),
          postData: JSON.parse(req.postData())
        };
      } catch (e) {
        capturedUploadRequest = { url: req.url(), postDataRaw: req.postData() };
      }
    }
  });

  page.on('response', async (res) => {
    if (res.url().includes('/documents') && res.request().method() === 'POST') {
      try {
        capturedUploadResponse = {
          status: res.status(),
          body: await res.json()
        };
      } catch (e) {
        capturedUploadResponse = { status: res.status() };
      }
    }
  });

  try {
    // STEP 1: Navigate to Client 360 page
    console.log(`[TEST STEP 1] Navigating to Client 360 page (${TARGET_URL}/clients/c/${CLIENT_ID})...`);
    await page.goto(`${TARGET_URL}/clients/c/${CLIENT_ID}`, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 1200));

    // Check if login card appears
    if (await page.$('.lg-form')) {
      console.log('  -> Login screen detected. Logging in as ines@caldermoss.co...');
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
      console.log('  ✓ Authenticated successfully.');
      
      // Navigate to Kavita Edutech Client 360
      await page.evaluate((cid) => {
        if (window.__navigate) window.__navigate(`/clients/c/${cid}`);
        else window.location.href = `/clients/c/${cid}`;
      }, CLIENT_ID);
      await new Promise((r) => setTimeout(r, 1200));
    }

    // Verify page header
    const pageTitle = await page.evaluate(() => document.querySelector('.phead b, .phead h1, .phead .phead__title')?.textContent || document.body.textContent);
    console.log(`  ✓ Current Page Title: "${pageTitle.trim().slice(0, 40)}"`);
    assert.ok(pageTitle.includes('Kavita Edutech'), `Expected page to be Kavita Edutech, got: ${pageTitle}`);

    // STEP 2: Switch to Contracts Tab
    console.log('\n[TEST STEP 2] Switching to "Contracts" tab...');
    const contractsTabClicked = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button[role="tab"], .tab'));
      const contractTab = tabs.find((t) => t.textContent.trim().includes('Contracts'));
      if (contractTab) {
        contractTab.click();
        return true;
      }
      return false;
    });
    assert.ok(contractsTabClicked, 'Contracts tab button found and clicked');
    await new Promise((r) => setTimeout(r, 800));

    // Verify Contracts card title and Add Contract button
    const cardTitle = await page.$eval('.card__title', (el) => el.textContent.trim());
    console.log(`  ✓ Section Title: "${cardTitle}"`);
    assert.ok(cardTitle.includes('Contracts & Document Repository'), 'Card title is Contracts & Document Repository');

    const addBtn = await page.$('#doc-add');
    assert.ok(addBtn, '+ Add Contract button (#doc-add) is present');
    console.log('  ✓ "+ Add Contract" button verified.');

    // Count initial documents
    const initialDocCards = await page.$$eval('#doc-grid .cd-doc', (els) =>
      els.map((el) => el.querySelector('.cd-soc__name')?.textContent.trim())
    );
    console.log('  ✓ Existing documents in Contracts Repository:', initialDocCards);
    assert.ok(initialDocCards.length >= 1, 'At least 1 seed document present');

    // Take screenshot of Contracts tab before upload
    const shotBefore = path.join(reportDir, 'contracts_tab_before_upload.png');
    await page.screenshot({ path: shotBefore, fullPage: false });
    console.log(`  ✓ Saved screenshot: ${shotBefore}`);

    // STEP 3: Click "+ Add Contract" and inspect modal
    console.log('\n[TEST STEP 3] Opening Document Upload Modal...');
    await addBtn.click();
    await new Promise((r) => setTimeout(r, 600));

    await page.waitForSelector('#doc-form', { timeout: 3000 });
    const modalTitle = await page.$eval('.scrim h2, .scrim b', (el) => el.textContent.trim());
    console.log(`  ✓ Modal opened with title: "${modalTitle}"`);
    assert.ok(modalTitle.includes('Upload Document'), 'Modal title is Upload Document');

    // Verify file input supports multiple files
    const isMultiple = await page.$eval('#doc-file', (el) => el.hasAttribute('multiple') || el.multiple === true);
    console.log(`  ✓ File input multiple attribute: ${isMultiple}`);
    assert.ok(isMultiple, 'File input MUST have multiple attribute enabled');

    // STEP 4: Select multiple document files (Array)
    console.log('\n[TEST STEP 4] Selecting multiple files simultaneously into document upload queue...');
    await page.evaluate(() => {
      // Create 3 simulated test files with different formats (PDF, PNG, PDF)
      const file1 = new File(['%PDF-1.4 MSA mock file bytes'], 'msa_agreement_fy26.pdf', { type: 'application/pdf' });
      const file2 = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'gst_registration_cert.png', { type: 'image/png' });
      const file3 = new File(['%PDF-1.4 ISO 27001 certificate bytes'], 'iso_27001_security_audit.pdf', { type: 'application/pdf' });

      const dt = new DataTransfer();
      dt.items.add(file1);
      dt.items.add(file2);
      dt.items.add(file3);

      const input = document.querySelector('#doc-file');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await new Promise((r) => setTimeout(r, 800));

    // Verify modal transformed to multiple-document array mode
    const updatedModalTitle = await page.$eval('.scrim h2, .scrim b', (el) => el.textContent.trim());
    console.log(`  ✓ Dynamic Modal Title: "${updatedModalTitle}"`);
    assert.ok(updatedModalTitle.includes('3 Documents'), 'Modal title updated to "Upload 3 Documents"');

    const fileCountText = await page.$eval('#doc-file-name', (el) => el.textContent.trim());
    console.log(`  ✓ File status text: "${fileCountText}"`);
    assert.ok(fileCountText.includes('3 document'), 'File status reflects 3 selected files');

    // Verify the Document Array container and Name inputs
    const arrayContainer = await page.$('.doc-files-array-container');
    assert.ok(arrayContainer, 'Document Array container (.doc-files-array-container) rendered');

    const nameInputsCount = await page.$$eval('.doc-array-name-input', (els) => els.length);
    console.log(`  ✓ Number of editable Document Name inputs rendered: ${nameInputsCount}`);
    assert.equal(nameInputsCount, 3, 'Must render exactly 3 Document Name inputs for the 3 selected files');

    // STEP 5: Edit Document Names for each item in the array
    console.log('\n[TEST STEP 5] Customizing Name for each document item in the array...');
    const customNames = [
      'Master Services Agreement (MSA) FY26',
      'GST Registration Certificate',
      'ISO 27001 Security Audit Report'
    ];

    await page.evaluate((names) => {
      names.forEach((name, idx) => {
        const input = document.querySelector(`#doc-name-${idx}`);
        if (input) {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, name);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      // Set category, dates and notes
      const cat = document.querySelector('#doc-category');
      if (cat) {
        cat.value = 'MSA';
        cat.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const start = document.querySelector('#doc-start');
      if (start) {
        start.value = '2026-04-01';
        start.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const end = document.querySelector('#doc-end');
      if (end) {
        end.value = '2027-03-31';
        end.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const notes = document.querySelector('#doc-notes');
      if (notes) {
        notes.value = 'Executed corporate agreements batch';
        notes.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, customNames);
    await new Promise((r) => setTimeout(r, 500));

    // Verify submit button text
    const saveBtnText = await page.$eval('#doc-save', (el) => el.textContent.trim());
    console.log(`  ✓ Submit button label: "${saveBtnText}"`);
    assert.ok(saveBtnText.includes('Upload 3 Documents'), 'Submit button reflects 3 documents');

    // Take screenshot of multi-document upload modal with array list
    const shotModalArray = path.join(reportDir, 'contracts_modal_document_array_inputs.png');
    await page.screenshot({ path: shotModalArray, fullPage: false });
    console.log(`  ✓ Saved modal screenshot: ${shotModalArray}`);

    // STEP 6: Submit form and verify array payload transmission
    console.log('\n[TEST STEP 6] Submitting multi-document array upload form...');
    await page.click('#doc-save');
    await new Promise((r) => setTimeout(r, 1500));

    // Verify network request
    assert.ok(capturedUploadRequest, 'POST /api/clients/:id/documents request was sent');
    console.log('  ✓ Captured HTTP Request URL:', capturedUploadRequest.url);
    console.log('  ✓ Request payload keys:', Object.keys(capturedUploadRequest.postData));
    
    assert.ok(Array.isArray(capturedUploadRequest.postData.documents), 'Payload MUST contain "documents" as an Array type');
    assert.equal(capturedUploadRequest.postData.documents.length, 3, 'Payload documents array MUST contain 3 items');

    const sentDocs = capturedUploadRequest.postData.documents;
    console.log('  ✓ Documents Array items sent to server:');
    sentDocs.forEach((d, i) => {
      console.log(`    [${i + 1}] Name: "${d.name}", FileName: "${d.fileName}", Type: "${d.type}", Size: "${d.size}"`);
      assert.equal(d.name, customNames[i], `Document ${i + 1} name match`);
      assert.ok(d.fileName, `Document ${i + 1} has fileName`);
      assert.ok(d.data.startsWith('data:'), `Document ${i + 1} has base64 data URL`);
    });

    // Verify server response
    assert.ok(capturedUploadResponse, 'Received HTTP Response from server');
    console.log(`  ✓ HTTP Status: ${capturedUploadResponse.status} (Expected: 201)`);
    assert.equal(capturedUploadResponse.status, 201, 'Backend returned 201 Created');
    assert.equal(capturedUploadResponse.body.success, true, 'Response body success is true');
    console.log(`  ✓ Server Response message: "${capturedUploadResponse.body.message}"`);
    assert.equal(capturedUploadResponse.body.documents.length, 3, 'Server returned 3 saved document objects');

    // STEP 7: Verify Contracts repository UI rendering
    console.log('\n[TEST STEP 7] Verifying Contracts & Document Repository grid UI...');
    await page.waitForSelector('#doc-grid', { timeout: 3000 });
    const renderedDocNames = await page.$$eval('#doc-grid .cd-doc .cd-soc__name', (els) =>
      els.map((el) => el.textContent.trim())
    );
    console.log('  ✓ Documents currently visible in Contracts Repository:', renderedDocNames);
    
    // Check all uploaded names exist
    customNames.forEach((name) => {
      assert.ok(renderedDocNames.includes(name), `Expected Contracts grid to display "${name}"`);
    });
    console.log('  ✓ All 3 newly uploaded documents successfully rendered in Contracts Repository grid!');

    // Take screenshot of Contracts tab after upload
    const shotAfter = path.join(reportDir, 'contracts_tab_after_multi_upload.png');
    await page.screenshot({ path: shotAfter, fullPage: false });
    console.log(`  ✓ Saved screenshot: ${shotAfter}`);

    // STEP 8: Database Integrity Verification
    console.log('\n[TEST STEP 8] Verifying Database persistence via direct backend API query...');
    const apiRes = await fetch(`${TARGET_URL}/api/clients/${CLIENT_ID}`);
    assert.equal(apiRes.status, 200, 'GET /api/clients/:id returned 200 OK');
    const apiJson = await apiRes.json();
    const dbDocs = apiJson.data.documents;
    console.log(`  ✓ Total documents in MongoDB client record: ${dbDocs.length}`);
    assert.ok(dbDocs.length >= 4, 'MongoDB client.documents array contains at least 4 documents');

    customNames.forEach((expectedName) => {
      const match = dbDocs.find((d) => d.name === expectedName);
      assert.ok(match, `Document "${expectedName}" verified in MongoDB`);
      assert.ok(match.fileName, `Document "${expectedName}" has fileName in MongoDB: ${match.fileName}`);
    });
    console.log('  ✓ All document records successfully verified in MongoDB database.');

    console.log('\n======================================================================');
    console.log('PUPPETEER TEST COMPLETED SUCCESSFULLY (10/10 ASSERTIONS PASSED)');
    console.log('======================================================================\n');
  } catch (err) {
    console.error('\n❌ PUPPETEER TEST FAILED:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runTest().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
