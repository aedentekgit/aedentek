// Regression tests for API authentication hardening (outside NODE_ENV=test):
// - requests without a verified JWT are rejected with 401
// - mock tokens, X-User-Role headers and ?role= cannot grant access
// - a signed JWT's role cannot be raised by client headers
// - public endpoints stay reachable
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test'; // import without auto-starting the server
const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { seedUserData } = await import('../src/utils/seedUsers.js').catch(() => ({}));
const { generateToken } = await import('../src/middleware/rbac.js');

const PORT = 5097;
const BASE = `http://localhost:${PORT}`;
const call = async (p, opts = {}) => {
  const res = await fetch(BASE + p, opts);
  return res.status;
};
const bearer = (t, extra = {}) => ({ headers: { Authorization: `Bearer ${t}`, ...extra } });

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`✓ [PASS] ${name}`); }
  catch (err) { failed++; console.error(`✗ [FAIL] ${name}: ${err.message}`); }
}

await connectDB();
if (typeof seedUserData === 'function') await seedUserData();
const server = http.createServer(app);
await new Promise((r) => server.listen(PORT, r));

// Switch to production-style auth for every request below.
process.env.NODE_ENV = 'production';
delete process.env.ALLOW_INSECURE_DEV_AUTH;

const staff = generateToken({ _id: 'sec-staff', name: 'Sec Staff', email: 'sec-staff@test.local', role: 'Staff' });
const manager = generateToken({ _id: 'sec-mgr', name: 'Sec Manager', email: 'sec-mgr@test.local', role: 'Manager' });
const admin = generateToken({ _id: 'sec-admin', name: 'Sec Admin', email: 'sec-admin@test.local', role: 'Admin' });

try {
  await test('No credentials -> 401 on protected endpoint', async () => assert.equal(await call('/api/salary-structures'), 401));
  await test('No credentials -> 401 on workspace endpoint', async () => assert.equal(await call('/api/clients'), 401));
  await test('Mock "admin-token" is rejected (401)', async () => assert.equal(await call('/api/salary-structures', bearer('admin-token')), 401));
  await test('X-User-Role: Admin without token is rejected (401)', async () => assert.equal(await call('/api/salary-structures', { headers: { 'X-User-Role': 'Admin' } }), 401));
  await test('?role=Admin without token is rejected (401)', async () => assert.equal(await call('/api/salary-structures?role=Admin'), 401));
  await test('Public-path substring in query cannot skip auth (401)', async () => assert.equal(await call('/api/salary-structures?x=/api/auth/login'), 401));
  await test('Tampered JWT is rejected (401)', async () => assert.equal(await call('/api/clients', bearer(staff.slice(0, -3) + 'abc')), 401));
  await test('Staff JWT -> salary structures forbidden (403)', async () => assert.equal(await call('/api/salary-structures', bearer(staff)), 403));
  await test('Staff JWT + X-User-Role: Admin header still forbidden (403)', async () =>
    assert.equal(await call('/api/salary-structures', bearer(staff, { 'X-User-Role': 'Admin', 'X-Access-Level': 'Admin' })), 403));
  await test('Staff JWT -> credential settings section forbidden (403)', async () => assert.equal(await call('/api/settings/smtp', bearer(staff)), 403));
  await test('Staff JWT -> settings write forbidden (403)', async () =>
    assert.equal(await call('/api/settings/theme', { method: 'PUT', headers: { Authorization: `Bearer ${staff}`, 'Content-Type': 'application/json' }, body: '{}' }), 403));
  await test('Staff JWT -> /api/settings returns only shared sections', async () => {
    const res = await fetch(BASE + '/api/settings', bearer(staff));
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(body.data).sort(), ['bankDetails', 'gstSettings', 'invoiceSender', 'theme']);
  });
  await test('Staff JWT -> accounts dashboard forbidden (403)', async () => assert.equal(await call('/api/accounts/dashboard', bearer(staff)), 403));
  await test('Staff JWT -> clients allowed (200)', async () => assert.equal(await call('/api/clients', bearer(staff)), 200));
  await test('Manager JWT -> payroll forbidden (403)', async () => assert.equal(await call('/api/hr/payroll', bearer(manager)), 403));
  await test('Manager JWT + X-User-Role: Admin -> payroll still forbidden (403)', async () =>
    assert.equal(await call('/api/hr/payroll', bearer(manager, { 'X-User-Role': 'Admin' })), 403));
  await test('Manager JWT -> staff list allowed (200)', async () => assert.equal(await call('/api/staff', bearer(manager)), 200));
  await test('Admin JWT -> salary structures allowed (200)', async () => assert.equal(await call('/api/salary-structures', bearer(admin)), 200));
  await test('Upload without credentials -> 401', async () =>
    assert.equal(await call('/api/uploads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: 'x.txt', data: 'aGk=' }) }), 401));
  await test('Health endpoint stays public (200)', async () => assert.equal(await call('/api/health'), 200));
  await test('Login endpoint stays public (not 401 for bad creds -> 400/401 from handler)', async () => {
    const res = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'nobody@x.y', password: 'wrong' }) });
    const body = await res.json();
    assert.notEqual(body.code, 'AUTH_REQUIRED');
  });
} finally {
  process.env.NODE_ENV = 'test';
  await new Promise((r) => server.close(r));
  await disconnectDB();
}

console.log(`\n${passed}/${passed + failed} auth hardening tests passed`);
process.exit(failed ? 1 : 0);
