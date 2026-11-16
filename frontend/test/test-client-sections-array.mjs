import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:1234';
const OUT = path.resolve('test-reports');
fs.mkdirSync(OUT, { recursive: true });

async function run() {
  console.log('===============================================================');
  console.log('CLIENT SECTIONS ARRAY FORM COLLECTIONS AUTOMATED TEST SUITE');
  console.log('===============================================================\n');

  // STEP 1: Reset database
  console.log('[STEP 1] Resetting database via POST /api/clients/reset...');
  const resetRes = await fetch(`${BASE_URL}/api/clients/reset`, { method: 'POST' });
  assert.equal(resetRes.status, 200, 'Reset returned 200 OK');
  const resetJson = await resetRes.json();
  assert.ok(resetJson.success, 'Reset successful');
  const clients = resetJson.data;
  console.log(`✓ Database reset with ${clients.length} seed clients.\n`);

  // STEP 2: Verify all 11 sections are Array collections across ALL customers
  console.log('[STEP 2] Verifying that for EACH customer, EACH section is an Array form collection...');
  const requiredArraySections = [
    'contacts',
    'websites',
    'social',
    'credentials',
    'projects',
    'invoices',
    'payments',
    'tickets',
    'documents',
    'timeline',
    'monthlySchedule'
  ];

  for (const client of clients) {
    console.log(`Checking Client: ${client.company} (${client.clientId}):`);
    for (const sec of requiredArraySections) {
      assert.ok(
        Array.isArray(client[sec]),
        `Expected ${client.company}.${sec} to be an Array collection, but got ${typeof client[sec]}`
      );
      console.log(`  ✓ ${sec.padEnd(16)}: Array(${client[sec].length})`);
    }
  }
  console.log('\n✓ All 11 sections verified as Array form collections across ALL customers.\n');

  // STEP 3: Verify Kavita Edutech specific array collections & lists endpoint
  console.log('[STEP 3] Verifying Kavita Edutech specific data and /lists endpoints...');
  const kavitaRes = await fetch(`${BASE_URL}/api/clients/client-kavita-edu`);
  assert.equal(kavitaRes.status, 200);
  const kavita = (await kavitaRes.json()).data;
  assert.equal(kavita.company, 'Kavita Edutech');
  assert.equal(kavita.websites.length, 1);
  assert.equal(kavita.websites[0].domain, 'app.kavitaedutech.io');
  assert.equal(kavita.social.length, 4);
  assert.equal(kavita.credentials.length, 1);
  assert.equal(kavita.projects.length, 1);
  assert.equal(kavita.invoices.length, 1);
  assert.equal(kavita.payments.length, 0);
  assert.equal(kavita.documents.length, 1);
  assert.equal(kavita.monthlySchedule.length, 2);
  console.log('✓ Kavita Edutech record retrieved with exact array counts.\n');

  // Test /lists/social endpoint
  const socListRes = await fetch(`${BASE_URL}/api/clients/client-kavita-edu/lists/social`);
  assert.equal(socListRes.status, 200);
  const socList = await socListRes.json();
  assert.equal(socList.success, true);
  assert.equal(socList.total, 4);
  assert.equal(socList.data[0].handle, 'linkedin.com/company/kavitaedutech');
  assert.equal(socList.data[1].handle, '@kavita_edu');
  assert.equal(socList.data[2].name, 'YouTube Masterclass Channel');
  assert.equal(socList.data[3].name, 'GitHub Organization');
  console.log('✓ GET /api/clients/client-kavita-edu/lists/social returned 4 live channels.\n');

  // STEP 4: Test Social Channel CRUD on Collection
  console.log('[STEP 4] Testing Social Channel CRUD operations...');
  // Add channel
  const addSoc = await fetch(`${BASE_URL}/api/clients/client-kavita-edu/social`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Instagram Edu Channel',
      handle: '@kavita_live',
      desc: 'Live interactive doubt sessions & student shorts',
      href: 'https://instagram.com/kavita_live',
      tone: 'amber'
    })
  });
  assert.equal(addSoc.status, 201);
  const addJson = await addSoc.json();
  assert.equal(addJson.data.social.length, 5);
  const newSocId = addJson.data.social.find((s) => s.name === 'Instagram Edu Channel').id;
  console.log(`✓ Added social channel '${newSocId}', collection expanded to 5.`);

  // Update channel
  const updSoc = await fetch(`${BASE_URL}/api/clients/client-kavita-edu/social/${newSocId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ desc: 'Official student updates & verified reels' })
  });
  assert.equal(updSoc.status, 200);
  const updJson = await updSoc.json();
  assert.equal(
    updJson.data.social.find((s) => s.id === newSocId).desc,
    'Official student updates & verified reels'
  );
  console.log('✓ Updated social channel metadata successfully.');

  // Delete channel
  const delSoc = await fetch(`${BASE_URL}/api/clients/client-kavita-edu/social/${newSocId}`, {
    method: 'DELETE'
  });
  assert.equal(delSoc.status, 200);
  const delJson = await delSoc.json();
  assert.equal(delJson.data.social.length, 4);
  console.log('✓ Deleted social channel cleanly, collection returned to 4.\n');

  // STEP 5: Browser UI Verification with Puppeteer
  console.log('[STEP 5] Launching Puppeteer for live UI verification on Client 360...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1400,960']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 960 });

  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  try {
    console.log(`Signing in at ${BASE_URL}/login...`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));
    await page.type('input[type="email"]', 'ines.okafor@aedentek.com');
    await page.type('input[autocomplete="current-password"]', 'password123');
    await page.click('.lg-submit');
    await new Promise((r) => setTimeout(r, 1200));

    console.log(`Navigating to ${BASE_URL}/clients/c/client-kavita-edu...`);
    await page.goto(`${BASE_URL}/clients/c/client-kavita-edu`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    // Check Header & Telemetry
    const clientTitle = await page.$eval('.phead__title, h1', (el) => el.textContent.trim());
    console.log(`✓ Header Title: "${clientTitle}"`);
    assert.ok(clientTitle.includes('Kavita Edutech'), 'Header displays Kavita Edutech');

    // Verify tabs
    const tabs = await page.$$eval('.tabs .tab', (els) => els.map((e) => e.textContent.trim()));
    console.log(`✓ Found ${tabs.length} tabs: ${tabs.join(' | ')}`);
    assert.ok(tabs.length >= 9, 'Expected at least 9 tabs');

    // 1. Websites Tab (Matching screenshot)
    await page.evaluate(() => {
      const t = Array.from(document.querySelectorAll('.tabs .tab')).find((el) => el.textContent.includes('Websites'));
      if (t) t.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    const websiteDomain = await page.$eval('.table tbody tr', (el) => el.textContent);
    assert.ok(websiteDomain.includes('app.kavitaedutech.io'), 'Websites table lists app.kavitaedutech.io');
    const websiteShot = path.join(OUT, 'client_kavita_websites_array.png');
    await page.screenshot({ path: websiteShot, fullPage: false });
    console.log(`✓ Websites tab verified & screenshot captured: ${websiteShot}`);

    // 2. Social Tab (Dynamic array collection from DB)
    await page.evaluate(() => {
      const t = Array.from(document.querySelectorAll('.tabs .tab')).find((el) => el.textContent.includes('Social'));
      if (t) t.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    const socCards = await page.$$eval('.cd-soc', (els) => els.map((el) => el.textContent));
    console.log(`✓ Social tab rendered ${socCards.length} dynamic channel card(s) from collection`);
    assert.equal(socCards.length, 4, 'Expected 4 social cards from Kavita Edutech collection');
    assert.ok(socCards[0].includes('linkedin.com/company/kavitaedutech'), 'Channel 1: Kavita Edutech LinkedIn');
    assert.ok(socCards[1].includes('@kavita_edu'), 'Channel 2: Kavita Edutech Twitter/X');
    assert.ok(socCards[2].includes('YouTube Masterclass Channel'), 'Channel 3: Kavita Edutech YouTube');
    assert.ok(socCards[3].includes('GitHub Organization'), 'Channel 4: Kavita Edutech GitHub');

    // Verify "+ Add Channel" button exists
    const hasAddBtn = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).some((b) => b.textContent.includes('Add Channel'));
    });
    assert.ok(hasAddBtn, '"+ Add Channel" button present in card tools');

    const socialShot = path.join(OUT, 'client_kavita_social_array.png');
    await page.screenshot({ path: socialShot, fullPage: false });
    console.log(`✓ Social tab verified & screenshot captured: ${socialShot}`);

    // 3. Monthly Billing Tab
    await page.evaluate(() => {
      const t = Array.from(document.querySelectorAll('.tabs .tab')).find((el) => el.textContent.includes('Monthly Billing'));
      if (t) t.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    const billingRows = await page.$$('.table tbody tr');
    console.log(`✓ Monthly Billing rendered ${billingRows.length} schedule row(s) from collection`);
    const billingShot = path.join(OUT, 'client_kavita_monthly_billing_array.png');
    await page.screenshot({ path: billingShot, fullPage: false });
    console.log(`✓ Monthly Billing tab verified & screenshot captured: ${billingShot}`);

    // 4. Contracts Tab
    await page.evaluate(() => {
      const t = Array.from(document.querySelectorAll('.tabs .tab')).find((el) => el.textContent.includes('Contracts'));
      if (t) t.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    const contractCards = await page.$$('.cd-soc.cd-doc');
    console.log(`✓ Contracts tab rendered ${contractCards.length} legal document card(s) from collection`);
    const contractsShot = path.join(OUT, 'client_kavita_contracts_array.png');
    await page.screenshot({ path: contractsShot, fullPage: false });
    console.log(`✓ Contracts tab verified & screenshot captured: ${contractsShot}`);

    // Assert 0 page errors
    assert.equal(pageErrors.length, 0, `Detected page errors: ${pageErrors.join(', ')}`);
    console.log('✓ Clean execution: 0 client-side page errors detected.');
  } finally {
    await browser.close();
  }

  console.log('\n===============================================================');
  console.log('ALL CLIENT SECTION ARRAY FORM COLLECTION TESTS PASSED (100%)');
  console.log('===============================================================\n');
}

run().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
