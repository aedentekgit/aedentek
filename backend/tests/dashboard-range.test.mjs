import http from 'node:http';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.PORT = '5100';

const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');

const PORT = 5100;
const BASE_URL = `http://localhost:${PORT}`;
let server;

function request(method, reqPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(new URL(reqPath, BASE_URL), { method }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} }));
    });
    req.on('error', reject);
    req.end();
  });
}

let passed = 0;
let failed = 0;
const check = (cond, label) => {
  if (cond) { passed += 1; console.log(`  ✓ ${label}`); } else { failed += 1; console.error(`  ✗ ${label}`); }
};
const near = (a, b) => Math.abs(a - b) < 0.011;

async function runTests() {
  console.log('--- STARTING DASHBOARD DATE-RANGE TESTS ---');
  await connectDB();
  server = app.listen(PORT, () => console.log(`[TEST-SERVER] Listening on ${BASE_URL}`));
  try {
    const dash = async (qs = '') => (await request('GET', `/api/accounts/dashboard${qs}`)).body.data;
    const expenses = (await request('GET', '/api/accounts/expenses')).body.data;
    const sumExp = (from, to) => expenses
      .filter((e) => (!from || e.date >= from) && (!to || e.date <= to))
      .reduce((s, e) => s + e.amount, 0);

    console.log('\nTest 1: No range = everything (unchanged behaviour)');
    const all = await dash();
    check(near(all.kpis.totalExpenses, sumExp()), `all-time expenses equal the sum of every expense (${all.kpis.totalExpenses})`);
    const open = await dash('?from=&to=');
    check(near(open.kpis.totalExpenses, all.kpis.totalExpenses), 'empty from/to behaves like no range');

    console.log('\nTest 2: Range windows the dated documents');
    const nov = await dash('?from=2026-11-01&to=2026-11-30');
    check(near(nov.kpis.totalExpenses, sumExp('2026-11-01', '2026-11-30')), `November expenses = ${sumExp('2026-11-01', '2026-11-30')} (${nov.kpis.totalExpenses})`);
    check(nov.kpis.totalExpenses < all.kpis.totalExpenses, 'a narrower range gives smaller expenses');
    check(nov.kpis.totalSales < all.kpis.totalSales, 'a narrower range gives smaller revenue (invoices windowed by invoice date)');
    const oct = await dash('?from=2026-10-01&to=2026-10-31');
    check(near(oct.kpis.totalExpenses, sumExp('2026-10-01', '2026-10-31')), `October expenses = ${sumExp('2026-10-01', '2026-10-31')}`);
    check(near(oct.kpis.totalExpenses + nov.kpis.totalExpenses, sumExp('2026-10-01', '2026-11-30')), 'adjacent months add up to the combined range');
    const fromOnly = await dash('?from=2026-11-01');
    check(near(fromOnly.kpis.totalExpenses, sumExp('2026-11-01', '')), 'from-only range (open-ended) works');
    const toOnly = await dash('?to=2026-10-31');
    check(near(toOnly.kpis.totalExpenses, sumExp('', '2026-10-31')), 'to-only range works');
    const none = await dash('?from=2030-01-01&to=2030-12-31');
    check(none.kpis.totalExpenses === 0 && none.kpis.totalSales === 0, 'a range with no records gives zero revenue and expenses');
    check(Array.isArray(none.expenseMix) && none.expenseMix.length === 0, 'expense mix is empty for an empty range');

    console.log('\nTest 3: Point-in-time figures are not windowed');
    check(near(nov.kpis.bankBalance, all.kpis.bankBalance) && near(nov.kpis.totalAssets, all.kpis.totalAssets), 'bank balance and fixed assets are unaffected by the range');
    check(near(none.kpis.bankBalance, all.kpis.bankBalance), 'bank balance stays even when the range is empty');

    console.log('\nTest 4: Pending counts follow the same window');
    check(nov.pending.expenses === expenses.filter((e) => e.date >= '2026-11-01' && e.date <= '2026-11-30').length, `expense count for November (${nov.pending.expenses})`);
    check(none.pending.expenses === 0, 'no expenses pending in an empty range');
    console.log('\n--- DASHBOARD RANGE TESTS COMPLETE ---');
  } catch (error) {
    failed += 1;
    console.error('\n[TEST-FAILURE]', error);
  }
  console.log(`\nDASHBOARD RANGE TEST RESULT: ${passed} passed, ${failed} failed`);
  server.close();
  await disconnectDB();
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
