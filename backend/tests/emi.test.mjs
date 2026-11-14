import http from 'node:http';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.PORT = '5098';

const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { default: Emi } = await import('../src/models/accounts/Emi.js');
const { computeEmi, addMonths, parseYmd, validateEmiInput, progressOf } = await import('../src/utils/emiEngine.js');

const PORT = 5098;
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
const near = (a, b, tol = 0.011) => Math.abs(a - b) <= tol;

const TAG = `QA-EMI-${Date.now()}`;

async function runTests() {
  console.log('--- STARTING EMI MODULE TESTS ---');
  await connectDB();
  server = app.listen(PORT, () => console.log(`[TEST-SERVER] Listening on ${BASE_URL}`));
  let id;
  try {
    // ============================================================ engine
    console.log('\nTest 1: EMI engine maths');
    const std = computeEmi({ principal: 100000, emiCount: 12, interestRate: 12, startDate: '2026-01-15' });
    check(near(std.emiAmount, 8884.88), `100000 @12% x12 → EMI 8884.88 (${std.emiAmount})`);
    check(near(std.totalPayable, 106618.53, 0.05), `total payable ≈ 106618.53 (${std.totalPayable})`);
    check(near(std.totalInterest, std.totalPayable - 100000, 0.005), 'total interest = payable − principal');
    check(std.schedule.length === 12, 'schedule has one row per EMI');
    check(std.schedule[11].balance === 0, 'closing balance is exactly 0');
    check(near(std.schedule.reduce((s, x) => s + x.principal, 0), 100000, 0.02), 'principal parts add back to the product amount');
    const zero = computeEmi({ principal: 1200, emiCount: 6, interestRate: 0, startDate: '2026-03-15' });
    check(zero.emiAmount === 200 && zero.totalInterest === 0, '0% interest → principal / n, no interest');
    check(computeEmi({ principal: 5000, emiCount: 1, interestRate: 10, startDate: '2026-03-15' }).schedule.length === 1, 'single-EMI plan works');

    console.log('\nTest 2: End date / end month calculation');
    check(std.endDate === '2026-12-15' && std.endMonth === '2026-12', 'start 15 Jan + 12 EMIs → ends 15 Dec 2026 (end month 2026-12)');
    check(std.durationMonths === 12, 'duration is the number of EMIs in months');
    check(addMonths('2026-01-31', 1) === '2026-02-28', 'month-end clamps (31 Jan + 1 → 28 Feb)');
    check(addMonths('2028-01-31', 1) === '2028-02-29', 'leap-year clamp (31 Jan 2028 + 1 → 29 Feb)');
    check(addMonths('2026-11-15', 2) === '2027-01-15', 'rolls over the year boundary');
    check(addMonths('2026-03-10', 0) === '2026-03-10', 'adding 0 months is a no-op');
    check(computeEmi({ principal: 1000, emiCount: 24, interestRate: 5, startDate: '2026-11-05' }).endDate === '2028-10-05', '24 EMIs from Nov 2026 → Oct 2028');
    check(parseYmd('2026-02-30') === null && parseYmd('garbage') === null, 'invalid dates are rejected');

    console.log('\nTest 3: Validation + progress rules');
    const base = { productName: 'X', category: 'Y', principal: 1000, emiCount: 6, interestRate: 5, startDate: '2026-03-01' };
    check(validateEmiInput(base).length === 0, 'valid input passes');
    check(validateEmiInput({ ...base, productName: ' ' }).length > 0, 'blank product rejected');
    check(validateEmiInput({ ...base, principal: 0 }).length > 0, 'zero amount rejected');
    check(validateEmiInput({ ...base, emiCount: 0 }).length > 0 && validateEmiInput({ ...base, emiCount: 2.5 }).length > 0, 'EMI count must be a whole number ≥ 1');
    check(validateEmiInput({ ...base, interestRate: 101 }).length > 0 && validateEmiInput({ ...base, interestRate: -1 }).length > 0, 'interest limited to 0–100');
    check(validateEmiInput({ ...base, startDate: '2026-13-01' }).length > 0, 'invalid start date rejected');
    check(validateEmiInput({ ...base, paidCount: 7 }).length > 0, 'paid count cannot exceed EMI count');
    check(progressOf({ ...base, paidCount: 0 }, '2026-03-01').status === 'Active', 'due today is still Active');
    check(progressOf({ ...base, paidCount: 0 }, '2026-03-02').status === 'Overdue', 'past next due date → Overdue');
    check(progressOf({ ...base, paidCount: 6 }, '2030-01-01').status === 'Completed', 'all EMIs paid → Completed');

    // ============================================================ API
    console.log('\nTest 4: Seed + list');
    const list = await request('GET', '/api/accounts/emi');
    check(list.status === 200 && list.body.success && list.body.data.length >= 3, 'GET /api/accounts/emi returns seeded plans');
    check(list.body.kpis && ['totalPlans', 'activeEmis', 'monthlyOutflow', 'outstanding'].every((k) => k in list.body.kpis), 'KPI payload present');
    const first = list.body.data[0];
    check(['emiAmount', 'endDate', 'endMonth', 'totalPayable', 'outstandingAmount', 'status'].every((k) => k in first), 'rows carry derived fields');

    console.log('\nTest 5: Create (auto-calculation on the server)');
    const created = await request('POST', '/api/accounts/emi', {
      productName: `${TAG} Cross Trainer`, category: 'Gym Equipment', principal: 60000, emiCount: 6,
      interestRate: 12, startDate: '2026-12-01', branch: 'Bandra', notes: 'qa'
    });
    check(created.status === 201 && created.body.success, 'POST returns 201');
    id = created.body.data._id;
    const c = created.body.data;
    const expected = computeEmi({ principal: 60000, emiCount: 6, interestRate: 12, startDate: '2026-12-01' });
    check(/^EMI-\d{6}$/.test(c.emiNumber), `EMI number generated (${c.emiNumber})`);
    check(near(c.emiAmount, expected.emiAmount), `monthly EMI computed (${c.emiAmount})`);
    check(c.endDate === '2027-05-01' && c.endMonth === '2027-05', 'end date/month computed automatically (1 Dec 2026 + 6 EMIs → May 2027)');
    check(near(c.totalPayable, expected.totalPayable, 0.02) && near(c.totalInterest, c.totalPayable - 60000, 0.02), 'totals computed');
    check(c.paidCount === 0 && c.status === 'Active' && c.nextDueDate === '2026-12-01', 'new plan is Active, next due = start date');
    check(near(c.outstandingAmount, c.totalPayable, 0.02), 'outstanding equals total payable before any payment');
    const clientNumbers = await request('POST', '/api/accounts/emi', {
      productName: `${TAG} Fake`, category: 'Other', principal: 1000, emiCount: 3, interestRate: 0, startDate: '2026-12-01',
      emiAmount: 1, endDate: '1999-01-01', totalPayable: 5
    });
    check(clientNumbers.body.data.emiAmount !== 1 && clientNumbers.body.data.endDate !== '1999-01-01', 'client-supplied derived values are ignored');
    await request('DELETE', `/api/accounts/emi/${clientNumbers.body.data._id}`);

    console.log('\nTest 6: Create validation');
    for (const [label, patch] of [
      ['missing product name', { productName: '' }], ['missing category', { category: '' }],
      ['zero amount', { principal: 0 }], ['zero EMIs', { emiCount: 0 }], ['fractional EMIs', { emiCount: 2.5 }],
      ['rate over 100', { interestRate: 150 }], ['bad start date', { startDate: 'soon' }]
    ]) {
      const r = await request('POST', '/api/accounts/emi', { productName: 'A', category: 'B', principal: 1000, emiCount: 3, interestRate: 5, startDate: '2026-12-01', ...patch });
      check(r.status === 400 && r.body.success === false, `${label} → 400`);
    }

    console.log('\nTest 7: Calculate preview endpoint');
    const calc = await request('POST', '/api/accounts/emi/calculate', { productName: 'p', category: 'c', principal: 100000, emiCount: 12, interestRate: 12, startDate: '2026-01-15' });
    check(calc.status === 200 && near(calc.body.data.emiAmount, 8884.88) && calc.body.data.endMonth === '2026-12', 'calculate returns EMI and end month');
    check((await request('POST', '/api/accounts/emi/calculate', { principal: -1 })).status === 400, 'calculate validates input');
    check((await Emi.countDocuments({ productName: 'p' })) === 0, 'calculate saves nothing');

    console.log('\nTest 8: Read one (with schedule)');
    const one = await request('GET', `/api/accounts/emi/${id}`);
    check(one.status === 200 && one.body.data.schedule.length === 6, 'GET by id includes the 6-row schedule');
    check(one.body.data.schedule[0].dueDate === '2026-12-01' && one.body.data.schedule[5].dueDate === '2027-05-01', 'schedule dates run month by month');
    check((await request('GET', '/api/accounts/emi/000000000000000000000000')).status === 404, 'unknown id → 404');

    console.log('\nTest 9: Filters + search');
    check((await request('GET', `/api/accounts/emi?q=${encodeURIComponent(TAG)}`)).body.data.some((d) => d._id === id), 'search by product name');
    const byCat = await request('GET', '/api/accounts/emi?category=Gym%20Equipment');
    check(byCat.body.data.length > 0 && byCat.body.data.every((d) => d.category === 'Gym Equipment'), 'category filter');
    const byBranch = await request('GET', '/api/accounts/emi?branch=Bandra');
    check(byBranch.body.data.length > 0 && byBranch.body.data.every((d) => d.branch === 'Bandra'), 'branch filter');
    const overdue = await request('GET', '/api/accounts/emi?status=Overdue');
    check(overdue.body.data.every((d) => d.status === 'Overdue'), 'status filter (Overdue)');

    console.log('\nTest 10: Update recalculates');
    const upd = await request('PUT', `/api/accounts/emi/${id}`, { emiCount: 12, interestRate: 0 });
    check(upd.status === 200 && upd.body.data.emiAmount === 5000, '12 EMIs at 0% → 5000 / month');
    check(upd.body.data.endDate === '2027-11-01' && upd.body.data.endMonth === '2027-11', 'end month recalculated (→ Nov 2027)');
    check(upd.body.data.totalInterest === 0, 'total interest recalculated');
    const upd2 = await request('PUT', `/api/accounts/emi/${id}`, { startDate: '2027-01-31' });
    check(upd2.body.data.endDate === '2027-12-31', 'changing start date moves the end date');
    check((await request('PUT', `/api/accounts/emi/${id}`, { emiCount: -4 })).status === 400, 'update validates');
    check((await request('PUT', `/api/accounts/emi/${id}`, { paidCount: 99 })).status === 400, 'paid count above EMI count rejected');
    check((await request('PUT', '/api/accounts/emi/000000000000000000000000', { notes: 'x' })).status === 404, 'update unknown id → 404');

    console.log('\nTest 11: Pay instalments');
    const small = await request('POST', '/api/accounts/emi', { productName: `${TAG} Small`, category: 'Other', principal: 3000, emiCount: 3, interestRate: 0, startDate: '2026-01-01' });
    const sid = small.body.data._id;
    check(small.body.data.status === 'Overdue', 'plan whose next due date has passed is Overdue');
    const p1 = await request('POST', `/api/accounts/emi/${sid}/pay`);
    check(p1.status === 200 && p1.body.data.paidCount === 1 && p1.body.data.outstandingAmount === 2000, 'paying 1st EMI → outstanding 2000');
    check(p1.body.data.nextDueDate === '2026-02-01', 'next due date advances');
    await request('POST', `/api/accounts/emi/${sid}/pay`);
    const p3 = await request('POST', `/api/accounts/emi/${sid}/pay`);
    check(p3.body.data.status === 'Completed' && p3.body.data.outstandingAmount === 0 && p3.body.data.nextDueDate === null, 'final EMI → Completed, outstanding 0');
    check((await request('POST', `/api/accounts/emi/${sid}/pay`)).status === 409, 'paying a completed plan → 409');
    check((await request('POST', '/api/accounts/emi/000000000000000000000000/pay')).status === 404, 'pay unknown id → 404');
    await request('DELETE', `/api/accounts/emi/${sid}`);

    console.log('\nTest 12: KPIs + dashboard integration');
    const k = (await request('GET', '/api/accounts/emi')).body.kpis;
    check(k.totalPlans >= 4 && k.monthlyOutflow > 0 && k.outstanding > 0, 'KPIs reflect all plans');
    const dash = await request('GET', '/api/accounts/dashboard');
    check(dash.status === 200 && typeof dash.body.data.pending.activeEmis === 'number', 'dashboard exposes running-EMI count');
    check((await request('GET', '/api/accounts/stock-inward')).status === 200, 'legacy stock-inward API still works (ledger/sales unaffected)');

    console.log('\nTest 13: Delete');
    const del = await request('DELETE', `/api/accounts/emi/${id}`);
    check(del.status === 200 && del.body.success, 'DELETE succeeds');
    check((await request('GET', `/api/accounts/emi/${id}`)).status === 404, 'record is gone');
    check((await request('DELETE', `/api/accounts/emi/${id}`)).status === 404, 'second delete → 404');
    id = null;
    console.log('\n--- ALL EMI TESTS COMPLETE ---');
  } catch (error) {
    failed += 1;
    console.error('\n[TEST-FAILURE]', error);
  }
  await Emi.deleteMany({ productName: new RegExp(`^${TAG}`) });
  console.log(`\nEMI TEST RESULT: ${passed} passed, ${failed} failed`);
  server.close();
  await disconnectDB();
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
