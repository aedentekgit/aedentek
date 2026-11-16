import puppeteer from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:1234';
const OUT_DIR = path.resolve('test-reports/rbac');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let passed = 0;
let failed = 0;
const results = [];

function assert(name, condition, details = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ [PASS] ${name}`);
    results.push({ name, status: 'PASS', details });
  } else {
    failed++;
    console.error(`  ✗ [FAIL] ${name} - ${details}`);
    results.push({ name, status: 'FAIL', details });
  }
}

async function run() {
  console.log('===============================================================');
  console.log('ROLE-BASED ACCESS CONTROL (RBAC) FRONTEND TEST SUITE');
  console.log(`Target: ${BASE_URL}`);
  console.log('===============================================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,960']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  try {
    // -------------------------------------------------------------------------
    // TEST SECTION 1: AUTHENTICATION & ADMIN ROLE VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- 1. ADMIN ROLE & FULL ACCESS CAPABILITIES ---');
    console.log(`Navigating to ${BASE_URL}/login...`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await sleep(800);

    // Login as Admin
    await page.type('input[type="email"]', 'ines@caldermoss.co');
    await page.type('input[autocomplete="current-password"]', 'marble88');
    await page.click('.lg-submit');
    await sleep(1200);

    const afterLoginUrl = page.url();
    assert('Admin logs in and reaches /today workspace', afterLoginUrl.includes('/today'), `Current URL: ${afterLoginUrl}`);

    // Verify window.__getUserRole returns 'Admin'
    const adminRole = await page.evaluate(() => {
      if (typeof window.__getUserRole === 'function') return window.__getUserRole();
      return null;
    });
    assert('Active session role is detected as Admin', adminRole === 'Admin', `Detected: ${adminRole}`);

    // Verify Sidebar groups for Admin
    const adminSidebar = await page.evaluate(() => {
      const groups = Array.from(document.querySelectorAll('.side__group')).map((g) => {
        const lbl = g.querySelector('.side__label');
        return lbl ? lbl.textContent.trim().toUpperCase() : '';
      }).filter(Boolean);

      const allLinks = Array.from(document.querySelectorAll('.side a')).map((a) => ({
        href: a.getAttribute('href'),
        text: a.textContent.trim()
      }));

      const meRole = document.querySelector('.mecard__txt small')?.textContent || '';
      const meName = document.querySelector('.mecard__txt b')?.textContent || '';

      return { groups, allLinks, meRole, meName };
    });

    assert('Admin sidebar contains WORKSPACE group', adminSidebar.groups.includes('WORKSPACE'));
    assert('Admin sidebar contains MONEY group', adminSidebar.groups.includes('MONEY'));
    assert('Admin sidebar contains ACCOUNTS group', adminSidebar.groups.includes('ACCOUNTS'));
    assert('Admin sidebar contains PEOPLE group', adminSidebar.groups.includes('PEOPLE'));
    assert('Admin sidebar contains MASTERS group', adminSidebar.groups.includes('MASTERS'));
    assert('Admin sidebar contains STUDIO group', adminSidebar.groups.includes('STUDIO'));
    assert('Admin sidebar Me card displays active role Admin', adminSidebar.meRole.includes('Admin'), adminSidebar.meRole);

    const hasSettingsLink = adminSidebar.allLinks.some((l) => l.href && l.href.includes('/settings'));
    assert('Admin sidebar contains link to Settings', hasSettingsLink);

    // Capture Admin full sidebar screenshot
    const adminScreenshotPath = path.join(OUT_DIR, '01_rbac_admin_full_workspace.png');
    await page.screenshot({ path: adminScreenshotPath, fullPage: false });
    console.log(`  📸 Saved screenshot: ${adminScreenshotPath}`);

    // Admin direct navigation to /settings
    console.log('\nNavigating Admin to /settings...');
    await page.evaluate(() => {
      if (window.__navigate) window.__navigate('/settings');
      else history.pushState(null, '', '/settings');
    });
    await sleep(800);

    const adminSettingsCheck = await page.evaluate(() => {
      const isRestricted = !!document.querySelector('.access-restricted, .rbac-restricted-card, [data-testid="access-restricted-page"]');
      const hasSettingsContent = !!document.querySelector('.set-shell') || document.body.textContent.includes('Studio Settings') || document.body.textContent.includes('Settings');
      return { isRestricted, hasSettingsContent };
    });

    assert('Admin is granted access to /settings (no 403 screen)', !adminSettingsCheck.isRestricted && adminSettingsCheck.hasSettingsContent);
    const adminSettingsScreenshot = path.join(OUT_DIR, '02_rbac_admin_settings_allowed.png');
    await page.screenshot({ path: adminSettingsScreenshot, fullPage: false });
    console.log(`  📸 Saved screenshot: ${adminSettingsScreenshot}`);

    // Admin direct navigation to /accounts/dashboard
    console.log('\nNavigating Admin to /accounts/dashboard...');
    await page.evaluate(() => {
      if (window.__navigate) window.__navigate('/accounts/dashboard');
      else history.pushState(null, '', '/accounts/dashboard');
    });
    await sleep(800);
    const adminAccountsCheck = await page.evaluate(() => !document.querySelector('.access-restricted, .rbac-restricted-card'));
    assert('Admin is granted access to /accounts/dashboard', adminAccountsCheck);

    // Admin direct navigation to /hr/payroll
    console.log('\nNavigating Admin to /hr/payroll...');
    await page.evaluate(() => {
      if (window.__navigate) window.__navigate('/hr/payroll');
      else history.pushState(null, '', '/hr/payroll');
    });
    await sleep(800);
    const adminPayrollCheck = await page.evaluate(() => !document.querySelector('.access-restricted, .rbac-restricted-card'));
    assert('Admin is granted access to /hr/payroll', adminPayrollCheck);

    // -------------------------------------------------------------------------
    // TEST SECTION 2: MANAGER ROLE & RESTRICTIONS VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- 2. MANAGER ROLE & RESTRICTIONS ---');
    console.log('Switching role to Manager via window.__setRole("Manager")...');
    await page.evaluate(() => {
      if (typeof window.__setRole === 'function') window.__setRole('Manager');
    });
    await sleep(600);

    const managerRole = await page.evaluate(() => window.__getUserRole());
    assert('Active session role is updated to Manager', managerRole === 'Manager', `Role: ${managerRole}`);

    // Verify Sidebar groups for Manager
    const managerSidebar = await page.evaluate(() => {
      const groups = Array.from(document.querySelectorAll('.side__group')).map((g) => {
        const lbl = g.querySelector('.side__label');
        return lbl ? lbl.textContent.trim().toUpperCase() : '';
      }).filter(Boolean);

      const allLinks = Array.from(document.querySelectorAll('.side a')).map((a) => ({
        href: a.getAttribute('href'),
        text: a.textContent.trim()
      }));

      const hrContainer = Array.from(document.querySelectorAll('.nav__item')).find((el) => el.textContent.includes('Human Resources'));
      const hrSubs = hrContainer ? Array.from(hrContainer.closest('div').querySelectorAll('.nav__sub')).map(s => s.textContent.trim()) : [];

      const meRole = document.querySelector('.mecard__txt small')?.textContent || '';

      return { groups, allLinks, hrSubs, meRole };
    });

    assert('Manager sidebar displays WORKSPACE', managerSidebar.groups.includes('WORKSPACE'));
    assert('Manager sidebar displays MONEY', managerSidebar.groups.includes('MONEY'));
    assert('Manager sidebar displays ACCOUNTS', managerSidebar.groups.includes('ACCOUNTS'));
    assert('Manager sidebar displays PEOPLE', managerSidebar.groups.includes('PEOPLE'));
    assert('Manager sidebar COMPLETELY HIDES MASTERS', !managerSidebar.groups.includes('MASTERS'));
    assert('Manager sidebar COMPLETELY HIDES Settings from STUDIO', !managerSidebar.allLinks.some((l) => l.href && l.href.includes('/settings')));
    assert('Manager sidebar hides Salary & Payroll sub-items from HR',
      !managerSidebar.hrSubs.includes('Salary Structures') &&
      !managerSidebar.hrSubs.includes('Salary Advances') &&
      !managerSidebar.hrSubs.includes('Payroll Adjustments') &&
      !managerSidebar.hrSubs.includes('Payroll & Payslips'),
      JSON.stringify(managerSidebar.hrSubs)
    );
    assert('Manager sidebar Me card reflects active Manager role', managerSidebar.meRole.includes('Manager'), managerSidebar.meRole);

    const managerSidebarScreenshot = path.join(OUT_DIR, '03_rbac_manager_filtered_sidebar.png');
    await page.screenshot({ path: managerSidebarScreenshot, fullPage: false });
    console.log(`  📸 Saved screenshot: ${managerSidebarScreenshot}`);

    // Manager Route Guard: Direct attempt to /settings
    console.log('\nTesting Manager direct navigation to restricted route /settings...');
    await page.evaluate(() => {
      if (window.__navigate) window.__navigate('/settings');
      else history.pushState(null, '', '/settings');
    });
    await sleep(800);

    const managerSettingsBlock = await page.evaluate(() => {
      const card = document.querySelector('.access-restricted, .rbac-restricted-card');
      if (!card) return { blocked: false };
      const ttl = card.querySelector('.ttl')?.textContent || '';
      const text = card.textContent || '';
      return { blocked: true, ttl, text };
    });

    assert('Manager is BLOCKED from /settings with 403 Forbidden', managerSettingsBlock.blocked);
    assert('Restricted screen displays 403 HTTP error code', managerSettingsBlock.ttl.includes('403'), managerSettingsBlock.ttl);
    assert('Restricted screen shows active role is Manager', managerSettingsBlock.text.includes('Current role: Manager'), managerSettingsBlock.text);
    assert('Restricted screen explains Admin privilege requirement', /Admin/i.test(managerSettingsBlock.text), managerSettingsBlock.text);

    const managerDeniedSettingsScreenshot = path.join(OUT_DIR, '04_rbac_manager_denied_settings.png');
    await page.screenshot({ path: managerDeniedSettingsScreenshot, fullPage: false });
    console.log(`  📸 Saved screenshot: ${managerDeniedSettingsScreenshot}`);

    // Manager Route Guard: Direct attempt to /hr/payroll
    console.log('\nTesting Manager direct navigation to restricted route /hr/payroll...');
    await page.evaluate(() => {
      if (window.__navigate) window.__navigate('/hr/payroll');
      else history.pushState(null, '', '/hr/payroll');
    });
    await sleep(800);

    const managerPayrollBlock = await page.evaluate(() => {
      const card = document.querySelector('.access-restricted, .rbac-restricted-card');
      return !!card;
    });
    assert('Manager is BLOCKED from /hr/payroll with 403 Forbidden', managerPayrollBlock);

    const managerDeniedPayrollScreenshot = path.join(OUT_DIR, '05_rbac_manager_denied_payroll.png');
    await page.screenshot({ path: managerDeniedPayrollScreenshot, fullPage: false });
    console.log(`  📸 Saved screenshot: ${managerDeniedPayrollScreenshot}`);

    // Manager Allowed Route: /accounts/dashboard
    console.log('\nTesting Manager allowed navigation to /accounts/dashboard...');
    await page.evaluate(() => {
      if (window.__navigate) window.__navigate('/accounts/dashboard');
      else history.pushState(null, '', '/accounts/dashboard');
    });
    await sleep(800);

    const managerAccountsAllowed = await page.evaluate(() => !document.querySelector('.access-restricted, .rbac-restricted-card'));
    assert('Manager is ALLOWED access to /accounts/dashboard', managerAccountsAllowed);

    const managerAllowedAccountsScreenshot = path.join(OUT_DIR, '06_rbac_manager_allowed_accounts.png');
    await page.screenshot({ path: managerAllowedAccountsScreenshot, fullPage: false });
    console.log(`  📸 Saved screenshot: ${managerAllowedAccountsScreenshot}`);

    // -------------------------------------------------------------------------
    // TEST SECTION 3: STAFF ROLE & MINIMAL SCOPE VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- 3. STAFF ROLE & SALES DESK ISOLATION ---');
    console.log('Switching role to Staff via window.__setRole("Staff")...');
    await page.evaluate(() => {
      if (typeof window.__setRole === 'function') window.__setRole('Staff');
    });
    await sleep(600);

    const staffRole = await page.evaluate(() => window.__getUserRole());
    assert('Active session role is updated to Staff', staffRole === 'Staff', `Role: ${staffRole}`);

    // Verify Sidebar groups for Staff: ONLY WORKSPACE and STUDIO (Profile, Playbooks, Support)
    const staffSidebar = await page.evaluate(() => {
      const groups = Array.from(document.querySelectorAll('.side__group')).map((g) => {
        const lbl = g.querySelector('.side__label');
        return lbl ? lbl.textContent.trim().toUpperCase() : '';
      }).filter(Boolean);

      const allLinks = Array.from(document.querySelectorAll('.side a')).map((a) => ({
        href: a.getAttribute('href'),
        text: a.textContent.trim()
      }));

      const meRole = document.querySelector('.mecard__txt small')?.textContent || '';

      return { groups, allLinks, meRole };
    });

    assert('Staff sidebar displays WORKSPACE', staffSidebar.groups.includes('WORKSPACE'));
    assert('Staff sidebar COMPLETELY BLOCKS MONEY group', !staffSidebar.groups.includes('MONEY'));
    assert('Staff sidebar COMPLETELY BLOCKS ACCOUNTS group', !staffSidebar.groups.includes('ACCOUNTS'));
    assert('Staff sidebar COMPLETELY BLOCKS PEOPLE group', !staffSidebar.groups.includes('PEOPLE'));
    assert('Staff sidebar COMPLETELY BLOCKS MASTERS group', !staffSidebar.groups.includes('MASTERS'));
    assert('Staff sidebar COMPLETELY BLOCKS Settings link', !staffSidebar.allLinks.some((l) => l.href && l.href.includes('/settings')));
    assert('Staff sidebar Me card displays active Staff role', staffSidebar.meRole.includes('Staff'), staffSidebar.meRole);

    const staffSidebarScreenshot = path.join(OUT_DIR, '07_rbac_staff_minimal_sidebar.png');
    await page.screenshot({ path: staffSidebarScreenshot, fullPage: false });
    console.log(`  📸 Saved screenshot: ${staffSidebarScreenshot}`);

    // Staff Route Guard: Direct attempt to /accounts/expenses
    console.log('\nTesting Staff direct navigation to restricted route /accounts/expenses...');
    await page.evaluate(() => {
      if (window.__navigate) window.__navigate('/accounts/expenses');
      else history.pushState(null, '', '/accounts/expenses');
    });
    await sleep(800);

    const staffAccountsBlock = await page.evaluate(() => {
      const card = document.querySelector('.access-restricted, .rbac-restricted-card');
      if (!card) return { blocked: false };
      const ttl = card.querySelector('.ttl')?.textContent || '';
      const text = card.textContent || '';
      return { blocked: true, ttl, text };
    });

    assert('Staff is BLOCKED from /accounts/expenses with 403 Forbidden', staffAccountsBlock.blocked);
    assert('Staff 403 specifies higher privilege requirement', /Admin|Manager/i.test(staffAccountsBlock.text), staffAccountsBlock.text);

    const staffDeniedAccountsScreenshot = path.join(OUT_DIR, '08_rbac_staff_denied_accounts.png');
    await page.screenshot({ path: staffDeniedAccountsScreenshot, fullPage: false });
    console.log(`  📸 Saved screenshot: ${staffDeniedAccountsScreenshot}`);

    // Staff Route Guard: Direct attempt to /hr/staff
    console.log('\nTesting Staff direct navigation to restricted route /hr/staff...');
    await page.evaluate(() => {
      if (window.__navigate) window.__navigate('/hr/staff');
      else history.pushState(null, '', '/hr/staff');
    });
    await sleep(800);

    const staffHrBlock = await page.evaluate(() => !!document.querySelector('.access-restricted, .rbac-restricted-card'));
    assert('Staff is BLOCKED from /hr/staff with 403 Forbidden', staffHrBlock);

    const staffDeniedHrScreenshot = path.join(OUT_DIR, '09_rbac_staff_denied_hr.png');
    await page.screenshot({ path: staffDeniedHrScreenshot, fullPage: false });
    console.log(`  📸 Saved screenshot: ${staffDeniedHrScreenshot}`);

    // Staff Route Guard: Direct attempt to /invoices
    console.log('\nTesting Staff direct navigation to restricted route /invoices...');
    await page.evaluate(() => {
      if (window.__navigate) window.__navigate('/invoices');
      else history.pushState(null, '', '/invoices');
    });
    await sleep(800);

    const staffInvoicesBlock = await page.evaluate(() => !!document.querySelector('.access-restricted, .rbac-restricted-card'));
    assert('Staff is BLOCKED from /invoices with 403 Forbidden', staffInvoicesBlock);

    // -------------------------------------------------------------------------
    // TEST SECTION 4: 403 ACCESS RESTRICTED VIEW INTERACTION ("Return to Dashboard")
    // -------------------------------------------------------------------------
    console.log('\n--- 4. INTERACTION TEST: RETURN TO DASHBOARD ---');
    const returnBtnExists = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="rbac-back-dashboard-btn"]') ||
        Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Return to Dashboard'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    assert('Return to Dashboard button clicked in AccessRestrictedView', returnBtnExists);
    await sleep(800);

    const currentPath = await page.evaluate(() => window.location.pathname);
    const todayLoaded = await page.evaluate(() => !document.querySelector('.access-restricted, .rbac-restricted-card') && (document.body.textContent.includes('Today') || document.body.textContent.includes('Workspace')));
    assert('Navigated back to /today sales desk successfully', currentPath.includes('/today') && todayLoaded, `Path: ${currentPath}`);

    const staffDashboardScreenshot = path.join(OUT_DIR, '10_rbac_staff_returned_to_dashboard.png');
    await page.screenshot({ path: staffDashboardScreenshot, fullPage: false });
    console.log(`  📸 Saved screenshot: ${staffDashboardScreenshot}`);

    // -------------------------------------------------------------------------
    // TEST SECTION 5: GLOBAL FETCH INTERCEPTOR & BACKEND RBAC INTEGRATION
    // -------------------------------------------------------------------------
    console.log('\n--- 5. FETCH INTERCEPTOR & BACKEND VERIFICATION ---');
    const fetchAuthMeResult = await page.evaluate(async () => {
      try {
        const res = await window.fetch('/api/auth/me');
        const json = await res.json();
        return { status: res.status, data: json };
      } catch (e) {
        return { error: e.message };
      }
    });

    assert('Fetch interceptor forwards active role to /api/auth/me',
      fetchAuthMeResult.status === 200 && (fetchAuthMeResult.data?.user?.role === 'Staff' || fetchAuthMeResult.data?.data?.role === 'Staff'),
      JSON.stringify(fetchAuthMeResult)
    );

    // Switch back to Admin and verify fetch interceptor sends Admin role
    await page.evaluate(() => window.__setRole('Admin'));
    await sleep(200);

    const fetchAuthMeAdminResult = await page.evaluate(async () => {
      try {
        const res = await window.fetch('/api/auth/me');
        const json = await res.json();
        return { status: res.status, data: json };
      } catch (e) {
        return { error: e.message };
      }
    });

    assert('Switching role dynamically updates fetch interceptor headers to Admin',
      fetchAuthMeAdminResult.status === 200 && (fetchAuthMeAdminResult.data?.user?.role === 'Admin' || fetchAuthMeAdminResult.data?.data?.role === 'Admin'),
      JSON.stringify(fetchAuthMeAdminResult)
    );

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n===============================================================');
  console.log(`FRONTEND RBAC TEST EXECUTION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run();
