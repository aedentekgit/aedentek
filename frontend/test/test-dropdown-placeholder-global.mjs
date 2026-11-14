import puppeteer from 'puppeteer';
import path from 'path';

// Global select-placeholder regression test.
// Guards the "Select…" placeholder behaviour added to the themed dropdown
// engine in frontend/assets/global-themed-controls.js:
//   - unselected empty-value single selects show "Select…", not the first option
//   - selects with a real default are left untouched
//   - placeholder can be picked/cleared through the themed dropdown
//   - list-page filter selects keep their "all"/"All" defaults

const BASE_URL = 'http://localhost:3000';
const artifactDir = path.resolve('test-reports');

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log(`  \u2713 [PASS] ${msg}`); passed++; }
  else { console.error(`  \u2717 [FAIL] ${msg}`); failed++; }
}

(async () => {
  console.log('--- GLOBAL SELECT PLACEHOLDER TEST ---');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // === 1. Inward invoice create drawer: empty selects show "Select…" ===
  console.log('\n=== 1. CREATE INWARD INVOICE DRAWER ===');
  await page.goto(`${BASE_URL}/accounts/sales`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find(b => b.textContent.includes('Create inward invoice'))?.click();
  });
  await new Promise(r => setTimeout(r, 900));

  const drawer = await page.evaluate(() => [...document.querySelectorAll('.drawer select')].map(s => ({
    value: s.value,
    display: s.options[s.selectedIndex]?.textContent,
    phCount: [...s.options].filter(o => o.dataset.tlPh === '1').length
  })));
  const empties = drawer.slice(0, 3); // Payment terms, Payment mode, Status
  empties.forEach((s, i) => assert(s.value === '' && s.display === 'Select\u2026' && s.phCount === 1,
    `empty select #${i + 1} displays "Select\u2026" (value="${s.value}", display="${s.display}")`));
  const branch = drawer[3];
  assert(branch.value !== '' && branch.display !== 'Select\u2026' && branch.phCount === 0,
    `select with real default left untouched (value="${branch.value}")`);

  // === 2. Themed dropdown shows placeholder, no stray checkmark ===
  console.log('\n=== 2. THEMED DROPDOWN PLACEHOLDER ===');
  await page.evaluate(() => {
    const s = [...document.querySelectorAll('.drawer select')][2];
    s.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 300));
  const dd = await page.evaluate(() => ({
    first: [...document.querySelectorAll('.theme-dropdown .theme-dropdown-item')][0],
    checks: document.querySelectorAll('.theme-dropdown .theme-dropdown-check').length
  }).first);
  const ddInfo = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.theme-dropdown .theme-dropdown-item')];
    const first = items[0];
    return { text: first?.textContent?.trim(), isPh: first?.classList.contains('is-placeholder'), sel: first?.classList.contains('is-selected'), checks: items.filter(i => i.querySelector('.theme-dropdown-check')).length };
  });
  assert(ddInfo.text === 'Select\u2026' && ddInfo.isPh === true, `dropdown row 0 is the "Select\u2026" placeholder`);
  assert(ddInfo.sel === true, `placeholder row is the active selection (nothing chosen)`);
  assert(ddInfo.checks === 0, `no checkmark rendered on the placeholder row`);
  await page.screenshot({ path: path.join(artifactDir, 'dropdown_placeholder_open.png') });

  // pick Draft
  await page.evaluate(() => { [...document.querySelectorAll('.theme-dropdown-item')].find(i => i.dataset.value === 'Draft')?.click(); });
  await new Promise(r => setTimeout(r, 400));
  let status = await page.evaluate(() => document.querySelectorAll('.drawer select')[2].value);
  assert(status === 'Draft', `picking Draft from the dropdown sets value (got "${status}")`);

  // clear back to Select…
  await page.evaluate(() => { const s = [...document.querySelectorAll('.drawer select')][2]; s.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => { [...document.querySelectorAll('.theme-dropdown-item')].find(i => i.dataset.value === '')?.click(); });
  await new Promise(r => setTimeout(r, 400));
  const cleared = await page.evaluate(() => { const s = document.querySelectorAll('.drawer select')[2]; return { v: s.value, d: s.options[s.selectedIndex]?.textContent }; });
  assert(cleared.v === '' && cleared.d === 'Select\u2026', `choosing the placeholder clears the value (value="${cleared.v}", display="${cleared.d}")`);

  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));

  // === 3. List-page filter selects keep their defaults ===
  console.log('\n=== 3. FILTER SELECTS UNCHANGED ===');
  await page.goto(`${BASE_URL}/finance/invoices`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));
  const filters = await page.evaluate(() => [...document.querySelectorAll('select.table-filter-select')].map(s => ({ v: s.value, hasPh: [...s.options].some(o => o.dataset.tlPh === '1') })));
  assert(filters.length > 0 && filters.every(f => f.hasPh === false), `finance filter selects have no injected placeholder`);
  const allSel = await page.evaluate(() => {
    const s = document.querySelector('select.table-filter-select');
    return s ? s.options[s.selectedIndex]?.textContent : null;
  });
  assert(allSel === 'All Invoices', `finance status filter still defaults to "All Invoices" (got "${allSel}")`);

  await page.screenshot({ path: path.join(artifactDir, 'filters_unchanged.png') });
  await browser.close();

  console.log(`\n===========================================`);
  console.log(`GLOBAL SELECT PLACEHOLDER: ${passed} passed, ${failed} failed`);
  console.log(`===========================================\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
