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
process.env.PORT = '5097';

const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { default: Branch } = await import('../src/models/Branch.js');
const { default: Staff } = await import('../src/models/Staff.js');
const { default: LeaveType } = await import('../src/models/LeaveType.js');

const PORT = 5097;
const BASE_URL = `http://localhost:${PORT}`;

let server;

function request(method, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let passed = 0;
let failed = 0;
const check = (condition, label) => {
  if (condition) { passed += 1; console.log(`  ✓ ${label}`); }
  else { failed += 1; console.error(`  ✗ ${label}`); }
};

const stamp = Date.now();
const N1 = `QA Branch ${stamp}`;
const N2 = `QA Renamed ${stamp}`;

async function runTests() {
  console.log('--- STARTING HR BRANCH MASTER INTEGRATION TESTS ---');
  await connectDB();
  server = app.listen(PORT, () => console.log(`[TEST-SERVER] Listening on ${BASE_URL}`));
  let id; let staffId;
  try {
    console.log('\nTest 1: Seed + list');
    const list = await request('GET', '/api/hr/branches');
    check(list.status === 200 && list.body.success, 'GET /api/hr/branches returns 200');
    check(Array.isArray(list.body.data) && list.body.data.length >= 2, 'seeded branches are present');
    check(list.body.data.some((b) => b.name === 'Bandra') && list.body.data.some((b) => b.name === 'Andheri'), 'Bandra and Andheri are seeded');
    check(list.body.kpis && list.body.kpis.total >= 2 && list.body.kpis.active >= 2, 'KPI payload has total/active/inactive');
    check(typeof list.body.data[0].staffCount === 'number', 'each branch carries a staffCount');

    console.log('\nTest 2: Create');
    const created = await request('POST', '/api/hr/branches', { name: N1, code: 'qa1', city: 'Pune', manager: 'Test Manager', email: 'QA@Example.com' });
    check(created.status === 201 && created.body.success, 'POST creates a branch (201)');
    id = created.body.data && created.body.data._id;
    check(created.body.data.code === 'QA1', 'code is upper-cased');
    check(created.body.data.email === 'qa@example.com', 'email is lower-cased');
    check(created.body.data.status === 'Active', 'status defaults to Active');
    const noName = await request('POST', '/api/hr/branches', { city: 'X' });
    check(noName.status >= 400 && noName.body.success === false, 'name is required (validation error)');
    const dup = await request('POST', '/api/hr/branches', { name: N1 });
    check(dup.status === 409, 'duplicate name is rejected with 409');
    const badStatus = await request('POST', '/api/hr/branches', { name: `${N1} x`, status: 'Bogus' });
    check(badStatus.status >= 400, 'invalid status is rejected');

    console.log('\nTest 3: Read');
    const one = await request('GET', `/api/hr/branches/${id}`);
    check(one.status === 200 && one.body.data.name === N1, 'GET by id returns the branch');
    const missing = await request('GET', '/api/hr/branches/000000000000000000000000');
    check(missing.status === 404, 'unknown id returns 404');
    const search = await request('GET', `/api/hr/branches?q=${encodeURIComponent(N1)}`);
    check(search.body.data.length === 1, 'search by name filters the list');
    const byCity = await request('GET', '/api/hr/branches?q=Pune');
    check(byCity.body.data.some((b) => b._id === id), 'search by city works');

    console.log('\nTest 4: Dropdown options + Default branch');
    let opts = await request('GET', '/api/hr/branches/options');
    check(opts.status === 200 && opts.body.data.includes(N1), 'active branch appears in /options');
    check(opts.body.defaultBranch && typeof opts.body.defaultBranch === 'string', 'defaultBranch is provided in /options');
    
    // Set this branch as default
    const setDef = await request('PUT', `/api/hr/branches/${id}/default`);
    check(setDef.status === 200 && setDef.body.data.isDefault === true, 'PUT /api/hr/branches/:id/default sets isDefault');
    opts = await request('GET', '/api/hr/branches/options');
    check(opts.body.defaultBranch === N1, 'newly set default branch is reflected in /options defaultBranch');
    
    // Switch default back to Bandra
    const bandra = (await request('GET', '/api/hr/branches')).body.data.find((b) => b.name === 'Bandra');
    if (bandra) {
      await request('PUT', `/api/hr/branches/${bandra._id}/default`);
      const checkBandraDef = await request('GET', '/api/hr/branches/options');
      check(checkBandraDef.body.defaultBranch === 'Bandra', 'switching default back to Bandra succeeds');
      const unsetDefault = await request('GET', `/api/hr/branches/${id}`);
      check(unsetDefault.body.data.isDefault === false, 'previously default branch is now isDefault: false');
    }

    const inactive = await request('PUT', `/api/hr/branches/${id}`, { status: 'Inactive' });
    check(inactive.status === 200 && inactive.body.data.status === 'Inactive', 'PUT can mark a branch Inactive');
    opts = await request('GET', '/api/hr/branches/options');
    check(!opts.body.data.includes(N1), 'inactive branch disappears from /options');
    const onlyInactive = await request('GET', '/api/hr/branches?status=Inactive');
    check(onlyInactive.body.data.every((b) => b.status === 'Inactive') && onlyInactive.body.data.some((b) => b._id === id), 'status filter works');
    await request('PUT', `/api/hr/branches/${id}`, { status: 'Active' });

    console.log('\nTest 5: Update + rename cascade + delete guard');
    const staff = await Staff.create({ firstName: 'Branchtest', branch: N1, joiningDate: '2026-11-01' });
    staffId = staff._id;
    const listWithStaff = await request('GET', '/api/hr/branches');
    check(listWithStaff.body.data.find((b) => b._id === id).staffCount === 1, 'staffCount reflects assigned employees');
    const blocked = await request('DELETE', `/api/hr/branches/${id}`);
    check(blocked.status === 409, 'deleting a branch with employees is blocked (409)');
    const renamed = await request('PUT', `/api/hr/branches/${id}`, { name: N2, city: 'Nashik' });
    check(renamed.status === 200 && renamed.body.data.name === N2 && renamed.body.data.city === 'Nashik', 'PUT updates fields');
    check((await Staff.findById(staffId)).branch === N2, 'renaming cascades to employees');
    const clash = await request('PUT', `/api/hr/branches/${id}`, { name: 'Bandra' });
    check(clash.status === 409, 'renaming onto an existing name is rejected');
    const put404 = await request('PUT', '/api/hr/branches/000000000000000000000000', { city: 'x' });
    check(put404.status === 404, 'PUT on unknown id returns 404');

    console.log('\nTest 6: Delete');
    await Staff.deleteOne({ _id: staffId });
    const del = await request('DELETE', `/api/hr/branches/${id}`);
    check(del.status === 200 && del.body.success, 'DELETE succeeds once no employees use the branch');
    check((await request('GET', `/api/hr/branches/${id}`)).status === 404, 'deleted branch is gone');
    check((await request('DELETE', `/api/hr/branches/${id}`)).status === 404, 'deleting twice returns 404');
    id = null;
    console.log('\n--- ALL HR BRANCH TESTS COMPLETE ---');
  } catch (error) {
    failed += 1;
    console.error('\n[TEST-FAILURE]', error);
  }
  await Staff.deleteMany({ firstName: 'Branchtest' });
  await Branch.deleteMany({ name: { $in: [N1, N2, `${N1} x`] } });
  console.log(`\nHR BRANCH TEST RESULT: ${passed} passed, ${failed} failed`);
  server.close();
  await disconnectDB();
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
