import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const BASE_URL = 'http://localhost:1234';

async function runTestSuite() {
  console.log('====================================================================');
  console.log('TEST SUITE: DEALS BOARD TOOLBAR RESPONSIVE AUDIT & FUNCTIONALITY');
  console.log(`Target: ${BASE_URL}/deals/board`);
  console.log('====================================================================\n');

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  let passCount = 0;
  let failCount = 0;

  function assert(desc, condition, details = '') {
    if (condition) {
      console.log(`  ✓ [PASS] ${desc}`);
      passCount++;
    } else {
      console.error(`  ✗ [FAIL] ${desc} - ${details}`);
      failCount++;
    }
  }

  // Step 1: Login
  console.log('--- 1. AUTHENTICATION & NAVIGATION ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.click('.lg-dev__item');
  await sleep(400);
  await page.click('.lg-submit');
  await sleep(2000);

  // Navigate to /deals/board
  await page.evaluate(() => {
    const dealsA = Array.from(document.querySelectorAll('a')).find(a => a.getAttribute('href') === '/deals/board' || a.textContent.includes('Deals'));
    if (dealsA) dealsA.click();
  });
  await sleep(1500);

  assert('Successfully reached /deals/board page', page.url().includes('/deals/board'), page.url());
  assert('Deal board H1 title rendered', await page.$eval('h1', el => el.textContent.includes('Deal board')));
  assert('Toolbar container exists with .dl-toolbar class', await page.$eval('.toolbar', el => el.classList.contains('dl-toolbar')));
  assert('Filter sub-container exists with .dl-toolbar__filters', await page.$eval('.dl-toolbar__filters', el => !!el));

  // Step 2: Desktop Viewport (1440px)
  console.log('\n--- 2. DESKTOP VIEWPORT (1440px) ---');
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(500);
  const m1440 = await page.evaluate(() => {
    const tb = document.querySelector('.toolbar');
    const search = tb.querySelector('.toolbar__search');
    const filters = tb.querySelector('.dl-toolbar__filters');
    return {
      tbHeight: tb.offsetHeight,
      searchTop: search.offsetTop,
      filtersTop: filters.offsetTop,
      hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });
  assert('Toolbar is a single horizontal row on 1440px desktop', Math.abs(m1440.searchTop - m1440.filtersTop) <= 3, `searchTop: ${m1440.searchTop}, filtersTop: ${m1440.filtersTop}`);
  assert('Toolbar height is compact on desktop (<= 45px)', m1440.tbHeight <= 45, `height: ${m1440.tbHeight}`);
  assert('No horizontal overflow on desktop', !m1440.hasOverflow);

  // Step 3: Tablet Viewport (768px)
  console.log('\n--- 3. TABLET VIEWPORT (768px) ---');
  await page.setViewport({ width: 768, height: 1024 });
  await sleep(500);
  const m768 = await page.evaluate(() => {
    const tb = document.querySelector('.toolbar');
    const search = tb.querySelector('.toolbar__search');
    const filters = tb.querySelector('.dl-toolbar__filters');
    return {
      tbHeight: tb.offsetHeight,
      searchW: search.offsetWidth,
      tbW: tb.offsetWidth,
      hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });
  assert('Search input expands to full row width on 768px tablet', Math.abs(m768.searchW - m768.tbW) <= 2, `search: ${m768.searchW}, tb: ${m768.tbW}`);
  assert('Toolbar height is exactly 2 rows on tablet (<= 90px)', m768.tbHeight <= 90, `height: ${m768.tbHeight}`);
  assert('No horizontal page overflow on tablet', !m768.hasOverflow);

  // Step 4: Mobile Viewports (480px, 390px, 360px, 320px)
  console.log('\n--- 4. MOBILE VIEWPORTS (480px, 390px, 360px, 320px) ---');
  const mobileWidths = [480, 390, 360, 320];
  for (const w of mobileWidths) {
    await page.setViewport({ width: w, height: 800 });
    await sleep(500);
    const m = await page.evaluate(() => {
      const tb = document.querySelector('.toolbar');
      const search = tb.querySelector('.toolbar__search');
      const filters = tb.querySelector('.dl-toolbar__filters');
      const owners = tb.querySelector('.dl-owners');
      const select = tb.querySelector('select');
      const chip = tb.querySelector('.chip');
      const docW = document.documentElement.clientWidth;
      const scrollW = document.documentElement.scrollWidth;
      return {
        tbHeight: tb.offsetHeight,
        searchW: search.offsetWidth,
        tbW: tb.offsetWidth,
        hasOverflow: scrollW > docW,
        filtersDisplay: window.getComputedStyle(filters).display,
        filtersOverflowX: window.getComputedStyle(filters).overflowX,
        ownersFlexShrink: window.getComputedStyle(owners).flexShrink,
        selectFlexShrink: window.getComputedStyle(select).flexShrink,
        chipFlexShrink: window.getComputedStyle(chip).flexShrink
      };
    });
    assert(`Mobile ${w}px: Toolbar height bounded to exactly 2 rows (<= 92px)`, m.tbHeight <= 92, `height: ${m.tbHeight}`);
    assert(`Mobile ${w}px: Search bar takes 100% width of toolbar`, Math.abs(m.searchW - m.tbW) <= 2, `search: ${m.searchW}, tb: ${m.tbW}`);
    assert(`Mobile ${w}px: No horizontal page overflow`, !m.hasOverflow);
    assert(`Mobile ${w}px: Filter strip has touch-scrollable horizontal rail`, m.filtersOverflowX === 'auto' || m.filtersOverflowX === 'scroll');
    assert(`Mobile ${w}px: Controls protected from squishing (flex-shrink: 0)`, m.ownersFlexShrink === '0' && m.selectFlexShrink === '0' && m.chipFlexShrink === '0');
  }

  // Step 5: Filter Interactions
  console.log('\n--- 5. INTERACTION & FILTER FUNCTIONALITY ---');
  await page.setViewport({ width: 390, height: 844 });
  await sleep(400);

  // Search filter
  await page.type('.toolbar__search input', 'Zellige');
  await sleep(400);
  const zelligeCardCount = await page.$$eval('.dl-card', cards => cards.length);
  assert('Search filter updates cards in real-time', zelligeCardCount > 0);

  // Clear button appears
  const clearBtn = await page.$('.dl-clear');
  assert('Clear filter button rendered when search active', !!clearBtn);
  if (clearBtn) {
    await clearBtn.click();
    await sleep(400);
  }
  const clearedCount = await page.$$eval('.dl-card', cards => cards.length);
  assert('Clicking Clear button resets card count', clearedCount > zelligeCardCount);

  // Owner filter click
  const firstOwner = await page.$('.dl-owner');
  if (firstOwner) {
    await firstOwner.click();
    await sleep(400);
    const isOn = await page.$eval('.dl-owner', el => el.classList.contains('is-on'));
    assert('Owner avatar toggle activates is-on class with ring', isOn);
  }

  // Lost chip click
  const lostChip = await page.$('.dl-chip');
  if (lostChip) {
    await lostChip.click();
    await sleep(400);
    const chipActive = await page.$eval('.dl-chip', el => el.classList.contains('is-on'));
    assert('Lost 2 chip toggles active state', chipActive);
  }

  console.log('\n====================================================================');
  console.log(`SUITE COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================================');

  await browser.close();
  if (failCount > 0) process.exit(1);
}
runTestSuite().catch(e => {
  console.error(e);
  process.exit(1);
});
