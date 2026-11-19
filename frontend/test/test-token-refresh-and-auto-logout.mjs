import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.resolve(__dirname, '../test-reports/auth-refresh');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const BASE_URL = 'http://localhost:1234';

async function runTokenRefreshAndAutoLogoutSuite() {
  console.log('===============================================================');
  console.log('TOKEN REFRESH, PERSISTENCE ON RELOAD & AUTO-LOGOUT TEST SUITE');
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

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('  [BROWSER ERROR]', msg.text());
  });
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
    // 1. Visit /login and submit credentials
    console.log('--- 1. LOGIN INITIALIZATION ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.lg-card');

    await page.type('input[name="email"]', 'ines@caldermoss.co');
    await page.type('input[autocomplete="current-password"]', 'marble88');
    await page.click('.lg-submit');
    await page.waitForSelector('.side', { timeout: 10000 });
    await sleep(800);

    const postLoginState = await page.evaluate(() => ({
      url: window.location.href,
      jwt: sessionStorage.getItem('tessly:jwt'),
      token: sessionStorage.getItem('tessly:token'),
      tokenExp: sessionStorage.getItem('tessly:tokenExp'),
      signedIn: window.__getTesslyState ? window.__getTesslyState().settings.signedIn : null
    }));

    assert('Navigated to /today after valid authentication', postLoginState.url.includes('/today'));
    assert('Session state signedIn is true', postLoginState.signedIn === true);
    assert('Cryptographic token stored in sessionStorage', !!postLoginState.token && postLoginState.token.split('.').length === 3);
    assert('Token expiration timestamp is in future', parseInt(postLoginState.tokenExp, 10) > Date.now());

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_success.png') });

    // 2. Refresh the page (Bug verification: Session must NOT expire, user must NOT be logged out)
    console.log('\n--- 2. BROWSER RELOAD / REFRESH PERSISTENCE AUDIT ---');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.side', { timeout: 10000 });
    await sleep(800);

    const postReloadState = await page.evaluate(() => ({
      url: window.location.href,
      signedIn: window.__getTesslyState ? window.__getTesslyState().settings.signedIn : null,
      hasSide: !!document.querySelector('.side'),
      hasTop: !!document.querySelector('.top'),
      hasLoginCard: !!document.querySelector('.lg-card'),
      token: sessionStorage.getItem('tessly:token'),
      me: window.__getTesslyState ? window.__getTesslyState().settings.me : null
    }));

    assert('Session remains signedIn: true after browser reload (no auto-logout)', postReloadState.signedIn === true);
    assert('Workspace sidebar remains visible', postReloadState.hasSide === true);
    assert('Top header bar remains visible', postReloadState.hasTop === true);
    assert('Login card is NOT displayed', postReloadState.hasLoginCard === false);
    assert('Session user id retained', postReloadState.me === 'u1');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_page_refresh_session_maintained.png') });

    // 3. Second reload to ensure long-term stability
    console.log('\n--- 3. REPEATED RELOAD STABILITY ---');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.side', { timeout: 10000 });
    const reload2SignedIn = await page.evaluate(() => window.__getTesslyState ? window.__getTesslyState().settings.signedIn : null);
    assert('Second page refresh maintains authenticated session', reload2SignedIn === true);

    // 4. Deep route reload (/finance/invoices)
    console.log('\n--- 4. DEEP-LINK ROUTE RELOAD ---');
    await page.evaluate(() => window.__navigate('/finance/invoices'));
    await page.waitForSelector('.phead', { timeout: 8000 });
    await sleep(500);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.phead', { timeout: 8000 });
    assert('Deep-linked route (/finance/invoices) maintained across reload', page.url().includes('/finance/invoices'));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_deep_route_refresh.png') });

    // 5. Backend Token Refresh endpoint: POST /api/auth/refresh
    console.log('\n--- 5. BACKEND TOKEN REFRESH API AUDIT ---');
    const validTok = await page.evaluate(() => sessionStorage.getItem('tessly:jwt'));
    const refreshApiRes = await page.evaluate(async (t) => {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + t,
          'Content-Type': 'application/json'
        }
      });
      return { status: res.status, body: await res.json() };
    }, validTok);

    assert('POST /api/auth/refresh returns HTTP 200 OK', refreshApiRes.status === 200, JSON.stringify(refreshApiRes));
    assert('Refreshed token is valid and renewed', !!refreshApiRes.body.token && refreshApiRes.body.token.split('.').length === 3);
    assert('User details returned in refresh response', refreshApiRes.body.user?.role === 'Admin');

    // 6. Token refresh with expired / invalid token
    console.log('\n--- 6. EXPIRED REFRESH TOKEN REJECTION ---');
    const badRefreshRes = await page.evaluate(async () => {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer expired.dummy.token',
          'Content-Type': 'application/json'
        }
      });
      return { status: res.status, body: await res.json() };
    });

    assert('POST /api/auth/refresh returns 401 Unauthorized for expired token', badRefreshRes.status === 401);
    assert('Error code is REFRESH_TOKEN_EXPIRED', badRefreshRes.body.code === 'REFRESH_TOKEN_EXPIRED');

    // 7. Automatic Logout on 401 Unauthorized / Expired Token
    console.log('\n--- 7. AUTOMATIC LOGOUT ON 401 / TOKEN EXPIRATION ---');
    await page.evaluate(() => {
      window.__triggerAutoLogout('Session expired. Please sign in again.');
    });
    await sleep(1000);

    const autoLogoutState = await page.evaluate(() => ({
      url: window.location.href,
      signedIn: window.__getTesslyState ? window.__getTesslyState().settings.signedIn : null,
      jwt: sessionStorage.getItem('tessly:jwt'),
      token: sessionStorage.getItem('tessly:token'),
      tokenExp: sessionStorage.getItem('tessly:tokenExp'),
      hasLoginCard: !!document.querySelector('.lg-card'),
      hasSide: !!document.querySelector('.side')
    }));

    assert('Automatic logout redirects to /login or /signin', autoLogoutState.url.includes('/login') || autoLogoutState.url.includes('/signin'), autoLogoutState.url);
    assert('State signedIn reset to false', autoLogoutState.signedIn === false);
    assert('Storage tessly:jwt purged', autoLogoutState.jwt === null);
    assert('Storage tessly:token purged', autoLogoutState.token === null);
    assert('Storage tessly:tokenExp purged', autoLogoutState.tokenExp === null);
    assert('Login card presented to user', autoLogoutState.hasLoginCard === true);
    assert('Workspace sidebar hidden', autoLogoutState.hasSide === false);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_auto_logout_expired_token.png') });

    // 8. Re-authenticate and perform Manual Sign-Out
    console.log('\n--- 8. MANUAL SIGN OUT WORKFLOW ---');
    await page.type('input[name="email"]', 'ines@caldermoss.co');
    await page.type('input[autocomplete="current-password"]', 'marble88');
    await page.click('.lg-submit');
    await page.waitForSelector('.side', { timeout: 10000 });
    await sleep(500);

    await page.evaluate(() => window.__performLogout());
    await sleep(1000);

    const manualSignoutState = await page.evaluate(() => ({
      url: window.location.href,
      signedIn: window.__getTesslyState ? window.__getTesslyState().settings.signedIn : null,
      jwt: sessionStorage.getItem('tessly:jwt'),
      hasLoginCard: !!document.querySelector('.lg-card')
    }));

    assert('Manual sign out redirects to /login or /signin', manualSignoutState.url.includes('/login') || manualSignoutState.url.includes('/signin'));
    assert('Manual sign out sets signedIn to false', manualSignoutState.signedIn === false);
    assert('Manual sign out clears tokens', manualSignoutState.jwt === null);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_manual_signout_clean_state.png') });

    console.log('\n===============================================================');
    console.log(`SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    if (failed > 0) process.exit(1);
  } finally {
    await browser.close();
  }
}

runTokenRefreshAndAutoLogoutSuite().catch((err) => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});
