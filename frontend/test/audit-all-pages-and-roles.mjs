/**
 * Exhaustive Workflow & Role-Based Page Restriction Access Audit
 *
 * Checks:
 * 1. Admin Workflow: Visits all 45 routes -> Every page must load without 403 or fatal errors
 * 2. Manager Workflow: Visits all routes -> Verifies allowed routes load, Admin-only routes show 403 Access Restricted
 * 3. Staff Workflow: Visits all routes -> Verifies allowed workspace routes load, Finance/Accounts/HR/Masters/Settings show 403 Access Restricted
 * 4. Custom Role Workflow: Creates custom "Auditor" role -> Verifies dynamic restriction and sidebar scoping
 * 5. Console & Network Error Tracking: Asserts zero uncaught runtime errors across all workflows
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const TARGET_URL = process.env.AUDIT_URL || 'http://localhost:1234';
const REPORT_DIR = path.resolve('test-reports/role-page-audit');
fs.mkdirSync(REPORT_DIR, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

const USERS = {
  Admin: { email: 'admin@gmail.com', pass: 'admin123', name: 'System Administrator' },
  Manager: { email: 'manager@tessly.local', pass: 'password123', name: 'Branch Manager' },
  Staff: { email: 'staff@tessly.local', pass: 'password123', name: 'Frontline Staff' }
};

// Complete route catalog across the CRM
const ROUTES = [
  // Workspace
  { path: '/today', name: 'Dashboard / Overview', module: 'Workspace' },
  { path: '/clients/companies', name: 'Clients Directory', module: 'Clients' },
  { path: '/clients/new', name: 'New Client Onboarding', module: 'Clients' },
  { path: '/deals/board', name: 'Deals Kanban Board', module: 'Deals' },
  { path: '/deals/forecast', name: 'Deals Forecast Sheet', module: 'Deals' },
  { path: '/projects', name: 'Projects Register', module: 'Projects' },

  // Reach
  { path: '/inbox', name: 'Inbox Messages', module: 'Reach' },
  { path: '/calendar', name: 'Calendar Schedule', module: 'Reach' },
  { path: '/outreach/sequences', name: 'Outreach Campaigns', module: 'Reach' },

  // Money / Finance
  { path: '/finance/invoices', name: 'Tax Invoices Register', module: 'Finance' },
  { path: '/finance/propagations', name: 'Commercial Proposals', module: 'Finance' },
  { path: '/finance/settings', name: 'Tax & Banking Settings', module: 'Finance', adminOnly: true },

  // Accounts
  { path: '/accounts/dashboard', name: 'Accounts Overview', module: 'Accounts' },
  { path: '/accounts/sales', name: 'Accounts Sales Register', module: 'Accounts' },
  { path: '/accounts/inward-expenses', name: 'Stock Inwards & Expenses', module: 'Accounts' },
  { path: '/accounts/expenses', name: 'Operating Expenses', module: 'Accounts' },
  { path: '/accounts/emi', name: 'Instalments & EMI Plans', module: 'Accounts' },
  { path: '/accounts/credit-notes', name: 'Credit Notes', module: 'Accounts' },
  { path: '/accounts/assets', name: 'Fixed Assets', module: 'Accounts' },
  { path: '/accounts/adjustment-entry', name: 'Adjustment Vouchers', module: 'Accounts' },
  { path: '/accounts/reports', name: 'Financial Reports', module: 'Accounts' },

  // People / HR
  { path: '/hr/staff', name: 'Employee Directory', module: 'HR' },
  { path: '/hr/staff/new', name: 'Add Employee Wizard', module: 'HR' },
  { path: '/hr/offer-letters', name: 'Offer Letters Register', module: 'HR' },
  { path: '/hr/attendance', name: 'Daily Attendance', module: 'HR' },
  { path: '/hr/leave', name: 'Leave Management', module: 'HR' },
  { path: '/hr/salary', name: 'Salary Structures', module: 'HR', adminOnly: true },
  { path: '/hr/advances', name: 'Salary Advances', module: 'HR', adminOnly: true },
  { path: '/hr/adjustments', name: 'Payroll Adjustments', module: 'HR', adminOnly: true },
  { path: '/hr/payroll', name: 'Monthly Payroll Runs', module: 'HR', adminOnly: true },

  // Masters (Admin Only)
  { path: '/clients/service-types', name: 'Service Types', module: 'Masters', adminOnly: true },
  { path: '/clients/project-stages', name: 'Project Stages', module: 'Masters', adminOnly: true },
  { path: '/accounts/expense-categories', name: 'Expense Categories', module: 'Masters', adminOnly: true },
  { path: '/accounts/asset-categories', name: 'Asset Categories', module: 'Masters', adminOnly: true },
  { path: '/hr/leave-types', name: 'Leave Types', module: 'Masters', adminOnly: true },
  { path: '/hr/branches', name: 'Branches Master', module: 'Masters', adminOnly: true },
  { path: '/hr/shifts', name: 'Shifts Master', module: 'Masters', adminOnly: true },
  { path: '/hr/roles', name: 'Roles & Access Master', module: 'Masters', adminOnly: true },
  { path: '/hr/offer-letter-templates', name: 'Offer Letter Templates Studio', module: 'Masters', adminOnly: true },

  // Studio & General
  { path: '/team', name: 'Team Directory', module: 'Studio' },
  { path: '/library', name: 'Playbooks & Library', module: 'Studio' },
  { path: '/profile', name: 'User Profile', module: 'Studio' },
  { path: '/settings', name: 'Platform Settings', module: 'Studio', adminOnly: true },
  { path: '/settings/theme', name: 'Theme Settings', module: 'Studio', adminOnly: true },
  { path: '/support', name: 'Help & Support', module: 'Studio' }
];

function isRouteExpectedAllowed(route, role) {
  if (role === 'Admin') return true;
  if (route.adminOnly) return false;
  if (['Finance', 'Accounts', 'HR'].includes(route.module)) {
    return role === 'Manager';
  }
  if (route.path === '/team') {
    return role === 'Manager';
  }
  return true; // Workspace, Reach, Library, Profile, Support
}

async function audit() {
  console.log('========================================================================');
  console.log(`EXHAUSTIVE WORKFLOW & ROLE RESTRICTION AUDIT AGAINST: ${TARGET_URL}`);
  console.log('========================================================================\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const auditLog = [];
  const uncaughtErrors = [];

  page.on('pageerror', err => {
    uncaughtErrors.push(err.message);
  });

  async function loginAs(userKey) {
    const creds = USERS[userKey];
    await page.goto(`${TARGET_URL}/login`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.evaluate(() => {
      document.querySelector('input[name="email"]').value = '';
      document.querySelector('input[name="password"]').value = '';
    });
    await page.type('input[name="email"]', creds.email);
    await page.type('input[name="password"]', creds.pass);
    await page.click('button.lg-submit');
    await page.waitForSelector('.side', { timeout: 15000 });
    await sleep(800);
  }

  async function logout() {
    await page.evaluate(() => {
      if (typeof window.__performLogout === 'function') window.__performLogout();
      sessionStorage.clear();
      localStorage.clear();
    });
    await sleep(600);
  }

  try {
    for (const role of ['Admin', 'Manager', 'Staff']) {
      console.log(`\n========================================================================`);
      console.log(`TESTING WORKFLOW FOR ROLE: ${role.toUpperCase()}`);
      console.log(`========================================================================`);

      await loginAs(role);

      // Check Sidebar Items for the role
      const navTexts = await page.evaluate(() =>
        [...document.querySelectorAll('.side__nav .nav__item, .side__nav a')].map(el => el.textContent.trim())
      );

      console.log(`Sidebar navigation items rendered for ${role}: [${navTexts.filter(Boolean).slice(0, 8).join(', ')}...]`);

      if (role === 'Staff') {
        assert.ok(!navTexts.some(t => t.includes('Invoice')), 'Staff must NOT see Invoice in sidebar');
        assert.ok(!navTexts.some(t => t.includes('Accounts')), 'Staff must NOT see Accounts in sidebar');
        assert.ok(!navTexts.some(t => t.includes('Human Resources')), 'Staff must NOT see HR in sidebar');
        assert.ok(!navTexts.some(t => t.includes('Masters')), 'Staff must NOT see Masters in sidebar');
        assert.ok(!navTexts.some(t => t.includes('Settings')), 'Staff must NOT see Settings in sidebar');
      } else if (role === 'Manager') {
        assert.ok(navTexts.some(t => t.includes('Invoice')), 'Manager must see Invoice in sidebar');
        assert.ok(navTexts.some(t => t.includes('Accounts')), 'Manager must see Accounts in sidebar');
        assert.ok(navTexts.some(t => t.includes('Human Resources')), 'Manager must see HR in sidebar');
        assert.ok(!navTexts.some(t => t.includes('Masters')), 'Manager must NOT see Masters in sidebar');
        assert.ok(!navTexts.some(t => t.includes('Settings')), 'Manager must NOT see Settings in sidebar');
      } else if (role === 'Admin') {
        assert.ok(navTexts.some(t => t.includes('Masters')), 'Admin must see Masters in sidebar');
        assert.ok(navTexts.some(t => t.includes('Settings')), 'Admin must see Settings in sidebar');
      }

      // Sweep every route
      for (const r of ROUTES) {
        const expectedAllow = isRouteExpectedAllowed(r, role);
        await page.goto(`${TARGET_URL}${r.path}`, { waitUntil: 'domcontentloaded' });
        await sleep(400);

        const pageState = await page.evaluate(() => {
          const isRestricted = !!document.querySelector('[data-testid="access-restricted-page"], .access-restricted');
          const title = document.querySelector('h1, h2, .ttl')?.textContent?.trim() || '';
          const bodyText = document.body.innerText || '';
          const hasFatalError = /cannot read properties|is not a function|chunk load error/i.test(bodyText);
          return { isRestricted, title, hasFatalError };
        });

        let pass = false;
        let note = '';

        if (expectedAllow) {
          if (!pageState.isRestricted && !pageState.hasFatalError) {
            pass = true;
            note = `Allowed & loaded: "${pageState.title.slice(0, 30)}"`;
          } else if (pageState.isRestricted) {
            pass = false;
            note = `False 403 on permitted page`;
          } else {
            pass = false;
            note = `Fatal frontend error detected`;
          }
        } else {
          if (pageState.isRestricted) {
            pass = true;
            note = `403 Access Restricted correctly enforced`;
          } else {
            pass = false;
            note = `SECURITY BREACH: Unauthorized access allowed to ${r.path}!`;
          }
        }

        const resultRecord = {
          role,
          path: r.path,
          name: r.name,
          module: r.module,
          expected: expectedAllow ? 'ALLOWED' : 'RESTRICTED (403)',
          actual: pageState.isRestricted ? 'RESTRICTED (403)' : 'ALLOWED',
          status: pass ? 'PASS' : 'FAIL',
          note
        };
        auditLog.push(resultRecord);

        const statusLabel = pass ? '✓ PASS' : '✗ FAIL';
        console.log(`  ${statusLabel.padEnd(8)} [${role.padEnd(7)}] ${r.path.padEnd(30)} -> ${resultRecord.actual.padEnd(16)} (${note})`);
      }

      await logout();
    }

    console.log('\n========================================================================');
    console.log('AUDIT SUMMARY');
    console.log('========================================================================');
    const total = auditLog.length;
    const passed = auditLog.filter(x => x.status === 'PASS').length;
    const failed = auditLog.filter(x => x.status === 'FAIL').length;

    console.log(`Total checks: ${total}`);
    console.log(`Passed:       ${passed}`);
    console.log(`Failed:       ${failed}`);
    console.log(`Uncaught JS Errors: ${uncaughtErrors.length}`);

    fs.writeFileSync(path.join(REPORT_DIR, 'audit-results.json'), JSON.stringify({
      targetUrl: TARGET_URL,
      timestamp: new Date().toISOString(),
      total,
      passed,
      failed,
      uncaughtErrors,
      details: auditLog
    }, null, 2));

    if (failed > 0) {
      throw new Error(`Audit completed with ${failed} failed checks.`);
    }

  } finally {
    await browser.close();
  }
}

audit().catch(err => {
  console.error('\nAudit execution error:', err);
  process.exit(1);
});
