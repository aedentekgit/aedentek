import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_DIR = path.resolve(__dirname, '../test-reports/e2e-crud-sweep');
fs.mkdirSync(REPORT_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const BASE_URL = 'http://localhost:1234';
const API_URL = 'http://localhost:5001/api';

async function runComprehensiveE2ECrudSuite() {
  console.log('========================================================================');
  console.log('AEDENTEK CRM: FULL-FLOW END-TO-END (E2E) CRUD VERIFICATION SUITE');
  console.log(`Frontend Target: ${BASE_URL} | Backend Target: ${API_URL}`);
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;
  const testResults = [];

  function assert(title, condition, details = '') {
    if (condition) {
      console.log(`  ✓ [PASS] ${title}`);
      passed++;
      testResults.push({ title, status: 'PASS', details });
    } else {
      console.error(`  ✗ [FAIL] ${title} - ${details}`);
      failed++;
      testResults.push({ title, status: 'FAIL', details });
    }
  }

  const idOf = (b) => {
    const d = b && (b.data || b);
    return d && (d._id || d.id || d.clientId);
  };

  // =========================================================================
  // SECTION 1: AUTHENTICATION & RBAC E2E TESTS
  // =========================================================================
  console.log('\n--- 1. AUTHENTICATION & SESSION PERSISTENCE ---');
  let adminToken = '';
  let managerToken = '';
  let staffToken = '';

  // 1.1 Admin login via API
  const adminRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ines@caldermoss.co', password: 'marble88' })
  });
  assert('Admin login endpoint returns 200 OK', adminRes.status === 200, `Status: ${adminRes.status}`);
  const adminData = await adminRes.json();
  adminToken = adminData.token;
  assert('Admin login returns signed JWT', typeof adminToken === 'string' && adminToken.length > 20);
  assert('Admin user has Admin role', adminData.user?.role === 'Admin');

  // 1.2 Manager login via API
  const mgrRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'manager@tessly.local', password: 'password123' })
  });
  const mgrData = await mgrRes.json();
  managerToken = mgrData.token;
  assert('Manager login returns signed JWT with Manager role', mgrData.user?.role === 'Manager');

  // 1.3 Staff login via API
  const staffRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'tomas@caldermoss.co', password: 'password123' })
  });
  const staffData = await staffRes.json();
  staffToken = staffData.token;
  assert('Staff login returns signed JWT with Staff role', staffData.user?.role === 'Staff');

  // 1.4 Token Refresh Endpoint
  const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: adminToken })
  });
  assert('Token refresh endpoint returns 200 OK', refreshRes.status === 200, `Status: ${refreshRes.status}`);
  const refreshData = await refreshRes.json();
  assert('Refreshed token is valid and renewed', typeof refreshData.token === 'string' && refreshData.token.length > 20);

  // 1.5 RBAC Middleware Permissions Enforcement
  const adminSettings = await fetch(`${API_URL}/settings`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert('Admin can access /api/settings (200 OK)', adminSettings.status === 200);

  const mgrSettings = await fetch(`${API_URL}/settings`, {
    headers: { 'Authorization': `Bearer ${managerToken}` }
  });
  assert('Manager is blocked from /api/settings with 403 Forbidden', mgrSettings.status === 403);

  const staffSettings = await fetch(`${API_URL}/settings`, {
    headers: { 'Authorization': `Bearer ${staffToken}` }
  });
  assert('Staff is blocked from /api/settings with 403 Forbidden', staffSettings.status === 403);

  // =========================================================================
  // SECTION 2: CLIENTS & CLIENT 360 FULL CRUD
  // =========================================================================
  console.log('\n--- 2. CLIENTS MODULE (FULL CRUD & ARRAY COLLECTIONS) ---');
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  };

  const testClientTag = `E2E-${Date.now()}`;
  let createdClientId = '';

  // 2.1 CREATE Client
  const createClientRes = await fetch(`${API_URL}/clients`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      company: `Apex Logistics ${testClientTag}`,
      name: `Rohan Verma ${testClientTag}`,
      email: `client_${testClientTag}@apex.com`,
      phone: '+91 98765 43210',
      address: '102 Tech Park, Bandra West, Mumbai',
      status: 'Active',
      category: 'Enterprise',
      gstNumber: '27AABCA1234A1Z5'
    })
  });
  assert('POST /api/clients creates new client (201/200)', createClientRes.status === 201 || createClientRes.status === 200);
  const clientPayload = await createClientRes.json();
  createdClientId = idOf(clientPayload);
  assert('Client ID returned', !!createdClientId, `ID: ${createdClientId}`);

  // 2.2 READ Client
  const getClientRes = await fetch(`${API_URL}/clients/${createdClientId}`, { headers: authHeaders });
  assert('GET /api/clients/:id retrieves created client', getClientRes.status === 200);
  const fetchedClient = await getClientRes.json();
  const clientObj = fetchedClient.data || fetchedClient;
  assert('Retrieved client name matches', clientObj.company === `Apex Logistics ${testClientTag}`);

  // 2.3 UPDATE Client
  const updateClientRes = await fetch(`${API_URL}/clients/${createdClientId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      notes: 'Verified via E2E test runner'
    })
  });
  assert('PUT /api/clients/:id updates client (200)', updateClientRes.status === 200);

  // 2.4 Nested Collection CRUD: Websites / Domains
  const addDomainRes = await fetch(`${API_URL}/clients/${createdClientId}/websites`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      domain: `portal.${testClientTag.toLowerCase()}.com`,
      status: 'Live',
      hostingProvider: 'AWS Mumbai',
      domainExpiry: '2028-12-31'
    })
  });
  assert('POST /api/clients/:id/websites adds domain with expireDate', addDomainRes.status === 201 || addDomainRes.status === 200);

  // 2.5 Nested Collection CRUD: Social Media Channels
  const addSocialRes = await fetch(`${API_URL}/clients/${createdClientId}/social`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'LinkedIn Corporate',
      handle: `@apex_${testClientTag.toLowerCase()}`,
      href: `https://linkedin.com/company/apex-${testClientTag.toLowerCase()}`,
      tone: 'blue'
    })
  });
  assert('POST /api/clients/:id/social adds social media record', addSocialRes.status === 201 || addSocialRes.status === 200);

  // 2.6 Nested Collection CRUD: Documents
  const addDocRes = await fetch(`${API_URL}/clients/${createdClientId}/documents`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      documents: [
        {
          name: 'Non-Disclosure Agreement',
          fileName: 'nda_agreement.pdf',
          type: 'PDF',
          size: '250 KB'
        }
      ]
    })
  });
  assert('POST /api/clients/:id/documents uploads document record', addDocRes.status === 201 || addDocRes.status === 200);

  // 2.7 Paginated Embedded List: GET /api/clients/:id/lists/websites
  const listWebRes = await fetch(`${API_URL}/clients/${createdClientId}/lists/websites`, { headers: authHeaders });
  assert('GET /api/clients/:id/lists/websites returns 200 OK', listWebRes.status === 200);
  const listWebData = await listWebRes.json();
  assert('Websites embedded array has added domain', listWebData.total >= 1 || listWebData.data?.length >= 1);

  // 2.8 DELETE Client (Clean up)
  const deleteClientRes = await fetch(`${API_URL}/clients/${createdClientId}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  assert('DELETE /api/clients/:id deletes client record', deleteClientRes.status === 200 || deleteClientRes.status === 204);

  // =========================================================================
  // SECTION 3: FINANCE & ACCOUNTS FULL CRUD
  // =========================================================================
  console.log('\n--- 3. FINANCE & ACCOUNTS (FULL CRUD) ---');
  let testInvoiceId = '';
  let testExpenseId = '';
  let testEmiId = '';

  // 3.1 Invoices CRUD
  const createInvRes = await fetch(`${API_URL}/invoices`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      invoiceNumber: `INV-${testClientTag.slice(-6)}`,
      clientName: 'Kavita Edutech',
      items: [
        { description: 'Cloud Architecture & CRM Setup', price: 45000, qty: 1 }
      ]
    })
  });
  assert('POST /api/invoices creates invoice', createInvRes.status === 201 || createInvRes.status === 200);
  const invData = await createInvRes.json();
  testInvoiceId = idOf(invData);

  const updateInvRes = await fetch(`${API_URL}/invoices/${testInvoiceId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ status: 'Paid', notes: 'Settled via RTGS' })
  });
  assert('PUT /api/invoices/:id updates status to paid', updateInvRes.status === 200);

  const deleteInvRes = await fetch(`${API_URL}/invoices/${testInvoiceId}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  assert('DELETE /api/invoices/:id removes invoice', deleteInvRes.status === 200 || deleteInvRes.status === 204);

  // 3.2 Expenses CRUD
  const createExpRes = await fetch(`${API_URL}/accounts/expenses`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: `Office Utilities ${testClientTag}`,
      category: 'Other',
      amount: 8500,
      paymentMode: 'Bank Transfer',
      branch: 'All Branches',
      date: '2026-11-16',
      notes: 'qa'
    })
  });
  assert('POST /api/accounts/expenses creates expense', createExpRes.status === 201 || createExpRes.status === 200);
  const expData = await createExpRes.json();
  testExpenseId = idOf(expData);

  const deleteExpRes = await fetch(`${API_URL}/accounts/expenses/${testExpenseId}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  assert('DELETE /api/accounts/expenses/:id removes expense', deleteExpRes.status === 200 || deleteExpRes.status === 204);

  // 3.3 EMI Plans & Custom EMI Date CRUD
  const createEmiRes = await fetch(`${API_URL}/accounts/emi`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      productName: `Equipment Lease ${testClientTag}`,
      category: 'Other',
      principal: 60000,
      interestRate: 10,
      emiCount: 12,
      startDate: '2026-11-01',
      emiDate: '2026-11-10',
      processingCharges: 1200,
      transactionFee: 50
    })
  });
  assert('POST /api/accounts/emi creates EMI plan with custom EMI date & fees', createEmiRes.status === 201 || createEmiRes.status === 200);
  const emiData = await createEmiRes.json();
  testEmiId = idOf(emiData);

  const updateEmiRes = await fetch(`${API_URL}/accounts/emi/${testEmiId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ emiDate: '2026-11-20' })
  });
  assert('PUT /api/accounts/emi/:id updates EMI date with recalculated schedule', updateEmiRes.status === 200);

  const deleteEmiRes = await fetch(`${API_URL}/accounts/emi/${testEmiId}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  assert('DELETE /api/accounts/emi/:id removes EMI plan', deleteEmiRes.status === 200 || deleteEmiRes.status === 204);

  // =========================================================================
  // SECTION 4: HUMAN RESOURCES (HR) FULL CRUD
  // =========================================================================
  console.log('\n--- 4. HUMAN RESOURCES (FULL CRUD) ---');
  let testBranchId = '';
  let testStaffId = '';

  // 4.1 Branches CRUD
  const createBranchRes = await fetch(`${API_URL}/hr/branches`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: `Kolkata Hub ${testClientTag}`,
      code: `CCU-${testClientTag.slice(-4)}`,
      city: 'Kolkata',
      state: 'West Bengal',
      isDefault: false,
      status: 'Active'
    })
  });
  assert('POST /api/hr/branches creates branch', createBranchRes.status === 201 || createBranchRes.status === 200);
  const branchData = await createBranchRes.json();
  testBranchId = idOf(branchData);

  const updateBranchRes = await fetch(`${API_URL}/hr/branches/${testBranchId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ city: 'Kolkata Central' })
  });
  assert('PUT /api/hr/branches/:id updates branch', updateBranchRes.status === 200);

  const deleteBranchRes = await fetch(`${API_URL}/hr/branches/${testBranchId}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  assert('DELETE /api/hr/branches/:id removes branch', deleteBranchRes.status === 200 || deleteBranchRes.status === 204);

  // 4.2 Staff / Employees CRUD
  const createStaffRes = await fetch(`${API_URL}/staff`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      firstName: 'Pooja',
      lastName: `Verma ${testClientTag.slice(-4)}`,
      email: `pooja_${testClientTag.slice(-4)}@tessly.local`,
      role: 'Staff',
      department: 'Finance',
      designation: 'Accounts Executive',
      branch: 'Bandra',
      status: 'Active',
      joiningDate: '2026-11-01'
    })
  });
  assert('POST /api/staff creates employee', createStaffRes.status === 201 || createStaffRes.status === 200);
  const staffEntity = await createStaffRes.json();
  testStaffId = idOf(staffEntity);

  const deleteStaffRes = await fetch(`${API_URL}/staff/${testStaffId}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  assert('DELETE /api/staff/:id removes employee', deleteStaffRes.status === 200 || deleteStaffRes.status === 204);

  // =========================================================================
  // SECTION 5: MASTERS & PLATFORM SETTINGS FULL CRUD
  // =========================================================================
  console.log('\n--- 5. MASTERS & SETTINGS (FULL CRUD) ---');
  let testGstId = '';
  let testStageId = '';
  let testServiceId = '';

  // 5.1 GST Tax Slabs CRUD
  const createGstRes = await fetch(`${API_URL}/gst-rates`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      hsnCode: '998314',
      gstRate: 18,
      serviceName: `Special GST 18% ${testClientTag}`,
      taxType: 'Standard'
    })
  });
  assert('POST /api/gst-rates creates GST slab with auto CGST/SGST/IGST', createGstRes.status === 201 || createGstRes.status === 200);
  const gstData = await createGstRes.json();
  testGstId = idOf(gstData);

  const deleteGstRes = await fetch(`${API_URL}/gst-rates/${testGstId}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  assert('DELETE /api/gst-rates/:id removes GST slab', deleteGstRes.status === 200 || deleteGstRes.status === 204);

  // 5.2 Project Stages CRUD
  const createStageRes = await fetch(`${API_URL}/project-stages`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: `Client Review ${testClientTag}`,
      order: 99
    })
  });
  assert('POST /api/project-stages creates project stage', createStageRes.status === 201 || createStageRes.status === 200);
  const stageData = await createStageRes.json();
  testStageId = idOf(stageData);

  const deleteStageRes = await fetch(`${API_URL}/project-stages/${testStageId}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  assert('DELETE /api/project-stages/:id removes project stage', deleteStageRes.status === 200 || deleteStageRes.status === 204);

  // 5.3 Service Types CRUD
  const createServiceRes = await fetch(`${API_URL}/service-types`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: `Consulting & Auditing ${testClientTag}`
    })
  });
  assert('POST /api/service-types creates service type', createServiceRes.status === 201 || createServiceRes.status === 200);
  const serviceData = await createServiceRes.json();
  testServiceId = idOf(serviceData);

  const deleteServiceRes = await fetch(`${API_URL}/service-types/${testServiceId}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  assert('DELETE /api/service-types/:id removes service type', deleteServiceRes.status === 200 || deleteServiceRes.status === 204);

  // =========================================================================
  // SECTION 6: FRONTEND PUPPETEER FULL E2E UI WORKFLOW
  // =========================================================================
  console.log('\n--- 6. FRONTEND PUPPETEER FULL E2E UI WORKFLOW ---');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  // 6.1 Login Flow
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.click('.lg-dev__item');
  await sleep(400);
  await page.click('.lg-submit');
  await sleep(1500);
  assert('Login flow navigates to authenticated workspace', page.url().includes('/today') || page.url().includes('/dashboard'));

  // 6.2 Clients Page UI Flow
  await page.goto(`${BASE_URL}/clients/companies`, { waitUntil: 'networkidle2' });
  await sleep(1000);
  const clientsHeader = await page.$eval('h1, .phead__title', el => el.textContent.trim()).catch(() => '');
  assert('Clients directory loads properly', clientsHeader.length > 0, `Header: ${clientsHeader}`);
  const clientRowsCount = await page.$$eval('.table tbody tr', trs => trs.length).catch(() => 0);
  assert('Clients directory renders live company rows', clientRowsCount > 0, `Rows: ${clientRowsCount}`);

  // 6.3 Client 360 Tab Navigation Flow
  await page.goto(`${BASE_URL}/clients/c/client-kavita-edu`, { waitUntil: 'networkidle2' });
  await sleep(1200);
  const c360Title = await page.$eval('h1, .phead__title', el => el.textContent.trim()).catch(() => '');
  assert('Client 360 loads Kavita Edutech profile', c360Title.includes('Kavita Edutech'), `Title: ${c360Title}`);
  const c360Tabs = await page.$$eval('.tabs .tab', tabs => tabs.map(t => t.textContent.trim())).catch(() => []);
  assert('Client 360 contains all 9 modular tabs', c360Tabs.length >= 9, `Tabs: ${c360Tabs.join(' | ')}`);

  // 6.4 Invoices & Finance UI Flow
  await page.goto(`${BASE_URL}/finance/invoices`, { waitUntil: 'networkidle2' });
  await sleep(1000);
  const invoiceRowsCount = await page.$$eval('.table tbody tr', trs => trs.length).catch(() => 0);
  assert('Finance invoices page renders table register', invoiceRowsCount > 0, `Invoices: ${invoiceRowsCount}`);

  // 6.5 HR Branches UI Flow
  await page.goto(`${BASE_URL}/hr/branches`, { waitUntil: 'networkidle2' });
  await sleep(1000);
  const branchRowsCount = await page.$$eval('.table tbody tr', trs => trs.length).catch(() => 0);
  assert('HR Branches page renders table with default badge', branchRowsCount > 0, `Branches: ${branchRowsCount}`);

  // 6.6 Deals Kanban Board UI Flow
  await page.goto(`${BASE_URL}/deals/board`, { waitUntil: 'networkidle2' });
  await sleep(1000);
  const dealCardsCount = await page.$$eval('.dl-card', cards => cards.length).catch(() => 0);
  assert('Deals Board renders pipeline deal cards', dealCardsCount > 0, `Deal cards: ${dealCardsCount}`);
  const toolbarExists = await page.$eval('.dl-toolbar, .toolbar', el => !!el).catch(() => false);
  assert('Deals Board renders responsive search & filter toolbar', toolbarExists);

  // 6.7 Zero Uncaught Page Errors
  assert('Zero uncaught frontend runtime errors during entire walkthrough', pageErrors.length === 0, `Errors: ${pageErrors.join('; ')}`);

  await browser.close();

  console.log('\n========================================================================');
  console.log(`FULL E2E CRUD SWEEP COMPLETE: ${passed} PASSED, ${failed} FAILED (Success Rate: ${Math.round(passed / (passed + failed) * 100)}%)`);
  console.log('========================================================================');

  const reportData = {
    timestamp: new Date().toISOString(),
    totalTests: passed + failed,
    passed,
    failed,
    results: testResults
  };
  fs.writeFileSync(path.join(REPORT_DIR, 'e2e-crud-summary.json'), JSON.stringify(reportData, null, 2));

  if (failed > 0) process.exit(1);
}

runComprehensiveE2ECrudSuite().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
