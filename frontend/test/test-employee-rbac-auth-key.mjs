/**
 * E2E Browser Test Suite:
 * Employee Add (Role, Username, Password) -> Login Validation with Auth Key -> Role-Based Page Access
 *
 * Runs against live local servers:
 *   Frontend: http://localhost:1234
 *   Backend:  http://localhost:5001
 */
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = path.resolve(__dirname, '../../test-reports/employee-rbac-auth-key');
fs.mkdirSync(REPORT_DIR, { recursive: true });

const FRONTEND_URL = 'http://localhost:1234';
const BACKEND_URL = 'http://localhost:5001';
const TAG = `e2e${Date.now().toString().slice(-6)}`;
const STAFF_USER = `${TAG}.staff`;
const STAFF_PASS = 'StaffE2e123!';
const MGR_USER = `${TAG}.mgr`;
const MGR_PASS = 'MgrE2e123!';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const createdIds = [];
let adminToken = '';
let passed = 0;
let failed = 0;
const results = [];

async function test(id, name, fn) {
  try {
    const note = (await fn()) || 'Verified';
    passed++;
    results.push({ id, name, status: 'PASS', note });
    console.log(`✓ [PASS] ${id}: ${name} — ${note}`);
  } catch (err) {
    failed++;
    results.push({ id, name, status: 'FAIL', note: err.message });
    console.error(`✗ [FAIL] ${id}: ${name} -> ${err.message}`);
  }
}

async function shot(page, filename) {
  const full = path.join(REPORT_DIR, filename);
  await page.screenshot({ path: full, fullPage: false });
  return full;
}

async function signIn(page, identifier, password) {
  await page.goto(`${FRONTEND_URL}/signin`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  await page.evaluate(() => {
    const e = document.querySelector('input[name="email"]');
    const p = document.querySelector('input[name="password"]');
    if (e) e.value = '';
    if (p) p.value = '';
  });
  await page.click('input[name="email"]', { clickCount: 3 });
  await page.type('input[name="email"]', identifier);
  await page.click('input[name="password"]', { clickCount: 3 });
  await page.type('input[name="password"]', password);
  await page.click('button.lg-submit');
  await sleep(1100);
}

async function signOut(page) {
  await page.evaluate(() => {
    if (typeof window.__performLogout === 'function') window.__performLogout();
  });
  await sleep(700);
}

async function createEmployeeViaUI(page, { firstName, lastName, email, roleTitle, accessLevel, username, password }) {
  await page.goto(`${FRONTEND_URL}/hr/staff/new`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#hr-staff-form', { timeout: 10000 });

  // Switch to All-in-one mode if toggle exists, or fill wizard step-by-step
  const hasAllBtn = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const allBtn = btns.find((b) => /all-in-one|all fields/i.test(b.textContent || ''));
    if (allBtn) { allBtn.click(); return true; }
    return false;
  });
  if (hasAllBtn) await sleep(300);

  // Fill fields directly via native React value setter + input/change events so wizard/all-in-one both work
  await page.evaluate((emp) => {
    const form = document.getElementById('hr-staff-form');
    const setVal = (name, val) => {
      const el = form.querySelector(`[name="${name}"]`);
      if (!el) throw new Error(`Missing form field: ${name}`);
      if (el.type === 'checkbox') {
        if (el.checked !== Boolean(val)) el.click();
        return;
      }
      const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setVal('firstName', emp.firstName);
    setVal('lastName', emp.lastName);
    setVal('email', emp.email);
    setVal('role', emp.roleTitle);
    setVal('joiningDate', '2026-11-01');
    const brSel = form.querySelector('select[name="branch"]');
    if (brSel && (!brSel.value || brSel.value === '')) {
      const opt = [...brSel.options].find((o) => o.value);
      if (opt) setVal('branch', opt.value);
    }
    setVal('createLogin', true);
    setVal('accessLevel', emp.accessLevel);
    setVal('username', emp.username);
    setVal('password', emp.password);
    setVal('confirmPassword', emp.password);
  }, { firstName, lastName, email, roleTitle, accessLevel, username, password });

  // If still in wizard mode, advance to step 4 (Portal access)
  if (!hasAllBtn) {
    for (let i = 0; i < 4; i++) {
      const nextBtn = await page.$('#wz-next');
      if (nextBtn) { await nextBtn.click(); await sleep(250); }
    }
  }
  await sleep(300);
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Capture outgoing API headers to prove X-Auth-Key + Authorization Bearer are sent
  const authHeadersSeen = [];
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().includes('/api/auth/verify') || req.url().includes('/api/staff')) {
      const h = req.headers();
      if (h['x-auth-key'] || h['authorization']) {
        authHeadersSeen.push({
          url: req.url(),
          hasBearer: Boolean(h['authorization'] && h['authorization'].startsWith('Bearer ')),
          hasAuthKey: Boolean(h['x-auth-key'])
        });
      }
    }
    req.continue();
  });

  // TC-UI-01: Admin sign-in & authKey persistence + header verification
  await test('TC-UI-01', 'Admin signs in on /signin and sends X-Auth-Key + Bearer JWT on protected API calls', async () => {
    await signIn(page, 'admin@gmail.com', 'admin123');
    await page.waitForSelector('.side', { timeout: 10000 });
    const session = await page.evaluate(() => ({
      path: location.pathname,
      authKey: sessionStorage.getItem('tessly:authKey'),
      jwt: sessionStorage.getItem('tessly:jwt'),
      role: sessionStorage.getItem('tessly:role')
    }));
    assert.equal(session.role, 'Admin');
    assert.ok(session.authKey && session.authKey.split('.').length === 3, 'Signed JWT authKey must be stored');
    assert.equal(session.authKey, session.jwt);
    adminToken = session.authKey;

    // Confirm /api/auth/verify fired with both headers
    await sleep(400);
    const verifyCall = authHeadersSeen.find((x) => x.url.includes('/api/auth/verify'));
    assert.ok(verifyCall && verifyCall.hasBearer && verifyCall.hasAuthKey, 'GET /api/auth/verify must send Authorization Bearer and X-Auth-Key');
    return `Signed in at ${session.path}, authKey stored & verified via X-Auth-Key + Bearer`;
  });

  // TC-UI-02: Employee Add form shows Login Role, Username, Password & live Page Access Scope
  await test('TC-UI-02', 'Add Employee Portal Access step exposes Login Role, Username, Password & dynamic Page Access Scope', async () => {
    await createEmployeeViaUI(page, {
      firstName: 'Kiran', lastName: 'StaffE2E', email: `${TAG}.staff@test.local`,
      roleTitle: 'Sales Rep', accessLevel: 'Staff', username: STAFF_USER, password: STAFF_PASS
    });
    const scopeText = await page.$eval('[data-testid="role-access-summary"]', (el) => el.textContent);
    assert.ok(scopeText.includes('Staff Role') && (scopeText.includes('Sales desk') || scopeText.includes('workspace access') || scopeText.includes('Restricted')), `Unexpected scope: ${scopeText}`);
    await shot(page, '01_add_employee_portal_access.png');

    await page.click('#wz-submit');
    await sleep(1200);
    const curPath = await page.evaluate(() => location.pathname);
    assert.equal(curPath, '/hr/staff', `Expected redirect to /hr/staff, got ${curPath}`);
    return `Created Staff employee (${STAFF_USER}) via UI`;
  });

  // TC-UI-03: Create Manager employee & verify both appear in Employee Directory with Login Access badges
  await test('TC-UI-03', 'Create Manager employee and verify Login Access column badges in Employee Directory', async () => {
    await createEmployeeViaUI(page, {
      firstName: 'Neha', lastName: 'ManagerE2E', email: `${TAG}.mgr@test.local`,
      roleTitle: 'Branch Manager', accessLevel: 'Manager', username: MGR_USER, password: MGR_PASS
    });
    const scopeText = await page.$eval('[data-testid="role-access-summary"]', (el) => el.textContent);
    assert.ok(scopeText.includes('Manager Role') && (scopeText.includes('Operational') || scopeText.includes('Workspace') || scopeText.includes('Restricted')), `Unexpected manager scope: ${scopeText}`);
    await page.click('#wz-submit');
    await sleep(1200);

    await page.waitForSelector('.table', { timeout: 10000 });
    const tableText = await page.$eval('.table', (el) => el.textContent);
    assert.ok(tableText.includes('LOGIN ACCESS') || tableText.includes('Login Access'), 'Login Access column header missing');
    assert.ok(tableText.includes(STAFF_USER) && tableText.includes(MGR_USER), 'Created usernames missing in directory');
    await shot(page, '02_employee_directory_login_access.png');

    // Collect IDs for cleanup
    const staffRes = await fetch(`${BACKEND_URL}/api/staff`, { headers: { 'X-Auth-Key': adminToken } }).then((r) => r.json());
    for (const s of staffRes.data || []) {
      if (s.username === STAFF_USER || s.username === MGR_USER) createdIds.push(s._id);
    }
    return `Both ${STAFF_USER} (Staff) & ${MGR_USER} (Manager) shown with Login Access badges`;
  });

  // TC-UI-04: Sign in with Staff employee USERNAME (no @ email) & verify Staff sidebar navigation
  await test('TC-UI-04', 'Staff employee signs in using Username (non-email) + Password and sees Staff-only sidebar', async () => {
    await signOut(page);
    const labelText = await page.$eval('.lg-label', (el) => el.textContent);
    assert.ok(/username or email/i.test(labelText), `Expected 'Username or Email' label, got '${labelText}'`);

    await signIn(page, STAFF_USER, STAFF_PASS);
    await page.waitForSelector('.side', { timeout: 10000 });

    const nav = await page.evaluate(() => ({
      role: sessionStorage.getItem('tessly:role'),
      authKey: Boolean(sessionStorage.getItem('tessly:authKey')),
      items: [...document.querySelectorAll('.side__nav .nav__item')].map((el) => el.textContent.trim())
    }));
    assert.equal(nav.role, 'Staff');
    assert.ok(nav.authKey, 'Staff authKey must be stored');
    assert.ok(nav.items.some((x) => x.includes('Dashboard')) && nav.items.some((x) => x.includes('Clients')), 'Workspace links must be visible');
    for (const forbidden of ['Invoice', 'Accounts', 'Human Resources', 'Masters', 'Settings', 'Team']) {
      assert.ok(!nav.items.some((x) => x.includes(forbidden)), `Staff sidebar must hide '${forbidden}', saw: ${nav.items.join(', ')}`);
    }
    await shot(page, '03_staff_username_login_sidebar.png');
    return `Logged in as '${STAFF_USER}', sidebar restricted to workspace (${nav.items.length} items)`;
  });

  // TC-UI-05: Staff direct URL access to restricted pages renders 403 Access Restricted (no Switch Role bypass)
  await test('TC-UI-05', 'Staff blocked from direct navigation to /settings, /accounts, /finance, /hr/staff, /hr/payroll (403 page)', async () => {
    for (const restrictedPath of ['/settings', '/accounts/dashboard', '/finance/invoices', '/hr/staff', '/hr/payroll', '/hr/branches']) {
      await page.goto(`${FRONTEND_URL}${restrictedPath}`, { waitUntil: 'networkidle2' });
      await page.waitForSelector('[data-testid="access-restricted-page"]', { timeout: 8000 });
      const text = await page.$eval('[data-testid="access-restricted-page"]', (el) => el.textContent);
      assert.ok(text.includes('403') && text.includes('Current role: Staff'), `403 view missing for ${restrictedPath}`);
      assert.ok(!text.includes('Switch Role'), 'Client-side Switch Role button must not appear on 403 page');
    }
    await shot(page, '04_staff_403_access_restricted.png');

    // Also verify profile menu does NOT contain Switch Role privilege bypass
    await page.click('.mecard');
    await sleep(250);
    const menuText = await page.evaluate(() => document.body.innerText);
    assert.ok(!menuText.includes('Switch Role (RBAC)'), 'Profile menu must not allow client-side role elevation');
    return 'All 6 restricted routes returned 403 Access Restricted; no client-side role bypass';
  });

  // TC-UI-06: Manager employee login via username -> Manager sidebar & Admin-only routes blocked
  await test('TC-UI-06', 'Manager signs in via Username, accesses HR/Accounts/Invoices, blocked from Settings/Payroll/Masters', async () => {
    await signOut(page);
    await signIn(page, MGR_USER, MGR_PASS);
    await page.waitForSelector('.side', { timeout: 10000 });

    const navItems = await page.evaluate(() =>
      [...document.querySelectorAll('.side__nav .nav__item')].map((el) => el.textContent.trim())
    );
    assert.ok(navItems.some((x) => x.includes('Invoice')), 'Manager must see Invoice');
    assert.ok(navItems.some((x) => x.includes('Accounts')), 'Manager must see Accounts');
    assert.ok(navItems.some((x) => x.includes('Human Resources')), 'Manager must see HR');
    assert.ok(!navItems.some((x) => x.includes('Masters')), 'Manager must NOT see Masters');
    assert.ok(!navItems.some((x) => x.includes('Settings')), 'Manager must NOT see Settings');

    // Allowed route: /hr/staff
    await page.goto(`${FRONTEND_URL}/hr/staff`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.table', { timeout: 10000 });
    await shot(page, '05_manager_hr_access.png');

    // Restricted Admin-only routes
    for (const adminPath of ['/settings', '/hr/payroll', '/hr/salary', '/hr/offer-letter-templates', '/finance/settings']) {
      await page.goto(`${FRONTEND_URL}${adminPath}`, { waitUntil: 'networkidle2' });
      await page.waitForSelector('[data-testid="access-restricted-page"]', { timeout: 8000 });
    }
    await shot(page, '06_manager_403_admin_page.png');
    return `Manager '${MGR_USER}' accessed /hr/staff & blocked from 5 Admin-only pages`;
  });

  // TC-UI-07: Tampered / revoked Auth Key triggers automatic logout on reload via /api/auth/verify
  await test('TC-UI-07', 'Tampered authKey in storage fails /api/auth/verify on reload and auto-logs out to /signin', async () => {
    await page.evaluate(() => {
      const bad = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZha2UiLCJyb2xlIjoiQWRtaW4iLCJleHAiOjk5OTk5OTk5OTl9.FORGED_SIG';
      sessionStorage.setItem('tessly:authKey', bad);
      sessionStorage.setItem('tessly:jwt', bad);
      sessionStorage.setItem('tessly:token', bad);
      localStorage.setItem('tessly:authKey', bad);
      localStorage.setItem('tessly:jwt', bad);
      localStorage.setItem('tessly:token', bad);
    });
    await page.goto(`${FRONTEND_URL}/today`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('form.lg-form', { timeout: 10000 });
    await sleep(400);
    const after = await page.evaluate(() => ({
      path: location.pathname,
      authKey: sessionStorage.getItem('tessly:authKey'),
      jwt: sessionStorage.getItem('tessly:jwt')
    }));
    assert.equal(after.authKey, null, 'Forged authKey must be purged');
    assert.equal(after.jwt, null, 'Forged jwt must be purged');
    await shot(page, '07_forged_authkey_auto_logout.png');
    return `Auto-logged out to ${after.path} and purged tampered authKey`;
  });

  // TC-UI-08: Invalid login credentials rejected cleanly on /signin (no dev bypass)
  await test('TC-UI-08', 'Invalid credentials and legacy dev1234 password are rejected on /signin', async () => {
    await signIn(page, STAFF_USER, 'dev1234');
    await page.waitForSelector('.lg-err', { timeout: 5000 });
    const errText = await page.$eval('.lg-err', (el) => el.textContent);
    const hasSide = await page.$('.side');
    assert.ok(!hasSide, 'Workspace must remain locked');
    assert.ok(/invalid/i.test(errText), `Expected invalid credential error, got '${errText}'`);
    return `Rejected with message: "${errText}"`;
  });
} finally {
  await browser.close();
  // Clean up created E2E employees
  for (const id of createdIds) {
    await fetch(`${BACKEND_URL}/api/staff/${id}`, {
      method: 'DELETE',
      headers: { 'X-Auth-Key': adminToken }
    }).catch(() => {});
  }
}

console.log(`\n======================================================`);
console.log(`FRONTEND E2E EMPLOYEE RBAC & AUTH KEY TESTS: ${passed}/${passed + failed} PASSED`);
console.log(`======================================================`);
process.exit(failed ? 1 : 0);
