/**
 * RBAC (Role-Based Access Control) Backend Integration Test Suite
 * Tests role permissions, boundary enforcement, and 403 Forbidden responses
 */

import http from 'http';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.PORT = '5092';

const { default: app } = await import('../src/server.js');
const { connectDB } = await import('../src/config/db.js');
import mongoose from 'mongoose';

const PORT = 5092;
let server;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function request(method, path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const fetchOptions = {
    method,
    headers
  };

  if (options.body) {
    fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const res = await fetch(`http://localhost:${PORT}${path}`, fetchOptions);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('--- STARTING RBAC BACKEND INTEGRATION TESTS ---');
  await connectDB();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`[TEST-SERVER] Listening on http://localhost:${PORT}`);

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`✓ [PASS] ${name}`);
    } catch (err) {
      console.error(`✗ [FAIL] ${name}: ${err.message}`);
      throw err;
    }
  }

  try {
    // 1. Auth introspection endpoints
    await test('GET /api/auth/roles returns full RBAC matrix and role definitions', async () => {
      const res = await request('GET', '/api/auth/roles');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success === true');
      assert(Array.isArray(res.data.roles) && res.data.roles.includes('Admin'), 'Roles must include Admin');
      assert(res.data.roles.includes('Manager'), 'Roles must include Manager');
      assert(res.data.roles.includes('Staff'), 'Roles must include Staff');
      assert(res.data.matrix.Admin.settings.write === true, 'Admin must have settings write');
      assert(res.data.matrix.Manager.settings.write === false, 'Manager must not have settings write');
      assert(res.data.matrix.Staff.accounts.read === false, 'Staff must not have accounts read');
    });

    await test('GET /api/auth/me detects role from X-User-Role header', async () => {
      const resAdmin = await request('GET', '/api/auth/me', { headers: { 'X-User-Role': 'Admin' } });
      assert(resAdmin.data.user.role === 'Admin', `Expected Admin role, got ${resAdmin.data.user.role}`);

      const resManager = await request('GET', '/api/auth/me', { headers: { 'X-User-Role': 'Manager' } });
      assert(resManager.data.user.role === 'Manager', `Expected Manager role, got ${resManager.data.user.role}`);

      const resStaff = await request('GET', '/api/auth/me', { headers: { 'X-User-Role': 'Staff' } });
      assert(resStaff.data.user.role === 'Staff', `Expected Staff role, got ${resStaff.data.user.role}`);
    });

    // 2. Settings protection: Admin only
    await test('GET /api/settings allows Admin access (200 OK)', async () => {
      const res = await request('GET', '/api/settings', { headers: { 'X-User-Role': 'Admin' } });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success: true');
    });

    await test('GET /api/settings blocks Manager access with 403 Forbidden', async () => {
      const res = await request('GET', '/api/settings', { headers: { 'X-User-Role': 'Manager' } });
      assert(res.status === 403, `Expected 403, got ${res.status}`);
      assert(res.data.code === 'RBAC_ACCESS_RESTRICTED', 'Expected RBAC_ACCESS_RESTRICTED code');
    });

    await test('GET /api/settings blocks Staff access with 403 Forbidden', async () => {
      const res = await request('GET', '/api/settings', { headers: { 'X-User-Role': 'Staff' } });
      assert(res.status === 403, `Expected 403, got ${res.status}`);
      assert(res.data.error === 'Forbidden', 'Expected Forbidden error');
    });

    // 3. Accounts protection: Admin & Manager allowed, Staff forbidden
    await test('GET /api/accounts/dashboard allows Admin (200 OK)', async () => {
      const res = await request('GET', '/api/accounts/dashboard', { headers: { 'X-User-Role': 'Admin' } });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test('GET /api/accounts/dashboard allows Manager (200 OK)', async () => {
      const res = await request('GET', '/api/accounts/dashboard', { headers: { 'X-User-Role': 'Manager' } });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test('GET /api/accounts/dashboard blocks Staff with 403 Forbidden', async () => {
      const res = await request('GET', '/api/accounts/dashboard', { headers: { 'X-User-Role': 'Staff' } });
      assert(res.status === 403, `Expected 403, got ${res.status}`);
      assert(res.data.currentRole === 'Staff', 'Expected currentRole === Staff');
    });

    // 4. Salary Structures: Admin only
    await test('GET /api/salary-structures allows Admin (200 OK)', async () => {
      const res = await request('GET', '/api/salary-structures', { headers: { 'X-User-Role': 'Admin' } });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test('GET /api/salary-structures blocks Manager with 403 Forbidden', async () => {
      const res = await request('GET', '/api/salary-structures', { headers: { 'X-User-Role': 'Manager' } });
      assert(res.status === 403, `Expected 403, got ${res.status}`);
    });

    await test('GET /api/salary-structures blocks Staff with 403 Forbidden', async () => {
      const res = await request('GET', '/api/salary-structures', { headers: { 'X-User-Role': 'Staff' } });
      assert(res.status === 403, `Expected 403, got ${res.status}`);
    });

    // 5. Payroll runs: Admin only
    await test('GET /api/hr/payroll blocks Manager and Staff with 403 Forbidden', async () => {
      const resManager = await request('GET', '/api/hr/payroll', { headers: { 'X-User-Role': 'Manager' } });
      assert(resManager.status === 403, `Expected 403 for Manager, got ${resManager.status}`);

      const resStaff = await request('GET', '/api/hr/payroll', { headers: { 'X-User-Role': 'Staff' } });
      assert(resStaff.status === 403, `Expected 403 for Staff, got ${resStaff.status}`);
    });

    // 6. Masters / Branches: Admin only
    await test('GET /api/hr/branches allows Admin and blocks Manager & Staff', async () => {
      const resAdmin = await request('GET', '/api/hr/branches', { headers: { 'X-User-Role': 'Admin' } });
      assert(resAdmin.status === 200, `Expected 200 for Admin, got ${resAdmin.status}`);

      const resManager = await request('GET', '/api/hr/branches', { headers: { 'X-User-Role': 'Manager' } });
      assert(resManager.status === 403, `Expected 403 for Manager, got ${resManager.status}`);

      const resStaff = await request('GET', '/api/hr/branches', { headers: { 'X-User-Role': 'Staff' } });
      assert(resStaff.status === 403, `Expected 403 for Staff, got ${resStaff.status}`);
    });

    // 7. Staff directory: Admin and Manager allowed, Staff forbidden
    await test('GET /api/staff allows Admin & Manager, blocks Staff with 403', async () => {
      const resAdmin = await request('GET', '/api/staff', { headers: { 'X-User-Role': 'Admin' } });
      assert(resAdmin.status === 200, `Expected 200 for Admin, got ${resAdmin.status}`);

      const resManager = await request('GET', '/api/staff', { headers: { 'X-User-Role': 'Manager' } });
      assert(resManager.status === 200, `Expected 200 for Manager, got ${resManager.status}`);

      const resStaff = await request('GET', '/api/staff', { headers: { 'X-User-Role': 'Staff' } });
      assert(resStaff.status === 403, `Expected 403 for Staff, got ${resStaff.status}`);
    });

    console.log(`\n======================================================`);
    console.log(`ALL RBAC BACKEND TESTS PASSED (${passed}/${total})`);
    console.log(`======================================================\n`);
    process.exit(0);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('RBAC test suite error:', err);
  process.exit(1);
});
