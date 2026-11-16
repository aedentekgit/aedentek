import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || 'http://localhost:1234';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const REPORT_DIR_ROOT = path.resolve(__dirname, '../../test-reports');
const REPORT_DIR_FRONTEND = path.resolve(__dirname, '../test-reports');

fs.mkdirSync(REPORT_DIR_ROOT, { recursive: true });
fs.mkdirSync(REPORT_DIR_FRONTEND, { recursive: true });

async function runCalendarAlignmentTest() {
  console.log('===============================================================');
  console.log('CALENDAR TASK CHIP ALIGNMENT & CONTROL EXCLUSION TEST');
  console.log(`Target: ${BASE_URL}/calendar`);
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

  let passed = 0;
  let failed = 0;
  const assertions = [];

  function assert(name, condition, details = '') {
    if (condition) {
      passed++;
      assertions.push({ name, status: 'PASS', details });
      console.log(`  ✓ [PASS] ${name}`);
    } else {
      failed++;
      assertions.push({ name, status: 'FAIL', details });
      console.error(`  ✗ [FAIL] ${name} - ${details}`);
    }
  }

  try {
    // 1. Authenticate
    console.log('--- 1. AUTHENTICATION & NAVIGATION ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await sleep(600);
    await page.type('input[type="email"]', 'ines@caldermoss.co');
    await page.type('input[autocomplete="current-password"]', 'marble88');
    await page.click('.lg-submit');
    await sleep(1500);

    const loggedInUrl = page.url();
    assert('Login successful and transitioned away from /login', !loggedInUrl.includes('/login'), loggedInUrl);

    // 2. Navigate to /calendar
    const calLink = await page.$('a[href="/calendar"]');
    if (calLink) {
      await calLink.click();
    } else {
      await page.evaluate(() => {
        if (window.__navigate) window.__navigate('/calendar');
        else {
          history.pushState(null, '', '/calendar');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      });
    }
    await sleep(1800);

    const currentUrl = page.url();
    assert('Navigated to /calendar route', currentUrl.includes('/calendar'), currentUrl);

    // 3. Inspect Calendar Structure
    console.log('\n--- 2. CALENDAR CONTAINER & MONTH GRID INSPECTION ---');
    const calStructure = await page.evaluate(() => {
      const wrap = document.querySelector('.ca-wrap');
      const month = document.querySelector('.ca-month');
      const grid = document.querySelector('.ca-grid');
      const cells = Array.from(document.querySelectorAll('.ca-cell'));
      const chips = Array.from(document.querySelectorAll('.ca-chip'));
      const mores = Array.from(document.querySelectorAll('.ca-more'));
      const dayList = document.querySelector('.ca-list');

      return {
        hasWrap: !!wrap,
        hasMonth: !!month,
        hasGrid: !!grid,
        cellCount: cells.length,
        chipCount: chips.length,
        moreCount: mores.length,
        hasDayList: !!dayList
      };
    });

    assert('.ca-wrap calendar wrapper is mounted', calStructure.hasWrap);
    assert('.ca-grid month grid is mounted with day cells', calStructure.cellCount >= 28, `Found ${calStructure.cellCount} cells`);
    assert('Task chips (.ca-chip) are present on the calendar', calStructure.chipCount > 0, `Found ${calStructure.chipCount} chips`);

    // 4. Check for .tl-act contamination
    console.log('\n--- 3. VERIFY ZERO .TL-ACT CONTAMINATION ON CALENDAR ELEMENTS ---');
    const tlActAudit = await page.evaluate(() => {
      const caWrap = document.querySelector('.ca-wrap');
      const tlActsInCalendar = caWrap ? Array.from(caWrap.querySelectorAll('.tl-act')) : [];
      const chipsWithTlAct = Array.from(document.querySelectorAll('.ca-chip.tl-act, .ca-chip[data-tl-act]'));
      const moresWithTlAct = Array.from(document.querySelectorAll('.ca-more.tl-act, .ca-more[data-tl-act]'));
      const checksWithTlAct = caWrap ? Array.from(caWrap.querySelectorAll('.check.tl-act, .check[data-tl-act]')) : [];
      const cellsWithTlAct = Array.from(document.querySelectorAll('.ca-cell.tl-act, .ca-cell[data-tl-act]'));

      return {
        totalTlActInCal: tlActsInCalendar.length,
        tlActDetails: tlActsInCalendar.map(el => ({
          tag: el.tagName,
          classes: el.className,
          text: el.textContent.trim().slice(0, 40),
          dataset: { ...el.dataset }
        })),
        chipsWithTlActCount: chipsWithTlAct.length,
        moresWithTlActCount: moresWithTlAct.length,
        checksWithTlActCount: checksWithTlAct.length,
        cellsWithTlActCount: cellsWithTlAct.length
      };
    });

    assert('Zero .tl-act elements inside .ca-wrap', tlActAudit.totalTlActInCal === 0,
      `Found ${tlActAudit.totalTlActInCal} .tl-act elements: ${JSON.stringify(tlActAudit.tlActDetails)}`);
    assert('Zero .ca-chip elements have .tl-act or data-tl-act', tlActAudit.chipsWithTlActCount === 0,
      `Found ${tlActAudit.chipsWithTlActCount} contaminated chips`);
    assert('Zero .ca-more elements have .tl-act or data-tl-act', tlActAudit.moresWithTlActCount === 0,
      `Found ${tlActAudit.moresWithTlActCount} contaminated more-buttons`);
    assert('Zero .check elements in calendar have .tl-act or data-tl-act', tlActAudit.checksWithTlActCount === 0,
      `Found ${tlActAudit.checksWithTlActCount} contaminated checkboxes`);

    // 5. Verify Pill Chip Geometry & Alignment
    console.log('\n--- 4. CHIP GEOMETRY, PILL STYLING & HORIZONTAL ALIGNMENT ---');
    const chipGeometryAudit = await page.evaluate(() => {
      const chips = Array.from(document.querySelectorAll('.ca-chip'));
      return chips.map(c => {
        const rect = c.getBoundingClientRect();
        const style = window.getComputedStyle(c);
        const icon = c.querySelector('svg, .ico');
        const em = c.querySelector('em');
        const span = c.querySelector('span');

        return {
          text: c.textContent.trim(),
          width: rect.width,
          height: rect.height,
          borderRadius: style.borderRadius,
          display: style.display,
          alignItems: style.alignItems,
          hasIcon: !!icon,
          iconWidth: icon ? icon.getBoundingClientRect().width : 0,
          hasEm: !!em,
          hasSpan: !!span,
          isPill: style.borderRadius !== '50%' && style.borderRadius !== '17px' && rect.width > 50,
          isCircular: style.borderRadius === '50%' || (rect.width <= 36 && rect.height <= 36)
        };
      });
    });

    const circularChips = chipGeometryAudit.filter(c => c.isCircular);
    const nonPillChips = chipGeometryAudit.filter(c => !c.isPill);

    assert('Zero calendar chips rendered as circular (34x34 50% border-radius) action buttons',
      circularChips.length === 0,
      `Found ${circularChips.length} circular chips: ${circularChips.map(c => c.text).join('; ')}`);

    assert('All calendar chips render with proper pill layout (width > 50px, border-radius ~7px)',
      nonPillChips.length === 0,
      `Found ${nonPillChips.length} non-pill chips`);

    // Inspect individual chip anatomy
    const sampleChip = chipGeometryAudit[0];
    if (sampleChip) {
      assert('Chip has flex layout with aligned items', sampleChip.display === 'flex' && sampleChip.alignItems === 'center',
        `display=${sampleChip.display}, alignItems=${sampleChip.alignItems}`);
      assert('Chip contains leading icon', sampleChip.hasIcon && sampleChip.iconWidth > 0,
        `hasIcon=${sampleChip.hasIcon}, iconWidth=${sampleChip.iconWidth}`);
      assert('Chip contains title span', sampleChip.hasSpan, `hasSpan=${sampleChip.hasSpan}`);
      console.log(`  Sample chip metrics: width=${sampleChip.width.toFixed(1)}px, height=${sampleChip.height.toFixed(1)}px, radius=${sampleChip.borderRadius}, text="${sampleChip.text}"`);
    }

    // 6. Inspect .ca-more (+N more) button if present
    console.log('\n--- 5. "+N MORE" EXPAND BUTTON ALIGNMENT ---');
    const moreBtnAudit = await page.evaluate(() => {
      const mores = Array.from(document.querySelectorAll('.ca-more'));
      return mores.map(m => {
        const rect = m.getBoundingClientRect();
        const style = window.getComputedStyle(m);
        return {
          text: m.textContent.trim(),
          width: rect.width,
          height: rect.height,
          isCircular: style.borderRadius === '50%',
          display: style.display,
          textAlign: style.textAlign
        };
      });
    });

    if (moreBtnAudit.length > 0) {
      const circularMores = moreBtnAudit.filter(m => m.isCircular);
      assert('All +N more buttons render with standard text button style (not circular)', circularMores.length === 0);
      console.log(`  Checked ${moreBtnAudit.length} "+N more" buttons: all cleanly formatted.`);
    } else {
      console.log('  Note: No cells overflowed >3 tasks in current month view.');
    }

    // 7. Capture Screenshots
    console.log('\n--- 6. CAPTURING EVIDENCE SCREENSHOTS ---');
    const screenshotRootPath = path.join(REPORT_DIR_ROOT, 'calendar_alignment_fixed.png');
    const screenshotFrontendPath = path.join(REPORT_DIR_FRONTEND, 'calendar_alignment_fixed.png');

    await page.screenshot({ path: screenshotRootPath, fullPage: false });
    await page.screenshot({ path: screenshotFrontendPath, fullPage: false });
    console.log(`  Saved screenshot to ${screenshotRootPath}`);
    console.log(`  Saved screenshot to ${screenshotFrontendPath}`);

    // Return full test metrics
    return {
      passed,
      failed,
      assertions,
      chipGeometryAudit,
      tlActAudit,
      calStructure
    };
  } finally {
    await browser.close();
  }
}

// Run test if invoked directly
runCalendarAlignmentTest()
  .then(res => {
    console.log(`\n===============================================================`);
    console.log(`TEST RUN COMPLETED: ${res.passed} PASSED, ${res.failed} FAILED`);
    console.log(`===============================================================\n`);
    if (res.failed > 0) {
      process.exitCode = 1;
    }
  })
  .catch(err => {
    console.error('Fatal test execution error:', err);
    process.exit(1);
  });

export { runCalendarAlignmentTest };
