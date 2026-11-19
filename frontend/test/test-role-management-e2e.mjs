/**
 * Full E2E Verification: Theme-Based Role Management (/hr/roles)
 * - Full CRUD (Create, Read/Search, Update, Delete, System role protection, In-use delete guard)
 * - Role-Based Access Restriction on /hr/roles (Admin allowed, Manager & Staff blocked 403)
 * - End-to-End Custom Role Enforcement:
 *     1. Admin creates custom role "Accounts Auditor" with ONLY Dashboard, Accounts, Invoices, Profile
 *     2. Admin assigns a new employee to "Accounts Auditor" (appears in Employee form dropdown!)
 *     3. Employee signs in via username + password
 *     4. Sidebar ONLY displays allowed modules (Accounts, Invoice, Dashboard, Profile — hides Clients, Deals, HR, Masters, Settings!)
 *     5. Direct URL access to /accounts/dashboard & /finance/invoices SUCCEEDS; /clients/companies, /hr/staff, /hr/roles, /settings return 403 Access Restricted!
 *     6. Backend APIs follow exact same rules (GET /api/accounts/dashboard & /api/invoices -> 200; GET /api/staff & /api/roles & /api/settings/smtp -> 403!)
 *     7. Admin edits role, removes employee, deletes custom role cleanly!
 */
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../test-reports/role-management');
fs.mkdirSync(OUT, { recursive: true });

const FE = 'http://localhost:1234';
const BE = 'http://localhost:5001';
const TAG = Date.now().toString().slice(-5);
const ROLE_NAME = `Auditor ${TAG}`;
const ROLE_RENAMED = `Senior Auditor ${TAG}`;
const EMP_USER = `auditor.${TAG}`;
const EMP_PASS = 'AuditPass123!';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0, failed = 0;
let adminKey = '';
let createdRoleId = null;
let createdStaffId = null;

async function test(id, name, fn) {
  try {
    const detail = (await fn()) || 'OK';
    passed++;
    console.log(`✓ [PASS] ${id}: ${name} — ${detail}`);
  } catch (err) {
    failed++;
    console.error(`✗ [FAIL] ${id}: ${name} -> ${err.message}`);
  }
}

const api = async (method, urlPath, { body, key } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (key) {
    headers['Authorization'] = `Bearer ${key}`;
    headers['X-Auth-Key'] = key;
  }
  const r = await fetch(BE + urlPath, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, ok: r.ok, data };
};

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

try {
  // Obtain Admin authKey
  const loginRes = await api('POST', '/api/auth/login', { body: { username: 'admin@gmail.com', password: 'admin123' } });
  assert.equal(loginRes.status, 200);
  adminKey = loginRes.data.authKey;

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Sign in as Admin in browser
  await page.goto(`${FE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="email"]');
  await page.type('input[name="email"]', 'admin@gmail.com');
  await page.type('input[name="password"]', 'admin123');
  await page.click('button.lg-submit');
  await page.waitForSelector('.side', { timeout: 10000 });

  await test('TC-ROLE-01', 'Navigate to /hr/roles (Roles & Access under Masters) and verify seeded system roles', async () => {
    await page.goto(`${FE}/hr/roles`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.rl-table', { timeout: 10000 });
    await sleep(500);
    const txt = await page.$eval('.rl-table', (el) => el.textContent);
    assert.ok(txt.includes('Admin') && txt.includes('Manager') && txt.includes('Staff'), 'System roles must be listed');
    await page.screenshot({ path: path.join(OUT, '01_roles_directory.png') });
    return 'Admin, Manager, Staff system roles visible';
  });

  await test('TC-ROLE-02', 'Create custom role via themed modal UI with selected pages only (Dashboard, Accounts, Invoices, Profile)', async () => {
    await page.click('[data-testid="new-role-btn"]');
    await page.waitForSelector('.rl-modal', { timeout: 5000 });
    await page.type('input[name="roleName"]', ROLE_NAME);
    await page.type('input[name="roleDescription"]', 'Read/write access restricted to Accounts and Invoices only');

    // Click Minimal preset first (leaves Dashboard + Profile), then check Accounts & Invoices
    await page.evaluate(() => {
      const minBtn = [...document.querySelectorAll('.rl-presets-bar button')].find((b) => /Minimal/i.test(b.textContent));
      if (minBtn) minBtn.click();
    });
    await sleep(200);
    await page.click('input[data-page-path="/accounts"]');
    await page.click('input[data-page-path="/finance"]');
    await page.evaluate(() => { const b = document.querySelector('.rl-modal__body'); if (b) b.scrollTop = 0; });
    await sleep(250);
    await page.screenshot({ path: path.join(OUT, '02_create_role_modal.png') });

    await page.click('[data-testid="save-role-btn"]');
    await sleep(900);
    const txt = await page.$eval('.rl-table', (el) => el.textContent);
    assert.ok(txt.includes(ROLE_NAME), 'Created custom role missing from table');

    const rolesRes = await api('GET', '/api/roles', { key: adminKey });
    const found = (rolesRes.data.data || []).find((r) => r.name === ROLE_NAME);
    assert.ok(found, 'Custom role must persist in MongoDB');
    createdRoleId = found._id;
    return `Created "${ROLE_NAME}" (${found.allowedPages.length} pages)`;
  });

  await test('TC-ROLE-03', 'Custom role appears dynamically in Add Employee Login Role dropdown & can be assigned to employee', async () => {
    await page.goto(`${FE}/hr/staff/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#hr-staff-form', { timeout: 10000 });
    await sleep(600);
    const opts = await page.$$eval('select[name="accessLevel"] option', (os) => os.map((o) => o.value));
    assert.ok(opts.includes(ROLE_NAME), `Custom role "${ROLE_NAME}" missing from Employee form dropdown: ${opts.join(', ')}`);

    // Create employee assigned to the custom role via API
    const empRes = await api('POST', '/api/staff', {
      key: adminKey,
      body: {
        firstName: 'Dev', lastName: 'Auditor', branch: 'Head Office',
        department: 'Accounts', role: 'Auditor', joiningDate: '2026-11-01', status: 'Active',
        createLogin: true, accessLevel: ROLE_NAME, username: EMP_USER, password: EMP_PASS
      }
    });
    assert.equal(empRes.status, 201, JSON.stringify(empRes.data));
    createdStaffId = empRes.data.data._id;
    return `Assigned employee '${EMP_USER}' to custom role '${ROLE_NAME}'`;
  });

  await test('TC-ROLE-04', 'Custom role API & delete protection: deleting an in-use role returns 409 Conflict; system role returns 400', async () => {
    const delInUse = await api('DELETE', `/api/roles/${createdRoleId}`, { key: adminKey });
    assert.equal(delInUse.status, 409, `Expected 409 for in-use role, got ${delInUse.status}`);

    const delSys = await api('DELETE', '/api/roles/admin', { key: adminKey });
    assert.equal(delSys.status, 400, `Expected 400 for system role, got ${delSys.status}`);
    return 'System & in-use deletion guards verified';
  });

  await test('TC-ROLE-05', 'Custom role user logs in: API enforces custom allowedPages (Accounts & Invoices 200; HR, Roles, Settings 403)', async () => {
    const uLogin = await api('POST', '/api/auth/login', { body: { username: EMP_USER, password: EMP_PASS } });
    assert.equal(uLogin.status, 200);
    assert.equal(uLogin.data.user.role, ROLE_NAME);
    const uKey = uLogin.data.authKey;

    assert.equal((await api('GET', '/api/accounts/dashboard', { key: uKey })).status, 200, 'Accounts must be allowed');
    assert.equal((await api('GET', '/api/invoices', { key: uKey })).status, 200, 'Invoices must be allowed');
    assert.equal((await api('GET', '/api/staff', { key: uKey })).status, 403, 'HR Staff must be 403');
    assert.equal((await api('GET', '/api/hr/payroll', { key: uKey })).status, 403, 'HR Payroll must be 403');
    assert.equal((await api('GET', '/api/roles', { key: uKey })).status, 403, 'Roles CRUD must be 403');
    assert.equal((await api('GET', '/api/settings/smtp', { key: uKey })).status, 403, 'Settings SMTP must be 403');
    return 'API RBAC strictly matched custom role permissions';
  });

  await test('TC-ROLE-06', 'Custom role user browser UI: sidebar hides non-permitted pages & direct URL shows 403 Access Restricted', async () => {
    await page.evaluate(() => window.__performLogout && window.__performLogout());
    await sleep(600);
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', EMP_USER);
    await page.type('input[name="password"]', EMP_PASS);
    await page.click('button.lg-submit');
    await page.waitForSelector('.side', { timeout: 10000 });
    await sleep(500);

    const navItems = await page.$$eval('.side__nav .nav__item', (els) => els.map((e) => e.textContent.trim()));
    assert.ok(navItems.some((x) => x.includes('Dashboard')), 'Dashboard must appear');
    assert.ok(navItems.some((x) => x.includes('Accounts')), 'Accounts must appear');
    assert.ok(navItems.some((x) => x.includes('Invoice')), 'Invoice must appear');
    for (const hidden of ['Clients', 'Deals', 'Human Resources', 'Masters', 'Settings']) {
      assert.ok(!navItems.some((x) => x.includes(hidden)), `Custom role sidebar must hide '${hidden}', saw: ${navItems.join(', ')}`);
    }

    // Allowed page loads cleanly
    await page.goto(`${FE}/accounts/dashboard`, { waitUntil: 'domcontentloaded' });
    await sleep(800);
    const forbiddenAcc = await page.$('[data-testid="access-restricted-page"]');
    assert.ok(!forbiddenAcc, '/accounts/dashboard should NOT show 403');

    // Restricted pages show 403
    for (const blocked of ['/hr/roles', '/hr/staff', '/clients/companies', '/settings']) {
      await page.goto(`${FE}${blocked}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="access-restricted-page"]', { timeout: 8000 });
    }
    await sleep(300);
    await page.screenshot({ path: path.join(OUT, '03_custom_role_403_and_sidebar.png') });
    return `Sidebar restricted to ${navItems.length} allowed items; 4 non-permitted pages returned 403`;
  });

  await test('TC-ROLE-07', 'Update custom role (rename + add Clients) via PUT /api/roles/:id and delete after unassigning employee', async () => {
    const upd = await api('PUT', `/api/roles/${createdRoleId}`, {
      key: adminKey,
      body: { name: ROLE_RENAMED, allowedPages: ['/today', '/accounts', '/finance', '/clients', '/profile'] }
    });
    assert.equal(upd.status, 200);
    assert.equal(upd.data.data.name, ROLE_RENAMED);

    // Delete assigned employee, then delete role
    const delEmp = await api('DELETE', `/api/staff/${createdStaffId}`, { key: adminKey });
    assert.equal(delEmp.status, 200);
    createdStaffId = null;

    const delRole = await api('DELETE', `/api/roles/${createdRoleId}`, { key: adminKey });
    assert.equal(delRole.status, 200);
    createdRoleId = null;
    return `Renamed to "${ROLE_RENAMED}", verified update, then cleanly deleted`;
  });

  await test('TC-ROLE-08', 'Non-Admin roles (Manager & Staff) are blocked from /api/roles (403 Forbidden)', async () => {
    const mLogin = await api('POST', '/api/auth/login', { body: { email: 'manager@tessly.local', password: 'password123' } });
    const sLogin = await api('POST', '/api/auth/login', { body: { email: 'staff@tessly.local', password: 'password123' } });
    assert.equal((await api('GET', '/api/roles', { key: mLogin.data.authKey })).status, 403);
    assert.equal((await api('POST', '/api/roles', { key: mLogin.data.authKey, body: { name: 'Hack', allowedPages: ['/today'] } })).status, 403);
    assert.equal((await api('GET', '/api/roles', { key: sLogin.data.authKey })).status, 403);
    return 'Manager and Staff strictly blocked (403) from Role Management API';
  });
} finally {
  await browser.close();
  if (createdStaffId) await api('DELETE', `/api/staff/${createdStaffId}`, { key: adminKey }).catch(() => {});
  if (createdRoleId) await api('DELETE', `/api/roles/${createdRoleId}`, { key: adminKey }).catch(() => {});
}

console.log(`\n======================================================`);
console.log(`ROLE MANAGEMENT FULL CRUD & RBAC E2E: ${passed}/${passed + failed} PASSED`);
console.log(`======================================================`);
process.exit(failed ? 1 : 0);
