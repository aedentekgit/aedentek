import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function startServer(port = 8091) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };

  const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0].split('#')[0];
    if (reqUrl.startsWith('/tessly/')) reqUrl = reqUrl.replace('/tessly', '');
    if (reqUrl === '' || reqUrl === '/') reqUrl = '/index.html';

    let filePath = path.join(ROOT_DIR, reqUrl);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(ROOT_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end(`Server Error`);
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
        });
        res.end(content, 'utf-8');
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`[TEST-LOGIN-SERVER] Listening on http://localhost:${port}`);
      resolve(server);
    });
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runLoginTests() {
  const PORT = 8091;
  const server = await startServer(PORT);
  const BASE_URL = `http://localhost:${PORT}/login`;

  console.log('[TEST-RUNNER] Launching Chromium to test Clean Centered Login UI/UX (Zero Hash)...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // The static test server has no backend, and the app no longer signs users in offline.
  // Mock the login API with a signed-in Admin response so the UI transition can be tested.
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().includes('/api/auth/login') && req.method() === 'POST' && req.url().includes(':8091/')) {
      const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
      const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: 'u1', role: 'Admin', accessLevel: 'Admin', email: 'ines@caldermoss.co', exp: Math.floor(Date.now() / 1000) + 3600 })}.test-signature`;
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, token, user: { id: 'u1', name: 'Ines Okafor', email: 'ines@caldermoss.co', role: 'Admin', accessLevel: 'Admin' } }),
      });
    }
    return req.continue();
  });

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('ERR_INTERNET_DISCONNECTED')) {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    errors.push(err.toString());
  });

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
    console.log('\n--- 1. SPLIT LOGIN LAYOUT WITH CODING ARTWORK ---');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await sleep(900);

    const layout = await page.evaluate(() => {
      const card = document.querySelector('.lg-card');
      const bg = document.querySelector('.lg-login__bg');
      const r = card ? card.getBoundingClientRect() : null;
      return {
        hasCard: !!card,
        bgImage: bg ? getComputedStyle(bg).backgroundImage : '',
        bgSize: bg ? getComputedStyle(bg).backgroundSize : '',
        cardLeft: r ? Math.round(r.left) : -1,
        cardRight: r ? Math.round(r.right) : -1,
        vw: window.innerWidth,
        blur: card ? getComputedStyle(card).backdropFilter : ''
      };
    });
    assert('Glass sign-in card and full-bleed background layer are rendered', layout.hasCard);
    assert('Background is the coding-workspace artwork (login-coding-bg.svg), sized to cover',
      layout.bgImage.includes('login-coding-bg.svg') && layout.bgSize === 'cover', layout.bgImage);
    assert('Card sits on the left half of the screen, artwork visible on the right',
      layout.cardRight < layout.vw * 0.5 && layout.cardLeft > 0, `${layout.cardLeft}-${layout.cardRight} of ${layout.vw}`);
    assert('Card uses a frosted-glass (backdrop blur) surface', /blur/.test(layout.blur), layout.blur);

    const artwork = await page.evaluate(async () => {
      const t = await (await fetch('/assets/login-coding-bg.svg')).text();
      return { ok: t.includes('<svg'), code: /jsonwebtoken/.test(t) };
    });
    assert('Artwork file is served and shows code on a monitor', artwork.ok && artwork.code);

    console.log('\n--- 2. CONTENT MATCHES THE REFERENCE STRUCTURE ---');
    const content = await page.evaluate(() => ({
      title: document.querySelector('.lg-title')?.innerText,
      desc: document.querySelector('.lg-desc')?.innerText,
      emailPh: document.querySelector('input[type="email"]')?.placeholder,
      pwPh: document.querySelector('input[autocomplete="current-password"]')?.placeholder,
      forgot: document.querySelector('.lg-forgot')?.innerText,
      submit: document.querySelector('.lg-submit')?.innerText.trim(),
      foot: document.querySelector('.lg-foot')?.innerText
    }));
    assert('Heading "Sign in" and helper text', content.title === 'Sign in' && /credentials to access your account/.test(content.desc), JSON.stringify(content));
    assert('Email and password fields with reference placeholders', content.emailPh === 'Enter your email' && content.pwPh === 'Enter your password', JSON.stringify(content));
    assert('"Forgot Password ?" link and "Login" button', /Forgot Password/.test(content.forgot) && /Login/.test(content.submit));
    assert('Footer shows "Secure login" and copyright', /Secure login/.test(content.foot) && /2026 All rights reserved/.test(content.foot));

    const rowAlign = await page.evaluate(() => {
      const f = document.querySelector('.lg-field');
      const i = f.querySelector('.lg-field__icon').getBoundingClientRect();
      const inp = f.querySelector('.lg-input').getBoundingClientRect();
      return Math.abs((i.top + i.height / 2) - (inp.top + inp.height / 2)) < 4 && i.right <= inp.left + 1;
    });
    assert('Field icon and input sit on one row', rowAlign);

    console.log('\n--- 3. VALIDATION ---');
    await page.click('.lg-submit');
    await sleep(500);
    const emailErr = await page.evaluate(() => document.querySelector('.lg-err')?.innerText);
    assert('Empty email shows an inline error and stays on login', /valid email/i.test(emailErr || '') && page.url().includes('/login'), emailErr);
    await page.type('input[type="email"]', 'ines@caldermoss.co');
    await page.click('.lg-submit');
    await sleep(500);
    const pwErr = await page.evaluate(() => document.querySelector('.lg-err')?.innerText);
    assert('Short password shows an inline error and stays on login', /4 characters/i.test(pwErr || '') && page.url().includes('/login'), pwErr);

    console.log('\n--- 4. PASSWORD VISIBILITY TOGGLE ---');
    await page.focus('input[autocomplete="current-password"]');
    await page.keyboard.type('marble88');
    const typeBefore = await page.evaluate(() => document.querySelector('input[autocomplete="current-password"]').type);
    await page.click('.lg-eye');
    await sleep(200);
    const typeAfter = await page.evaluate(() => document.querySelector('input[autocomplete="current-password"]').type);
    assert('Eye button toggles password between hidden and visible', typeBefore === 'password' && typeAfter === 'text', `${typeBefore} -> ${typeAfter}`);
    await page.click('.lg-eye');
    assert('Eye button hides the password again', (await page.evaluate(() => document.querySelector('input[autocomplete="current-password"]').type)) === 'password');

    console.log('\n--- 5. AUTHENTICATION & LOGIN WORKFLOW ---');
    await page.click('.lg-submit');
    await sleep(900);
    const urlAfterLogin = page.url();
    const mainAppMounted = await page.evaluate(() => !!document.querySelector('.app'));
    assert(
      'Valid email + password transitions to /today CRM sales desk without hash (#)',
      !urlAfterLogin.includes('#') && urlAfterLogin.includes('/today') && mainAppMounted,
      `URL: ${urlAfterLogin}, App mounted: ${mainAppMounted}`
    );

    console.log('\n--- 6. SIGN-OUT BACK TO LOGIN ---');
    await page.evaluate(() => {
      if (window.__navigate) window.__navigate('/login');
      else {
        history.pushState(null, '', '/login');
        window.dispatchEvent(new Event('popstate'));
      }
    });
    await sleep(700);
    const returnedToLogin = await page.evaluate(() => !!document.querySelector('.lg-card'));
    assert('Navigating to /login returns to the split login page without hash (#)',
      !page.url().includes('#') && returnedToLogin, `URL: ${page.url()}`);

    console.log('\n--- 7. RESPONSIVE (MOBILE) ---');
    await page.setViewport({ width: 390, height: 800 });
    await sleep(400);
    const mobile = await page.evaluate(() => {
      const r = document.querySelector('.lg-card').getBoundingClientRect();
      return { fits: r.left >= 0 && r.right <= window.innerWidth, noScroll: document.documentElement.scrollWidth <= window.innerWidth };
    });
    assert('Card fits a 390px phone viewport with no horizontal scroll', mobile.fits && mobile.noScroll, JSON.stringify(mobile));
    await page.setViewport({ width: 1440, height: 900 });

    console.log('\n--- 8. THEME BASE COLOURS (not a fixed green palette) ---');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await sleep(700);
    const theme = await page.evaluate(() => {
      const probe = (cssVar) => {
        const d = document.createElement('span');
        d.style.color = `var(${cssVar})`;
        document.body.appendChild(d);
        const c = getComputedStyle(d).color;
        d.remove();
        return c;
      };
      const btn = getComputedStyle(document.querySelector('.lg-submit'));
      const mark = getComputedStyle(document.querySelector('.lg-brand__mark'));
      const card = getComputedStyle(document.querySelector('.lg-card'));
      return {
        btnBg: btn.backgroundColor, primary: probe('--primary'),
        btnInk: btn.color, onPrimary: probe('--on-primary'),
        markBg: mark.backgroundColor, citron: probe('--citron'),
        cardBorder: card.borderColor, side: probe('--side')
      };
    });
    assert('Login button uses the theme primary colour (--primary)', theme.btnBg === theme.primary, `${theme.btnBg} vs ${theme.primary}`);
    assert('Button label uses the theme "on primary" ink', theme.btnInk === theme.onPrimary, `${theme.btnInk} vs ${theme.onPrimary}`);
    assert('Brand mark uses the theme accent (--citron)', theme.markBg === theme.citron, `${theme.markBg} vs ${theme.citron}`);
    const svgText = await page.evaluate(async () => (await (await fetch('/assets/login-coding-bg.svg')).text()));
    assert('Artwork is recoloured to the theme (no leftover green accents)', !/#2dd4a0|#34d399|#6ee7b7|#16a37a/i.test(svgText));
    const recolor = await page.evaluate(() => {
      document.documentElement.style.setProperty('--primary', 'rgb(200, 30, 30)');
      return getComputedStyle(document.querySelector('.lg-submit')).backgroundColor;
    });
    assert('Changing the theme token re-colours the button (follows admin theme)', recolor === 'rgb(200, 30, 30)', recolor);
    await page.evaluate(() => document.documentElement.style.removeProperty('--primary'));

    console.log('\n--- 9. QUICK-LOGIN LIST IS HIDDEN OUTSIDE DEV MODE ---');
    const staticHasList = await page.evaluate(() => !!document.querySelector('.lg-dev, [data-dev-only]'));
    assert('Static / non-dev serving: no quick-login list is rendered', staticHasList === false);

    // Production build must not even contain the list code
    const { execFileSync } = await import('node:child_process');
    const os = await import('node:os');
    const outDir = path.join(os.tmpdir(), `login-prod-check-${Date.now()}`);
    let prodClean = false;
    try {
      execFileSync('npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir'], { cwd: ROOT_DIR, stdio: 'pipe', timeout: 120000 });
      const jsFiles = fs.readdirSync(path.join(outDir, 'assets')).filter((f) => f.endsWith('.js'));
      const joined = jsFiles.map((f) => fs.readFileSync(path.join(outDir, 'assets', f), 'utf8')).join('\n');
      prodClean = !joined.includes('DEV MODE') && !joined.includes('lg-dev') && !joined.includes('Quick login');
    } catch (e) {
      console.error('   vite build failed:', String(e.message).slice(0, 200));
    }
    assert('Production build (vite build) contains no quick-login list code at all', prodClean);

    // Dev server: list must be present and usable
    const { spawn } = await import('node:child_process');
    const devPort = 5199;
    const dev = spawn('npx', ['vite', '--port', String(devPort), '--strictPort'], { cwd: ROOT_DIR, stdio: 'pipe' });
    await new Promise((resolve) => {
      const t = setTimeout(resolve, 15000);
      dev.stdout.on('data', (d) => { if (String(d).includes('Local')) { clearTimeout(t); resolve(); } });
    });
    try {
      await page.goto(`http://localhost:${devPort}/login`, { waitUntil: 'networkidle2' });
      await sleep(900);
      const devInfo = await page.evaluate(() => ({
        listed: document.querySelectorAll('.lg-dev__item').length,
        badge: document.querySelector('.lg-dev__badge')?.innerText
      }));
      assert('Dev server: quick-login list is shown with the DEV MODE badge', devInfo.listed >= 2 && devInfo.badge === 'DEV MODE', JSON.stringify(devInfo));
      await page.evaluate(() => document.querySelectorAll('.lg-dev__item')[1].click());
      await sleep(300);
      const filled = await page.evaluate(() => ({
        email: document.querySelector('input[type="email"]').value,
        pw: document.querySelector('input[autocomplete="current-password"]').value.length,
        selected: document.querySelectorAll('.lg-dev__item.is-selected').length
      }));
      assert('Clicking an account fills email + password and highlights it', /@/.test(filled.email) && filled.pw >= 4 && filled.selected === 1, JSON.stringify(filled));
      await page.click('.lg-submit');
      await sleep(1000);
      assert('Quick login signs in to /today', page.url().includes('/today'), page.url());
    } finally {
      dev.kill('SIGTERM');
    }

    console.log('\n--- 10. ERROR & CONSOLE AUDIT ---');
    assert('Zero console errors or exceptions during login walkthrough', errors.length === 0, JSON.stringify(errors));

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n===========================================`);
  console.log(`LOGIN UI/UX TEST RESULT: ${passed} passed, ${failed} failed`);
  console.log(`===========================================\n`);

  if (failed > 0) process.exit(1);
}

runLoginTests();
