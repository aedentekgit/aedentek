import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_DIR = path.resolve(__dirname, '../test-reports');
fs.mkdirSync(REPORT_DIR, { recursive: true });

const BASE_URL = 'http://localhost:1234';
const API_URL = 'http://localhost:5001/api';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runOfferLettersModuleSuite() {
  console.log('====================================================================');
  console.log('TEST SUITE: HR OFFER LETTERS & MASTERS TEMPLATES FULL CRUD');
  console.log(`Frontend: ${BASE_URL} | Backend: ${API_URL}`);
  console.log('====================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(title, condition, details = '') {
    if (condition) {
      console.log(`  ✓ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${title} - ${details}`);
      failed++;
    }
  }

  // --- STEP 1: AUTHENTICATION ---
  console.log('--- 1. AUTHENTICATION & TOKENS ---');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@tessly.local', password: 'password123' })
  });
  assert('Admin login returns HTTP 200', loginRes.status === 200);
  const { token } = await loginRes.json();
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // --- STEP 2: MASTERS OFFER LETTER TEMPLATES CRUD ---
  console.log('\n--- 2. MASTERS OFFER LETTER TEMPLATES (API CRUD) ---');
  let createdTemplateId = '';
  const testTplTag = `QA-${Date.now()}`;

  // 2.1 READ list
  const getTplRes = await fetch(`${API_URL}/hr/offer-letter-templates`, { headers: authHeaders });
  assert('GET /api/hr/offer-letter-templates returns 200 OK', getTplRes.status === 200);
  const tplList = await getTplRes.json();
  assert('Seeded templates exist in database', tplList.total >= 3);
  assert('Default template exists', tplList.data.some((t) => t.isDefault));

  // 2.2 CREATE Template
  const createTplRes = await fetch(`${API_URL}/hr/offer-letter-templates`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: `Creative Stylist Offer ${testTplTag}`,
      code: `OLT-${testTplTag.slice(-5)}`,
      description: 'Custom agreement template for surface stylists and showroom leads.',
      subject: 'Offer of Employment: {position} at {companyName}',
      headerTitle: 'SURFACES STYLIST APPOINTMENT LETTER',
      salaryStructure: { basicPercent: 55, hraPercent: 25, specialAllowancePercent: 20 },
      terms: ['Probation: 90 days', 'Notice: 30 days'],
      isDefault: false
    })
  });
  assert('POST /api/hr/offer-letter-templates creates template (201)', createTplRes.status === 201);
  const createdTpl = await createTplRes.json();
  createdTemplateId = createdTpl.data?._id;
  assert('Created template ID returned', !!createdTemplateId);

  // 2.3 READ single by ID
  const getSingleTpl = await fetch(`${API_URL}/hr/offer-letter-templates/${createdTemplateId}`, { headers: authHeaders });
  assert('GET /api/hr/offer-letter-templates/:id returns 200', getSingleTpl.status === 200);
  const singleTplData = await getSingleTpl.json();
  assert('Retrieved template matches name', singleTplData.data?.name === `Creative Stylist Offer ${testTplTag}`);

  // 2.4 UPDATE Template
  const updateTplRes = await fetch(`${API_URL}/hr/offer-letter-templates/${createdTemplateId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ description: 'Updated template description via QA suite' })
  });
  assert('PUT /api/hr/offer-letter-templates/:id updates template (200)', updateTplRes.status === 200);

  // 2.5 SET DEFAULT Template
  const defTplRes = await fetch(`${API_URL}/hr/offer-letter-templates/${createdTemplateId}/default`, {
    method: 'PUT',
    headers: authHeaders
  });
  assert('PUT /api/hr/offer-letter-templates/:id/default sets default (200)', defTplRes.status === 200);

  // 2.6 Reset original default template back
  const originalDef = tplList.data.find((t) => t.isDefault);
  if (originalDef) {
    await fetch(`${API_URL}/hr/offer-letter-templates/${originalDef._id}/default`, {
      method: 'PUT',
      headers: authHeaders
    });
  }

  // 2.7 DELETE Template
  const delTplRes = await fetch(`${API_URL}/hr/offer-letter-templates/${createdTemplateId}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  assert('DELETE /api/hr/offer-letter-templates/:id removes template (200)', delTplRes.status === 200);

  // --- STEP 3: HR OFFER LETTERS (API CRUD) ---
  console.log('\n--- 3. HR OFFER LETTERS (API CRUD) ---');
  let createdOfferId = '';
  const testOfferTag = `OFFER-${Date.now()}`;

  // 3.1 READ list & KPIs
  const getOffersRes = await fetch(`${API_URL}/hr/offer-letters`, { headers: authHeaders });
  assert('GET /api/hr/offer-letters returns 200 OK', getOffersRes.status === 200);
  const offersPayload = await getOffersRes.json();
  assert('Offer letters list returned with data array', Array.isArray(offersPayload.data));
  assert('KPI metrics calculated (totalOffers >= 1)', offersPayload.kpis?.totalOffers >= 1);
  assert('CTC Committed KPI calculated', offersPayload.kpis?.totalCtcCommitted > 0);

  // 3.2 CREATE Offer Letter
  const createOfferRes = await fetch(`${API_URL}/hr/offer-letters`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      candidateName: `Rhea Kapoor ${testOfferTag.slice(-4)}`,
      candidateEmail: `rhea_${testOfferTag.slice(-4)}@example.com`,
      candidatePhone: '+91 99887 76655',
      candidateAddress: 'Sea View Towers, Worli, Mumbai',
      position: 'Senior Spatial Designer',
      department: 'Design',
      branch: 'Bandra',
      joiningDate: '2026-12-15',
      expiryDate: '2026-11-30',
      ctc: 840000,
      status: 'Draft',
      notes: 'Shortlisted from direct portfolio presentation'
    })
  });
  assert('POST /api/hr/offer-letters creates offer letter (201)', createOfferRes.status === 201);
  const createdOffer = await createOfferRes.json();
  createdOfferId = createdOffer.data?._id;
  assert('Offer letter generated with ID', !!createdOfferId);
  assert('Auto-generated offerNumber format (OL-YYYY-XXXX)', /^OL-\d{4}-\d{4}$/.test(createdOffer.data?.offerNumber));
  assert('Salary breakdown computed (Monthly Gross = 70,000)', createdOffer.data?.salaryBreakdown?.monthlyGross === 70000);
  assert('Basic salary computed (50% = 35,000)', createdOffer.data?.salaryBreakdown?.basic === 35000);

  // 3.3 READ single Offer Letter by ID
  const getSingleOffer = await fetch(`${API_URL}/hr/offer-letters/${createdOfferId}`, { headers: authHeaders });
  assert('GET /api/hr/offer-letters/:id returns 200', getSingleOffer.status === 200);
  const singleOfferData = await getSingleOffer.json();
  assert('Candidate name matches created', singleOfferData.data?.candidateName.startsWith('Rhea Kapoor'));

  // 3.4 UPDATE Offer Letter (Status to Sent, change CTC)
  const updateOfferRes = await fetch(`${API_URL}/hr/offer-letters/${createdOfferId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      status: 'Sent',
      ctc: 960000
    })
  });
  assert('PUT /api/hr/offer-letters/:id updates offer (200)', updateOfferRes.status === 200);
  const updatedOfferData = await updateOfferRes.json();
  assert('Status updated to Sent', updatedOfferData.data?.status === 'Sent');
  assert('Salary recomputed for new CTC (Monthly Gross = 80,000)', updatedOfferData.data?.salaryBreakdown?.monthlyGross === 80000);

  // 3.5 DELETE Offer Letter
  const delOfferRes = await fetch(`${API_URL}/hr/offer-letters/${createdOfferId}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  assert('DELETE /api/hr/offer-letters/:id removes offer (200)', delOfferRes.status === 200);

  // --- STEP 4: FRONTEND PUPPETEER FULL UI WORKFLOW ---
  console.log('\n--- 4. FRONTEND PUPPETEER E2E UI WALKTHROUGH ---');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  try {
    await page.setViewport({ width: 1440, height: 900 });

    // 4.1 Login
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[name="email"]', { timeout: 8000 });
    await page.type('input[name="email"]', 'admin@gmail.com');
    await page.type('input[name="password"]', 'admin123');
    await page.click('.lg-submit');
    await page.waitForSelector('.side', { timeout: 10000 });

    // 4.2 Verify Masters sidebar contains "Offer Letter Templates" and studio renders
    console.log('Verifying Masters sidebar has Offer Letter Templates...');
    await page.goto(`${BASE_URL}/hr/roles`, { waitUntil: 'networkidle2' });
    await sleep(600);

    const sidebarText = await page.evaluate(() => document.querySelector('.side')?.textContent || '');
    assert('Masters sidebar lists Offer Letter Templates', sidebarText.includes('Offer Letter Templates'));

    // Verify navigating to /hr/offer-letter-templates shows the studio
    await page.goto(`${BASE_URL}/hr/offer-letter-templates`, { waitUntil: 'networkidle2' });
    await sleep(800);
    const hasStudio = (await page.$('.tmpl-grid')) !== null;
    assert('Offer letter templates studio is rendered properly', hasStudio);

    // Verify template cards and live preview letterhead
    const tmplCardsCount = await page.evaluate(() => document.querySelectorAll('.tmpl-card').length);
    assert('Template library cards rendered', tmplCardsCount >= 2, `Found ${tmplCardsCount} cards`);

    const previewHasNoInvoice = await page.evaluate(() => {
      const stage = document.querySelector('.tmpl-preview__stage');
      if (!stage) return false;
      const text = stage.textContent;
      const hasYourLogo = text.includes('YOUR LOGO');
      const hasGSTIN = text.includes('GSTIN');
      const hasQuotation = text.includes('QUOTATION');
      return !hasYourLogo && !hasGSTIN && !hasQuotation;
    });
    assert('Studio preview has zero invoice artifacts', previewHasNoInvoice);

    const studioShotPath = path.resolve(REPORT_DIR, 'masters_offer_letter_templates_gallery.png');
    await page.screenshot({ path: studioShotPath, fullPage: true });
    console.log(`  ✓ Studio screenshot captured: ${studioShotPath}`);

    // 4.3 Navigate to HR > Offer Letters
    console.log('Navigating to /hr/offer-letters...');
    await page.goto(`${BASE_URL}/hr/offer-letters`, { waitUntil: 'networkidle2' });
    await sleep(800);

    const olTitle = await page.evaluate(() => document.querySelector('.phead h1')?.textContent.trim());
    assert('HR Offer Letters page title rendered', olTitle === 'Offer Letters');

    const olCrumbs = await page.evaluate(() => [...document.querySelectorAll('.crumbs li, .crumbs span')].map((el) => el.textContent.trim()).join(' > '));
    assert('Breadcrumbs reflect Human Resources navigation', olCrumbs.includes('Human Resources') && olCrumbs.includes('Offer Letters'), `Crumbs: ${olCrumbs}`);

    const kpiCount = await page.evaluate(() => document.querySelectorAll('.kpi').length);
    assert('KPI stat cards rendered in Offer Letters header', kpiCount >= 4);

    const initialRows = await page.evaluate(() => document.querySelectorAll('table tbody tr[data-row]').length);
    assert('Offer letters table rendered with seeded records', initialRows >= 1);

    const shotRegister = path.join(REPORT_DIR, 'hr_offer_letters_register.png');
    await page.screenshot({ path: shotRegister });
    console.log(`  ✓ Screenshot captured: ${shotRegister}`);

    // 4.4 Open "New Offer Letter" Drawer
    console.log('Opening "New Offer Letter" drawer...');
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('New Offer Letter'));
      if (btn) btn.click();
    });
    await sleep(800);

    const hasDrawer = await page.evaluate(() => document.querySelector('.drawer') !== null);
    assert('New Offer Letter modal drawer opens smoothly', hasDrawer);

    // Verify Template selector exists
    const hasTplSelect = await page.evaluate(() => {
      const selects = [...document.querySelectorAll('.drawer select')];
      return selects.some((s) => s.closest('label')?.textContent.includes('Template'));
    });
    assert('Drawer includes Offer Letter Template selection dropdown', hasTplSelect);

    // Close drawer
    await page.evaluate(() => {
      const cancelBtn = [...document.querySelectorAll('.drawer button')].find((b) => b.textContent.includes('Cancel'));
      if (cancelBtn) cancelBtn.click();
    });
    await sleep(600);

    // 4.5 Click "View & Print" on First Offer Letter
    console.log('Opening View & Print Offer Letter modal...');
    await page.evaluate(() => {
      const printBtn = document.querySelector('button[title="View & Print Offer Letter"]');
      if (printBtn) printBtn.click();
    });
    await sleep(800);

    const hasPrintDoc = await page.evaluate(() => document.querySelector('.ol-paper') !== null);
    assert('Printable Offer Letter document rendered in modal', hasPrintDoc);

    const docElements = await page.evaluate(() => {
      const doc = document.querySelector('.ol-paper');
      if (!doc) return { hasBrand: false, hasAnnexure: false, hasTerms: false, hasSigs: false, noInvoiceArtifacts: false, printBtnText: '' };
      const text = doc.textContent;
      const printBtn = document.querySelector('.ol-print-btn');
      return {
        hasBrand: text.includes('Aedentek CRM') || text.includes('Calder & Moss'),
        hasAnnexure: text.includes('Annexure A') && text.includes('Basic Salary') && text.includes('Total Cost to Company'),
        hasTerms: text.includes('Key Employment Terms'),
        hasSigs: text.includes('Candidate Acceptance') && text.includes('For Aedentek CRM'),
        noInvoiceArtifacts: !text.includes('YOUR LOGO') && !text.includes('GSTIN') && !text.includes('OFFER EXTENDED TO (CANDIDATE)') && doc.querySelectorAll('polygon').length === 0,
        printBtnText: printBtn ? printBtn.textContent.trim() : ''
      };
    });
    assert('Offer letter contains company brand letterhead', docElements.hasBrand);
    assert('Offer letter contains Annexure A structured salary breakdown table', docElements.hasAnnexure);
    assert('Offer letter contains terms and conditions clauses', docElements.hasTerms);
    assert('Offer letter contains formal signatory and candidate acceptance blocks', docElements.hasSigs);
    assert('Offer letter has ZERO invoice artifacts (no YOUR LOGO, no GSTIN, no diagonal polygons, no Bill-To box)', docElements.noInvoiceArtifacts);
    assert('Print / Save PDF button preserves full visible label', docElements.printBtnText.includes('Print / Save PDF'), `Got: "${docElements.printBtnText}"`);

    const shotPrint = path.join(REPORT_DIR, 'hr_offer_letter_executive_preview.png');
    await page.screenshot({ path: shotPrint });
    console.log(`  ✓ Screenshot captured: ${shotPrint}`);

    // Close preview
    await page.evaluate(() => {
      const closeBtn = [...document.querySelectorAll('.drawer button')].find((b) => b.textContent.includes('Close'));
      if (closeBtn) closeBtn.click();
    });
    await sleep(600);

    // 4.6 Runtime Health Audit
    assert('Zero uncaught frontend runtime errors during entire walkthrough', pageErrors.length === 0, pageErrors.join('; '));

  } finally {
    await browser.close();
  }

  // --- FINAL TALLY ---
  console.log('\n====================================================================');
  console.log(`OFFER LETTERS MODULE VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runOfferLettersModuleSuite().catch((err) => {
  console.error('Fatal Suite Error:', err);
  process.exit(1);
});
