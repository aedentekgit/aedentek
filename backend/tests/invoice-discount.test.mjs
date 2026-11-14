// Invoice discount (percent / flat): server-side calculation, validation, edit, payments and persistence.
import http from 'node:http';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.NODE_ENV = 'test';
process.env.PORT = '5095';
const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { default: Invoice } = await import('../src/models/Invoice.js');
const PORT = 5095;
const req = (method, p, body) => new Promise((resolve, reject) => {
  const r = http.request(new URL(p, `http://localhost:${PORT}`), { method, headers: { 'Content-Type': 'application/json' } }, (res) => {
    let d = ''; res.on('data', (c) => (d += c));
    res.on('end', () => { let j; try { j = d ? JSON.parse(d) : {}; } catch { j = { raw: d }; } resolve({ status: res.statusCode, body: j }); });
  });
  r.on('error', reject); if (body) r.write(JSON.stringify(body)); r.end();
});
const TAG = `QA-DSC-${Date.now()}`;
const results = [];
const check = (id, label, ok, detail = '') => { results.push({ id, label, ok: !!ok, detail }); console.log(`  ${ok ? '✓' : '✗'} ${id} ${label}${ok ? '' : ' — ' + detail}`); };
const items = (...rows) => rows.map(([description, price, qty], i) => ({ sNo: i + 1, description, price, qty, total: price * qty }));
const full = (extra = {}) => ({
  clientMode: 'registered', clientId: 'client-x', clientName: `${TAG} Client`, clientEmail: 'buyer@qa.example.com', clientPhone: '+91 90000 00000',
  buyerGstin: '33AABCA9988C1Z4', buyerPan: 'AABCA9988C', buyerAddress: '1 Buyer Road, Chennai', projectName: 'Phase 1',
  title: `${TAG} Title`, issueDate: '2026-11-01', dueDate: '2026-12-01', gstCategory: 'B2B', gstType: 'IGST', hsn: '998314',
  items: items(['Design', 1000, 3], ['Build', 500, 2]), subtotal: 4000, gstRate: 18, gstAmount: 720, totalAmount: 4720, paidAmount: 0, balance: 4720, status: 'Sent',
  companyName: `${TAG} Co`, companyTagline: 'Tagline', companyContactPerson: 'Accounts', companyEmail: 'billing@qa.example.com', companyPhone: '+91 80000 00000',
  companyGst: '33AAFCE7781K1ZQ', companyPan: 'AAFCE7781K', companyAddress: '12 Company Street, Madurai', companyLogo: '', signatoryName: 'Rahul Sen', signatoryDesignation: 'Managing Director', signatorySeal: '',
  bankDetails: { bankName: 'HDFC Bank', accountName: `${TAG} Co`, accountType: 'Current', accountNumber: '50200088192831', ifsc: 'HDFC0000240', branch: 'Madurai', upiId: 'qa@hdfcbank', bankAddress: 'Bank Road', qrCode: '' },
  ...extra
});
await connectDB();
const server = app.listen(PORT);
const put = (id, b) => req('PUT', `/api/invoices/${id}`, b);
const mk = async (extra) => { const r = await req('POST', '/api/invoices', full(extra)); return r; };
try {
  console.log('\nCREATE WITH DISCOUNT');
  let r = await mk({}); let a = r.body.data || {};
  check('D-01', 'no discount fields → type none, amount 0, total unchanged (4000 + 18% = 4720)', r.status === 201 && a.discountType === 'none' && a.discountAmount === 0 && a.discountValue === 0 && a.totalAmount === 4720);
  r = await mk({ discountType: 'percent', discountValue: 10 }); a = r.body.data || {};
  check('D-02', '10% discount → amount 400, GST on 3600 = 648 (IGST), total 4248, balance 4248', r.status === 201 && a.discountAmount === 400 && a.gstAmount === 648 && a.igstAmount === 648 && a.totalAmount === 4248 && a.balance === 4248, JSON.stringify([a.discountAmount, a.gstAmount, a.totalAmount]));
  check('D-03', 'subtotal stays the undiscounted line total (4000)', a.subtotal === 4000);
  check('D-04', 'type and value stored', a.discountType === 'percent' && a.discountValue === 10);
  r = await mk({ discountType: 'flat', discountValue: 500 }); a = r.body.data || {};
  check('D-05', 'flat 500 → taxable 3500, GST 630, total 4130', r.status === 201 && a.discountAmount === 500 && a.gstAmount === 630 && a.totalAmount === 4130, JSON.stringify([a.discountAmount, a.gstAmount, a.totalAmount]));
  r = await mk({ gstType: 'CGST+SGST', discountType: 'percent', discountValue: 10 }); a = r.body.data || {};
  check('D-06', 'CGST + SGST split uses the discounted GST (324 + 324)', a.cgstAmount === 324 && a.sgstAmount === 324 && a.igstAmount === 0, JSON.stringify([a.cgstAmount, a.sgstAmount]));
  r = await mk({ gstCategory: 'N/A', gstType: 'Exempted', gstRate: 0, discountType: 'percent', discountValue: 10 }); a = r.body.data || {};
  check('D-07', 'Without GST + 10% → no tax, total 3600', a.gstAmount === 0 && a.totalAmount === 3600 && a.discountAmount === 400, JSON.stringify([a.gstAmount, a.totalAmount]));
  r = await mk({ discountType: 'percent', discountValue: 100 }); a = r.body.data || {};
  check('D-08', '100% discount → total 0, GST 0', r.status === 201 && a.totalAmount === 0 && a.gstAmount === 0 && a.discountAmount === 4000, JSON.stringify([a.totalAmount, a.gstAmount]));
  r = await mk({ discountType: 'percent', discountValue: 12.5 }); a = r.body.data || {};
  check('D-09', 'fractional percent 12.5% → amount 500, total 4130', a.discountAmount === 500 && a.totalAmount === 4130);
  r = await mk({ discountType: 'none', discountValue: 50 }); a = r.body.data || {};
  check('D-10', 'type none ignores a stray value (value reset to 0, total 4720)', a.discountValue === 0 && a.discountAmount === 0 && a.totalAmount === 4720);
  r = await mk({ discountAmount: 3000 }); a = r.body.data || {};
  check('D-11', 'client-sent discountAmount is ignored without a type (recalculated to 0)', a.discountAmount === 0 && a.totalAmount === 4720);

  console.log('\nCREATE VALIDATION');
  for (const [id, label, patch] of [
    ['V-01', 'percent above 100', { discountType: 'percent', discountValue: 101 }],
    ['V-02', 'negative value', { discountType: 'flat', discountValue: -5 }],
    ['V-03', 'unknown type', { discountType: 'bogus', discountValue: 5 }],
    ['V-04', 'flat larger than subtotal', { discountType: 'flat', discountValue: 4001 }],
    ['V-05', 'non-numeric value', { discountType: 'percent', discountValue: 'abc' }],
    ['V-06', 'percent type with no value', { discountType: 'percent' }],
  ]) check(id, `create with ${label} → 400`, (await mk({ title: `${TAG} V`, ...patch })).status === 400);
  const stray = await req('GET', '/api/invoices');
  check('V-07', 'rejected creates left no records', !(stray.body.data || []).some((x) => x.title === `${TAG} V`));

  console.log('\nEDIT');
  r = await mk({}); const inv = r.body.data;
  r = await put(inv._id, { discountType: 'percent', discountValue: 25 }); a = r.body.data || {};
  check('U-01', 'add 25% on an existing invoice → amount 1000, GST 540, total 3540', r.status === 200 && a.discountAmount === 1000 && a.gstAmount === 540 && a.totalAmount === 3540, JSON.stringify([r.status, a.discountAmount, a.totalAmount]));
  r = await put(inv._id, { discountType: 'flat', discountValue: 200 }); a = r.body.data || {};
  check('U-02', 'switch to flat 200 → GST 684, total 4484', a.discountAmount === 200 && a.gstAmount === 684 && a.totalAmount === 4484, JSON.stringify([a.discountAmount, a.gstAmount, a.totalAmount]));
  r = await put(inv._id, { discountValue: 300 }); a = r.body.data || {};
  check('U-03', 'change only the value (flat 300) → total 4366', a.discountType === 'flat' && a.totalAmount === 4366, String(a.totalAmount));
  r = await put(inv._id, { items: items(['Design', 1000, 1]) }); a = r.body.data || {};
  check('U-04', 'edit line items → flat discount kept, totals recomputed (700 + 18% = 826)', a.subtotal === 1000 && a.discountAmount === 300 && a.gstAmount === 126 && a.totalAmount === 826, JSON.stringify([a.subtotal, a.discountAmount, a.gstAmount, a.totalAmount]));
  r = await put(inv._id, { discountType: 'percent', discountValue: 50 }); a = r.body.data || {};
  check('U-05', 'percent follows the new subtotal (50% of 1000 = 500)', a.discountAmount === 500 && a.totalAmount === 590, JSON.stringify([a.discountAmount, a.totalAmount]));
  r = await put(inv._id, { items: items(['Design', 1000, 3], ['Build', 500, 2]) }); a = r.body.data || {};
  check('U-06', 'percent recalculates when items grow back (50% of 4000 = 2000)', a.discountAmount === 2000 && a.totalAmount === 2360, JSON.stringify([a.discountAmount, a.totalAmount]));
  r = await put(inv._id, { discountType: 'none' }); a = r.body.data || {};
  check('U-07', 'remove the discount (none) → value 0, amount 0, total 4720', a.discountType === 'none' && a.discountValue === 0 && a.discountAmount === 0 && a.totalAmount === 4720, JSON.stringify([a.discountValue, a.totalAmount]));
  r = await put(inv._id, { discountType: 'flat', discountValue: 100, discountAmount: 9999, totalAmount: 1 }); a = r.body.data || {};
  check('U-08', 'client-sent discountAmount / totalAmount are ignored', a.discountAmount === 100 && a.totalAmount === 4602, JSON.stringify([a.discountAmount, a.totalAmount]));
  for (const [id, label, patch] of [
    ['U-09', 'percent above 100', { discountType: 'percent', discountValue: 150 }],
    ['U-10', 'negative value', { discountType: 'flat', discountValue: -1 }],
    ['U-11', 'unknown type', { discountType: 'weird' }],
    ['U-12', 'flat larger than subtotal', { discountType: 'flat', discountValue: 5000 }],
  ]) check(id, `edit with ${label} → 400`, (await put(inv._id, patch)).status === 400);
  a = (await req('GET', `/api/invoices/${inv._id}`)).body.data;
  check('U-13', 'rejected edits changed nothing (flat 100, total 4602)', a.discountType === 'flat' && a.discountValue === 100 && a.totalAmount === 4602);
  r = await put(inv._id, { discountType: 'flat', discountValue: 4001 });
  check('U-14', 'flat above the current subtotal on edit → 400', r.status === 400);
  check('U-15', 'edit on an unknown id → 404', (await put('64b000000000000000000000', { discountType: 'none' })).status === 404);

  console.log('\nPAYMENTS vs DISCOUNT');
  r = await mk({ discountType: 'percent', discountValue: 10 }); const p = r.body.data;
  r = await req('POST', `/api/invoices/${p._id}/payment`, { amount: 4000 }); a = r.body.data || {};
  check('P-01', 'record 4000 against a 4248 invoice → balance 248, Partially Paid', a.balance === 248 && a.status === 'Partially Paid', JSON.stringify([a.balance, a.status]));
  r = await put(p._id, { discountType: 'percent', discountValue: 50 });
  check('P-02', 'a discount that drops the total below the amount paid → 400', r.status === 400, `HTTP ${r.status}`);
  r = await put(p._id, { discountType: 'percent', discountValue: 5 }); a = r.body.data || {};
  check('P-03', 'smaller discount keeps payments and recalculates balance (4484 − 4000 = 484)', r.status === 200 && a.totalAmount === 4484 && a.balance === 484 && a.paidAmount === 4000, JSON.stringify([r.status, a.totalAmount, a.balance]));
  r = await put(p._id, { discountType: 'flat', discountValue: 680 }); a = r.body.data || {};
  check('P-04', 'flat 680 → total 3918 is below the 4000 already paid → 400', r.status === 400, JSON.stringify([r.status, a.status, a.totalAmount]));

  console.log('\nPERSISTENCE + LIST');
  a = (await req('GET', `/api/invoices/${p._id}`)).body.data;
  check('L-01', 'GET by id returns discount type, value and amount', a.discountType && typeof a.discountValue === 'number' && typeof a.discountAmount === 'number');
  const list = (await req('GET', '/api/invoices')).body.data || [];
  const row = list.find((x) => x._id === p._id);
  check('L-02', 'list endpoint carries the discount fields', row && row.discountType === a.discountType && row.discountAmount === a.discountAmount);

  console.log('\nDELETE');
  r = await req('DELETE', `/api/invoices/${inv._id}`);
  check('X-01', 'delete an invoice that has a discount → 200', r.status === 200);
  check('X-02', 'deleted invoice is gone', (await req('GET', `/api/invoices/${inv._id}`)).status === 404);
} finally {
  await Invoice.deleteMany({ $or: [{ clientName: new RegExp(TAG) }, { title: new RegExp(TAG) }] });
  server.close();
  await disconnectDB();
}
const failed = results.filter((x) => !x.ok);
fs.writeFileSync(path.join(__dirname, 'invoice-discount-results.json'), JSON.stringify(results, null, 2));
console.log(`\nINVOICE DISCOUNT: ${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
