import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const appDir = path.resolve(process.cwd().endsWith('frontend') ? '.' : 'frontend');
const artifactDir = path.resolve("test-reports"); fs.mkdirSync(artifactDir, { recursive: true });

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  let filePath = path.join(appDir, reqPath === '/' ? 'index.html' : reqPath);
  if (!fs.existsSync(filePath)) filePath = path.join(appDir, 'index.html');
  const ext = path.extname(filePath);
  const mimeMap = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
  res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

const PORT = 8098;

server.listen(PORT, async () => {
  console.log(`[TEST-RUNNER] server on http://localhost:${PORT}`);
  console.log('--- TEMPLATE SELECTION PAGE (THEME UI/UX + DISTINCT TEMPLATES) ---');

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });

  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error' && !msg.text().includes('fonts.googleapis.com')) errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push('PAGEERROR ' + err.message));

  let passed = 0, failed = 0;
  const assert = (c, m) => { if (c) { console.log(`  \u2713 [PASS] ${m}`); passed++; } else { console.error(`  \u2717 [FAIL] ${m}`); failed++; } };
  const theme = async (n) => { await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), n); await new Promise((r) => setTimeout(r, 350)); };
  const thBg = async () => page.$eval('[data-spec-sheet] thead th', (el) => getComputedStyle(el).backgroundColor);
  const thColor = async () => page.$eval('[data-spec-sheet] thead th', (el) => getComputedStyle(el).color);
  const pick = async (id) => { await page.evaluate((x) => { const c = document.querySelector(`[data-template-card="${x}"]`); if (c) c.click(); }, id); await new Promise((r) => setTimeout(r, 300)); };
  const toggle = async () => { await page.evaluate(() => { const t = Array.from(document.querySelectorAll('.phead__actions button')).find((b) => /Preview (Quotation|Invoice)/.test(b.textContent)); if (t) t.click(); }); await new Promise((r) => setTimeout(r, 350)); };

  try {
    // 1. MOUNT + SINGLE HEADER + TOP-CONTAINER BUTTONS
    console.log('\n=== 1. MOUNT + TOP CONTAINER ===');
    await page.goto(`http://localhost:${PORT}/finance/templates`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-spec-page="templates"]', { timeout: 9000 });
    await new Promise((r) => setTimeout(r, 700));

    assert((await page.$('.app')) !== null, 'Page renders inside the CRM app shell (sidebar present)');
    const crumb = await page.$eval('.crumbs', (el) => el.textContent);
    assert(crumb.includes('Invoice') && crumb.includes('Templates'), `Breadcrumb reads "Invoice / Templates"`);
    const pheadCount = await page.$$eval('.phead', (els) => els.length);
    assert(pheadCount === 1, `Exactly ONE page-header container renders (got ${pheadCount} - no duplicated header)`);
    const topActions = await page.$eval('.phead__actions', (el) => el.textContent);
    assert(/Preview (Quotation|Invoice)/.test(topActions), 'Kind-toggle button lives in the top container');
    assert(/Set as Default|Saved as Default/.test(topActions), 'Set-as-Default button lives in the top container');

    // 2. GALLERY
    console.log('\n=== 2. TEMPLATE GALLERY ===');
    const cards = await page.$$('[data-template-card]');
    assert(cards.length === 3, `Gallery renders 3 selectable templates (got ${cards.length})`);
    const names = await page.$$eval('.tmpl-card__body b', (els) => els.map((e) => e.textContent));
    assert(names.includes('Classic Corporate') && (names.includes('Crimson Creative') || names.includes('Retail Light')) && names.includes('Settlement Fintech'), `Cards: ${names.join(', ')}`);
    let sel = await page.$$eval('.tmpl-card.is-selected', (els) => els.map((e) => e.getAttribute('data-template-card')));
    assert(sel.length === 1 && sel[0] === 'classic', `Default selection is Classic Corporate`);

    // 3. THREE GENUINELY DIFFERENT TEMPLATES
    console.log('\n=== 3. THREE DISTINCT TEMPLATES ===');
    await pick('classic');
    assert((await page.$('[data-spec-header="dark"]')) !== null, 'Classic renders its dark-band header (slashes + logo box)');
    const cTh = await thBg();
    assert(/77, 51, 182/.test(cTh), `Classic: indigo line-items header (${cTh})`);

    await pick('retail');
    assert((await page.$('[data-spec-header="creative"], [data-spec-header="light"]')) !== null, 'Crimson Creative renders a distinct geometric header');
    const rTh = await thBg();
    assert(/229, 37, 42/.test(rTh), `Crimson Creative: crimson red line-items header (${rTh})`);
    const rFc = await page.$eval('[data-spec-footer]', (el) => getComputedStyle(el).backgroundColor);
    assert(/255, 255, 255/.test(rFc), `Crimson Creative: white footer band (${rFc})`);

    await pick('fintech');
    assert((await page.$('[data-spec-header="rail"]')) !== null, 'Settlement Fintech renders its rail-accent header (distinct from dark & light)');
    const fBorder = await page.$eval('[data-spec-sheet]', (el) => getComputedStyle(el).borderLeftWidth);
    assert(fBorder.startsWith('10px'), `Settlement Fintech: 10px accent rail on sheet left edge (${fBorder})`);
    const fTh = await thBg();
    assert(/15, 23, 42/.test(fTh), `Settlement Fintech: slate line-items header (${fTh})`);

    assert(new Set([cTh, rTh, fTh]).size === 3, `Each template has its own line-items header design (${cTh} / ${rTh} / ${fTh})`);

    // 4. INVOICE <-> QUOTATION (button in top container)
    console.log('\n=== 4. INVOICE <-> QUOTATION ===');
    await pick('classic');
    await toggle();
    let sheetNow = await page.$eval('[data-spec-sheet]', (el) => el.getAttribute('data-spec-sheet'));
    assert(sheetNow === 'quotation', `Toggling kind swaps the sheet to Quotation (${sheetNow})`);
    const qFull = await page.$eval('[data-spec-sheet]', (el) => el.textContent);
    assert(qFull.includes('COMMERCIAL QUOTATION') || qFull.includes('QUOTATION'), 'Quotation sheet shows quotation header');
    await toggle();
    sheetNow = await page.$eval('[data-spec-sheet]', (el) => el.getAttribute('data-spec-sheet'));
    assert(sheetNow === 'invoice', `Toggle back returns to invoice sheet (${sheetNow})`);

    // 5. SPEC FIDELITY (classic)
    console.log('\n=== 5. SPEC SHEET FIDELITY ===');
    await pick('classic');
    const sheetText = await page.$eval('[data-spec-sheet]', (el) => el.textContent);
    assert(sheetText.includes('INVOICE TO (BILLED TO)'), 'Sheet shows the Billed-To panel');
    assert(sheetText.includes('INVOICE FROM (ISSUER)') || sheetText.includes('ISSUER'), 'Sheet shows the Issuer panel');
    assert(sheetText.includes('GST') && sheetText.includes('PAN'), 'Dedicated GST and PAN rows rendered');
    assert((await page.$('[data-spec-sheet] [data-spec-qr]')) !== null, 'Scan-to-Pay UPI QR present');
    assert((await page.$('[data-spec-sheet] [data-spec-signature]')) !== null, 'FOR AEDENTEK signature block present');
    assert((await page.$('[data-spec-sheet] [data-spec-settlement]')) !== null, 'Bank & Wire remittance tray present');
    const sheetW = await page.$eval('[data-spec-sheet]', (el) => el.getBoundingClientRect().width);
    assert(sheetW > 380 && sheetW <= 794, `A4 sheet fluid within panel, never > 794px (${Math.round(sheetW)}px)`);

    // 6. THEME LIGHT
    console.log('\n=== 6. THEME (LIGHT) ===');
    await theme('light');
    const lgCard = await page.$eval('.tmpl-card', (el) => getComputedStyle(el).backgroundColor);
    assert(lgCard.includes('255') || lgCard.includes('250') || lgCard === 'rgb(250, 251, 252)', `Light: card surface light (${lgCard})`);

    // 7. THEME DARK
    console.log('\n=== 7. THEME (DARK) ===');
    await theme('dark');
    const dkCard = await page.$eval('.tmpl-card', (el) => getComputedStyle(el).backgroundColor);
    assert(dkCard !== lgCard, `Dark: card surface re-themes (${lgCard} -> ${dkCard})`);
    const dkSheet = await page.$eval('[data-spec-sheet]', (el) => getComputedStyle(el).backgroundColor);
    assert(dkSheet === 'rgb(255, 255, 255)', 'Dark: A4 sheet stays print-crisp white');
    assert(/77, 51, 182/.test(await thBg()), 'Dark: line-items header stays indigo regardless of app theme');
    await theme('light');

    // 8. SET AS DEFAULT (button in top container)
    console.log('\n=== 8. SET AS DEFAULT ===');
    await page.evaluate(() => localStorage.removeItem('tessly:templateDefault'));
    await pick('retail');
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll('.phead__actions button')).find((x) => /Set as Default|Saved/.test(x.textContent)); if (b) b.click(); });
    await new Promise((r) => setTimeout(r, 400));
    const persisted = await page.evaluate(() => localStorage.getItem('tessly:templateDefault'));
    assert(persisted && JSON.parse(persisted).selected === 'retail', `Set as Default persists the chosen template (${persisted})`);

    // 9. HEALTH
    console.log('\n=== 9. CONSOLE AUDIT ===');
    assert(errors.length === 0, `Zero uncaught console errors (count ${errors.length}: ${JSON.stringify(errors.slice(0, 4))})`);

    if (fs.existsSync(artifactDir)) {
      await theme('light'); await page.screenshot({ path: path.join(artifactDir, 'templates_page_light.png') });
      await theme('dark'); await page.screenshot({ path: path.join(artifactDir, 'templates_page_dark.png') });
      console.log('  \u2713 screenshots: templates_page_light/dark.png');
    }

    console.log('\n===========================================');
    console.log(`TEMPLATE PAGE UI/UX TEST RESULT: ${passed} passed, ${failed} failed`);
    console.log('===========================================\n');
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution failed with unhandled error:', err);
    process.exit(1);
  } finally {
    await browser.close();
    server.close();
  }
});
