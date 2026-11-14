import http from 'node:http';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.PORT = '5099';

const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { default: Expense } = await import('../src/models/accounts/Expense.js');
const { default: StockInward } = await import('../src/models/accounts/StockInward.js');
const { default: JournalEntry } = await import('../src/models/accounts/JournalEntry.js');

const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}`;
let server;

function request(method, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
    const req = http.request(url, { method, headers: { 'Content-Type': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} }); }
        catch (e) { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let passed = 0;
let failed = 0;
const check = (cond, label) => {
  if (cond) { passed += 1; console.log(`  ✓ ${label}`); } else { failed += 1; console.error(`  ✗ ${label}`); }
};
const near = (a, b) => Math.abs(a - b) < 0.011;
const TAG = `QA-IE-${Date.now()}`;
const list = async (qs = '') => (await request('GET', `/api/accounts/inward-expenses${qs}`)).body;

async function runTests() {
  console.log('--- STARTING INWARD & EXPENSES COMBINED-LIST TESTS ---');
  await connectDB();
  server = app.listen(PORT, () => console.log(`[TEST-SERVER] Listening on ${BASE_URL}`));
  let expId; let inwId; let inw2Id;
  try {
    console.log('\nTest 1: Baseline shape');
    const base = await request('GET', '/api/accounts/inward-expenses');
    check(base.status === 200 && base.body.success, 'GET /api/accounts/inward-expenses returns 200');
    check(base.body.data.some((r) => r.kind === 'Expense') && base.body.data.some((r) => r.kind === 'Inward'), 'list contains both Expense and Inward rows');
    const sample = base.body.data[0];
    check(['kind', 'reference', 'date', 'category', 'branch', 'paymentMode', 'amount', 'paidAmount', 'balanceDue', 'status', 'raw'].every((k) => k in sample), 'rows carry the unified fields');
    const k0 = base.body.kpis;
    check(['totalRecords', 'expenseCount', 'inwardCount', 'totalExpenses', 'totalInward', 'totalSpend', 'payable'].every((k) => k in k0), 'KPI payload present');
    check(near(k0.totalSpend, k0.totalExpenses + k0.totalInward), 'total spend = expenses + stock inward');
    const dates = base.body.data.map((r) => r.date);
    check(dates.every((d, i) => i === 0 || dates[i - 1] >= d), 'rows are newest first');

    console.log('\nTest 2: Totals match the source modules');
    const exps = (await request('GET', '/api/accounts/expenses')).body;
    const inws = (await request('GET', '/api/accounts/stock-inward')).body;
    check(near(k0.totalExpenses, exps.kpis.totalExpenses), `expense total equals /expenses KPI (${k0.totalExpenses})`);
    check(near(k0.totalInward, inws.kpis.totalProcuredValue), `inward total equals /stock-inward KPI (${k0.totalInward})`);
    check(near(k0.payable, inws.kpis.accountsPayable), 'payable equals stock-inward accounts payable');
    check(k0.totalRecords === exps.data.length + inws.data.length, 'record count = expenses + inwards');

    console.log('\nTest 3: Create an expense and an inward, see both in one list');
    const e = await request('POST', '/api/accounts/expenses', {
      title: `${TAG} Expense`, category: 'Facility Rent', amount: 5000, paymentMode: 'UPI', branch: 'Bandra', date: '2099-01-10', notes: 'qa'
    });
    expId = e.body.data && e.body.data._id;
    const i = await request('POST', '/api/accounts/stock-inward', {
      supplier: `${TAG} Supplier`, date: '2099-01-12', category: 'Supplements', branch: 'Bandra',
      items: [{ sku: `${TAG}-1`, description: 'QA item', quantity: 10, unitCost: 300, sellingPrice: 450 }],
      payments: [{ mode: 'Cash', amount: 1000 }]
    });
    inwId = i.body.data && i.body.data._id;
    check(e.status === 201 && i.status === 201, 'expense and inward created through their own APIs');
    const after = await list();
    const eRow = after.data.find((r) => r._id === expId);
    const iRow = after.data.find((r) => r._id === inwId);
    check(eRow && eRow.kind === 'Expense' && eRow.amount === 5000 && eRow.paidAmount === 5000 && eRow.balanceDue === 0 && eRow.status === 'Paid', 'expense row: amount 5000, fully paid, no balance');
    check(iRow && iRow.kind === 'Inward' && iRow.amount === 3000 && iRow.paidAmount === 1000 && iRow.balanceDue === 2000, 'inward row: total 3000, paid 1000, balance 2000');
    check(iRow && iRow.status === 'Partially Paid' && iRow.party === `${TAG} Supplier` && /^SI-\d+$/.test(iRow.reference) && iRow.items === 1, 'inward row: Partially Paid, supplier, SI number, item count');
    check(iRow && iRow.paymentMode === 'Cash', 'inward payment mode derived from its payments');
    check(after.data[0]._id === inwId && after.data[1]._id === expId, 'newest records (2099) sort to the top, inward (12th) before expense (10th)');
    check(near(after.kpis.totalExpenses - k0.totalExpenses, 5000) && near(after.kpis.totalInward - k0.totalInward, 3000) && near(after.kpis.payable - k0.payable, 2000), 'KPIs moved by exactly the new amounts');
    check(eRow.raw && eRow.raw.title === `${TAG} Expense` && iRow.raw && iRow.raw.items.length === 1, 'raw record included so the UI can open the right edit drawer');

    console.log('\nTest 4: Filters');
    const onlyI = await list('?type=Inward');
    check(onlyI.data.length > 0 && onlyI.data.every((r) => r.kind === 'Inward'), 'type=Inward');
    const onlyE = await list('?type=Expense');
    check(onlyE.data.length > 0 && onlyE.data.every((r) => r.kind === 'Expense'), 'type=Expense');
    check((await list('?type=All')).data.length === after.data.length, 'type=All returns everything');
    const q1 = await list(`?q=${encodeURIComponent(TAG)}`);
    check(q1.data.length === 2, 'search finds the expense title and the supplier');
    check((await list(`?q=${encodeURIComponent(TAG + ' Supplier')}`)).data.length === 1, 'search by supplier only matches the inward');
    check((await list('?category=Supplements')).data.every((r) => r.category === 'Supplements') && (await list('?category=Supplements')).data.some((r) => r._id === inwId), 'category filter (shared across both kinds)');
    check((await list('?branch=Bandra')).data.every((r) => r.branch === 'Bandra'), 'branch filter');
    const range = await list('?from=2099-01-01&to=2099-12-31');
    check(range.data.length === 2, 'date range isolates the two new records');
    check(range.kpis.totalRecords === 2 && near(range.kpis.totalSpend, 8000), 'KPIs follow the filtered view (5000 + 3000)');
    check((await list('?from=2100-01-01')).data.length === 0, 'empty range → no rows');
    const combo = await list(`?type=Inward&q=${encodeURIComponent(TAG)}`);
    check(combo.data.length === 1 && combo.data[0].kind === 'Inward', 'filters combine (type + search)');

    console.log('\nTest 5: Edits made through the source APIs show up here');
    const upd = await request('PUT', `/api/accounts/expenses/${expId}`, { amount: 7500, title: `${TAG} Expense v2` });
    check(upd.status === 200, 'expense updated');
    const inwUpd = await request('PUT', `/api/accounts/stock-inward/${inwId}`, { payments: [{ mode: 'Bank Transfer', amount: 3000 }, { mode: 'Cash', amount: 0 }] });
    check(inwUpd.status === 200, 'inward updated (fully paid)');
    const re = await list(`?q=${encodeURIComponent(TAG)}`);
    const re1 = re.data.find((r) => r._id === expId);
    const re2 = re.data.find((r) => r._id === inwId);
    check(re1 && re1.amount === 7500 && re1.reference === `${TAG} Expense v2`, 'expense edit reflected');
    check(re2 && re2.status === 'Paid' && re2.balanceDue === 0 && re2.paymentMode === 'Bank Transfer', 'inward edit reflected (Paid, balance 0)');

    console.log('\nTest 6: Cancelled inward is excluded from KPIs but still listed');
    const i2 = await request('POST', '/api/accounts/stock-inward', {
      supplier: `${TAG} Cancelled`, date: '2099-02-01', category: 'Other',
      items: [{ description: 'x', quantity: 1, unitCost: 900 }], payments: []
    });
    inw2Id = i2.body.data._id;
    await request('PUT', `/api/accounts/stock-inward/${inw2Id}`, { status: 'Cancelled' });
    const canc = await list('?from=2099-02-01&to=2099-02-28');
    check(canc.data.length === 1 && canc.data[0].status === 'Cancelled', 'cancelled inward still appears in the list');
    check(canc.kpis.totalInward === 0 && canc.kpis.payable === 0, 'cancelled inward adds nothing to the totals');

    console.log('\nTest 7: Ledger side effects stay with the source modules');
    const journals = await JournalEntry.countDocuments({ sourceModule: { $in: ['Expenses', 'StockInward'] } });
    check(journals > 0, 'journal entries still posted for expenses / stock inward');
    check((await request('GET', '/api/accounts/dashboard')).status === 200, 'dashboard still loads');

    console.log('\nTest 8: Delete through the source APIs');
    check((await request('DELETE', `/api/accounts/expenses/${expId}`)).status === 200, 'expense deleted');
    check((await request('DELETE', `/api/accounts/stock-inward/${inwId}`)).status === 200, 'inward deleted');
    check((await request('DELETE', `/api/accounts/stock-inward/${inw2Id}`)).status === 200, 'cancelled inward deleted');
    const gone = await list(`?q=${encodeURIComponent(TAG)}`);
    check(gone.data.length === 0, 'combined list no longer shows them');
    const k1 = (await list()).kpis;
    check(near(k1.totalSpend, k0.totalSpend) && k1.totalRecords === k0.totalRecords, 'KPIs return to the baseline');
    expId = inwId = inw2Id = null;
    console.log('\n--- ALL INWARD & EXPENSE TESTS COMPLETE ---');
  } catch (error) {
    failed += 1;
    console.error('\n[TEST-FAILURE]', error);
  }
  const rx = new RegExp(`^${TAG}`);
  const stray = await StockInward.find({ supplier: rx });
  for (const s of stray) await JournalEntry.deleteMany({ sourceId: s._id.toString() });
  await StockInward.deleteMany({ supplier: rx });
  const strayE = await Expense.find({ title: rx });
  for (const x of strayE) await JournalEntry.deleteMany({ sourceId: x._id.toString() });
  await Expense.deleteMany({ title: rx });
  // Deleting through the API posts reversing entries (audit trail, net zero). Remove this run's
  // tagged journal pairs so repeated runs never pollute the ledger / balance sheet.
  {
    const tagRx = new RegExp(TAG);
    const mine = await JournalEntry.find({ description: tagRx }).select('_id reversedBy reversalOf');
    const ids = mine.flatMap((e) => [e._id, e.reversedBy, e.reversalOf].filter(Boolean));
    await JournalEntry.deleteMany({ $or: [{ description: tagRx }, { entryNumber: { $in: ids } }] });
  }
  console.log(`\nINWARD & EXPENSE TEST RESULT: ${passed} passed, ${failed} failed`);
  server.close();
  await disconnectDB();
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
