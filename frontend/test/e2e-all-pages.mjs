// E2E page sweep: logs in through the real login form for each role and visits
// every route, recording JS errors, failed API calls, error screens and blank pages.
// Run against an isolated backend that serves the SPA, e.g.
//   E2E_BASE=http://localhost:5002 node test/e2e-all-pages.mjs
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.env.E2E_BASE || 'http://localhost:5002';
const OUT = process.env.E2E_OUT || '/tmp/crm-e2e/pages';
fs.mkdirSync(OUT, { recursive: true });

// Test credentials from backend/src/utils/seedUsers.js
const ROLES = [
  { role: 'Admin', email: 'admin@tessly.local', password: 'password123', name: 'System Administrator' },
  { role: 'Manager', email: 'manager@tessly.local', password: 'password123', name: 'Branch Manager' },
  { role: 'Staff', email: 'staff@tessly.local', password: 'password123', name: 'Frontline Staff' },
];

const ROUTES = (process.env.E2E_ROUTES || `
/today /clients/companies /clients/new /clients/service-types /clients/project-stages
/deals/board /deals/forecast /projects /inbox /calendar /outreach/sequences
/finance/invoices /finance/propagations /finance/settings
/accounts/dashboard /accounts/sales /accounts/credit-notes /accounts/expenses /accounts/expense-categories
/accounts/inward-expenses /accounts/assets /accounts/asset-categories /accounts/emi /accounts/adjustment-entry /accounts/reports
/hr/staff /hr/staff/new /hr/employees /hr/attendance /hr/leave /hr/leave-types /hr/shifts /hr/branches /hr/salary
/hr/payroll /hr/advances /hr/adjustments /hr/offer-letters /hr/offer-letter-templates
/team /library /settings /settings/theme /support /profile
`).trim().split(/\s+/);

const ADMIN_ONLY = new Set(['finance/settings', 'hr/salary', 'hr/advances', 'hr/adjustments', 'hr/payroll', 'hr/branches', 'hr/shifts', 'hr/offer-letter-templates',
  'clients/service-types', 'clients/project-stages', 'accounts/expense-categories', 'accounts/asset-categories', 'hr/leave-types']);
const isLoginPath = (p) => p.startsWith('/login') || p.startsWith('/signin');
function expectedAllowed(route, role) {
  if (role === 'Admin') return true;
  const [p, sub = ''] = route.replace(/^\//, '').split('/');
  const full = `${p}/${sub}`;
  if (ADMIN_ONLY.has(full) || p === 'settings' || p === 'masters') return false;
  if (['finance', 'accounts', 'hr', 'team'].includes(p)) return role === 'Manager';
  return true;
}

const ERROR_TEXT = /something went wrong|unexpected error|cannot read prop|is not a function|undefined is not|failed to load|chunk.*failed|\[object Object\]|(?<![A-Za-z])(NaN|undefined|Invalid Date)(?![A-Za-z])/;

async function login(page, u) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
  await page.type('input[type="email"], input[name="email"]', u.email);
  await page.type('input[type="password"]', u.password);
  await Promise.all([
    page.waitForFunction(() => !location.pathname.startsWith('/login') && !location.pathname.startsWith('/signin'), { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
}

const results = [];
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
async function flow(name, fn) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const r = { role: 'Flow', route: name, notes: [], jsErrors: [], apiErrors: [], consoleErrors: [] };
  page.on('pageerror', (e) => r.jsErrors.push(String(e.message || e).slice(0, 300)));
  try { await fn(page, r); } catch (e) { r.notes.push(e.message); }
  r.status = r.notes.length || r.jsErrors.length ? 'FAIL' : 'PASS';
  results.push(r);
  console.log(`${r.status.padEnd(10)} FLOW     ${name}${r.status === 'FAIL' ? '  ' + JSON.stringify({ js: r.jsErrors, notes: r.notes }) : ''}`);
  await page.close();
}
const textOf = (page) => page.evaluate(() => document.body.innerText);
try {
  await flow('Unauthenticated deep link redirects to login', async (page, r) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto(`${BASE}/hr/salary`, { waitUntil: 'networkidle2' });
    await new Promise((x) => setTimeout(x, 800));
    const p = await page.evaluate(() => location.pathname);
    if (!isLoginPath(p)) r.notes.push(`expected /login or /signin, got ${p}`);
  });
  await flow('Login page shows no "Session expired" toast when signed out', async (page, r) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    await new Promise((x) => setTimeout(x, 1200));
    if (/Session expired/i.test(await textOf(page))) r.notes.push('"Session expired" toast shown on fresh login page');
  });
  await flow('Wrong password is rejected with an error', async (page, r) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', 'staff@tessly.local');
    await page.type('input[type="password"]', 'wrong-password');
    await page.click('button[type="submit"]');
    await new Promise((x) => setTimeout(x, 1500));
    const p = await page.evaluate(() => location.pathname);
    if (!isLoginPath(p)) r.notes.push(`wrong password navigated to ${p}`);
    if (!/invalid (username\/email|email) or password/i.test(await textOf(page))) r.notes.push('no invalid credentials error message');
  });
  await flow('"dev1234" backdoor password does not sign in (non-dev build)', async (page, r) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', 'ines@caldermoss.co');
    await page.type('input[type="password"]', 'dev1234');
    await page.click('button[type="submit"]');
    await new Promise((x) => setTimeout(x, 1500));
    const p = await page.evaluate(() => location.pathname);
    if (!isLoginPath(p)) r.notes.push(`dev1234 signed in and navigated to ${p}`);
  });
  for (const u of ROLES) {
    await flow(`${u.role}: role survives page reload (header shows own name, not demo admin)`, async (page, r) => {
      await login(page, u);
      await page.reload({ waitUntil: 'networkidle2' });
      await new Promise((x) => setTimeout(x, 800));
      const role = await page.evaluate(() => window.__getJwtRole && window.__getJwtRole());
      if (role !== u.role) r.notes.push(`JWT role ${role} != ${u.role}`);
      const me = await page.evaluate(() => localStorage.getItem('tessly:me'));
      if (u.role !== 'Admin' && me === 'u1') r.notes.push('session mapped to demo admin u1');
      const who = await page.evaluate(() => window.__getCurrentUser && window.__getCurrentUser());
      if (!who || who.name !== u.name) r.notes.push(`current user after reload is "${who && who.name}", expected "${u.name}"`);
      await page.goto(`${BASE}/hr/salary`, { waitUntil: 'networkidle2' });
      await new Promise((x) => setTimeout(x, 600));
      const body = await textOf(page);
      const signedIn = (body.match(/Signed-in Account:?\s*([^\n]+)/) || [])[1];
      if (u.role !== 'Admin' && signedIn && signedIn.trim() !== u.name) r.notes.push(`403 screen shows signed-in account "${signedIn.trim()}", expected "${u.name}"`);
    });
  }
  await flow('Logout clears session and returns to login', async (page, r) => {
    await login(page, ROLES[2]);
    await page.evaluate(() => window.__triggerAutoLogout ? window.__triggerAutoLogout('Signed out') : null);
    await new Promise((x) => setTimeout(x, 1200));
    const p = await page.evaluate(() => location.pathname);
    if (!isLoginPath(p)) r.notes.push(`after logout path is ${p}`);
    await page.goto(`${BASE}/clients/companies`, { waitUntil: 'networkidle2' });
    await new Promise((x) => setTimeout(x, 800));
    const p2 = await page.evaluate(() => location.pathname);
    if (!isLoginPath(p2)) r.notes.push(`protected page reachable after logout (${p2})`);
  });

  for (const u of ROLES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    let current = null;
    const bucket = () => current;
    page.on('pageerror', (e) => bucket()?.jsErrors.push(String(e.message || e).slice(0, 300)));
    page.on('console', (m) => {
      if (m.type() === 'error') {
        const t = m.text();
        if (/Failed to load resource/.test(t)) return; // captured via response listener
        bucket()?.consoleErrors.push(t.slice(0, 300));
      }
    });
    page.on('response', (r) => {
      const url = r.url();
      if (!url.includes('/api/')) return;
      if (r.status() >= 400) bucket()?.apiErrors.push(`${r.request().method()} ${url.replace(BASE, '')} -> ${r.status()}`);
    });

    let loginOk = true;
    try { await login(page, u); } catch (e) { loginOk = false; results.push({ role: u.role, route: '/login', status: 'FAIL', notes: ['login failed: ' + e.message] }); }
    if (!loginOk) { await page.close(); continue; }

    for (const route of ROUTES) {
      current = { role: u.role, route, jsErrors: [], consoleErrors: [], apiErrors: [], notes: [] };
      try {
        await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise((r) => setTimeout(r, 600));
        const info = await page.evaluate(() => {
          const main = document.querySelector('main, .main, #main') || document.body;
          const text = main.innerText || '';
          return {
            path: location.pathname,
            textLen: text.trim().length,
            forbidden: /403\s*·\s*Access Restricted/i.test(document.body.innerText),
            snippet: text.replace(/\s+/g, ' ').slice(0, 4000),
          };
        });
        current.finalPath = info.path;
        current.forbidden = info.forbidden;
        if (isLoginPath(info.path)) current.notes.push('redirected to login (session lost)');
        if (info.textLen < 40 && !info.forbidden) current.notes.push(`near-empty page (${info.textLen} chars)`);
        const m = info.snippet.match(ERROR_TEXT);
        if (m) current.notes.push(`suspicious text: "${m[0]}"`);
        const safe = `${u.role}${route.replace(/\//g, '_')}`;
        await page.screenshot({ path: path.join(OUT, `${safe}.png`) });
      } catch (e) {
        current.notes.push('navigation error: ' + e.message);
      }
      const allowed = expectedAllowed(route, u.role);
      current.expected = allowed ? 'allowed' : 'restricted';
      if (allowed && current.forbidden) current.notes.push('RBAC: page should be allowed but showed 403');
      if (!allowed && !current.forbidden) current.notes.push('RBAC: page should be restricted but rendered content');
      const bad = current.jsErrors.length || current.apiErrors.filter((a) => !/-> 403$/.test(a) || allowed).length || current.notes.length;
      current.status = bad ? 'FAIL' : current.forbidden ? 'RESTRICTED (expected)' : 'PASS';
      results.push(current);
      console.log(`${current.status.padEnd(10)} ${u.role.padEnd(8)} ${route}${bad ? '  ' + JSON.stringify({ js: current.jsErrors, api: current.apiErrors, console: current.consoleErrors.slice(0, 3), notes: current.notes }) : ''}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
const fails = results.filter((r) => r.status === 'FAIL');
console.log(`\n${results.length} checks, ${fails.length} failed, ${results.filter((r) => r.status.startsWith('RESTRICTED')).length} correctly restricted`);
process.exit(fails.length ? 1 : 0);
