import puppeteer from 'puppeteer';

const PORT = 3000; // Connects to running dev server

async function run() {
  console.log('--- STARTING SETTINGS ALL PAGES & ADMIN SECTIONS AUDIT ---');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!txt.includes('net::ERR_INTERNET_DISCONNECTED') && !txt.includes('fonts.googleapis.com')) {
        errors.push(txt);
      }
    }
  });
  page.on('pageerror', err => errors.push(err.message));

  let passed = 0;
  let failed = 0;
  function assert(cond, msg) {
    if (cond) {
      console.log(`  ✓ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${msg}`);
      failed++;
    }
  }

  try {
    // 1. Visit /settings
    console.log('\n=== 1. VERIFY 13 LIST ON TOP PLACE (/settings) ===');
    await page.goto(`http://localhost:${PORT}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.phead');
    await new Promise(r => setTimeout(r, 600));

    const topTabs = await page.$$eval('.tabs .tab', els => els.map(e => e.textContent.trim()));
    assert(topTabs.length >= 10, `Top place contains 10 admin sections (found: ${topTabs.length})`);
    
    // Assert 10 list is on top place
    assert(topTabs[0].includes('Web Appearance'), 'Section 1 on top place is Web Appearance');
    assert(topTabs[1].includes('SMTP Server'), 'Section 2 on top place is SMTP Server');
    assert(topTabs[2].includes('MSG91 SMS'), 'Section 3 on top place is MSG91 SMS');
    assert(topTabs[3].includes('OTP Policy'), 'Section 4 on top place is OTP Policy');
    assert(topTabs[4].includes('Firebase Push'), 'Section 5 on top place is Firebase Push');
    assert(topTabs[5].includes('Mobile Apps Sync'), 'Section 6 on top place is Mobile Apps Sync');
    assert(topTabs[6].includes('Page Visibility'), 'Section 7 on top place is Page Visibility');
    assert(topTabs[7].includes('Desktop Updates'), 'Section 8 on top place is Desktop Updates');
    assert(topTabs[8].includes('Razorpay Gateway'), 'Section 9 on top place is Razorpay Gateway');
    assert(topTabs[9].includes('Security & Anti-Fraud'), 'Section 10 on top place is Security & Anti-Fraud');
    // Platform Identity and Social Media are now nested UNDER Web Appearance, not standalone tabs
    assert(!topTabs.includes('Platform Identity'), 'Platform Identity is nested under Web Appearance (not a top tab)');
    assert(!topTabs.includes('Social Media'), 'Social Media is nested under Web Appearance (not a top tab)');
    // Vimeo Video section is deleted entirely
    assert(!topTabs.some(b => b.includes('Vimeo Video')), 'Vimeo Video section is removed from Settings');

    // Assert 3 Financial sections are NOT in Settings
    assert(!topTabs.some(b => b.includes('Invoice Sender')), 'Invoice Sender is removed from Settings (resides on Finance page)');
    assert(!topTabs.some(b => b.includes('Banking & Wire')), 'Banking & Wire is removed from Settings (resides on Finance page)');
    assert(!topTabs.some(b => b.includes('GST & HSN Slabs')), 'GST & HSN Slabs is removed from Settings (resides on Finance page)');

    // Assert Profile is extracted to standalone /profile (not a top tab in settings)
    assert(!topTabs.includes('Profile'), 'Profile is now standalone at /profile (not in settings tabs)');

    // Assert Company, Users & roles and Data sections are removed from Settings
    assert(!topTabs.includes('Company'), 'Company section is removed from Settings');
    assert(!topTabs.includes('Users & roles'), 'Users & roles section is removed from Settings');
    assert(!topTabs.includes('Data'), 'Data section is removed from Settings');

    const activeTopTab = await page.$eval('.tabs .tab.is-active', el => el.textContent.trim());
    assert(activeTopTab.includes('Web Appearance'), `Default active tab on top place is "1. Web Appearance" (got: "${activeTopTab}")`);

    // 2. Web Appearance tab shows nested Platform Identity + Social Media sub-sections
    console.log('\n=== 2. VERIFY NESTED PLATFORM IDENTITY & SOCIAL MEDIA UNDER WEB APPEARANCE ===');
    await page.goto(`http://localhost:${PORT}/settings/theme`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 600));
    const themeText = await page.evaluate(() => document.body.textContent);
    assert(themeText.includes('Platform Identity'), 'Web Appearance tab renders nested Platform Identity group');
    assert(themeText.includes('Platform Site Name'), 'Platform Identity fields render inside Web Appearance');
    assert(themeText.includes('Social Media'), 'Web Appearance tab renders nested Social Media group');
    assert(themeText.includes('Instagram Profile URL'), 'Social Media fields render inside Web Appearance');

    // 3. Verify standalone Profile Page (/profile, linked from the sidebar)
    console.log('\n=== 3. VERIFY PROFILE PAGE (/profile) ===');
    await page.goto(`http://localhost:${PORT}/profile`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 600));
    const profText = await page.evaluate(() => document.body.innerText);
    assert(profText.includes('Your profile') && profText.includes('Full name') && profText.includes('Sign-in'), 'Standalone Profile page renders user details & security settings');
    // sidebar link to Profile exists
    const sbProfile = await page.evaluate(() => {
      const a = [...document.querySelectorAll('.nav__item')].find(x => x.textContent.trim() === 'Profile');
      return a ? a.getAttribute('href') : null;
    });
    assert(sbProfile === '/profile', `Sidebar Profile link points to /profile (got: "${sbProfile}")`);

    // 10. Console errors check
    console.log('\n=== 9. CONSOLE ERROR AUDIT ===');
    assert(errors.length === 0, `Zero uncaught console errors (count: ${errors.length}, errors: ${JSON.stringify(errors)})`);

    console.log('\n===========================================');
    console.log(`SETTINGS PAGES TEST RESULT: ${passed} passed, ${failed} failed`);
    console.log('===========================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();

