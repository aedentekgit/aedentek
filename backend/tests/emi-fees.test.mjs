import http from 'node:http';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.PORT = '5101';

const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { default: Emi } = await import('../src/models/accounts/Emi.js');
const { computeEmi, validateEmiInput, progressOf } = await import('../src/utils/emiEngine.js');

const PORT = 5101;
const BASE_URL = `http://localhost:${PORT}`;
let server;

function request(method, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(new URL(reqPath, BASE_URL), { method, headers: { 'Content-Type': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} }));
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
const TAG = `QA-FEE-${Date.now()}`;
const base = { category: 'Gym Equipment', principal: 60000, emiCount: 6, interestRate: 12, startDate: '2099-01-10', branch: 'Bandra' };

async function runTests() {
  console.log('--- STARTING EMI PROCESSING-CHARGES / TRANSACTION-FEE TESTS ---');
  await connectDB();
  server = app.listen(PORT, () => console.log(`[TEST-SERVER] Listening on ${BASE_URL}`));
  const ids = [];
  try {
    // ============================================================ engine
    console.log('\nTest 1: Engine — charges on top of the instalments');
    const plain = computeEmi({ principal: 60000, emiCount: 6, interestRate: 12, startDate: '2099-01-10' });
    const withFees = computeEmi({ principal: 60000, emiCount: 6, interestRate: 12, startDate: '2099-01-10', processingCharges: 1200, transactionFee: 50 });
    check(plain.processingCharges === 0 && plain.transactionFee === 0 && plain.totalCharges === 0, 'no fees given → all charge figures are 0');
    check(plain.totalCost === plain.totalPayable && plain.monthlyOutflow === plain.emiAmount, 'without fees total cost = total payable and outflow = EMI');
    check(withFees.emiAmount === plain.emiAmount && withFees.endDate === plain.endDate && withFees.totalInterest === plain.totalInterest, 'fees never change the EMI, end date or interest');
    check(withFees.totalFees === 300 && withFees.totalCharges === 1500, `transaction fees 50 × 6 = 300; total charges 1200 + 300 = 1500 (${withFees.totalCharges})`);
    check(near(withFees.totalCost, plain.totalPayable + 1500), `total cost = total payable + charges (${withFees.totalCost})`);
    check(near(withFees.monthlyOutflow, plain.emiAmount + 50), `monthly outflow = EMI + transaction fee (${withFees.monthlyOutflow})`);
    check(withFees.schedule.every((r) => r.fee === 50 && near(r.total, r.emi + 50)), 'every schedule row carries the fee and a total (EMI + fee)');
    check(computeEmi({ principal: 1000, emiCount: 3, interestRate: 0, startDate: '2099-01-10', processingCharges: '10.555', transactionFee: '0.005' }).processingCharges === 10.56, 'amounts are rounded to 2 decimals');
    check(computeEmi({ principal: 1000, emiCount: 3, interestRate: 0, startDate: '2099-01-10', processingCharges: -5, transactionFee: 'abc' }).totalCharges === 0, 'negative or non-numeric values are treated as 0 inside the maths');

    console.log('\nTest 2: Validation');
    const v = (patch) => validateEmiInput({ productName: 'x', ...base, ...patch });
    check(v({}).length === 0, 'plans without the new fields are valid');
    check(v({ processingCharges: 0, transactionFee: 0 }).length === 0, 'zero fees are valid');
    check(v({ processingCharges: '', transactionFee: '' }).length === 0, 'blank fees are valid (treated as 0)');
    check(v({ processingCharges: -1 }).some((e) => /Processing charges/.test(e)), 'negative processing charges rejected');
    check(v({ transactionFee: -0.5 }).some((e) => /Transaction fee/.test(e)), 'negative transaction fee rejected');
    check(v({ processingCharges: 'abc' }).length > 0 && v({ transactionFee: 'x1' }).length > 0, 'non-numeric fees rejected');
    check(v({ processingCharges: 2e9 }).length > 0, 'absurdly large fee rejected');

    console.log('\nTest 3: Progress with fees');
    const plan = { ...base, paidCount: 2, processingCharges: 1200, transactionFee: 50 };
    const pr = progressOf(plan, '2098-01-01');
    check(near(pr.outstandingFees, 200), `outstanding fees = 50 × 4 remaining (${pr.outstandingFees})`);
    const whole = computeEmi(plan);
    const emis = whole.schedule.reduce((s, r) => s + r.emi, 0);
    const paidEmis = whole.schedule.slice(0, 2).reduce((s, r) => s + r.emi, 0);
    check(near(pr.outstandingAmount, emis - paidEmis + 200), `outstanding = remaining EMIs + remaining fees (${pr.outstandingAmount})`);

    // ============================================================ API — CREATE
    console.log('\nTest 4: CREATE');
    const c = await request('POST', '/api/accounts/emi', { ...base, productName: `${TAG} A`, processingCharges: 1200, transactionFee: 50, notes: 'fees' });
    check(c.status === 201 && c.body.success, 'POST with fees → 201');
    const a = c.body.data;
    ids.push(a._id);
    check(a.processingCharges === 1200 && a.transactionFee === 50, 'both fees are stored');
    check(a.totalFees === 300 && a.totalCharges === 1500, `derived: transaction fees 300, total charges 1500 (${a.totalFees}/${a.totalCharges})`);
    check(near(a.totalCost, a.totalPayable + 1500) && near(a.monthlyOutflow, a.emiAmount + 50), 'derived: total cost and monthly outflow');
    check(near(a.outstandingAmount, a.totalPayable + 300), `a new plan owes all EMIs + all transaction fees (${a.outstandingAmount})`);
    const noFees = await request('POST', '/api/accounts/emi', { ...base, productName: `${TAG} B` });
    ids.push(noFees.body.data._id);
    check(noFees.status === 201 && noFees.body.data.processingCharges === 0 && noFees.body.data.transactionFee === 0 && noFees.body.data.totalCharges === 0, 'omitting the fees stores 0 / 0');
    const blank = await request('POST', '/api/accounts/emi', { ...base, productName: `${TAG} C`, processingCharges: '', transactionFee: '' });
    ids.push(blank.body.data._id);
    check(blank.status === 201 && blank.body.data.processingCharges === 0 && blank.body.data.transactionFee === 0, 'blank fees store 0 / 0');
    const strings = await request('POST', '/api/accounts/emi', { ...base, productName: `${TAG} D`, processingCharges: '750.5', transactionFee: '12.25' });
    ids.push(strings.body.data._id);
    check(strings.body.data.processingCharges === 750.5 && strings.body.data.transactionFee === 12.25, 'numeric strings (as sent by a form) are accepted');
    const neg = await request('POST', '/api/accounts/emi', { ...base, productName: `${TAG} E`, processingCharges: -10 });
    check(neg.status === 400 && /Processing charges/.test(neg.body.message), `negative processing charges → 400 (${neg.body.message})`);
    const neg2 = await request('POST', '/api/accounts/emi', { ...base, productName: `${TAG} F`, transactionFee: -1 });
    check(neg2.status === 400 && /Transaction fee/.test(neg2.body.message), 'negative transaction fee → 400');
    const nan = await request('POST', '/api/accounts/emi', { ...base, productName: `${TAG} G`, transactionFee: 'free' });
    check(nan.status === 400, 'non-numeric fee → 400');
    check((await Emi.countDocuments({ productName: new RegExp(`^${TAG} [EFG]`) })) === 0, 'rejected requests save nothing');

    // ============================================================ READ
    console.log('\nTest 5: READ');
    const list = await request('GET', `/api/accounts/emi?q=${encodeURIComponent(TAG)}`);
    const row = list.body.data.find((d) => d._id === a._id);
    check(row && row.processingCharges === 1200 && row.transactionFee === 50 && row.totalCharges === 1500, 'list rows include both fees and the charge totals');
    const one = await request('GET', `/api/accounts/emi/${a._id}`);
    check(one.status === 200 && one.body.data.schedule.length === 6 && one.body.data.schedule.every((r) => r.fee === 50), 'GET by id: schedule shows the fee on every instalment');
    check(near(one.body.data.schedule[0].total, one.body.data.schedule[0].emi + 50), 'GET by id: schedule row total = EMI + fee');
    const k = (await request('GET', '/api/accounts/emi')).body.kpis;
    check(typeof k.totalCharges === 'number' && k.totalCharges >= 1500 + 750.5 + 12.25 * 6, `KPIs expose total charges across plans (${k.totalCharges})`);
    const all = (await request('GET', '/api/accounts/emi')).body;
    const open = all.data.filter((d) => d.status !== 'Completed');
    check(near(all.kpis.monthlyOutflow, open.reduce((s, d) => s + d.emiAmount + d.transactionFee, 0)), 'monthly outflow KPI includes transaction fees');

    // ============================================================ CALCULATE
    console.log('\nTest 6: CALCULATE preview');
    const calc = await request('POST', '/api/accounts/emi/calculate', { ...base, productName: 'p', processingCharges: 1200, transactionFee: 50 });
    check(calc.status === 200 && calc.body.data.totalCharges === 1500 && near(calc.body.data.totalCost, a.totalCost) && calc.body.data.schedule.length === 6, 'preview returns the same charges and cost as a saved plan');
    check((await request('POST', '/api/accounts/emi/calculate', { ...base, productName: 'p', transactionFee: -2 })).status === 400, 'preview validates the fees too');

    // ============================================================ UPDATE
    console.log('\nTest 7: UPDATE');
    const up1 = await request('PUT', `/api/accounts/emi/${a._id}`, { transactionFee: 100 });
    check(up1.status === 200 && up1.body.data.transactionFee === 100 && up1.body.data.processingCharges === 1200, 'update only the transaction fee; processing charges untouched');
    check(up1.body.data.totalFees === 600 && up1.body.data.totalCharges === 1800, `totals recalculated (fees 600, charges 1800: ${up1.body.data.totalCharges})`);
    check(up1.body.data.emiAmount === a.emiAmount && up1.body.data.endDate === a.endDate, 'EMI amount and end date unchanged by a fee edit');
    const up2 = await request('PUT', `/api/accounts/emi/${a._id}`, { processingCharges: 0, transactionFee: 0 });
    check(up2.body.data.totalCharges === 0 && near(up2.body.data.totalCost, up2.body.data.totalPayable), 'setting both fees to 0 clears the charges');
    const up3 = await request('PUT', `/api/accounts/emi/${a._id}`, { processingCharges: 3000, transactionFee: 25, emiCount: 12, interestRate: 0 });
    check(up3.body.data.totalCharges === 3000 + 25 * 12 && up3.body.data.emiAmount === 5000, 'fees and plan terms can be changed together (12 EMIs × 25 + 3000 = 3300)');
    const up4 = await request('PUT', `/api/accounts/emi/${a._id}`, { notes: 'only a note' });
    check(up4.body.data.processingCharges === 3000 && up4.body.data.transactionFee === 25 && up4.body.data.notes === 'only a note', 'editing an unrelated field keeps the fees');
    const bad = await request('PUT', `/api/accounts/emi/${a._id}`, { transactionFee: -5 });
    check(bad.status === 400, 'negative fee on update → 400');
    check((await request('GET', `/api/accounts/emi/${a._id}`)).body.data.transactionFee === 25, 'the rejected update changed nothing');
    check((await request('PUT', '/api/accounts/emi/000000000000000000000000', { transactionFee: 1 })).status === 404, 'update of an unknown id → 404');

    // ============================================================ PAY
    console.log('\nTest 8: Paying instalments with fees');
    const p = await request('POST', '/api/accounts/emi', { ...base, productName: `${TAG} Pay`, principal: 3000, emiCount: 3, interestRate: 0, startDate: '2026-01-01', processingCharges: 90, transactionFee: 10 });
    const pid = p.body.data._id;
    ids.push(pid);
    check(p.body.data.outstandingAmount === 3030, 'new plan outstanding = 3000 + 3 × 10 fees');
    const p1 = await request('POST', `/api/accounts/emi/${pid}/pay`);
    check(p1.body.data.outstandingAmount === 2020 && p1.body.data.outstandingFees === 20, 'after the 1st payment: 2000 + 2 × 10 = 2020');
    await request('POST', `/api/accounts/emi/${pid}/pay`);
    const p3 = await request('POST', `/api/accounts/emi/${pid}/pay`);
    check(p3.body.data.status === 'Completed' && p3.body.data.outstandingAmount === 0 && p3.body.data.outstandingFees === 0, 'last payment → Completed, nothing outstanding');
    check(p3.body.data.totalCharges === 120 && p3.body.data.totalCost === 3120, 'completed plan still reports its total cost (3000 + 90 + 30 = 3120)');

    // ============================================================ legacy records
    console.log('\nTest 9: Older records without the new fields');
    const legacy = await Emi.collection.insertOne({
      emiNumber: `LEG-${Date.now()}`, productName: `${TAG} Legacy`, category: 'Other', principal: 1200, emiCount: 6, interestRate: 0,
      startDate: '2099-02-01', paidCount: 0, branch: 'All Branches', notes: '', emiAmount: 200, totalPayable: 1200, totalInterest: 0,
      endDate: '2099-07-01', endMonth: '2099-07', durationMonths: 6, createdAt: new Date(), updatedAt: new Date()
    });
    const lid = legacy.insertedId.toString();
    const lr = await request('GET', `/api/accounts/emi/${lid}`);
    check(lr.status === 200 && lr.body.data.processingCharges === 0 && lr.body.data.transactionFee === 0 && lr.body.data.totalCharges === 0 && lr.body.data.totalCost === 1200, 'a record saved before this change reads back with 0 / 0 and the right cost');
    const lu = await request('PUT', `/api/accounts/emi/${lid}`, { processingCharges: 60, transactionFee: 5 });
    check(lu.status === 200 && lu.body.data.totalCharges === 90 && lu.body.data.totalCost === 1290, 'it can be edited to add fees (60 + 5 × 6 = 90)');
    ids.push(lid);

    // ============================================================ DELETE
    console.log('\nTest 10: DELETE');
    for (const id of ids) {
      const d = await request('DELETE', `/api/accounts/emi/${id}`);
      check(d.status === 200 && d.body.success, `deleted ${id.slice(-6)}`);
    }
    check((await request('GET', `/api/accounts/emi/${a._id}`)).status === 404, 'deleted plan is gone');
    check((await request('DELETE', `/api/accounts/emi/${a._id}`)).status === 404, 'second delete → 404');
    check((await request('GET', `/api/accounts/emi?q=${encodeURIComponent(TAG)}`)).body.data.length === 0, 'no test records left');
    console.log('\n--- ALL EMI FEE TESTS COMPLETE ---');
  } catch (error) {
    failed += 1;
    console.error('\n[TEST-FAILURE]', error);
  }
  await Emi.deleteMany({ productName: new RegExp(`^${TAG}`) });
  console.log(`\nEMI FEES TEST RESULT: ${passed} passed, ${failed} failed`);
  server.close();
  await disconnectDB();
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
