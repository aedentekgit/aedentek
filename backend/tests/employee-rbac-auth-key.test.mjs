/**
 * Employee Role / Username / Password + Auth Key Validation + RBAC Integration Test Suite
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { default: Staff } = await import('../src/models/Staff.js');
const { default: User } = await import('../src/models/User.js');
const { seedUserData } = await import('../src/utils/seedUsers.js');

const PORT = 5096;
const BASE = `http://localhost:${PORT}`;
const TAG = `empauth_${Date.now()}`;

const reqJson = async (method, urlPath, { body, headers = {} } = {}) => {
  const res = await fetch(BASE + urlPath, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, ok: res.ok, data };
};

const results = [];
let passed = 0;
let failed = 0;

async function test(id, name, fn) {
  try {
    await fn();
    passed++;
    results.push({ id, name, status: 'PASS', detail: 'Verified' });
    console.log(`✓ [PASS] ${id}: ${name}`);
  } catch (err) {
    failed++;
    results.push({ id, name, status: 'FAIL', detail: err.message });
    console.error(`✗ [FAIL] ${id}: ${name} -> ${err.message}`);
  }
}

await connectDB();
await seedUserData();
const server = http.createServer(app);
await new Promise((r) => server.listen(PORT, r));

// Run under strict production-style auth enforcement (no X-User-Role spoofing, no implicit Admin)
process.env.NODE_ENV = 'production';
delete process.env.ALLOW_INSECURE_DEV_AUTH;

const createdStaffIds = [];

try {
  // Admin login to obtain a valid Admin auth key
  const adminLogin = await reqJson('POST', '/api/auth/login', {
    body: { username: 'admin@gmail.com', password: 'admin123' }
  });
  assert.equal(adminLogin.status, 200, 'Admin login must succeed');
  const adminKey = adminLogin.data.authKey;
  assert.ok(adminKey && adminKey === adminLogin.data.token, 'Admin authKey must be issued');
  const adminHdr = { Authorization: `Bearer ${adminKey}`, 'X-Auth-Key': adminKey };

  const staffUser = `${TAG}_staff`;
  const staffEmail = `${TAG}.staff@test.local`;
  const mgrUser = `${TAG}_mgr`;
  const mgrEmail = `${TAG}.mgr@test.local`;
  const admUser = `${TAG}_adm`;
  let staffEmpId = null;
  let mgrEmpId = null;
  let admEmpId = null;
  let staffAuthKey = null;
  let mgrAuthKey = null;
  let admAuthKey = null;

  await test('TC-BE-01', 'Create Staff employee with role, username, password & email (bcrypt hash + authKey, no plaintext on Staff)', async () => {
    const res = await reqJson('POST', '/api/staff', {
      headers: adminHdr,
      body: {
        firstName: 'Ravi', lastName: 'StaffTest', email: staffEmail,
        branch: 'Head Office', department: 'Sales', role: 'Sales Executive',
        joiningDate: '2026-11-01', status: 'Active',
        createLogin: true, accessLevel: 'Staff', username: staffUser, password: 'StaffPass123!'
      }
    });
    assert.equal(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
    staffEmpId = res.data.data._id;
    createdStaffIds.push(staffEmpId);

    const rawStaff = await Staff.findById(staffEmpId).lean();
    assert.equal(rawStaff.password, '', 'Plaintext password must never persist in Staff collection');
    assert.equal(rawStaff.accessLevel, 'Staff');
    assert.equal(rawStaff.username, staffUser);

    const linkedUser = await User.findOne({ staffRef: staffEmpId });
    assert.ok(linkedUser, 'Linked User must be created');
    assert.equal(linkedUser.role, 'Staff');
    assert.equal(linkedUser.accessLevel, 'Staff');
    assert.equal(linkedUser.email, staffEmail);
    assert.ok(linkedUser.password.startsWith('$2'), 'Password must be bcrypt hashed');
    assert.ok(linkedUser.authKey && linkedUser.authKey.length >= 32, 'User must have server-side authKey');
  });

  await test('TC-BE-02', 'Create Manager employee — User.role accurately maps to Manager (not defaulted to Staff)', async () => {
    const res = await reqJson('POST', '/api/staff', {
      headers: adminHdr,
      body: {
        firstName: 'Meera', lastName: 'ManagerTest', email: mgrEmail,
        branch: 'Head Office', department: 'Operations', role: 'Operations Lead',
        joiningDate: '2026-11-01', status: 'Active',
        createLogin: true, accessLevel: 'Manager', username: mgrUser, password: 'ManagerPass123!'
      }
    });
    assert.equal(res.status, 201);
    mgrEmpId = res.data.data._id;
    createdStaffIds.push(mgrEmpId);

    const linkedUser = await User.findOne({ staffRef: mgrEmpId });
    assert.equal(linkedUser.role, 'Manager', 'User.role must be Manager');
    assert.equal(linkedUser.accessLevel, 'Manager');
  });

  await test('TC-BE-03', 'Create Admin employee — User.role accurately maps to Admin', async () => {
    const res = await reqJson('POST', '/api/staff', {
      headers: adminHdr,
      body: {
        firstName: 'Arjun', lastName: 'AdminTest',
        branch: 'Head Office', department: 'Management', role: 'Director',
        joiningDate: '2026-11-01', status: 'Active',
        createLogin: true, accessLevel: 'Admin', username: admUser, password: 'AdminPass123!'
      }
    });
    assert.equal(res.status, 201);
    admEmpId = res.data.data._id;
    createdStaffIds.push(admEmpId);

    const linkedUser = await User.findOne({ staffRef: admEmpId });
    assert.equal(linkedUser.role, 'Admin', 'User.role must be Admin');
  });

  await test('TC-BE-04', 'Employee creation validation: duplicate username, weak password, invalid username, and Manager->Admin escalation blocked', async () => {
    const dup = await reqJson('POST', '/api/staff', {
      headers: adminHdr,
      body: { firstName: 'Dup', branch: 'Head Office', joiningDate: '2026-11-01', createLogin: true, accessLevel: 'Staff', username: staffUser, password: 'ValidPass123' }
    });
    assert.equal(dup.status, 400);

    const shortPw = await reqJson('POST', '/api/staff', {
      headers: adminHdr,
      body: { firstName: 'Short', branch: 'Head Office', joiningDate: '2026-11-01', createLogin: true, accessLevel: 'Staff', username: `${TAG}_short`, password: '123' }
    });
    assert.equal(shortPw.status, 400);

    const badUser = await reqJson('POST', '/api/staff', {
      headers: adminHdr,
      body: { firstName: 'Space', branch: 'Head Office', joiningDate: '2026-11-01', createLogin: true, accessLevel: 'Staff', username: 'bad user', password: 'ValidPass123' }
    });
    assert.equal(badUser.status, 400);

    // Log in as Manager and try creating an Admin employee
    const mgrLoginRes = await reqJson('POST', '/api/auth/login', { body: { username: mgrUser, password: 'ManagerPass123!' } });
    assert.equal(mgrLoginRes.status, 200);
    mgrAuthKey = mgrLoginRes.data.authKey;
    const esc = await reqJson('POST', '/api/staff', {
      headers: { 'X-Auth-Key': mgrAuthKey },
      body: { firstName: 'Esc', branch: 'Head Office', joiningDate: '2026-11-01', createLogin: true, accessLevel: 'Admin', username: `${TAG}_esc`, password: 'ValidPass123' }
    });
    assert.equal(esc.status, 403, 'Manager must not be allowed to create an Admin login');
  });

  await test('TC-BE-05', 'Employee login via Username + Password returns signed authKey, role, and allowedPages', async () => {
    const sRes = await reqJson('POST', '/api/auth/login', { body: { username: staffUser, password: 'StaffPass123!' } });
    assert.equal(sRes.status, 200);
    assert.equal(sRes.data.user.role, 'Staff');
    assert.equal(sRes.data.user.username, staffUser);
    assert.ok(sRes.data.authKey, 'authKey must be returned');
    assert.ok(Array.isArray(sRes.data.user.allowedPages) && !sRes.data.user.allowedPages.includes('/settings'));
    staffAuthKey = sRes.data.authKey;

    const aRes = await reqJson('POST', '/api/auth/login', { body: { username: admUser, password: 'AdminPass123!' } });
    assert.equal(aRes.status, 200);
    assert.equal(aRes.data.user.role, 'Admin');
    assert.ok(aRes.data.user.allowedPages.includes('/settings') && aRes.data.user.allowedPages.includes('/hr/payroll'));
    admAuthKey = aRes.data.authKey;
  });

  await test('TC-BE-06', 'Employee login via Email + Password also succeeds', async () => {
    const res = await reqJson('POST', '/api/auth/login', { body: { email: staffEmail, password: 'StaffPass123!' } });
    assert.equal(res.status, 200);
    assert.equal(res.data.user.username, staffUser);
    assert.equal(res.data.user.role, 'Staff');
  });

  await test('TC-BE-07', 'Employee login with wrong password rejected (401)', async () => {
    const res = await reqJson('POST', '/api/auth/login', { body: { username: staffUser, password: 'WrongPassword!' } });
    assert.equal(res.status, 401);
  });

  await test('TC-BE-08', 'Auth key validation via X-Auth-Key and Authorization Bearer on /api/auth/verify (and rejection of missing/tampered keys)', async () => {
    const byAuthKey = await reqJson('GET', '/api/auth/verify', { headers: { 'X-Auth-Key': staffAuthKey } });
    assert.equal(byAuthKey.status, 200);
    assert.equal(byAuthKey.data.valid, true);
    assert.equal(byAuthKey.data.authKeyValid, true);
    assert.equal(byAuthKey.data.user.role, 'Staff');

    const byBearer = await reqJson('GET', '/api/auth/verify', { headers: { Authorization: `Bearer ${mgrAuthKey}` } });
    assert.equal(byBearer.status, 200);
    assert.equal(byBearer.data.user.role, 'Manager');

    const noKey = await reqJson('GET', '/api/auth/verify');
    assert.equal(noKey.status, 401);
    assert.equal(noKey.data.code, 'AUTH_REQUIRED');

    const tampered = await reqJson('GET', '/api/auth/verify', { headers: { 'X-Auth-Key': staffAuthKey.slice(0, -4) + 'XXXX' } });
    assert.equal(tampered.status, 401);
    assert.equal(tampered.data.code, 'INVALID_TOKEN');
  });

  await test('TC-BE-09', 'Role-based API access enforcement across Staff, Manager, and Admin auth keys', async () => {
    const sH = { 'X-Auth-Key': staffAuthKey };
    const mH = { 'X-Auth-Key': mgrAuthKey };
    const aH = { 'X-Auth-Key': admAuthKey };

    // Staff: workspace OK, Finance/Accounts/HR/Settings restricted
    assert.equal((await reqJson('GET', '/api/clients', { headers: sH })).status, 200);
    assert.equal((await reqJson('GET', '/api/invoices', { headers: sH })).status, 403);
    assert.equal((await reqJson('GET', '/api/propagations', { headers: sH })).status, 403);
    assert.equal((await reqJson('GET', '/api/accounts/dashboard', { headers: sH })).status, 403);
    assert.equal((await reqJson('GET', '/api/staff', { headers: sH })).status, 403);
    assert.equal((await reqJson('GET', '/api/hr/payroll', { headers: sH })).status, 403);
    assert.equal((await reqJson('GET', '/api/settings/smtp', { headers: sH })).status, 403);

    // Manager: workspace + invoices + accounts + staff OK; payroll/salary/branches/settings restricted
    assert.equal((await reqJson('GET', '/api/clients', { headers: mH })).status, 200);
    assert.equal((await reqJson('GET', '/api/invoices', { headers: mH })).status, 200);
    assert.equal((await reqJson('GET', '/api/accounts/dashboard', { headers: mH })).status, 200);
    assert.equal((await reqJson('GET', '/api/staff', { headers: mH })).status, 200);
    assert.equal((await reqJson('GET', '/api/hr/payroll', { headers: mH })).status, 403);
    assert.equal((await reqJson('GET', '/api/salary-structures', { headers: mH })).status, 403);
    assert.equal((await reqJson('GET', '/api/hr/branches', { headers: mH })).status, 403);
    assert.equal((await reqJson('GET', '/api/settings/smtp', { headers: mH })).status, 403);

    // Admin: all allowed
    assert.equal((await reqJson('GET', '/api/clients', { headers: aH })).status, 200);
    assert.equal((await reqJson('GET', '/api/invoices', { headers: aH })).status, 200);
    assert.equal((await reqJson('GET', '/api/accounts/dashboard', { headers: aH })).status, 200);
    assert.equal((await reqJson('GET', '/api/staff', { headers: aH })).status, 200);
    assert.equal((await reqJson('GET', '/api/hr/payroll', { headers: aH })).status, 200);
    assert.equal((await reqJson('GET', '/api/salary-structures', { headers: aH })).status, 200);
    assert.equal((await reqJson('GET', '/api/hr/branches', { headers: aH })).status, 200);
    assert.equal((await reqJson('GET', '/api/settings/smtp', { headers: aH })).status, 200);
  });

  await test('TC-BE-10', 'Edit employee profile without password preserves existing password (no UNCHANGED overwrite bug)', async () => {
    const upd = await reqJson('PUT', `/api/staff/${staffEmpId}`, {
      headers: adminHdr,
      body: { department: 'Enterprise Sales', createLogin: true, accessLevel: 'Staff', username: staffUser }
    });
    assert.equal(upd.status, 200);
    const relogin = await reqJson('POST', '/api/auth/login', { body: { username: staffUser, password: 'StaffPass123!' } });
    assert.equal(relogin.status, 200, 'Original password must still work after profile edit');
    const badUnchanged = await reqJson('POST', '/api/auth/login', { body: { username: staffUser, password: 'UNCHANGED' } });
    assert.equal(badUnchanged.status, 401, 'Literal UNCHANGED must never be accepted');
  });

  await test('TC-BE-11', 'Updating employee role (Staff -> Manager) immediately updates live permissions on existing authKey', async () => {
    const upd = await reqJson('PUT', `/api/staff/${staffEmpId}`, {
      headers: adminHdr,
      body: { createLogin: true, accessLevel: 'Manager', username: staffUser }
    });
    assert.equal(upd.status, 200);

    const verify = await reqJson('GET', '/api/auth/verify', { headers: { 'X-Auth-Key': staffAuthKey } });
    assert.equal(verify.status, 200);
    assert.equal(verify.data.user.role, 'Manager', 'Live role must immediately reflect Manager');
    assert.equal((await reqJson('GET', '/api/invoices', { headers: { 'X-Auth-Key': staffAuthKey } })).status, 200);
    assert.equal((await reqJson('GET', '/api/hr/payroll', { headers: { 'X-Auth-Key': staffAuthKey } })).status, 403);
  });

  await test('TC-BE-12', 'Resetting employee password rotates authKey (revokes old sessions immediately)', async () => {
    const oldKey = staffAuthKey;
    const upd = await reqJson('PUT', `/api/staff/${staffEmpId}`, {
      headers: adminHdr,
      body: { createLogin: true, accessLevel: 'Manager', username: staffUser, password: 'NewSecretPass99!' }
    });
    assert.equal(upd.status, 200);

    const revoked = await reqJson('GET', '/api/auth/verify', { headers: { 'X-Auth-Key': oldKey } });
    assert.equal(revoked.status, 401);
    assert.equal(revoked.data.code, 'AUTH_KEY_REVOKED');

    const oldPwLogin = await reqJson('POST', '/api/auth/login', { body: { username: staffUser, password: 'StaffPass123!' } });
    assert.equal(oldPwLogin.status, 401);

    const newPwLogin = await reqJson('POST', '/api/auth/login', { body: { username: staffUser, password: 'NewSecretPass99!' } });
    assert.equal(newPwLogin.status, 200);
    staffAuthKey = newPwLogin.data.authKey;
  });

  await test('TC-BE-13', 'Disabling employee login (createLogin: false) revokes active authKey and blocks sign-in', async () => {
    const upd = await reqJson('PUT', `/api/staff/${staffEmpId}`, {
      headers: adminHdr,
      body: { createLogin: false }
    });
    assert.equal(upd.status, 200);

    const verify = await reqJson('GET', '/api/auth/verify', { headers: { 'X-Auth-Key': staffAuthKey } });
    assert.equal(verify.status, 401);
    assert.equal(verify.data.code, 'ACCOUNT_DEACTIVATED');

    const login = await reqJson('POST', '/api/auth/login', { body: { username: staffUser, password: 'NewSecretPass99!' } });
    assert.equal(login.status, 403);
    assert.equal(login.data.code, 'ACCOUNT_DEACTIVATED');
  });

  await test('TC-BE-14', 'Deleting employee removes linked User and immediately invalidates active authKey', async () => {
    const del = await reqJson('DELETE', `/api/staff/${mgrEmpId}`, { headers: adminHdr });
    assert.equal(del.status, 200);

    const verify = await reqJson('GET', '/api/auth/verify', { headers: { 'X-Auth-Key': mgrAuthKey } });
    assert.equal(verify.status, 401);
    assert.equal(verify.data.code, 'USER_NOT_FOUND');

    const login = await reqJson('POST', '/api/auth/login', { body: { username: mgrUser, password: 'ManagerPass123!' } });
    assert.equal(login.status, 401);
  });
} finally {
  // Clean up test employees & users
  for (const id of createdStaffIds) {
    await User.deleteMany({ staffRef: id }).catch(() => {});
    await Staff.findByIdAndDelete(id).catch(() => {});
  }
  process.env.NODE_ENV = 'test';
  await new Promise((r) => server.close(r));
  await disconnectDB();
}

console.log(`\n======================================================`);
console.log(`BACKEND EMPLOYEE RBAC & AUTH KEY TESTS: ${passed}/${passed + failed} PASSED`);
console.log(`======================================================`);
process.exit(failed ? 1 : 0);
