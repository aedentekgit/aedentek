import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.PORT = '5098';

const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { seedFinanceData } = await import('../src/utils/seedFinance.js');
const { default: Propagation } = await import('../src/models/Propagation.js');
const { default: Invoice } = await import('../src/models/Invoice.js');

const PORT = 5098;
const BASE_URL = `http://localhost:${PORT}`;

let server;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING INVOICES & COMMERCIAL PROPAGATIONS INTEGRATION TESTS ---');

  await connectDB();
  await seedFinanceData();
  server = app.listen(PORT);
  console.log(`[TEST-SERVER] Listening on ${BASE_URL}`);

  try {
    // Test 1: Reset and Seed Live Propagations
    console.log('\nTest 1: POST /api/propagations/reset');
    const resetPropRes = await request('POST', '/api/propagations/reset');
    assert.equal(resetPropRes.status, 200);
    assert.equal(resetPropRes.data.success, true);
    assert.equal(resetPropRes.data.count, 2);
    console.log('✓ Commercial Propagations reset and seeded with 2 live records');

    // Test 2: Reset and Seed Live Invoices
    console.log('\nTest 2: POST /api/invoices/reset');
    const resetInvRes = await request('POST', '/api/invoices/reset');
    assert.equal(resetInvRes.status, 200);
    assert.equal(resetInvRes.data.success, true);
    assert.equal(resetInvRes.data.count, 4);
    console.log('✓ Tax Invoices reset and seeded with 4 live records');

    // Test 3: Verify Live Propagations Structure & Values
    console.log('\nTest 3: GET /api/propagations');
    const getPropRes = await request('GET', '/api/propagations');
    assert.equal(getPropRes.status, 200);
    const props = getPropRes.data.data;
    const prop42 = props.find((p) => p.propagationNumber === 'PRP-2026-0042');
    const prop45 = props.find((p) => p.propagationNumber === 'PRP-2026-0045');

    assert.ok(prop42, 'PRP-2026-0042 must exist');
    assert.equal(prop42.clientName, 'Omni Retail Solutions Ltd');
    assert.equal(prop42.subtotal, 350000);
    assert.equal(prop42.status, 'Accepted');
    assert.equal(prop42.items.length, 2);

    assert.ok(prop45, 'PRP-2026-0045 must exist');
    assert.equal(prop45.clientName, 'Kavita Edutech');
    assert.equal(prop45.subtotal, 180000);
    assert.equal(prop45.status, 'Sent');
    console.log('✓ Verified live propagations (PRP-2026-0042 & PRP-2026-0045) data fidelity');

    // Test 4: Verify Live Invoices Statutory GST Calculations
    console.log('\nTest 4: GET /api/invoices');
    const getInvRes = await request('GET', '/api/invoices');
    assert.equal(getInvRes.status, 200);
    const invoices = getInvRes.data.data;

    // INV-2026-0081 (B2B Intra-State CGST+SGST 18%)
    const inv81 = invoices.find((i) => i.invoiceNumber === 'INV-2026-0081');
    assert.ok(inv81);
    assert.equal(inv81.subtotal, 400000);
    assert.equal(inv81.gstAmount, 72000);
    assert.equal(inv81.cgstAmount, 36000);
    assert.equal(inv81.sgstAmount, 36000);
    assert.equal(inv81.totalAmount, 472000);
    assert.equal(inv81.paidAmount, 472000);
    assert.equal(inv81.balance, 0);
    assert.equal(inv81.status, 'Paid');

    // INV-2026-0094 (B2B Inter-State IGST 18%)
    const inv94 = invoices.find((i) => i.invoiceNumber === 'INV-2026-0094');
    assert.ok(inv94);
    assert.equal(inv94.subtotal, 300000);
    assert.equal(inv94.igstAmount, 54000);
    assert.equal(inv94.totalAmount, 354000);
    assert.equal(inv94.paidAmount, 200000);
    assert.equal(inv94.balance, 154000);
    assert.equal(inv94.status, 'Partially Paid');

    // INV-2026-0102 (Export LUT Zero-Rated 0%)
    const inv102 = invoices.find((i) => i.invoiceNumber === 'INV-2026-0102');
    assert.ok(inv102);
    assert.equal(inv102.subtotal, 750000);
    assert.equal(inv102.gstRate, 0);
    assert.equal(inv102.tax, 0);
    assert.equal(inv102.totalAmount, 750000);
    assert.equal(inv102.lutNumber, 'AD330224001928K');
    assert.equal(inv102.status, 'Paid');

    // INV-2026-0118 (B2C IGST 18% Unsettled)
    const inv118 = invoices.find((i) => i.invoiceNumber === 'INV-2026-0118');
    assert.ok(inv118);
    assert.equal(inv118.subtotal, 150000);
    assert.equal(inv118.tax, 27000);
    assert.equal(inv118.totalAmount, 177000);
    assert.equal(inv118.paidAmount, 0);
    assert.equal(inv118.balance, 177000);
    assert.equal(inv118.status, 'Sent');
    console.log('✓ Verified 4 live invoices across CGST+SGST, IGST, and Export LUT regimes');

    // Test 5: Sequential Invoice Number Generator
    console.log('\nTest 5: GET /api/invoices/next-number');
    const nextNumRes = await request('GET', '/api/invoices/next-number');
    assert.equal(nextNumRes.status, 200);
    assert.match(nextNumRes.data.nextNumber, /^INV-2026-0119$/);
    console.log(`✓ Next sequential invoice number generated correctly: ${nextNumRes.data.nextNumber}`);

    // Test 6: 1-Click Propagation-to-Invoice Conversion Engine
    console.log('\nTest 6: POST /api/propagations/:id/convert (1-Click Convert)');
    const convertRes = await request('POST', `/api/propagations/${prop45._id}/convert`);
    assert.equal(convertRes.status, 201);
    assert.equal(convertRes.data.success, true);
    const convertedInv = convertRes.data.invoice;
    assert.equal(convertedInv.invoiceNumber, 'INV-2026-0119');
    assert.equal(convertedInv.propagationNumber, 'PRP-2026-0045');
    assert.equal(convertedInv.clientName, 'Kavita Edutech');
    assert.equal(convertedInv.subtotal, 180000);
    assert.equal(convertedInv.gstRate, 18);
    assert.equal(convertedInv.gstAmount, 32400); // 18% of 1,80,000
    assert.equal(convertedInv.totalAmount, 212400);
    assert.equal(convertedInv.balance, 212400);
    assert.equal(convertedInv.status, 'Sent');

    // Verify parent propagation updated to Accepted
    const updatedProp45 = await Propagation.findById(prop45._id);
    assert.equal(updatedProp45.status, 'Accepted');
    console.log('✓ 1-Click Conversion successfully generated INV-2026-0119 and marked propagation Accepted');

    // Test 7: Record Inward Payment Settlement
    console.log('\nTest 7: POST /api/invoices/:id/payment');
    // Pay partial 1,00,000 on converted invoice
    const payRes1 = await request('POST', `/api/invoices/${convertedInv._id}/payment`, {
      amount: 100000,
      paymentRef: 'REC-2026-099 (UPI Transfer: 409823901)',
      paymentMode: 'UPI',
    });
    assert.equal(payRes1.status, 200);
    assert.equal(payRes1.data.data.paidAmount, 100000);
    assert.equal(payRes1.data.data.balance, 112400);
    assert.equal(payRes1.data.data.status, 'Partially Paid');

    // Pay remaining 1,12,400 to fully settle
    const payRes2 = await request('POST', `/api/invoices/${convertedInv._id}/payment`, {
      amount: 112400,
      paymentRef: 'REC-2026-100 (NEFT Transfer)',
      paymentMode: 'Bank Transfer (NEFT)',
    });
    assert.equal(payRes2.status, 200);
    assert.equal(payRes2.data.data.paidAmount, 212400);
    assert.equal(payRes2.data.data.balance, 0);
    assert.equal(payRes2.data.data.status, 'Paid');
    console.log('✓ Recorded inward payment settlements: transitioning from Partially Paid to Paid');

    // Test 8: Create New Propagation with Dynamic Deliverables
    console.log('\nTest 8: POST /api/propagations (Create New Proposal)');
    const createPropRes = await request('POST', '/api/propagations', {
      clientName: 'Acme Architecture Labs',
      title: 'Parametric BIM Integration Suite',
      issueDate: '2026-10-01',
      validUntil: '2026-10-31',
      items: [
        { description: 'Revit / Rhino Model Synchronization API', qty: 2, rate: 75000 },
        { description: 'On-Premise Render Farm Daemon', qty: 1, rate: 50000 },
      ],
      notes: 'Net 30 validity window.',
    });
    assert.equal(createPropRes.status, 201);
    assert.equal(createPropRes.data.data.subtotal, 200000);
    assert.equal(createPropRes.data.data.total, 200000);
    const createdPropId = createPropRes.data.data._id;
    console.log('✓ Created custom Commercial Propagation with auto-computed line items and subtotal');

    // Test 9: Delete Propagation & Delete Invoice
    console.log('\nTest 9: DELETE /api/propagations/:id & DELETE /api/invoices/:id');
    const delPropRes = await request('DELETE', `/api/propagations/${createdPropId}`);
    assert.equal(delPropRes.status, 200);

    const delInvRes = await request('DELETE', `/api/invoices/${convertedInv._id}`);
    assert.equal(delInvRes.status, 200);
    console.log('✓ Clean deletion of test records confirmed');

    // Test 10: Validation Error Handlers
    console.log('\nTest 10: Validation error rejection');
    const badPropRes = await request('POST', '/api/propagations', { clientName: '' });
    assert.equal(badPropRes.status, 400);

    const badInvRes = await request('POST', '/api/invoices', { title: '' });
    assert.equal(badInvRes.status, 400);

    const badPayRes = await request('POST', `/api/invoices/${inv81._id}/payment`, { amount: -500 });
    assert.equal(badPayRes.status, 400);
    console.log('✓ Bad requests properly validated and rejected with HTTP 400');

    console.log('\n======================================================');
    console.log('ALL INVOICES & PROPAGATIONS TESTS PASSED (10/10)');
    console.log('======================================================\n');
  } finally {
    if (server) server.close();
    await disconnectDB();
  }
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});

