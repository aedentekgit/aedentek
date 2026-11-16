import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.resolve(__dirname, '../test-reports/auth');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const BASE_URL = 'http://localhost:1234';

async function runJwtLoginE2ETest() {
  console.log('===============================================================');
  console.log('SERVER-SIDE AUTHENTICATION & JWT LOGIN PUPPETEER TEST');
  console.log(`Target: ${BASE_URL}`);
  console.log('===============================================================\n');

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log('  [BROWSER CONSOLE]', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('  [PAGE ERROR]', err.message));

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      passed++;
      console.log(`  ✓ [PASS] ${name}`);
    } else {
      failed++;
      console.error(`  ✗ [FAIL] ${name} - ${details}`);
    }
  }

  try {
    // 1. Visit /login
    console.log('--- 1. LOGIN PAGE MOUNT ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await sleep(900);
    const hasCard = await page.evaluate(() => !!document.querySelector('.lg-card'));
    assert('Login card mounted on /login', hasCard);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_page.png') });

    // 2. Submit with wrong password
    console.log('\n--- 2. INVALID CREDENTIALS REJECTION ---');
    await page.type('input[type="email"]', 'ines@caldermoss.co');
    await page.type('input[autocomplete="current-password"]', 'wrongpassword');
    await page.click('.lg-submit');
    await sleep(900);

    const stayedOnLogin = page.url().includes('/login');
    assert('Rejected login stays on /login', stayedOnLogin, page.url());
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_invalid_password_rejected.png') });

    // 3. Clear and enter correct Admin credentials
    console.log('\n--- 3. SUCCESSFUL ADMIN LOGIN WITH BCRYPT & JWT ---');
    // Reload page to get clean inputs
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await sleep(900);

    await page.type('input[type="email"]', 'ines@caldermoss.co');
    await page.type('input[autocomplete="current-password"]', 'marble88');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_credentials_entered.png') });

    const formVals = await page.evaluate(() => ({
      em: document.querySelector('input[type="email"]')?.value,
      pw: document.querySelector('input[autocomplete="current-password"]')?.value
    }));
    console.log('  Form values submitted:', formVals);

    await page.click('.lg-submit');
    await sleep(1500);

    const urlAfter = page.url();
    assert('Transitions to /today workspace after valid login', urlAfter.includes('/today'), urlAfter);

    const sessionState = await page.evaluate(() => {
      return {
        jwt: sessionStorage.getItem('tessly:jwt'),
        role: sessionStorage.getItem('tessly:role'),
        signedIn: window.__getTesslyState ? window.__getTesslyState().settings.signedIn : null
      };
    });

    assert('Signed JWT stored in sessionStorage tessly:jwt', !!sessionState.jwt && sessionState.jwt.split('.').length === 3, sessionState.jwt);
    assert('Session role set to Admin', sessionState.role === 'Admin', sessionState.role);
    assert('State settings.signedIn is true', sessionState.signedIn === true);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_authenticated_today_workspace.png') });

    // 4. Verify outgoing API requests forward Bearer JWT token
    console.log('\n--- 4. VERIFY FETCH INTERCEPTOR SENDS BEARER JWT ---');
    const apiMeRes = await page.evaluate(async () => {
      const res = await fetch('/api/auth/me');
      return { status: res.status, data: await res.json() };
    });

    assert('GET /api/auth/me returns 200 OK', apiMeRes.status === 200, JSON.stringify(apiMeRes));
    assert('User role identified as Admin from JWT', apiMeRes.data?.user?.role === 'Admin', JSON.stringify(apiMeRes.data));
    assert('Token was cryptographically validated by backend', apiMeRes.data?.user?.tokenValidated === true);

    console.log('\n===============================================================');
    console.log(`FRONTEND JWT AUTHENTICATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    if (failed > 0) process.exit(1);
  } finally {
    await browser.close();
  }
}

runJwtLoginE2ETest().catch(err => {
  console.error('\n❌ FRONTEND JWT TEST RUNNER FAILED:', err);
  process.exit(1);
});
