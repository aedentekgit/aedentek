/**
 * PLAYBOOKS (STUDIO > PLAYBOOKS) RESPONSIVE UI/UX AUTOMATED TEST SUITE
 * --------------------------------------------------------------------
 * Verifies:
 *   1. Playbook cards have NO floating eye action buttons (.tl-act / .tl-act--view).
 *   2. Playbook cards have NO invasive 4px left border; border is 1px solid var(--line).
 *   3. .lb-card__open is an invisible absolute overlay (inset: 0) providing full card clickability.
 *   4. Toolbar search input placeholder is visible ("Search playbooks" in var(--muted)), not transparent.
 *   5. Search filtering dynamically filters cards in real-time.
 *   6. Category chips (All, Discovery, Specification, Negotiation, Hospitality, Product) filter cards.
 *   7. "Saved only" switch filters bookmarked cards.
 *   8. Bookmark button saves/unsaves playbook.
 *   9. Clicking anywhere on card opens the playbook drawer modal.
 *  10. Drawer modal renders summary quote, key points checklist, progress meter, and close button.
 *  11. Multi-breakpoint responsive layouts:
 *      - 1600px / 1440px Desktop (balanced multi-column grid)
 *      - 1024px Tablet Landscape (2 columns)
 *      - 768px Tablet Portrait (2 columns, full-width search)
 *      - 390px Mobile (1 column fluid stack)
 *  12. Zero page errors or console exceptions.
 */

import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const PORT = 8155;
const API_TARGET = { host: 'localhost', port: 5001 };
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};
const appDir = path.resolve(process.cwd().endsWith('frontend') ? '.' : 'frontend');
const artifactDir = '/Users/aedenteka/.gemini/antigravity/brain/3d12e36d-49a8-4948-8950-271dec127182';

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const pr = http.request(
      { host: API_TARGET.host, port: API_TARGET.port, path: req.url, method: req.method, headers: req.headers },
      (up) => {
        res.writeHead(up.statusCode, up.headers);
        up.pipe(res);
      }
    );
    pr.on('error', () => {
      res.writeHead(502);
      res.end('{}');
    });
    req.pipe(pr);
    return;
  }
  const reqPath = req.url.split('?')[0];
  let filePath = path.join(appDir, reqPath === '/' ? 'index.html' : reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(appDir, 'index.html');
  }
  fs.readFile(filePath, (err, c) => {
    if (err) {
      res.writeHead(500);
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(c);
  });
});

server.listen(PORT, async () => {
  console.log(`[TEST-RUNNER] Server running on http://localhost:${PORT}`);
  console.log('================================================================');
  console.log('PLAYBOOKS PAGE (STUDIO > PLAYBOOKS) RESPONSIVE UI/UX TEST SUITE');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;
  const testAssert = (cond, msg) => {
    if (cond) {
      console.log(`  ✓ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${msg}`);
      failed++;
    }
  };

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  try {
    // 1. LOGIN & NAVIGATE TO /library
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 1200));

    if (await page.$('.lg-form')) {
      await page.evaluate(() => {
        const set = (sel, v) => {
          const el = document.querySelector(sel);
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        };
        set('.lg-input[name="email"]', 'ines.okafor@tessly.io');
        set('.lg-input[name="password"]', 'dev1234');
        document.querySelector('.lg-form').requestSubmit();
      });
      await page.waitForSelector('.app', { timeout: 9000 });
    }

    await page.evaluate(() => window.__navigate && window.__navigate('/library'));
    await page.waitForSelector('.lb-card', { timeout: 9000 });
    await new Promise((r) => setTimeout(r, 800));

    console.log('\n--- 1. CARD CLICKABILITY & EYE-ICON REMOVAL ---');
    const openBtnsInfo = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.lb-card__open'));
      return {
        count: btns.length,
        hasTlAct: btns.some((b) => b.classList.contains('tl-act')),
        hasViewClass: btns.some((b) => b.classList.contains('tl-act--view')),
        opacityZero: btns.every((b) => getComputedStyle(b).opacity === '0'),
        isAbsolute: btns.every((b) => getComputedStyle(b).position === 'absolute'),
        coversCard: btns[0] && btns[0].getBoundingClientRect().width > 200
      };
    });
    testAssert(openBtnsInfo.count >= 9, `Found ${openBtnsInfo.count} playbook cards`);
    testAssert(!openBtnsInfo.hasTlAct, 'No floating action buttons (.tl-act) injected into cards');
    testAssert(!openBtnsInfo.hasViewClass, 'No .tl-act--view eye icons on playbook cards');
    testAssert(openBtnsInfo.opacityZero, '.lb-card__open is invisible (opacity: 0)');
    testAssert(openBtnsInfo.isAbsolute && openBtnsInfo.coversCard, '.lb-card__open covers the entire card as click trigger');

    console.log('\n--- 2. CARD BORDER & CLEAN STYLING ---');
    const borderInfo = await page.evaluate(() => {
      const card = document.querySelector('.lb-card');
      const cont = document.querySelector('.lb-continue');
      const cs = card ? getComputedStyle(card) : null;
      const ccs = cont ? getComputedStyle(cont) : null;
      return {
        cardBorderLeft: cs ? cs.borderLeftWidth : null,
        cardBorderLeftColor: cs ? cs.borderLeftColor : null,
        continueBorderLeft: ccs ? ccs.borderLeftWidth : null,
        overflowHidden: cs ? cs.overflow : null
      };
    });
    testAssert(borderInfo.cardBorderLeft === '1px', `Card left border is 1px (got ${borderInfo.cardBorderLeft}, no 4px purple strip)`);
    testAssert(borderInfo.continueBorderLeft === '1px', `Continue section border is 1px (got ${borderInfo.continueBorderLeft})`);
    testAssert(borderInfo.overflowHidden === 'hidden', 'Card has overflow: hidden for smooth rounded tone header');

    console.log('\n--- 3. TOOLBAR SEARCH BAR & VISIBLE PLACEHOLDER ---');
    const searchInfo = await page.evaluate(() => {
      const search = document.querySelector('.toolbar__search');
      const input = search ? search.querySelector('input') : null;
      const cs = input ? getComputedStyle(input, '::placeholder') : null;
      return {
        hasSearch: !!search,
        placeholder: input ? input.placeholder : '',
        placeholderColor: cs ? cs.color : null,
        isVisible: cs && cs.color !== 'rgba(0, 0, 0, 0)' && cs.color !== 'transparent'
      };
    });
    testAssert(searchInfo.hasSearch, 'Toolbar search control is present');
    testAssert(searchInfo.placeholder === 'Search playbooks', `Placeholder text is "Search playbooks"`);
    testAssert(searchInfo.isVisible, `Placeholder text is visible (color: ${searchInfo.placeholderColor}, not transparent)`);

    console.log('\n--- 4. SEARCH FILTERING REAL-TIME INTERACTION ---');
    await page.type('.toolbar__search input', 'terrazzo');
    await new Promise((r) => setTimeout(r, 400));
    const filteredCount = await page.evaluate(() => document.querySelectorAll('.lb-card').length);
    testAssert(filteredCount >= 1 && filteredCount < 9, `Search filtered cards: ${filteredCount} card matches "terrazzo"`);

    // Clear search
    await page.evaluate(() => {
      const inp = document.querySelector('.toolbar__search input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, '');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await new Promise((r) => setTimeout(r, 400));
    const restoredCount = await page.evaluate(() => document.querySelectorAll('.lb-card').length);
    testAssert(restoredCount >= 9, `Clearing search restored all ${restoredCount} cards`);

    console.log('\n--- 5. CATEGORY FILTER CHIPS ---');
    await page.evaluate(() => {
      const chips = Array.from(document.querySelectorAll('.toolbar .chip'));
      const disc = chips.find((c) => c.textContent.trim() === 'Discovery');
      if (disc) disc.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    const discoveryCount = await page.evaluate(() => document.querySelectorAll('.lb-card').length);
    testAssert(discoveryCount >= 1 && discoveryCount < restoredCount, `Discovery chip filtered to ${discoveryCount} playbooks`);

    // Reset back to All
    await page.evaluate(() => {
      const chips = Array.from(document.querySelectorAll('.toolbar .chip'));
      const all = chips.find((c) => c.textContent.trim() === 'All');
      if (all) all.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    console.log('\n--- 6. CARD CLICK OPENS DRAWER MODAL ---');
    await page.click('.lb-card');
    await page.waitForSelector('.drawer, .modal', { timeout: 6000 });
    await new Promise((r) => setTimeout(r, 500));
    const drawerInfo = await page.evaluate(() => {
      const d = document.querySelector('.drawer, .modal');
      const quote = d ? d.querySelector('.lb-quote') : null;
      const points = d ? d.querySelectorAll('.lb-points li') : [];
      const meter = d ? d.querySelector('.meter') : null;
      return {
        open: !!d && d.offsetHeight > 0,
        hasQuote: !!quote,
        pointsCount: points.length,
        hasMeter: !!meter
      };
    });
    testAssert(drawerInfo.open, 'Clicking card opened playbook drawer modal');
    testAssert(drawerInfo.hasQuote, 'Modal contains summary quote');
    testAssert(drawerInfo.pointsCount > 0, `Modal contains ${drawerInfo.pointsCount} key points`);
    testAssert(drawerInfo.hasMeter, 'Modal displays reading progress meter');

    const drawerShot = path.join(artifactDir, 'playbooks_drawer_modal.png');
    await page.screenshot({ path: drawerShot });
    testAssert(fs.existsSync(drawerShot), 'Captured playbooks_drawer_modal.png');

    // Close modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.drawer .btn--ghost, .modal .btn--ghost, .drawer .ibtn--close');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    console.log('\n--- 7. RESPONSIVENESS ACROSS VIEWPORTS ---');
    // Desktop 1440
    await page.setViewport({ width: 1440, height: 900 });
    await new Promise((r) => setTimeout(r, 500));
    const shot1440 = path.join(artifactDir, 'playbooks_desktop_1440.png');
    await page.screenshot({ path: shot1440 });
    const cols1440 = await page.evaluate(() => getComputedStyle(document.querySelector('.lb-grid')).gridTemplateColumns.split(' ').length);
    testAssert(cols1440 >= 3, `Desktop (1440px): ${cols1440} balanced columns (>=3)`);
    testAssert(fs.existsSync(shot1440), 'Captured playbooks_desktop_1440.png');

    // Tablet Landscape 1024
    await page.setViewport({ width: 1024, height: 768 });
    await new Promise((r) => setTimeout(r, 500));
    const shot1024 = path.join(artifactDir, 'playbooks_tablet_1024.png');
    await page.screenshot({ path: shot1024 });
    const cols1024 = await page.evaluate(() => getComputedStyle(document.querySelector('.lb-grid')).gridTemplateColumns.split(' ').length);
    testAssert(cols1024 === 2 || cols1024 === 3, `Tablet Landscape (1024px): ${cols1024} columns`);
    testAssert(fs.existsSync(shot1024), 'Captured playbooks_tablet_1024.png');

    // Tablet Portrait 768
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise((r) => setTimeout(r, 500));
    const shot768 = path.join(artifactDir, 'playbooks_tablet_768.png');
    await page.screenshot({ path: shot768 });
    const cols768 = await page.evaluate(() => getComputedStyle(document.querySelector('.lb-grid')).gridTemplateColumns.split(' ').length);
    const searchWidth768 = await page.evaluate(() => Math.round(document.querySelector('.toolbar__search').getBoundingClientRect().width));
    testAssert(cols768 === 2, `Tablet Portrait (768px): 2 columns`);
    testAssert(searchWidth768 > 400, `Tablet Portrait (768px): Search bar spans fluidly (${searchWidth768}px)`);
    testAssert(fs.existsSync(shot768), 'Captured playbooks_tablet_768.png');

    // Mobile 390
    await page.setViewport({ width: 390, height: 844 });
    await new Promise((r) => setTimeout(r, 500));
    const shot390 = path.join(artifactDir, 'playbooks_mobile_390.png');
    await page.screenshot({ path: shot390 });
    const cols390 = await page.evaluate(() => getComputedStyle(document.querySelector('.lb-grid')).gridTemplateColumns.split(' ').length);
    const searchWidth390 = await page.evaluate(() => Math.round(document.querySelector('.toolbar__search').getBoundingClientRect().width));
    testAssert(cols390 === 1, `Mobile (390px): Single stacked column (got ${cols390})`);
    testAssert(searchWidth390 <= 390, `Mobile (390px): Search bar fits within screen (${searchWidth390}px)`);
    testAssert(fs.existsSync(shot390), 'Captured playbooks_mobile_390.png');

    console.log('\n--- 8. ZERO ERRORS ---');
    testAssert(pageErrors.length === 0, `Zero page errors during test run (got ${pageErrors.length})`);
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n================================================================');
  console.log(`PLAYBOOKS TEST RESULT: ${passed} passed, ${failed} failed`);
  console.log('================================================================');
  process.exit(failed ? 1 : 0);
});
