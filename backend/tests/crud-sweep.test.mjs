// Full CRUD sweep: every resource exposed by the API gets Create, Read (list + by id),
// Update, Delete, validation (400) and not-found (404) checks. Payloads are generated from
// each Mongoose schema's required paths, with overrides where business rules need real refs.
import http from 'node:http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.NODE_ENV = 'test';
process.env.PORT = '5098';

const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const PORT = 5098;

const M = async (p) => (await import(p)).default;
const models = {
  Client: await M('../src/models/Client.js'), Invoice: await M('../src/models/Invoice.js'), Propagation: await M('../src/models/Propagation.js'),
  GstTaxRate: await M('../src/models/GstTaxRate.js'), SalesInvoice: await M('../src/models/accounts/SalesInvoice.js'),
  CreditNote: await M('../src/models/accounts/CreditNote.js'), Expense: await M('../src/models/accounts/Expense.js'),
  ExpenseCategory: await M('../src/models/accounts/ExpenseCategory.js'), Emi: await M('../src/models/accounts/Emi.js'),
  StockInward: await M('../src/models/accounts/StockInward.js'), Asset: await M('../src/models/accounts/Asset.js'),
  AssetCategory: await M('../src/models/accounts/AssetCategory.js'), JournalVoucher: await M('../src/models/accounts/JournalVoucher.js'),
  BankAccount: await M('../src/models/accounts/BankAccount.js'), BankTransfer: await M('../src/models/accounts/BankTransfer.js'),
  Branch: await M('../src/models/Branch.js'), Staff: await M('../src/models/Staff.js'), StaffAttendance: await M('../src/models/StaffAttendance.js'),
  LeaveRequest: await M('../src/models/LeaveRequest.js'), LeaveType: await M('../src/models/LeaveType.js'), Shift: await M('../src/models/Shift.js'),
  SalaryStructure: await M('../src/models/SalaryStructure.js'), SalaryAdvance: await M('../src/models/SalaryAdvance.js'),
  PayrollAdjustment: await M('../src/models/PayrollAdjustment.js'),
};

function req(method, p, body) {
  return new Promise((resolve, reject) => {
    const r = http.request(new URL(p, `http://localhost:${PORT}`), { method, headers: { 'Content-Type': 'application/json' } }, (res) => {
      let d = ''; res.on('data', (c) => (d += c));
      res.on('end', () => { let j; try { j = d ? JSON.parse(d) : {}; } catch { j = { raw: d }; } resolve({ status: res.statusCode, body: j }); });
    });
    r.on('error', reject); if (body) r.write(JSON.stringify(body)); r.end();
  });
}

const stamp = Date.now();
function gen(model, overrides = {}) {
  const out = {};
  model.schema.eachPath((p, t) => {
    if (['_id', '__v', 'createdAt', 'updatedAt', 'id'].includes(p)) return;
    if (!t.isRequired && !(p in overrides)) return;
    if (p.includes('.')) { // nested path
      const [a, b] = p.split('.'); out[a] = out[a] || {}; out[a][b] = valFor(t, p); return;
    }
    out[p] = valFor(t, p);
  });
  return { ...out, ...overrides };
}
function valFor(t, p) {
  if (t.enumValues && t.enumValues.length) return t.enumValues[0];
  const k = t.instance;
  if (k === 'Number') return 10;
  if (k === 'Boolean') return true;
  if (k === 'Date') return new Date().toISOString().slice(0, 10);
  if (k === 'Array') return [];
  if (k === 'ObjectId') return new mongoose.Types.ObjectId().toString();
  if (/email/i.test(p)) return `qa${stamp}@example.com`;
  if (/phone|mobile/i.test(p)) return '9876543210';
  return `QA ${p} ${stamp}`;
}

// Shared fixtures (created once; removed at the end)
const fx = {};
const today = '2026-11-02';
const PAY = {
  sales: () => ({ customer: `QA Cust ${stamp}`, invoiceDate: today, dueDate: '2026-12-01', status: 'Draft', items: [{ productService: 'QA Service', quantity: 2, rate: 500 }], notes: 'qa' }),
  credit: () => ({ customer: `QA Cust ${stamp}`, status: 'Draft', reason: models.CreditNote.schema.path('reason').enumValues?.[0], items: [{ productService: 'QA Item', description: 'QA item', quantity: 1, rate: 100 }] }),
  emi: () => ({ productName: `QA EMI ${stamp}`, category: 'Other', principal: 6000, emiCount: 6, interestRate: 0, startDate: '2026-12-01', notes: 'qa' }),
  inward: () => ({ supplier: `QA Supplier ${stamp}`, date: today, category: 'Other', items: [{ sku: `QA-${stamp}`, description: 'QA item', quantity: 2, unitCost: 100, sellingPrice: 150 }], notes: 'qa' }),
  asset: () => ({ assetName: `QA Asset ${stamp}`, category: fx.assetCategory, purchaseDate: today, purchaseCost: 5000, notes: 'qa' }),
  transfer: () => ({ fromAccount: fx.bankA, toAccount: fx.bankB, amount: 100, date: today, notes: 'qa' }),
  attendance: () => ({ staffRef: fx.staff, date: `2026-10-${String(10 + (stamp % 15)).padStart(2, '0')}`, status: 'Present', checkIn: '09:00', checkOut: '18:00', remarks: 'qa' }),
  leave: () => ({ staffRef: fx.staff, leaveType: fx.leaveType, fromDate: '2026-09-10', toDate: '2026-09-11', reason: 'qa' }),
  advance: () => gen(models.SalaryAdvance, { staffRef: fx.staff, amount: 1000, balance: 1000, reason: 'qa' }),
  adjustment: () => gen(models.PayrollAdjustment, { staffRef: fx.staff, amount: 100, label: 'qa' }),
  structure: () => ({ staffRef: fx.staff, staffName: `QA Staff ${stamp}`, basic: 10000, hra: 2000 }),
};
// [name, base, model, update field, payload fn|null, has GET by id, has PUT]
const R = [
  ['Clients', '/api/clients', 'Client', 'company', () => ({ name: `QA Contact ${stamp}`, company: `QA Co ${stamp}`, email: `qa${stamp}@example.com` }), true, true],
  ['Invoices', '/api/invoices', 'Invoice', 'title', () => gen(models.Invoice, { items: [{ description: 'QA item', price: 100, qty: 1 }] }), true, true],
  ['Propagations (Quotations)', '/api/propagations', 'Propagation', 'title', null, true, true],
  ['GST rates', '/api/gst-rates', 'GstTaxRate', 'serviceName', () => ({ hsnCode: `99${String(stamp).slice(-4)}`, gstRate: 18, serviceName: `QA Svc ${stamp}`, taxType: 'Standard' }), false, true],
  ['Sales invoices', '/api/accounts/sales', 'SalesInvoice', 'notes', PAY.sales, true, true],
  ['Credit notes', '/api/accounts/credit-notes', 'CreditNote', 'customer', PAY.credit, false, true],
  ['Expenses', '/api/accounts/expenses', 'Expense', 'notes', () => ({ title: `QA Exp ${stamp}`, category: 'Other', amount: 10, date: today, notes: 'qa' }), false, true],
  ['Expense categories', '/api/accounts/expense-categories', 'ExpenseCategory', 'name', null, false, true],
  ['EMI plans', '/api/accounts/emi', 'Emi', 'notes', PAY.emi, true, true],
  ['Stock inward', '/api/accounts/stock-inward', 'StockInward', 'notes', PAY.inward, true, true],
  ['Assets', '/api/accounts/assets', 'Asset', 'notes', PAY.asset, false, true],
  ['Asset categories', '/api/accounts/asset-categories', 'AssetCategory', 'name', null, false, true],
  ['Adjustment entries', '/api/accounts/adjustment-entry', 'JournalVoucher', 'narration', null, false, true],
  ['Bank accounts', '/api/accounts/banking/accounts', 'BankAccount', 'accountName', null, false, true],
  ['Bank transfers', '/api/accounts/banking/transfers', 'BankTransfer', null, PAY.transfer, false, false],
  ['HR branches', '/api/hr/branches', 'Branch', 'name', null, true, true],
  ['Staff', '/api/staff', 'Staff', 'firstName', null, true, true],
  ['Staff attendance', '/api/hr/staff-attendance', 'StaffAttendance', 'remarks', PAY.attendance, true, true],
  ['Leave requests', '/api/hr/leave', 'LeaveRequest', 'reason', PAY.leave, false, true],
  ['Leave types', '/api/hr/leave-types', 'LeaveType', 'name', null, true, true],
  ['Shifts', '/api/hr/shifts', 'Shift', 'name', null, true, true],
  ['Salary structures', '/api/salary-structures', 'SalaryStructure', 'staffName', PAY.structure, true, true],
  ['Salary advances', '/api/hr/advances', 'SalaryAdvance', 'reason', PAY.advance, true, true],
  ['Payroll adjustments', '/api/hr/adjustments', 'PayrollAdjustment', 'label', PAY.adjustment, true, true],
];

const results = []; // {resource, op, ok, detail}
const rec = (resource, op, ok, detail = '') => { results.push({ resource, op, ok, detail }); console.log(`  ${ok ? '✓' : '✗'} ${resource} · ${op}${ok ? '' : ' — ' + detail}`); };
const idOf = (b) => { const d = b && (b.data || b); return d && (d._id || d.id); };
const ghost = new mongoose.Types.ObjectId().toString();

await connectDB();
const server = app.listen(PORT);
try {
  // fixtures
  let f = await req('POST', '/api/staff', gen(models.Staff)); fx.staff = idOf(f.body);
  f = await req('POST', '/api/hr/leave-types', gen(models.LeaveType)); fx.leaveType = idOf(f.body);
  f = await req('POST', '/api/accounts/asset-categories', gen(models.AssetCategory, { code: `FX${String(stamp).slice(-6)}`, name: `QA FX Cat ${stamp}` })); fx.assetCategory = (f.body.data || {}).name || idOf(f.body);
  f = await req('POST', '/api/accounts/banking/accounts', { accountNumber: `A${stamp}`, accountName: `QA A ${stamp}`, openingBalance: 5000 }); fx.bankA = idOf(f.body);
  f = await req('POST', '/api/accounts/banking/accounts', { accountNumber: `B${stamp}`, accountName: `QA B ${stamp}`, openingBalance: 0 }); fx.bankB = idOf(f.body);
  console.log('fixtures:', JSON.stringify(fx));
  for (const [name, base, model, field, override, hasById, hasPut] of R) {
    console.log(`\n# ${name}  (${base})`);
    const Model = models[model];
    // READ list
    let r = await req('GET', base);
    rec(name, 'READ list', r.status === 200, `HTTP ${r.status}`);
    // CREATE
    const payload = override ? override() : gen(Model);
    r = await req('POST', base, payload);
    const created = r.status === 200 || r.status === 201;
    const id = created ? idOf(r.body) : null;
    rec(name, 'CREATE', created && !!id, `HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);
    // VALIDATION
    const bad = await req('POST', base, {});
    rec(name, 'CREATE validation (empty body → 4xx)', bad.status >= 400 && bad.status < 500, `HTTP ${bad.status}`);
    if (!id) { rec(name, 'READ by id / UPDATE / DELETE', false, 'skipped: create failed'); continue; }
    // READ by id
    if (hasById) { r = await req('GET', `${base}/${id}`); rec(name, 'READ by id', r.status === 200, `HTTP ${r.status}`); }
    else { r = await req('GET', base); const list = r.body.data || r.body; rec(name, 'READ (record appears in list)', Array.isArray(list) && list.some((x) => String(x._id || x.id) === String(id)), 'not in list'); }
    // UPDATE
    if (hasPut && field) {
      const cur = (await req('GET', hasById ? `${base}/${id}` : base)).body; 
      const rec0 = hasById ? (cur.data || cur) : (cur.data || cur).find((x) => String(x._id || x.id) === String(id));
      const next = { ...rec0, [field]: `QA updated ${stamp}` };
      r = await req('PUT', `${base}/${id}`, next);
      const ok = r.status === 200;
      rec(name, 'UPDATE', ok, `HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);
      if (ok) {
        const g = hasById ? (await req('GET', `${base}/${id}`)).body : (await req('GET', base)).body;
        const doc = hasById ? (g.data || g) : (g.data || g).find((x) => String(x._id || x.id) === String(id));
        rec(name, 'UPDATE persisted', doc && String(doc[field]).includes('QA updated'), `field "${field}" = ${doc && doc[field]}`);
      }
      r = await req('PUT', `${base}/${ghost}`, { [field]: 'x' });
      rec(name, 'UPDATE unknown id → 404', r.status === 404, `HTTP ${r.status}`);
    }
    // DELETE
    r = await req('DELETE', `${base}/${id}`);
    rec(name, 'DELETE', r.status === 200 || r.status === 204, `HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);
    if (hasById) { r = await req('GET', `${base}/${id}`); rec(name, 'READ after delete → 404', r.status === 404, `HTTP ${r.status}`); }
    else { r = await req('GET', base); const list = r.body.data || r.body; const row = Array.isArray(list) && list.find((x) => String(x._id || x.id) === String(id)); const reversed = row && row.status === 'Reversed'; rec(name, reversed ? 'delete reverses (kept as Reversed for audit)' : 'gone after delete', !row || reversed, 'still listed'); }
    r = await req('DELETE', `${base}/${ghost}`);
    rec(name, 'DELETE unknown id → 404', r.status === 404, `HTTP ${r.status}`);
  }

  // ---- Client sub-resources: websites + credentials (nested CRUD) ----
  {
    const c = await req('POST', '/api/clients', { name: `QA Sub ${stamp}`, company: `QA Sub Co ${stamp}`, email: `sub${stamp}@example.com` });
    const cid = idOf(c.body);
    console.log('\n# Client websites / credentials (nested)');
    let r = await req('POST', `/api/clients/${cid}/websites`, { domain: `qa${stamp}.example.com` });
    const web = ((r.body.data || {}).websites || []).slice(-1)[0];
    rec('Client websites', 'CREATE', r.status < 300 && !!web, `HTTP ${r.status}`);
    rec('Client websites', 'CREATE validation (no domain → 400)', (await req('POST', `/api/clients/${cid}/websites`, {})).status === 400, '');
    r = await req('PUT', `/api/clients/${cid}/websites/${web && web.id}`, { hostingProvider: `QA Host ${stamp}` });
    rec('Client websites', 'UPDATE', r.status === 200 && (r.body.data.websites || []).some((w) => w.hostingProvider === `QA Host ${stamp}`), `HTTP ${r.status}`);
    rec('Client websites', 'UPDATE unknown id → 404', (await req('PUT', `/api/clients/${cid}/websites/nope`, { status: 'Live' })).status === 404, '');
    r = await req('DELETE', `/api/clients/${cid}/websites/${web && web.id}`);
    rec('Client websites', 'DELETE', r.status === 200 && !(r.body.data.websites || []).some((w) => w.id === (web && web.id)), `HTTP ${r.status}`);
    rec('Client websites', 'DELETE unknown id → 404', (await req('DELETE', `/api/clients/${cid}/websites/nope`)).status === 404, '');

    r = await req('POST', `/api/clients/${cid}/credentials`, { label: `QA Cred ${stamp}`, username: 'qa', password: 'secret' });
    const cred = ((r.body.data || {}).credentials || []).slice(-1)[0];
    rec('Client credentials', 'CREATE', r.status < 300 && !!cred, `HTTP ${r.status}`);
    rec('Client credentials', 'CREATE validation (missing fields → 400)', (await req('POST', `/api/clients/${cid}/credentials`, { label: 'x' })).status === 400, '');
    r = await req('PUT', `/api/clients/${cid}/credentials/${cred && cred.id}`, { username: `qa-upd-${stamp}` });
    rec('Client credentials', 'UPDATE', r.status === 200 && (r.body.data.credentials || []).some((x) => x.username === `qa-upd-${stamp}`), `HTTP ${r.status}`);
    rec('Client credentials', 'UPDATE unknown id → 404', (await req('PUT', `/api/clients/${cid}/credentials/nope`, { label: 'x' })).status === 404, '');
    r = await req('DELETE', `/api/clients/${cid}/credentials/${cred && cred.id}`);
    rec('Client credentials', 'DELETE', r.status === 200 && !(r.body.data.credentials || []).some((x) => x.id === (cred && cred.id)), `HTTP ${r.status}`);
    rec('Client credentials', 'DELETE unknown id → 404', (await req('DELETE', `/api/clients/${cid}/credentials/nope`)).status === 404, '');
    await req('DELETE', `/api/clients/${cid}`);
  }
} finally {
  for (const [p, id] of [['/api/accounts/banking/accounts', fx.bankA], ['/api/accounts/banking/accounts', fx.bankB], ['/api/hr/leave-types', fx.leaveType], ['/api/staff', fx.staff]]) { if (id) await req('DELETE', `${p}/${id}`); }
  // Accounting deletes are reversing entries (audit trail, net zero). Remove this run's QA
  // journal pairs so repeated runs never accumulate noise in the ledger.
  try {
    const { default: JournalEntry } = await import('../src/models/accounts/JournalEntry.js');
    const rx = new RegExp(String(stamp));
    const mine = await JournalEntry.find({ description: rx }).select('_id reversedBy reversalOf');
    const ids = mine.flatMap((e) => [e._id, e.reversedBy, e.reversalOf].filter(Boolean));
    await JournalEntry.deleteMany({ $or: [{ description: rx }, { entryNumber: { $in: ids } }] });
  } catch (e) { console.log('journal cleanup skipped:', e.message); }
  server.close();
  await disconnectDB();
}
const failed = results.filter((x) => !x.ok);
fs.writeFileSync(path.join(__dirname, 'crud-sweep-results.json'), JSON.stringify(results, null, 2));
console.log(`\nCRUD SWEEP: ${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
