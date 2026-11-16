import http from 'node:http';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.PORT = '5102';

const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { default: Emi } = await import('../src/models/accounts/Emi.js');
const { computeEmi, validateEmiInput, progressOf } = await import('../src/utils/emiEngine.js');

const PORT = 5102;
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
const TAG = `QA-DATE-${Date.now()}`;
const base = { category: 'Gym Equipment', principal: 120000, emiCount: 12, interestRate: 10, startDate: '2026-09-01', branch: 'Bandra' };

async function runTests() {
  console.log('--- STARTING EMI DATE CRUD & ENGINE TESTS ---');
  await connectDB();
  server = app.listen(PORT, () => console.log(`[TEST-SERVER] Listening on ${BASE_URL}`));
  const ids = [];
  try {
    // ============================================================ 1. ENGINE
    console.log('\nTest 1: Engine — emiDate drives schedule and end date');
    const withEmiDate = computeEmi({ ...base, emiDate: '2026-10-05' });
    check(withEmiDate.emiDate === '2026-10-05', `computed payload exposes emiDate (${withEmiDate.emiDate})`);
    check(withEmiDate.schedule[0].dueDate === '2026-10-05', `first instalment falls due on emiDate 2026-10-05 (${withEmiDate.schedule[0].dueDate})`);
    check(withEmiDate.schedule[1].dueDate === '2026-11-05', `second instalment is one calendar month later (${withEmiDate.schedule[1].dueDate})`);
    check(withEmiDate.endDate === '2027-09-05' && withEmiDate.endMonth === '2027-09', `endDate is 2027-09-05 (12 instalments from Oct 2026)`);

    const fallback = computeEmi({ ...base, emiDate: '' });
    check(fallback.emiDate === '2026-09-01', 'omitted/blank emiDate falls back to startDate');
    check(fallback.schedule[0].dueDate === '2026-09-01', 'schedule starts on startDate when emiDate omitted');
    check(fallback.endDate === '2027-08-01', 'endDate computed from startDate fallback');

    // ============================================================ 2. VALIDATION
    console.log('\nTest 2: Validation — YYYY-MM-DD check');
    check(validateEmiInput({ productName: 'x', ...base, emiDate: '2026-10-05' }).length === 0, 'valid emiDate passes validation');
    check(validateEmiInput({ productName: 'x', ...base, emiDate: '' }).length === 0, 'blank emiDate passes (falls back)');
    check(validateEmiInput({ productName: 'x', ...base, emiDate: undefined }).length === 0, 'undefined emiDate passes (falls back)');
    const badDate = validateEmiInput({ productName: 'x', ...base, emiDate: 'invalid-date' });
    check(badDate.some((e) => /EMI date/.test(e)), `non-date emiDate rejected: ${badDate.join('; ')}`);
    const badDay = validateEmiInput({ productName: 'x', ...base, emiDate: '2026-02-31' });
    check(badDay.some((e) => /EMI date/.test(e)), 'calendar invalid date (Feb 31) rejected');

    // ============================================================ 3. PROGRESS
    console.log('\nTest 3: Progress & Next Due Date');
    const pr = progressOf({ ...base, emiDate: '2099-05-15', paidCount: 0 }, '2026-11-15');
    check(pr.nextDueDate === '2099-05-15', `nextDueDate is emiDate for unpaid plan (${pr.nextDueDate})`);
    check(pr.status === 'Active', 'future emiDate → Active status');

    // ============================================================ 4. CREATE
    console.log('\nTest 4: CREATE (POST /api/accounts/emi)');
    const c1 = await request('POST', '/api/accounts/emi', {
      ...base,
      productName: `${TAG} Custom EMI Date`,
      emiDate: '2026-10-10',
      notes: 'Custom debit date'
    });
    check(c1.status === 201 && c1.body.success, 'POST with custom emiDate → 201 Created');
    const p1 = c1.body.data;
    ids.push(p1._id);
    check(p1.startDate === '2026-09-01' && p1.emiDate === '2026-10-10', `stored startDate=2026-09-01 and emiDate=2026-10-10`);
    check(p1.nextDueDate === '2026-10-10', `nextDueDate matches emiDate (${p1.nextDueDate})`);
    check(p1.endDate === '2027-09-10' && p1.endMonth === '2027-09', `endDate reflects emiDate schedule: ${p1.endDate}`);

    const c2 = await request('POST', '/api/accounts/emi', {
      ...base,
      productName: `${TAG} Default EMI Date`
    });
    check(c2.status === 201 && c2.body.success, 'POST without emiDate → 201 Created');
    const p2 = c2.body.data;
    ids.push(p2._id);
    check(p2.emiDate === p2.startDate, `omitted emiDate defaulted to startDate (${p2.emiDate})`);

    const cBad = await request('POST', '/api/accounts/emi', {
      ...base,
      productName: `${TAG} Bad Date`,
      emiDate: '99-99-99'
    });
    check(cBad.status === 400 && /EMI date/.test(cBad.body.message), `invalid emiDate rejected with 400 (${cBad.body.message})`);

    // ============================================================ 5. READ
    console.log('\nTest 5: READ (GET /api/accounts/emi and GET /api/accounts/emi/:id)');
    const listRes = await request('GET', `/api/accounts/emi?q=${encodeURIComponent(TAG)}`);
    check(listRes.status === 200 && listRes.body.success, 'GET list → 200');
    const row = listRes.body.data.find((d) => d._id === p1._id);
    check(row && row.emiDate === '2026-10-10', `list item contains emiDate (${row?.emiDate})`);

    const getRes = await request('GET', `/api/accounts/emi/${p1._id}`);
    check(getRes.status === 200 && getRes.body.data.emiDate === '2026-10-10', `GET single contains emiDate`);
    check(getRes.body.data.schedule.length === 12 && getRes.body.data.schedule[0].dueDate === '2026-10-10', 'schedule first instalment is emiDate');
    check(getRes.body.data.schedule[11].dueDate === '2027-09-10', 'schedule final instalment matches endDate');

    // ============================================================ 6. PREVIEW
    console.log('\nTest 6: CALCULATE Preview (POST /api/accounts/emi/calculate)');
    const prev = await request('POST', '/api/accounts/emi/calculate', {
      ...base,
      productName: 'Preview test',
      emiDate: '2026-10-25'
    });
    check(prev.status === 200 && prev.body.data.emiDate === '2026-10-25', 'calculate preview returns emiDate');
    check(prev.body.data.schedule[0].dueDate === '2026-10-25', 'preview schedule reflects emiDate');
    check(prev.body.data.endDate === '2027-09-25', 'preview endDate matches emiDate + 11 months');

    // ============================================================ 7. UPDATE
    console.log('\nTest 7: UPDATE (PUT /api/accounts/emi/:id)');
    const upd = await request('PUT', `/api/accounts/emi/${p1._id}`, {
      emiDate: '2026-10-20'
    });
    check(upd.status === 200 && upd.body.success, 'PUT update emiDate → 200');
    check(upd.body.data.emiDate === '2026-10-20', `updated emiDate stored (${upd.body.data.emiDate})`);
    check(upd.body.data.nextDueDate === '2026-10-20', `nextDueDate updated to 2026-10-20`);
    check(upd.body.data.endDate === '2027-09-20', `endDate recalculated to 2027-09-20`);

    const updBad = await request('PUT', `/api/accounts/emi/${p1._id}`, {
      emiDate: 'bad-date-string'
    });
    check(updBad.status === 400 && /EMI date/.test(updBad.body.message), 'bad emiDate on PUT rejected with 400');

    // Verify update on other fields retains emiDate
    const updNotes = await request('PUT', `/api/accounts/emi/${p1._id}`, {
      notes: 'Updated notes only'
    });
    check(updNotes.body.data.emiDate === '2026-10-20', 'updating notes retains previously set emiDate');

    // ============================================================ 8. DELETE
    console.log('\nTest 8: DELETE (DELETE /api/accounts/emi/:id)');
    for (const id of ids) {
      const del = await request('DELETE', `/api/accounts/emi/${id}`);
      check(del.status === 200 && del.body.success, `DELETE plan ${id.slice(-6)} → 200`);
      const verifyGone = await request('GET', `/api/accounts/emi/${id}`);
      check(verifyGone.status === 404, `plan ${id.slice(-6)} confirmed deleted (404)`);
    }

    console.log('\n--- ALL EMI DATE TESTS COMPLETE ---');
  } catch (error) {
    failed += 1;
    console.error('\n[TEST-FAILURE]', error);
  } finally {
    await Emi.deleteMany({ productName: new RegExp(`^${TAG}`) });
    console.log(`\nEMI DATE TEST RESULT: ${passed} passed, ${failed} failed`);
    await disconnectDB();
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
