// Tax invoices: full CRUD + validation + server-side recalculation + payments.
import http from 'node:http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.NODE_ENV = 'test';
process.env.PORT = '5096';

const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { default: Invoice } = await import('../src/models/Invoice.js');
const PORT = 5096;

const req = (method, p, body) => new Promise((resolve, reject) => {
  const r = http.request(new URL(p, `http://localhost:${PORT}`), { method, headers: { 'Content-Type': 'application/json' } }, (res) => {
    let d = ''; res.on('data', (c) => (d += c));
    res.on('end', () => { let j; try { j = d ? JSON.parse(d) : {}; } catch { j = { raw: d }; } resolve({ status: res.statusCode, body: j }); });
  });
  r.on('error', reject); if (body) r.write(JSON.stringify(body)); r.end();
});

const TAG = `QA-INV-${Date.now()}`;
const results = [];
const check = (id, label, ok, detail = '') => { results.push({ id, label, ok: !!ok, detail }); console.log(`  ${ok ? '✓' : '✗'} ${id} ${label}${ok ? '' : ' — ' + detail}`); };
const base = '/api/invoices';
const ghost = new mongoose.Types.ObjectId().toString();
const items = (...rows) => rows.map(([description, price, qty], i) => ({ sNo: i + 1, description, price, qty, total: price * qty }));
const mk = (extra = {}) => ({ clientName: `${TAG} Client`, title: `${TAG} Title`, gstCategory: 'B2B', gstType: 'CGST+SGST', dueDate: '2026-12-01', items: items(['Design', 1000, 2]), subtotal: 2000, gstRate: 18, gstAmount: 360, totalAmount: 2360, paidAmount: 0, balance: 2360, status: 'Sent', ...extra });
const get = async (id) => (await req('GET', `${base}/${id}`)).body.data;
const ids = [];

await connectDB();
const server = app.listen(PORT);
try {
  console.log('\nCREATE');
  let r = await req('POST', base, mk());
  const inv = r.body.data || {}; ids.push(inv._id);
  check('C-01', 'create → 201', r.status === 201 && r.body.success, `HTTP ${r.status}`);
  check('C-02', 'invoice number auto-generated', /^INV-\d{4}-\d+/.test(inv.invoiceNumber || ''), inv.invoiceNumber);
  check('C-03', 'client, title, items and totals stored', inv.clientName === `${TAG} Client` && inv.title === `${TAG} Title` && inv.items.length === 1 && inv.totalAmount === 2360 && inv.balance === 2360);
  check('C-04', 'create without clientName → 400', (await req('POST', base, mk({ clientName: '' }))).status === 400);
  check('C-05', 'create without title is allowed (title optional)', (await req('POST', base, mk({ title: '' }))).status === 201);
  check('C-06', 'create with empty body → 4xx', (await req('POST', base, {})).status >= 400);

  console.log('\nREAD');
  r = await req('GET', base);
  check('R-01', 'list contains the invoice', (r.body.data || []).some((x) => x._id === inv._id));
  check('R-02', 'read by id', (await req('GET', `${base}/${inv._id}`)).status === 200);
  check('R-03', 'read unknown id → 404', (await req('GET', `${base}/${ghost}`)).status === 404);
  check('R-04', 'read malformed id → 4xx', (await req('GET', `${base}/not-an-id`)).status >= 400);

  console.log('\nUPDATE');
  const put = (id, patch) => req('PUT', `${base}/${id}`, patch);
  r = await put(inv._id, { clientName: `${TAG} Client 2` });
  check('U-01', 'update client name', r.status === 200 && r.body.data.clientName === `${TAG} Client 2`);
  r = await put(inv._id, { title: `${TAG} Title 2` });
  check('U-02', 'update title', r.status === 200 && r.body.data.title === `${TAG} Title 2`);
  r = await put(inv._id, { dueDate: '2026-12-31' });
  check('U-03', 'update due date', r.status === 200 && r.body.data.dueDate === '2026-12-31');
  r = await put(inv._id, { buyerGstin: '27AAFCO1234F1Z8', notes: 'edited' });
  check('U-04', 'update buyer GSTIN and notes', r.status === 200 && r.body.data.buyerGstin === '27AAFCO1234F1Z8' && r.body.data.notes === 'edited');
  r = await put(inv._id, { items: items(['Design', 1000, 2], ['Build', 500, 3]) });
  let d = r.body.data || {};
  check('U-05', 'changing items recalculates subtotal (3500)', r.status === 200 && d.subtotal === 3500, String(d.subtotal));
  check('U-06', 'GST 18% recalculated (630) and total 4130', d.gstAmount === 630 && d.totalAmount === 4130, `${d.gstAmount}/${d.totalAmount}`);
  check('U-07', 'balance follows the new total (4130)', d.balance === 4130, String(d.balance));
  check('U-08', 'CGST + SGST split sums to GST', d.cgstAmount + d.sgstAmount === 630, `${d.cgstAmount}+${d.sgstAmount}`);
  check('U-09', 'client-sent totals are ignored (server recomputes)', (await put(inv._id, { totalAmount: 1, subtotal: 1, balance: 1, items: items(['Design', 1000, 2]) })).body.data.totalAmount === 2360);
  r = await put(inv._id, { gstCategory: 'Export LUT', gstType: 'Export LUT' });
  check('U-10', 'switching to Export LUT sets GST to 0', r.status === 200 && r.body.data.gstAmount === 0 && r.body.data.totalAmount === 2000, JSON.stringify([r.body.data.gstAmount, r.body.data.totalAmount]));
  await put(inv._id, { gstCategory: 'B2B', gstType: 'IGST' });
  d = await get(inv._id);
  check('U-11', 'IGST puts the tax in igstAmount', d.igstAmount === 360 && d.cgstAmount === 0, `${d.igstAmount}/${d.cgstAmount}`);
  await put(inv._id, { gstType: 'CGST+SGST' });
  const num = (await get(inv._id)).invoiceNumber;
  r = await put(inv._id, { invoiceNumber: 'HACK-0001', paidAmount: 99999, _id: ghost });
  check('U-12', 'invoice number / paid amount / id cannot be overwritten', r.status === 200 && r.body.data.invoiceNumber === num && r.body.data.paidAmount === 0 && r.body.data._id === inv._id);
  for (const [id, label, patch] of [
    ['U-13', 'blank client name', { clientName: '  ' }],
    ['U-15', 'empty items', { items: [] }], ['U-16', 'item without description', { items: items(['', 10, 1]) }],
    ['U-17', 'negative price', { items: items(['x', -5, 1]) }], ['U-18', 'negative quantity', { items: items(['x', 5, -1]) }],
    ['U-19', 'invalid due date', { dueDate: 'soon' }], ['U-20', 'invalid issue date', { issueDate: '2026-99-99' }],
  ]) {
    const x = await put(inv._id, patch);
    check(id, `update with ${label} → 400`, x.status === 400, `HTTP ${x.status}`);
  }
  d = await get(inv._id);
  check('U-21', 'rejected updates change nothing', d.clientName === `${TAG} Client 2` && d.totalAmount === 2360);
  check('U-22', 'update unknown id → 404', (await put(ghost, { title: 'x' })).status === 404);
  check('U-23', 'update malformed id → 4xx', (await put('not-an-id', { title: 'x' })).status >= 400);

  console.log('\nPAYMENTS vs EDITS');
  r = await req('POST', `${base}/${inv._id}/payment`, { amount: 1000 });
  check('P-01', 'partial payment recorded (balance 1360, Partially Paid)', r.status === 200 && r.body.data.balance === 1360 && r.body.data.status === 'Partially Paid', JSON.stringify([r.status, r.body.data && r.body.data.balance, r.body.data && r.body.data.status]));
  r = await put(inv._id, { items: items(['Design', 800, 1]) });
  check('P-02', 'cannot lower the total below the amount already paid → 400', r.status === 400 && /already paid/i.test(r.body.message || ''), `HTTP ${r.status} ${r.body.message}`);
  r = await put(inv._id, { items: items(['Design', 1000, 3]) });
  d = r.body.data || {};
  check('P-03', 'raising the total keeps payments: paid 1000, balance recalculated (2540), still Partially Paid', r.status === 200 && d.paidAmount === 1000 && d.balance === 2540 && d.status === 'Partially Paid', JSON.stringify([d.paidAmount, d.balance, d.status]));
  r = await put(inv._id, { gstCategory: 'Export LUT', gstType: 'Export LUT', items: items(['Design', 1000, 1]) });
  d = r.body.data || {};
  check('P-04', 'edit that makes total equal to the amount paid sets status Paid, balance 0', r.status === 200 && d.totalAmount === 1000 && d.balance === 0 && d.status === 'Paid', JSON.stringify([r.status, d.totalAmount, d.balance, d.status]));

  console.log('\nDELETE');
  r = await req('POST', base, mk({ clientName: `${TAG} ToDelete` })); const del = r.body.data || {}; ids.push(del._id);
  r = await req('DELETE', `${base}/${del._id}`);
  check('D-01', 'delete → 200', r.status === 200 && r.body.success);
  check('D-02', 'record gone (404 on read, absent from list)', (await req('GET', `${base}/${del._id}`)).status === 404 && !((await req('GET', base)).body.data || []).some((x) => x._id === del._id));
  check('D-03', 'second delete → 404', (await req('DELETE', `${base}/${del._id}`)).status === 404);
  check('D-04', 'delete unknown id → 404', (await req('DELETE', `${base}/${ghost}`)).status === 404);
  check('D-05', 'delete malformed id → 4xx', (await req('DELETE', `${base}/not-an-id`)).status >= 400);
  check('D-06', 'other invoices unaffected', !!(await get(inv._id)));
  r = await req('DELETE', `${base}/${inv._id}`);
  check('D-07', 'a partially paid invoice can be deleted', r.status === 200);
} finally {
  await Invoice.deleteMany({ clientName: new RegExp(TAG) });
  server.close();
  await disconnectDB();
}
const failed = results.filter((x) => !x.ok);
fs.writeFileSync(path.join(__dirname, 'invoice-crud-results.json'), JSON.stringify(results, null, 2));
console.log(`\nINVOICE CRUD: ${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
