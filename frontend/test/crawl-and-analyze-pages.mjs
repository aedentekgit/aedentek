import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:1234';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ROUTES_TO_AUDIT = [
  // Auth
  { path: '/login', name: 'Login Screen', group: 'Auth' },
  // Workspace
  { path: '/today', name: 'Today Sales Desk', group: 'Workspace' },
  { path: '/clients/companies', name: 'Clients Directory', group: 'Workspace' },
  { path: '/clients/new', name: 'New Client Form/Modal', group: 'Workspace' },
  { path: '/clients/c/client-omni-retail', name: 'Client 360 Profile', group: 'Workspace' },
  { path: '/projects', name: 'Projects Overview', group: 'Workspace' },
  { path: '/deals/board', name: 'Deals Kanban Board', group: 'Workspace' },
  { path: '/deals/forecast', name: 'Deals Forecast Ladder', group: 'Workspace' },
  // Reach
  { path: '/inbox', name: 'Inbox & Communications', group: 'Reach' },
  { path: '/calendar', name: 'Calendar & Tasks', group: 'Reach' },
  { path: '/outreach/sequences', name: 'Outreach Sequences', group: 'Reach' },
  { path: '/outreach/templates', name: 'Outreach Templates', group: 'Reach' },
  // Money
  { path: '/finance/invoices', name: 'Tax Invoices', group: 'Money' },
  { path: '/finance/propagations', name: 'Commercial Propagations', group: 'Money' },
  { path: '/finance/commissions', name: 'Sales Commissions', group: 'Money' },
  { path: '/finance/settings', name: 'Finance Settings', group: 'Money' },
  { path: '/finance/templates', name: 'Invoice Templates', group: 'Money' },
  // Accounts
  { path: '/accounts/dashboard', name: 'Accounts Dashboard', group: 'Accounts' },
  { path: '/accounts/sales', name: 'Inward Sales Ledger', group: 'Accounts' },
  { path: '/accounts/expenses', name: 'Expenses Ledger', group: 'Accounts' },
  { path: '/accounts/inward-expenses', name: 'Inward & Expense Reconciliation', group: 'Accounts' },
  { path: '/accounts/emi', name: 'EMI Installments Tracker', group: 'Accounts' },
  { path: '/accounts/credit-notes', name: 'Credit Notes', group: 'Accounts' },
  { path: '/accounts/assets', name: 'Asset Records & Depreciation', group: 'Accounts' },
  { path: '/accounts/adjustment-entry', name: 'Adjustment Entry (JV)', group: 'Accounts' },
  { path: '/accounts/reports', name: 'Financial Reports', group: 'Accounts' },
  { path: '/accounts/expense-categories', name: 'Expense Categories (Masters)', group: 'Masters' },
  { path: '/accounts/asset-categories', name: 'Asset Categories (Masters)', group: 'Masters' },
  // People
  { path: '/hr/staff', name: 'HR Employees Directory', group: 'People' },
  { path: '/hr/attendance', name: 'HR Attendance Logs', group: 'People' },
  { path: '/hr/leave', name: 'HR Leave Requests', group: 'People' },
  { path: '/hr/salary', name: 'HR Salary Structures', group: 'People' },
  { path: '/hr/advances', name: 'HR Salary Advances', group: 'People' },
  { path: '/hr/adjustments', name: 'HR Payroll Adjustments', group: 'People' },
  { path: '/hr/payroll', name: 'HR Payroll & Payslips', group: 'People' },
  { path: '/hr/branches', name: 'Company Branches (Masters)', group: 'Masters' },
  { path: '/hr/shifts', name: 'Work Shifts (Masters)', group: 'Masters' },
  { path: '/hr/leave-types', name: 'Leave Types (Masters)', group: 'Masters' },
  { path: '/clients/service-types', name: 'Service Types (Masters)', group: 'Masters' },
  { path: '/clients/project-stages', name: 'Project Stages (Masters)', group: 'Masters' },
  // Studio
  { path: '/profile', name: 'User Profile', group: 'Studio' },
  { path: '/team', name: 'Team Directory', group: 'Studio' },
  { path: '/library', name: 'Playbooks Library', group: 'Studio' },
  { path: '/settings', name: 'Studio Settings (16 Sections)', group: 'Studio' },
  { path: '/support', name: 'Helpdesk & Support', group: 'Studio' }
];

async function main() {
  console.log(`Starting Comprehensive Page Audit against ${BASE_URL}...`);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,960']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  const auditResults = [];

  // 1. Initial Login
  console.log('Logging in as Admin (ines@caldermoss.co)...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await sleep(600);
  await page.type('input[type="email"]', 'ines@caldermoss.co');
  await page.type('input[autocomplete="current-password"]', 'marble88');
  await page.click('.lg-submit');
  await sleep(1000);

  // 2. Audit each route under Admin
  for (const route of ROUTES_TO_AUDIT) {
    const pageErrors = [];
    const consoleLogs = [];
    const apiRequests = [];

    const onPageError = (err) => pageErrors.push(err.message);
    const onConsole = (msg) => {
      if (msg.type() === 'error') consoleLogs.push(msg.text());
    };
    const onRequest = (req) => {
      const url = req.url();
      if (url.includes('/api/')) {
        apiRequests.push({ url, method: req.method() });
      }
    };

    page.on('pageerror', onPageError);
    page.on('console', onConsole);
    page.on('request', onRequest);

    console.log(`Auditing [${route.group}] ${route.name} (${route.path})...`);
    try {
      await page.evaluate((p) => {
        if (window.__navigate) window.__navigate(p);
        else history.pushState(null, '', p);
      }, route.path);
      await sleep(700);

      const pageState = await page.evaluate((targetPath) => {
        const root = document.getElementById('root');
        const main = document.getElementById('main');
        const app = document.querySelector('.app');
        const isRestricted = !!document.querySelector('.access-restricted, .rbac-restricted-card');
        const hasCard = !!document.querySelector('.card, .card--flush, .set-shell');
        const titleEl = document.querySelector('.phead__title, .card__title, .set-title, .ttl, h1, h2');
        const pageTitle = titleEl ? titleEl.textContent.trim() : document.title;
        const tables = document.querySelectorAll('table, .tabular, .tab-table');
        const buttons = Array.from(document.querySelectorAll('button:not([disabled])')).map(b => b.textContent.trim()).filter(Boolean).slice(0, 8);
        const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => i.placeholder || i.name || i.type).slice(0, 8);
        const emptyState = !!document.querySelector('.empty');

        return {
          currentUrl: location.pathname,
          pageTitle,
          isRestricted,
          hasCard,
          appMounted: !!app,
          tableCount: tables.length,
          buttonsSample: buttons,
          inputsSample: inputs,
          hasEmptyState: emptyState
        };
      }, route.path);

      auditResults.push({
        route: route.path,
        name: route.name,
        group: route.group,
        status: pageErrors.length === 0 ? 'OK' : 'ERROR',
        pageState,
        apiRequests,
        pageErrors,
        consoleErrors: consoleLogs
      });
    } catch (err) {
      auditResults.push({
        route: route.path,
        name: route.name,
        group: route.group,
        status: 'CRASH',
        error: err.message
      });
    } finally {
      page.off('pageerror', onPageError);
      page.off('console', onConsole);
      page.off('request', onRequest);
    }
  }

  await browser.close();

  const outPath = path.resolve('test-reports/page-crawl-audit.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(auditResults, null, 2));
  console.log(`\nAudit completed! Audited ${auditResults.length} pages. Results saved to ${outPath}`);

  const errors = auditResults.filter(r => r.pageErrors?.length > 0 || r.status === 'CRASH');
  console.log(`Total Pages with Errors: ${errors.length}`);
  if (errors.length > 0) {
    errors.forEach(e => console.log(`  - ${e.name} (${e.route}): ${e.pageErrors || e.error}`));
  }
}

main().catch(console.error);
