import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.NODE_ENV = 'test';
process.env.PORT = '5098';

const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');

const BASE = 'http://localhost:5098';
let server;

const request = (method, p, body) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      new URL(p, BASE),
      { method, headers: { 'Content-Type': 'application/json' } },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: d ? JSON.parse(d) : {} });
          } catch {
            resolve({ status: res.statusCode, raw: d });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });

const results = [];
const test = async (id, feature, name, fn) => {
  try {
    await fn();
    results.push({ id, feature, name, status: 'PASS' });
    console.log(`  ✓ [${id}] ${name}`);
  } catch (e) {
    results.push({ id, feature, name, status: 'FAIL', error: e.message });
    console.log(`  ✗ [${id}] ${name}\n    ${e.message}`);
  }
};

const pdfData = (tag) =>
  'data:application/pdf;base64,' + Buffer.from(`%PDF-1.4 Mock PDF ${tag}`).toString('base64');
const imgData = (tag) =>
  'data:image/png;base64,' + Buffer.from(`PNG Mock Image ${tag}`).toString('base64');

await connectDB();
server = app.listen(5098);

console.log('\n--- ACCOUNTS TRANSACTION ATTACHMENTS (IMAGE & PDF) TESTS ---');

try {
  // 1. EXPENSES
  let expenseId;
  await test('ATT-EXP-01', 'Expenses', 'create expense with multiple image and PDF attachments', async () => {
    const payload = {
      title: 'Facility Electric Bill & Maintenance',
      description: 'Power and repairs with vendor bill and meter reading',
      category: 'Electricity & Utilities',
      amount: 4500,
      paymentMode: 'Bank Transfer',
      branch: 'Bandra',
      date: '2026-11-10',
      notes: 'Monthly billing',
      attachments: [
        { name: 'electric-bill-nov2026.pdf', type: 'PDF', size: '1.4 MB', data: pdfData('bill') },
        { name: 'meter-reading.png', type: 'PNG', size: '420 KB', data: imgData('meter') }
      ]
    };
    const res = await request('POST', '/api/accounts/expenses', payload);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data._id);
    assert.equal(res.body.data.attachments.length, 2);
    assert.equal(res.body.data.attachments[0].name, 'electric-bill-nov2026.pdf');
    assert.equal(res.body.data.attachments[0].type, 'PDF');
    assert.ok(res.body.data.attachments[0].data.startsWith('data:application/pdf'));
    assert.equal(res.body.data.attachments[1].name, 'meter-reading.png');
    assert.equal(res.body.data.attachments[1].type, 'PNG');
    assert.ok(res.body.data.attachments[1].data.startsWith('data:image/png'));
    expenseId = res.body.data._id;
  });

  await test('ATT-EXP-02', 'Expenses', 'update expense attachments (append new receipt image)', async () => {
    const updateRes = await request('PUT', `/api/accounts/expenses/${expenseId}`, {
      attachments: [
        { name: 'electric-bill-nov2026.pdf', type: 'PDF', size: '1.4 MB', data: pdfData('bill') },
        { name: 'meter-reading.png', type: 'PNG', size: '420 KB', data: imgData('meter') },
        { name: 'payment-receipt.jpg', type: 'JPG', size: '210 KB', data: imgData('receipt') }
      ]
    });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.attachments.length, 3);
    assert.equal(updateRes.body.data.attachments[2].name, 'payment-receipt.jpg');
  });

  // 2. EMI PLANS
  let emiId;
  await test('ATT-EMI-01', 'EMI Plans', 'create EMI plan with agreement PDF and sanction image', async () => {
    const payload = {
      productName: 'Commercial Pilates Studio Reformer',
      category: 'Equipment',
      principal: 120000,
      emiCount: 12,
      interestRate: 8,
      startDate: '2026-11-15',
      branch: 'Andheri',
      notes: 'Financed equipment',
      attachments: [
        { name: 'financing-agreement.pdf', type: 'PDF', size: '2.1 MB', data: pdfData('agreement') },
        { name: 'equipment-sanction.jpg', type: 'JPG', size: '650 KB', data: imgData('sanction') }
      ]
    };
    const res = await request('POST', '/api/accounts/emi', payload);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.attachments.length, 2);
    assert.equal(res.body.data.attachments[0].type, 'PDF');
    assert.equal(res.body.data.attachments[1].name, 'equipment-sanction.jpg');
    emiId = res.body.data._id;
  });

  await test('ATT-EMI-02', 'EMI Plans', 'update EMI plan attachments', async () => {
    const updateRes = await request('PUT', `/api/accounts/emi/${emiId}`, {
      attachments: [
        { name: 'financing-agreement-amended.pdf', type: 'PDF', size: '2.3 MB', data: pdfData('agreement2') }
      ]
    });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.attachments.length, 1);
    assert.equal(updateRes.body.data.attachments[0].name, 'financing-agreement-amended.pdf');
  });

  // 3. CREDIT NOTES
  let cnId;
  await test('ATT-CN-01', 'Credit Notes', 'create Credit Note with damaged goods photos & credit voucher PDF', async () => {
    const payload = {
      customer: 'Kavita Edutech',
      reason: 'Customer Return',
      items: [{ description: 'Defective Tile Lot', quantity: 2, rate: 1200 }],
      settlementMethod: 'Direct Refund',
      paymentMode: 'Cash',
      branch: 'Bandra',
      notes: 'Batch returned upon inspection',
      attachments: [
        { name: 'damage-inspection.png', type: 'PNG', size: '890 KB', data: imgData('damage') },
        { name: 'credit-memo-voucher.pdf', type: 'PDF', size: '350 KB', data: pdfData('creditmemo') }
      ]
    };
    const res = await request('POST', '/api/accounts/credit-notes', payload);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.attachments.length, 2);
    cnId = res.body.data._id;
  });

  await test('ATT-CN-02', 'Credit Notes', 'update Credit Note attachments', async () => {
    const res = await request('PUT', `/api/accounts/credit-notes/${cnId}`, {
      attachments: [
        { name: 'customer-signature-slip.pdf', type: 'PDF', size: '180 KB', data: pdfData('sig') }
      ]
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.attachments.length, 1);
    assert.equal(res.body.data.attachments[0].name, 'customer-signature-slip.pdf');
  });

  // 4. ASSET RECORDS
  let assetId;
  await test('ATT-AST-01', 'Asset Records', 'create Asset with purchase bill PDF and warranty card image', async () => {
    const payload = {
      assetName: 'Studio HVAC Air Quality System',
      category: 'IT & Electronics',
      quantity: 1,
      purchaseDate: '2026-11-01',
      purchaseCost: 85000,
      usefulLifeYears: 5,
      depreciationMethod: 'Straight Line',
      depreciationRate: 20,
      salvageValue: 5000,
      location: 'Showroom Floor 2',
      branch: 'Bandra',
      notes: 'Installed and tested',
      attachments: [
        { name: 'hvac-tax-invoice.pdf', type: 'PDF', size: '1.1 MB', data: pdfData('invoice') },
        { name: 'warranty-card.jpg', type: 'JPG', size: '540 KB', data: imgData('warranty') }
      ]
    };
    const res = await request('POST', '/api/accounts/assets', payload);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.attachments.length, 2);
    assetId = res.body.data._id;
  });

  await test('ATT-AST-02', 'Asset Records', 'update Asset attachments', async () => {
    const res = await request('PUT', `/api/accounts/assets/${assetId}`, {
      attachments: [
        { name: 'hvac-tax-invoice.pdf', type: 'PDF', size: '1.1 MB', data: pdfData('invoice') },
        { name: 'amc-contract-2026.pdf', type: 'PDF', size: '920 KB', data: pdfData('amc') }
      ]
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.attachments.length, 2);
    assert.equal(res.body.data.attachments[1].name, 'amc-contract-2026.pdf');
  });

  // 5. ADJUSTMENT ENTRY / JOURNAL VOUCHER
  let jvId;
  await test('ATT-JV-01', 'Adjustment Entry', 'create Journal Voucher with supporting memo PDF and approval note', async () => {
    const payload = {
      date: '2026-11-09',
      entryType: 'Journal Voucher',
      referenceNumber: 'AUDIT-ADJ-004',
      narration: 'Depreciation adjustment for Q3 machinery',
      debitAccount: '5600',
      creditAccount: '1600',
      amount: 15000,
      status: 'Draft',
      branch: 'All Branches',
      attachments: [
        { name: 'internal-audit-memo.pdf', type: 'PDF', size: '750 KB', data: pdfData('memo') },
        { name: 'director-signoff.png', type: 'PNG', size: '310 KB', data: imgData('signoff') }
      ]
    };
    const res = await request('POST', '/api/accounts/adjustment-entry', payload);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.attachments.length, 2);
    jvId = res.body.data._id;
  });

  await test('ATT-JV-02', 'Adjustment Entry', 'update Journal Voucher attachments', async () => {
    const res = await request('PUT', `/api/accounts/adjustment-entry/${jvId}`, {
      attachments: [
        { name: 'internal-audit-memo-v2.pdf', type: 'PDF', size: '760 KB', data: pdfData('memo2') }
      ]
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.attachments.length, 1);
    assert.equal(res.body.data.attachments[0].name, 'internal-audit-memo-v2.pdf');
  });

  // 6. SALES / INWARD INVOICES
  let salesId;
  await test('ATT-SALES-01', 'Sales / Inward Invoices', 'create Inward Invoice with PO document PDF and signed challan image', async () => {
    const payload = {
      customer: 'Aarav Nair Studio',
      invoiceDate: '2026-11-10',
      dueDate: '2026-11-25',
      paymentTerms: 'Net 15',
      items: [{ productService: 'Bespoke Terrazzo Slabs', quantity: 5, rate: 8000 }],
      paymentMode: 'Bank Transfer',
      branch: 'Bandra',
      notes: 'Customer PO #9923',
      attachments: [
        { name: 'purchase-order-9923.pdf', type: 'PDF', size: '1.8 MB', data: pdfData('po') },
        { name: 'delivery-challan-signed.jpg', type: 'JPG', size: '490 KB', data: imgData('challan') }
      ]
    };
    const res = await request('POST', '/api/accounts/sales', payload);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.attachments.length, 2);
    salesId = res.body.data._id;
  });

  await test('ATT-SALES-02', 'Sales / Inward Invoices', 'update Inward Invoice attachments', async () => {
    const res = await request('PUT', `/api/accounts/sales/${salesId}`, {
      attachments: [
        { name: 'purchase-order-9923.pdf', type: 'PDF', size: '1.8 MB', data: pdfData('po') },
        { name: 'delivery-challan-signed.jpg', type: 'JPG', size: '490 KB', data: imgData('challan') },
        { name: 'quality-inspection-pass.pdf', type: 'PDF', size: '320 KB', data: pdfData('qc') }
      ]
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.attachments.length, 3);
  });

  // 7. INWARD & EXPENSES AGGREGATED ENDPOINT
  await test('ATT-INEX-01', 'Inward & Expenses View', 'GET /api/accounts/inward-expenses returns raw records with attachments preserved', async () => {
    const res = await request('GET', '/api/accounts/inward-expenses');
    assert.equal(res.status, 200);
    const expRow = res.body.data.find((r) => r._id === expenseId.toString());
    assert.ok(expRow, 'Created expense is found in inward-expenses');
    assert.ok(Array.isArray(expRow.raw.attachments), 'Raw attachments array is exposed');
    assert.equal(expRow.raw.attachments.length, 3);
  });

  // Clean up test records
  await request('DELETE', `/api/accounts/expenses/${expenseId}`);
  await request('DELETE', `/api/accounts/emi/${emiId}`);
  await request('DELETE', `/api/accounts/credit-notes/${cnId}`);
  await request('DELETE', `/api/accounts/assets/${assetId}`);
  await request('DELETE', `/api/accounts/adjustment-entry/${jvId}`);
  await request('DELETE', `/api/accounts/sales/${salesId}`);
} finally {
  server.close();
  await disconnectDB();
}

console.log('\n===========================================');
const passed = results.filter((r) => r.status === 'PASS').length;
const failed = results.filter((r) => r.status === 'FAIL').length;
console.log(`ATTACHMENTS TEST RESULT: ${passed} passed, ${failed} failed`);
console.log('===========================================\n');
if (failed > 0) process.exit(1);
