/**
 * BUTTON THEME INTEGRITY TEST
 * ------------------------------------------------------------------
 * Verifies that the global button system (.btn / .btn--primary / .btn--ghost)
 * is driven exclusively by CSS custom-property theme tokens, and that it
 * re-resolves correctly in BOTH the light and dark themes.
 *
 * Regression covered:
 *   - .btn--ghost used to render with `background:0 0; border-color:#0000`,
 *     i.e. a fully transparent "Cancel / Discard" button that looked like
 *     plain body text and carried no theme surface at all.
 *   - The top-bar primary button baked the LIGHT theme primary (#2c52cf)
 *     into its box-shadow as rgba(44, 82, 207, ...), so the glow stayed dark
 *     blue in dark mode while the button fill became periwinkle.
 *
 * Run: node test/test-button-theming.mjs
 */
import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 8096;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const appDir = path.resolve(process.cwd().endsWith('frontend') ? '.' : 'frontend');

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath.startsWith('/tessly/assets/')) {
    reqPath = reqPath.replace('/tessly/assets/', '/assets/');
  }
  let filePath = path.join(
    appDir,
    reqPath === '/' || (reqPath.startsWith('/tessly') && !reqPath.includes('.')) ? 'index.html' : reqPath
  );
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(appDir, 'index.html');
  }
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

// ---- helpers -------------------------------------------------------
const hexToRgb = (hex) => {
  const h = String(hex).trim().replace('#', '');
  if (h.length === 3) return `rgb(${parseInt(h[0] + h[0], 16)}, ${parseInt(h[1] + h[1], 16)}, ${parseInt(h[2] + h[2], 16)})`;
  const n = parseInt(h, 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
const isTransparent = (c) => !c || c === 'transparent' || /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(c);
const sameColor = (a, b) => String(a).replace(/\s+/g, '') === String(b).replace(/\s+/g, '');

server.listen(PORT, async () => {
  console.log(`[TEST-BUTTON-THEME] Listening on http://localhost:${PORT}`);
  console.log('[TEST-RUNNER] Verifying global button theming integrity (light + dark)...\n');

  let passed = 0;
  let failed = 0;
  const assert = (condition, msg) => {
    if (condition) {
      console.log(`  ✓ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${msg}`);
      failed++;
    }
  };

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(e.message));

  // ================================================================
  // 1. SETTINGS > MSG91 SMS — the reported defect location
  // ================================================================
  await page.goto(`http://localhost:${PORT}/settings/msg91`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.st-actions .btn--primary', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 800));

  const readButtons = async () =>
    page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const tok = (n) => root.getPropertyValue(n).trim();
      const g = (sel, prop) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el)[prop] : null;
      };
      const actions = document.querySelector('.st-actions');
      const surface = actions?.closest('.card, .st-section') || actions?.parentElement;
      return {
        tokens: {
          primary: tok('--primary'), onPrimary: tok('--on-primary'),
          card: tok('--card'), card2: tok('--card-2'),
          line2: tok('--line-2'), text: tok('--text'),
        },
        primaryBg: g('.st-actions .btn--primary', 'backgroundColor'),
        primaryColor: g('.st-actions .btn--primary', 'color'),
        primaryShadow: g('.st-actions .btn--primary', 'boxShadow'),
        ghostBg: g('.st-actions .btn--ghost', 'backgroundColor'),
        ghostColor: g('.st-actions .btn--ghost', 'color'),
        ghostBorder: g('.st-actions .btn--ghost', 'borderColor'),
        ghostShadow: g('.st-actions .btn--ghost', 'boxShadow'),
        ghostHeight: g('.st-actions .btn--ghost', 'height'),
        surfaceBg: surface ? getComputedStyle(surface).backgroundColor : null,
        topNewBg: g('.top .btn--primary', 'backgroundColor'),
        topNewShadow: g('.top .btn--primary', 'boxShadow'),
        topNewColor: g('.top .btn--primary', 'color'),
        topAvatarBg: g('.top .me-btn .av', 'backgroundColor'),
        topAvatarColor: g('.top .me-btn .av', 'color'),
      };
    });

  console.log('=== 1. SETTINGS > MSG91 SMS :: LIGHT THEME ===');
  const light = await readButtons();
  const lightPrimary = hexToRgb(light.tokens.primary);
  const lightCard = hexToRgb(light.tokens.card);

  assert(sameColor(light.primaryBg, lightPrimary),
    `Primary button fill resolves from --primary (${light.primaryBg})`);
  assert(sameColor(light.primaryColor, hexToRgb(light.tokens.onPrimary)),
    `Primary button label resolves from --on-primary (${light.primaryColor})`);
  assert(!isTransparent(light.ghostBg),
    `Ghost button has a visible themed surface (was transparent, now ${light.ghostBg})`);
  assert(!isTransparent(light.ghostBorder),
    `Ghost button has a visible themed border (was transparent, now ${light.ghostBorder})`);
  assert(!sameColor(light.ghostBg, light.surfaceBg),
    `Ghost button surface is distinguishable from the card (${light.ghostBg} vs ${light.surfaceBg})`);
  assert(sameColor(light.ghostColor, hexToRgb(light.tokens.text)),
    `Ghost button label resolves from --text (${light.ghostColor})`);
  assert(light.ghostHeight === '40px',
    `Ghost button keeps the standard control height (${light.ghostHeight})`);

  // ================================================================
  // 2. SAME PAGE, DARK THEME
  // ================================================================
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await new Promise((r) => setTimeout(r, 350));

  console.log('\n=== 2. SETTINGS > MSG91 SMS :: DARK THEME ===');
  const dark = await readButtons();
  const darkPrimary = hexToRgb(dark.tokens.primary);
  const darkCard = hexToRgb(dark.tokens.card);

  assert(sameColor(dark.primaryBg, darkPrimary),
    `Primary button fill re-resolves from dark --primary (${dark.primaryBg})`);
  assert(!sameColor(dark.primaryBg, light.primaryBg),
    `Primary button actually changes between themes (${light.primaryBg} -> ${dark.primaryBg})`);
  assert(sameColor(dark.primaryColor, hexToRgb(dark.tokens.onPrimary)),
    `Primary button label re-resolves from dark --on-primary (${dark.primaryColor})`);
  assert(!isTransparent(dark.ghostBg),
    `Ghost button keeps a visible themed surface in dark mode (${dark.ghostBg})`);
  assert(!isTransparent(dark.ghostBorder),
    `Ghost button keeps a visible themed border in dark mode (${dark.ghostBorder})`);
  assert(!sameColor(dark.ghostBg, dark.surfaceBg),
    `Ghost button surface is distinguishable from the dark card (${dark.ghostBg} vs ${dark.surfaceBg})`);
  assert(sameColor(dark.ghostColor, hexToRgb(dark.tokens.text)),
    `Ghost button label re-resolves from dark --text (${dark.ghostColor})`);
  if (light.topNewBg) {
    assert(!sameColor(dark.topNewShadow, light.topNewShadow),
      `Top-bar primary glow is theme-derived, not a fixed light-theme blue (${light.topNewShadow} -> ${dark.topNewShadow})`);
    assert(!sameColor(dark.topNewBg, light.topNewBg),
      `Top-bar primary button fill re-resolves in dark mode (${dark.topNewBg})`);
  } else {
    console.log('  ✓ [PASS] Top-bar has no legacy + New button (replaced by notification bell per spec)');
  }

  // ================================================================
  // 3. GLOBAL CSS AUDIT — no hardcoded light-primary in app-surface button rules
  // ================================================================
  console.log('\n=== 3. GLOBAL CSS AUDIT :: HARDCODED LIGHT-PRIMARY IN BUTTON RULES ===');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await new Promise((r) => setTimeout(r, 250));

  const audit = await page.evaluate(() => {
    const offenders = [];
    const walk = (rules, href) => {
      for (const rule of rules) {
        if (rule.cssRules && rule.cssRules.length) { walk(rule.cssRules, href); continue; }
        if (!rule.selectorText || !rule.style) continue;
        const sel = rule.selectorText;
        if (!/btn/.test(sel)) continue;
        // The sign-in screen is a fixed brand surface (photo-backed dark card);
        // its deep-blue gradient art direction is intentional and excluded.
        if (/signin/.test(sel)) continue;
        const text = rule.style.cssText || '';
        const hits = text.match(/rgba?\(\s*44\s*,\s*82\s*,\s*207[^)]*\)|#2c52cf|#2346b8|#1d3285|#d6e0ff|#bfdbfe/gi);
        if (hits) offenders.push({ file: href, sel, hits: [...new Set(hits)] });
      }
    };
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      walk(rules, (sheet.href || 'inline').split('/').pop());
    }
    return offenders;
  });

  assert(audit.length === 0,
    `No hardcoded light-theme primary in any app-surface button rule (${audit.length} offender(s))`);
  for (const o of audit) {
    console.error(`       -> [${o.file}] ${o.sel} :: ${o.hits.join(', ')}`);
  }

  // ================================================================
  // 4. CROSS-PAGE PROOF — the fix is global, not settings-specific
  // ================================================================
  console.log('\n=== 4. CROSS-PAGE PROOF :: OTHER SCREENS USE THE SAME THEMED GHOST BUTTON ===');
  for (const route of ['/clients/companies', '/finance/invoices', '/today']) {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 900));
    const found = await page.evaluate(() => {
      const ghosts = [...document.querySelectorAll('.btn--ghost')];
      if (!ghosts.length) return { count: 0 };
      const cs = getComputedStyle(ghosts[0]);
      return {
        count: ghosts.length,
        text: ghosts[0].textContent.trim().slice(0, 24),
        bg: cs.backgroundColor,
        border: cs.borderColor,
      };
    });
    if (found.count === 0) {
      console.log(`  · [INFO] ${route}: no .btn--ghost rendered on this route (skipped)`);
    } else {
      assert(!isTransparent(found.bg),
        `${route}: ghost button surface is themed (${found.count} found, first "${found.text}" -> ${found.bg})`);
      assert(!isTransparent(found.border),
        `${route}: ghost button border is themed (${found.text} -> ${found.border})`);
    }
  }

  // ================================================================
  // 5. RUNTIME HEALTH
  // ================================================================
  console.log('\n=== 5. RUNTIME HEALTH ===');
  assert(consoleErrors.length === 0,
    `Zero uncaught page errors during theming audit (${consoleErrors.length})`);

  console.log('\n===========================================');
  console.log(`BUTTON THEME TEST RESULT: ${passed} passed, ${failed} failed`);
  console.log('===========================================\n');

  await browser.close();
  server.close();
  process.exit(failed > 0 ? 1 : 0);
});
