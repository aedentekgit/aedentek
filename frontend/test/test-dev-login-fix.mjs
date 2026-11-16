import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const BASE_URL = 'http://localhost:1234';

async function runTest() {
  console.log('Testing DEV quick-login and error message accuracy...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  let passed = 0;
  let failed = 0;
  const assert = (name, cond, details = '') => {
    if (cond) {
      passed++;
      console.log(`  ✓ [PASS] ${name}`);
    } else {
      failed++;
      console.error(`  ✗ [FAIL] ${name} - ${details}`);
    }
  };

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await sleep(900);

    // 1. Test short password (<4 chars)
    console.log('\n--- 1. SHORT PASSWORD VALIDATION ---');
    await page.type('input[type="email"]', 'ines@caldermoss.co');
    await page.type('input[autocomplete="current-password"]', 'abc');
    await page.click('.lg-submit');
    await sleep(500);

    const errText1 = await page.evaluate(() => document.querySelector('.lg-err')?.textContent);
    assert('Short password shows "Enter at least 4 characters."', errText1 === 'Enter at least 4 characters.', errText1);

    // 2. Test wrong password (>=4 chars)
    console.log('\n--- 2. WRONG CREDENTIALS ERROR MESSAGE ---');
    await page.click('input[autocomplete="current-password"]', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('input[autocomplete="current-password"]', 'wrongpass999');
    await page.click('.lg-submit');
    await sleep(800);

    const errText2 = await page.evaluate(() => document.querySelector('.lg-err')?.textContent);
    assert('Wrong credentials shows "Invalid email or password. Please try again."', errText2?.includes('Invalid email or password'), errText2);

    // 3. Test DEV MODE Quick Login button
    console.log('\n--- 3. DEV MODE QUICK LOGIN BUTTON ---');
    // Click the first dev mode item (Ines Okafor)
    const devBtnExists = await page.evaluate(() => !!document.querySelector('.lg-dev__item'));
    assert('Dev mode quick-login buttons present', devBtnExists);

    await page.click('.lg-dev__item');
    await sleep(300);

    const devFormValues = await page.evaluate(() => ({
      em: document.querySelector('input[type="email"]')?.value,
      pw: document.querySelector('input[autocomplete="current-password"]')?.value
    }));
    assert('Dev quick-login populated email and password', devFormValues.em === 'ines@caldermoss.co' && !!devFormValues.pw, JSON.stringify(devFormValues));

    await page.click('.lg-submit');
    await sleep(1500);

    const afterLoginUrl = page.url();
    assert('Dev quick-login successfully authenticates and transitions to /today', afterLoginUrl.includes('/today'), afterLoginUrl);

    console.log(`\nTEST SUMMARY: ${passed} PASSED, ${failed} FAILED\n`);
    if (failed > 0) process.exit(1);
  } finally {
    await browser.close();
  }
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
