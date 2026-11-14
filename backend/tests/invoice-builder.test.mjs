// Invoice builder (create + edit form): client mode, project, GST option, issuer / bank / signatory blocks, validation.
import http from 'node:http';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.NODE_ENV = 'test';
process.env.PORT = '5094';
const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { default: Invoice } = await import('../src/models/Invoice.js');
const PORT = 5094;
const req = (method, p, body) => new Promise((resolve, reject) => {
  const r = http.request(new URL(p, `http://localhost:${PORT}`), { method, headers: { 'Content-Type': 'application/json' } }, (res) => {
    let d = ''; res.on('data', (c) => (d += c));
    res.on('end', () => { let j; try { j = d ? JSON.parse(d) : {}; } catch { j = { raw: d }; } resolve({ status: res.statusCode, body: j }); });
  });
  r.on('error', reject); if (body) r.write(JSON.stringify(body)); r.end();
});
const TAG = `QA-BLD-${Date.now()}`;
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
try {
  console.log('\nCREATE (all form sections)');
  let r = await req('POST', '/api/invoices', full());
  const inv = r.body.data || {};
  check('B-01', 'create with every form section → 201', r.status === 201, `HTTP ${r.status} ${r.body.message}`);
  check('B-02', 'client block stored (mode, id, email, phone, GSTIN, PAN, address, project)', inv.clientMode === 'registered' && inv.clientId === 'client-x' && inv.clientEmail === 'buyer@qa.example.com' && inv.clientPhone === '+91 90000 00000' && inv.buyerGstin === '33AABCA9988C1Z4' && inv.buyerPan === 'AABCA9988C' && inv.buyerAddress.includes('Chennai') && inv.projectName === 'Phase 1');
  check('B-03', 'issue date and due date stored', inv.issueDate === '2026-11-01' && inv.dueDate === '2026-12-01');
  check('B-04', 'company block stored (name, tagline, contact, email, phone, GSTIN, PAN, address)', inv.companyName === `${TAG} Co` && inv.companyTagline === 'Tagline' && inv.companyContactPerson === 'Accounts' && inv.companyEmail === 'billing@qa.example.com' && inv.companyGst === '33AAFCE7781K1ZQ' && inv.companyAddress.includes('Madurai'));
  check('B-05', 'bank block stored (name, account, IFSC, UPI, branch)', inv.bankDetails.bankName === 'HDFC Bank' && inv.bankDetails.accountNumber === '50200088192831' && inv.bankDetails.ifsc === 'HDFC0000240' && inv.bankDetails.upiId === 'qa@hdfcbank');
  check('B-06', 'signatory block stored', inv.signatoryName === 'Rahul Sen' && inv.signatoryDesignation === 'Managing Director');
  check('B-07', 'invoice number generated automatically', /^INV-\d{4}-\d+/.test(inv.invoiceNumber || ''));
  r = await req('POST', '/api/invoices', full({ clientMode: 'manual', clientId: '', clientName: `${TAG} Manual`, title: `${TAG} Manual T`, gstCategory: 'N/A', gstType: 'Exempted', gstRate: 0, gstAmount: 0, totalAmount: 4000, balance: 4000 }));
  const man = r.body.data || {};
  check('B-08', 'manual client + Without GST (0% tax) accepted', r.status === 201 && man.clientMode === 'manual' && man.gstCategory === 'N/A' && man.totalAmount === 4000);

  console.log('\nVALIDATION');
  for (const [id, label, patch] of [
    ['V-01', 'invalid buyer GSTIN', { buyerGstin: 'BAD' }], ['V-02', 'invalid buyer PAN', { buyerPan: '12345' }], ['V-03', 'invalid client email', { clientEmail: 'nope' }],
    ['V-04', 'invalid company email', { companyEmail: 'nope' }], ['V-05', 'invalid company GSTIN', { companyGst: 'XX' }], ['V-06', 'invalid company PAN', { companyPan: 'ABC' }],
    ['V-07', 'due date before issue date', { issueDate: '2026-12-10', dueDate: '2026-12-01' }],
  ]) check(id, `create with ${label} → 400`, (await req('POST', '/api/invoices', full({ title: `${TAG} V`, ...patch }))).status === 400);
  check('V-08', 'nothing was created by rejected requests', (await Invoice.countDocuments({ title: `${TAG} V` })) === 0);

  console.log('\nEDIT (same form)');
  const put = (patch) => req('PUT', `/api/invoices/${inv._id}`, patch);
  r = await put({ clientMode: 'manual', clientId: '', clientName: `${TAG} Client 2`, clientEmail: 'new@qa.example.com', clientPhone: '+91 91111 11111', buyerAddress: 'New Address', projectName: '' });
  check('E-01', 'edit client block (switch to manual client)', r.status === 200 && r.body.data.clientMode === 'manual' && r.body.data.clientName === `${TAG} Client 2` && r.body.data.clientEmail === 'new@qa.example.com' && r.body.data.projectName === '');
  r = await put({ companyName: `${TAG} Co 2`, companyTagline: 'New tagline', companyContactPerson: 'Finance', companyPhone: '+91 82222 22222', companyAddress: 'New HQ' });
  check('E-02', 'edit company block', r.status === 200 && r.body.data.companyName === `${TAG} Co 2` && r.body.data.companyTagline === 'New tagline' && r.body.data.companyContactPerson === 'Finance' && r.body.data.companyAddress === 'New HQ');
  r = await put({ bankDetails: { bankName: 'ICICI Bank', ifsc: 'ICIC0006032' } });
  check('E-03', 'edit bank block (partial: unchanged fields kept)', r.status === 200 && r.body.data.bankDetails.bankName === 'ICICI Bank' && r.body.data.bankDetails.ifsc === 'ICIC0006032' && r.body.data.bankDetails.accountNumber === '50200088192831');
  r = await put({ signatoryName: 'Meera Iyer', signatoryDesignation: 'Director' });
  check('E-04', 'edit signatory block', r.status === 200 && r.body.data.signatoryName === 'Meera Iyer' && r.body.data.signatoryDesignation === 'Director');
  r = await put({ gstCategory: 'N/A', gstType: 'Exempted', items: items(['Design', 1000, 3], ['Build', 500, 2]) });
  check('E-05', 'switch to Without GST → 0% tax, total = subtotal', r.status === 200 && r.body.data.gstAmount === 0 && r.body.data.totalAmount === 4000 && r.body.data.balance === 4000, JSON.stringify([r.body.data.gstAmount, r.body.data.totalAmount]));
  r = await put({ gstCategory: 'B2B', gstType: 'CGST+SGST' });
  check('E-06', 'switch back to B2B Intra-State → 18% restored, CGST + SGST split', r.status === 200 && r.body.data.gstAmount === 720 && r.body.data.cgstAmount === 360 && r.body.data.sgstAmount === 360, JSON.stringify([r.body.data.gstAmount, r.body.data.cgstAmount, r.body.data.sgstAmount]));
  for (const [id, label, patch] of [
    ['E-07', 'invalid buyer GSTIN', { buyerGstin: 'BAD' }], ['E-08', 'invalid email', { clientEmail: 'x' }], ['E-09', 'due before issue', { dueDate: '2026-10-01' }], ['E-10', 'invalid company PAN', { companyPan: '1' }],
  ]) check(id, `edit with ${label} → 400`, (await put(patch)).status === 400);
  const still = (await req('GET', `/api/invoices/${inv._id}`)).body.data;
  check('E-11', 'rejected edits changed nothing', still.buyerGstin === '33AABCA9988C1Z4' && still.dueDate === '2026-12-31' || still.dueDate === '2026-12-01');
  check('E-12', 'invoice number cannot be changed', (await put({ invoiceNumber: 'HACK' })).body.data.invoiceNumber === inv.invoiceNumber);
} finally {
  await Invoice.deleteMany({ $or: [{ clientName: new RegExp(TAG) }, { title: new RegExp(TAG) }] });
  server.close();
  await disconnectDB();
}
const failed = results.filter((x) => !x.ok);
fs.writeFileSync(path.join(__dirname, 'invoice-builder-results.json'), JSON.stringify(results, null, 2));
console.log(`\nINVOICE BUILDER: ${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
