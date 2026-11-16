import http from 'http';
import assert from 'assert';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.PORT = '5093';

const { default: app } = await import('../src/server.js');
const { connectDB } = await import('../src/config/db.js');
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import { seedUserData } from '../src/utils/seedUsers.js';
import { JWT_SECRET, ROLES } from '../src/middleware/rbac.js';
import jwt from 'jsonwebtoken';

const TEST_PORT = 5093;
let server;
const BASE_URL = `http://localhost:${TEST_PORT}`;

const request = (path, method = 'GET', body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
};

async function runAuthTests() {
  console.log('--- STARTING SERVER-SIDE AUTHENTICATION & JWT INTEGRATION TESTS ---');

  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }

  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`[TEST-SERVER] Listening on ${BASE_URL}`);
      resolve();
    });
  });

  let adminToken = '';
  let managerToken = '';
  let staffToken = '';

  try {
    // Test 1: User database seeding
    console.log('\nTest 1: Seeding User accounts with bcrypt password hashes');
    await seedUserData();
    const adminUser = await User.findOne({ username: 'ines.okafor' });
    assert(adminUser, 'Admin user ines.okafor must exist in MongoDB');
    assert(adminUser.password.startsWith('$2'), 'Password must be hashed with bcrypt');
    assert.strictEqual(adminUser.role, ROLES.ADMIN, 'ines.okafor must have role Admin');
    console.log('✓ Seeded and verified bcrypt hashed admin account');

    // Test 2: Admin Login with bcrypt password verification
    console.log('\nTest 2: POST /api/auth/login for Admin (ines@caldermoss.co)');
    const adminLoginRes = await request('/api/auth/login', 'POST', {
      email: 'ines@caldermoss.co',
      password: 'marble88'
    });
    assert.strictEqual(adminLoginRes.status, 200, 'Admin login must return 200 OK');
    assert(adminLoginRes.data.success, 'Response must indicate success: true');
    assert(adminLoginRes.data.token, 'Response must include signed JWT token');
    assert.strictEqual(adminLoginRes.data.user.role, 'Admin', 'User role must be Admin');
    adminToken = adminLoginRes.data.token;

    // Verify cryptographic signature of JWT
    const decodedAdmin = jwt.verify(adminToken, JWT_SECRET);
    assert.strictEqual(decodedAdmin.role, 'Admin', 'Decoded JWT must contain role: Admin');
    console.log('✓ Admin login returned cryptographically signed JWT with Admin role');

    // Test 3: Manager Login
    console.log('\nTest 3: POST /api/auth/login for Manager (manager@tessly.local)');
    const mgrLoginRes = await request('/api/auth/login', 'POST', {
      email: 'manager@tessly.local',
      password: 'password123'
    });
    assert.strictEqual(mgrLoginRes.status, 200, 'Manager login must return 200 OK');
    assert.strictEqual(mgrLoginRes.data.user.role, 'Manager', 'User role must be Manager');
    managerToken = mgrLoginRes.data.token;
    console.log('✓ Manager login returned signed JWT with Manager role');

    // Test 4: Staff Login
    console.log('\nTest 4: POST /api/auth/login for Staff (tomas@caldermoss.co)');
    const staffLoginRes = await request('/api/auth/login', 'POST', {
      email: 'tomas@caldermoss.co',
      password: 'password123'
    });
    assert.strictEqual(staffLoginRes.status, 200, 'Staff login must return 200 OK');
    assert.strictEqual(staffLoginRes.data.user.role, 'Staff', 'User role must be Staff');
    staffToken = staffLoginRes.data.token;
    console.log('✓ Staff login returned signed JWT with Staff role');

    // Test 5: Rejection of incorrect password
    console.log('\nTest 5: POST /api/auth/login with wrong password');
    const wrongPwRes = await request('/api/auth/login', 'POST', {
      email: 'ines@caldermoss.co',
      password: 'wrong_password_xyz'
    });
    assert.strictEqual(wrongPwRes.status, 401, 'Wrong password must return 401 Unauthorized');
    assert(!wrongPwRes.data.success, 'Response success must be false');
    console.log('✓ Wrong password rejected with 401 Unauthorized');

    // Test 6: Rejection of unknown user
    console.log('\nTest 6: POST /api/auth/login with non-existent user');
    const unknownRes = await request('/api/auth/login', 'POST', {
      email: 'ghost@nowhere.com',
      password: 'password123'
    });
    assert.strictEqual(unknownRes.status, 401, 'Unknown user must return 401 Unauthorized');
    console.log('✓ Non-existent user rejected with 401 Unauthorized');

    // Test 7: GET /api/auth/me with valid JWT in Authorization header
    console.log('\nTest 7: GET /api/auth/me using Bearer JWT');
    const meRes = await request('/api/auth/me', 'GET', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(meRes.status, 200, 'GET /api/auth/me must return 200 OK');
    assert.strictEqual(meRes.data.user.role, 'Admin', 'User role must be Admin');
    assert(meRes.data.user.tokenValidated, 'Token must be cryptographically validated');
    console.log('✓ GET /api/auth/me authenticated via Bearer JWT successfully');

    // Test 8: Forged / tampered JWT rejection
    console.log('\nTest 8: Rejection of tampered JWT signature');
    const forgedToken = adminToken.slice(0, -6) + 'abcdef';
    const forgedRes = await request('/api/auth/me', 'GET', null, {
      'Authorization': `Bearer ${forgedToken}`
    });
    assert.strictEqual(forgedRes.status, 401, 'Tampered JWT must return 401 Unauthorized');
    assert.strictEqual(forgedRes.data.code, 'INVALID_TOKEN', 'Must return INVALID_TOKEN error code');
    console.log('✓ Forged JWT rejected with 401 Unauthorized and INVALID_TOKEN code');

    // Test 9: JWT-enforced endpoint protection: Admin allowed /settings
    console.log('\nTest 9: Admin JWT accessing protected route /api/settings');
    const settingsAdminRes = await request('/api/settings', 'GET', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(settingsAdminRes.status, 200, 'Admin must be granted access (200 OK)');
    console.log('✓ Admin JWT successfully accessed /api/settings');

    // Test 10: JWT-enforced endpoint protection: Staff blocked from /settings
    console.log('\nTest 10: Staff JWT attempting to access protected route /api/settings');
    const settingsStaffRes = await request('/api/settings', 'GET', null, {
      'Authorization': `Bearer ${staffToken}`
    });
    assert.strictEqual(settingsStaffRes.status, 403, 'Staff must be blocked with 403 Forbidden');
    assert.strictEqual(settingsStaffRes.data.code, 'RBAC_ACCESS_RESTRICTED', 'Must return RBAC_ACCESS_RESTRICTED');
    console.log('✓ Staff JWT strictly blocked with 403 Forbidden from /api/settings');

    // Test 11: JWT-enforced endpoint protection: Manager blocked from /hr/payroll
    console.log('\nTest 11: Manager JWT attempting to access /api/hr/payroll');
    const payrollMgrRes = await request('/api/hr/payroll', 'GET', null, {
      'Authorization': `Bearer ${managerToken}`
    });
    assert.strictEqual(payrollMgrRes.status, 403, 'Manager must be blocked from /hr/payroll with 403 Forbidden');
    console.log('✓ Manager JWT strictly blocked with 403 Forbidden from /hr/payroll');

    // Test 12: Logout endpoint
    console.log('\nTest 12: POST /api/auth/logout');
    const logoutRes = await request('/api/auth/logout', 'POST');
    assert.strictEqual(logoutRes.status, 200, 'Logout must return 200 OK');
    assert(logoutRes.data.success, 'Logout must succeed');
    console.log('✓ Logout endpoint cleared session successfully');

    // Test 13: Refresh token endpoint with valid token
    console.log('\nTest 13: POST /api/auth/refresh with valid token');
    const refreshRes = await request('/api/auth/refresh', 'POST', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(refreshRes.status, 200, 'Refresh must return 200 OK');
    assert(refreshRes.data.success, 'Refresh response must be success');
    assert(refreshRes.data.token, 'Refresh must return renewed token');
    console.log('✓ Refresh token endpoint returned renewed token with 200 OK');

    // Test 14: Refresh token endpoint with invalid/expired token
    console.log('\nTest 14: POST /api/auth/refresh with expired/invalid token');
    const badRefreshRes = await request('/api/auth/refresh', 'POST', null, {
      'Authorization': 'Bearer expired.token.signature'
    });
    assert.strictEqual(badRefreshRes.status, 401, 'Invalid/expired refresh token must return 401 Unauthorized');
    assert.strictEqual(badRefreshRes.data.code, 'REFRESH_TOKEN_EXPIRED', 'Must return REFRESH_TOKEN_EXPIRED code');
    console.log('✓ Expired/invalid refresh token strictly rejected with 401 Unauthorized');

    console.log('\n======================================================');
    console.log('ALL SERVER-SIDE AUTHENTICATION TESTS PASSED (14/14)');
    console.log('======================================================\n');
  } finally {
    if (server) {
      await new Promise(res => server.close(res));
      console.log('[TEST-SERVER] Closed');
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[MongoDB] Disconnected from database');
    }
  }
}

runAuthTests().catch(err => {
  console.error('\n❌ AUTH TEST SUITE FAILED:', err);
  process.exit(1);
});
