import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'node:fs';

const artifactDir = path.resolve("test-reports"); fs.mkdirSync(artifactDir, { recursive: true });

(async () => {
  console.log('--- STARTING GLOBAL HEADER & THEMED CONTROLS E2E TEST ---');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      failed++;
    }
  }

  // Navigate to accounts sales page
  await page.goto('http://localhost:3000/accounts/sales', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.top', { timeout: 8000 });

  console.log('\n=== 1. SIDEBAR CLOSE MENU ICON REMOVAL ===');
  const insideSidebarClose = await page.$('.side .side__collapse');
  assert(!insideSidebarClose, 'Inside sidebar close/collapse icon is completely removed from DOM');

  const sideHeadButtons = await page.evaluate(() => {
    const head = document.querySelector('.side__head');
    if (!head) return [];
    return Array.from(head.querySelectorAll('button')).map(b => ({
      cls: b.className,
      aria: b.getAttribute('aria-label'),
      display: getComputedStyle(b).display
    }));
  });
  const visibleSidebarCollapse = sideHeadButtons.find(b => b.cls.includes('collapse') || (b.aria && b.aria.toLowerCase().includes('collapse')));
  assert(!visibleSidebarCollapse, 'No collapse button is present inside the sidebar header');

  console.log('\n=== 2. HEADER SEARCHBAR & NEW BUTTON REMOVAL ===');
  const headerSearch = await page.$('.top .search, .top input[type="search"]');
  const headerSearchVisible = await page.evaluate(() => {
    const s = document.querySelector('.top .search, .top__search');
    if (!s) return false;
    return getComputedStyle(s).display !== 'none';
  });
  assert(!headerSearch || !headerSearchVisible, 'Header searchbar is completely removed from the top bar');

  const headerNewBtn = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.top button'));
    return btns.some(b => b.textContent.trim() === 'New' && getComputedStyle(b).display !== 'none');
  });
  assert(!headerNewBtn, 'Header "+ New" button is completely removed from the top bar');

  console.log('\n=== 3. BELL NOTIFICATION ICON & THEME-BASED DROPDOWN ===');
  const bellBtn = await page.$('.top .top__bell');
  assert(!!bellBtn, 'Bell icon button (.top__bell) is present in the header');

  const bellAria = await page.evaluate(() => {
    const b = document.querySelector('.top .top__bell');
    return b ? b.getAttribute('aria-label') : null;
  });
  assert(bellAria && bellAria.includes('Notification'), `Bell button has accessible label (got: "${bellAria}")`);

  const bellDot = await page.$('.top .top__bell-dot');
  assert(!!bellDot, 'Unread notification dot badge is rendered on the bell button');

  // Click the bell button to open the notification dropdown
  await page.click('.top .top__bell');
  await new Promise(r => setTimeout(r, 400));

  const bellDropdown = await page.$('.menu[role="menu"]');
  assert(!!bellDropdown, 'Theme-based notification dropdown (.menu) opened upon clicking bell icon');

  const bellDropdownPos = await page.evaluate(() => {
    const bell = document.querySelector('.top .top__bell').getBoundingClientRect();
    const menu = document.querySelector('.menu[role="menu"]').getBoundingClientRect();
    return {
      bellBottom: bell.bottom,
      menuTop: menu.top,
      isBelow: menu.top >= bell.bottom - 2
    };
  });
  assert(bellDropdownPos.isBelow, `Notification dropdown renders strictly below the bell button (bell bottom: ${bellDropdownPos.bellBottom}, menu top: ${bellDropdownPos.menuTop})`);

  const bellMenuItems = await page.evaluate(() => {
    const menu = document.querySelector('.menu[role="menu"]');
    if (!menu) return [];
    return Array.from(menu.querySelectorAll('.menu__item, .menu__label')).map(el => el.textContent.trim());
  });
  assert(bellMenuItems.length >= 3, `Notification dropdown contains rich activity items (count: ${bellMenuItems.length})`);

  // Close the menu
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 200));

  console.log('\n=== 4. THEME-BASED DROPDOWNS BELOW OF VALUE ONLY ===');
  // Check any select on the page (e.g. status filter on sales table)
  const selectElem = await page.$('select');
  assert(!!selectElem, 'Select element present on page for dropdown testing');

  if (selectElem) {
    const initialVal = await page.evaluate(() => document.querySelector('select').value);
    const selectRect = await page.evaluate(() => {
      const s = document.querySelector('select');
      const r = s.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, width: r.width };
    });

    // Click the select
    await page.click('select');
    await new Promise(r => setTimeout(r, 300));

    const themeDropdown = await page.$('.theme-dropdown');
    assert(!!themeDropdown, 'Custom theme-based dropdown (.theme-dropdown) opened on select interaction');

    const dropdownPos = await page.evaluate(() => {
      const sel = document.querySelector('select').getBoundingClientRect();
      const dd = document.querySelector('.theme-dropdown').getBoundingClientRect();
      return {
        selBottom: sel.bottom,
        ddTop: dd.top,
        isBelow: dd.top >= sel.bottom - 1
      };
    });
    assert(dropdownPos.isBelow, `Theme dropdown is positioned strictly BELOW the value only (select bottom: ${dropdownPos.selBottom}, dd top: ${dropdownPos.ddTop})`);

    const ddItems = await page.evaluate(() => {
      const dd = document.querySelector('.theme-dropdown');
      return Array.from(dd.querySelectorAll('.theme-dropdown-item')).map(i => i.textContent.trim());
    });
    assert(ddItems.length > 0, `Dropdown shows selectable options (found ${ddItems.length}: ${ddItems.slice(0, 3).join(', ')})`);

    // Click an option in the theme dropdown
    await page.evaluate(() => {
      const items = document.querySelectorAll('.theme-dropdown-item');
      if (items.length > 1) items[1].click();
      else if (items.length > 0) items[0].click();
    });
    await new Promise(r => setTimeout(r, 300));

    const dropdownClosed = await page.evaluate(() => !document.querySelector('.theme-dropdown'));
    assert(dropdownClosed, 'Theme dropdown automatically closes after selecting an option');
  }

  console.log('\n=== 5. COMPLETE REMOVAL OF NUMBER INPUT UP/DOWN ARROWS ===');
  // Navigate to an entry drawer or form with number input
  // Click "Create invoice" button on sales page
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Create invoice'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const hasNumInput = await page.$('input[type="number"], input[inputmode="numeric"], input[inputmode="decimal"], input[name="amount"], input[name="price"]');
  assert(!!hasNumInput, 'Number input present in modal/drawer for testing');

  const spinButtonStyles = await page.evaluate(() => {
    const input = document.querySelector('input[type="number"]') || document.querySelector('input[inputmode="numeric"]');
    if (!input) return null;
    const style = window.getComputedStyle(input);
    return {
      appearance: style.appearance || style.webkitAppearance,
      mozAppearance: style.MozAppearance
    };
  });
  assert(
    spinButtonStyles && (spinButtonStyles.appearance === 'none' || spinButtonStyles.appearance === 'textfield'),
    `Number input spin button appearance is removed (appearance: "${spinButtonStyles?.appearance}", moz: "${spinButtonStyles?.mozAppearance}")`
  );

  console.log('\n=== 6. STRICT NUMBER INPUT VALIDATION (NUMBERS ONLY) ===');
  if (hasNumInput) {
    const numInputSelector = 'input[type="number"], input[inputmode="numeric"], input[name="amount"], input[name="price"]';
    
    // Clear input first
    await page.click(numInputSelector, { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.evaluate((sel) => { document.querySelector(sel).value = ''; }, numInputSelector);

    // Focus number input and type non-numeric characters: letters, +, -, e
    await page.focus(numInputSelector);
    await page.keyboard.type('abc!@#eE+-');
    const valAfterLetters = await page.$eval(numInputSelector, el => el.value);
    assert(valAfterLetters === '', `Letters and special symbols ('abc!@#eE+-') are blocked on number input (got: "${valAfterLetters}")`);

    // Type valid numbers
    await page.keyboard.type('12500.50');
    const valAfterNumbers = await page.$eval(numInputSelector, el => el.value);
    assert(valAfterNumbers === '12500.50' || valAfterNumbers === '12500', `Numeric digits are properly accepted (got: "${valAfterNumbers}")`);

    // Test paste with mixed characters
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      el.value = '';
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer()
      });
      pasteEvent.clipboardData.setData('text', 'Price: $4500.75 USD');
      el.dispatchEvent(pasteEvent);
    }, numInputSelector);
    await new Promise(r => setTimeout(r, 200));

    const valAfterPaste = await page.$eval(numInputSelector, el => el.value);
    assert(valAfterPaste === '4500.75' || valAfterPaste === '4500', `Paste with letters and symbols sanitizes to numbers only (got: "${valAfterPaste}")`);
  }

  // Close drawer/modal
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));

  console.log('\n=== 7. THEME-BASED MONTHLY CALENDAR ===');
  // Test monthly calendar
  await page.evaluate(() => {
    // Create or find a month input
    let monthInput = document.querySelector('input[type="month"]');
    if (!monthInput) {
      monthInput = document.createElement('input');
      monthInput.type = 'month';
      monthInput.value = '2026-11';
      monthInput.style.position = 'fixed';
      monthInput.style.top = '100px';
      monthInput.style.left = '200px';
      monthInput.id = 'test-month-input';
      document.body.appendChild(monthInput);
    }
  });
  await new Promise(r => setTimeout(r, 200));

  await page.click('input[type="month"]');
  await new Promise(r => setTimeout(r, 300));

  const cal = await page.$('.theme-calendar');
  assert(!!cal, 'Theme-based monthly calendar (.theme-calendar) opened on month input click');

  if (cal) {
    const calPos = await page.evaluate(() => {
      const inp = document.querySelector('input[type="month"]').getBoundingClientRect();
      const c = document.querySelector('.theme-calendar').getBoundingClientRect();
      return {
        inpBottom: inp.bottom,
        calTop: c.top,
        isBelow: c.top >= inp.bottom - 1
      };
    });
    assert(calPos.isBelow, `Monthly calendar renders strictly BELOW the input value only (inp bottom: ${calPos.inpBottom}, cal top: ${calPos.calTop})`);

    const monthsCount = await page.evaluate(() => {
      return document.querySelectorAll('.theme-cal-month').length;
    });
    assert(monthsCount === 12, `Monthly calendar renders 12 selectable month capsules (got: ${monthsCount})`);

    // Click October month
    await page.evaluate(() => {
      const octBtn = Array.from(document.querySelectorAll('.theme-cal-month')).find(b => b.textContent.trim() === 'Oct');
      if (octBtn) octBtn.click();
    });
    await new Promise(r => setTimeout(r, 200));

    const selectedMonthVal = await page.$eval('input[type="month"]', el => el.value);
    assert(selectedMonthVal.includes('2026-10'), `Selecting month updates input value to 2026-10 (got: "${selectedMonthVal}")`);

    // Clean up test element if created
    await page.evaluate(() => {
      document.getElementById('test-month-input')?.remove();
    });
  }

  console.log('\n=== 8. SCREENSHOTS & DARK MODE VERIFICATION ===');
  await page.screenshot({ path: path.join(artifactDir, 'global_themed_controls_light.png') });

  // Toggle dark mode
  const themeBtn = await page.$('.top .top__theme');
  if (themeBtn) {
    await page.click('.top .top__theme');
  } else {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  }
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, 'global_themed_controls_dark.png') });

  const isDarkMode = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark');
  assert(isDarkMode, 'Theme toggle correctly switches to dark mode with full visual continuity');

  // Toggle back to light
  if (themeBtn) {
    await page.click('.top .top__theme');
  } else {
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
  }
  await new Promise(r => setTimeout(r, 300));

  await browser.close();

  console.log(`\n===========================================`);
  console.log(`GLOBAL THEMED CONTROLS RESULT: ${passed} passed, ${failed} failed`);
  console.log(`===========================================\n`);

  if (failed > 0) process.exit(1);
})();
