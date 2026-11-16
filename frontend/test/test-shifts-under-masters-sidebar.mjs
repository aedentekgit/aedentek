import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:1234';
const OUT = path.resolve('test-reports');
fs.mkdirSync(OUT, { recursive: true });

async function run() {
  console.log('===============================================================');
  console.log('SIDEBAR SHIFTS UNDER MASTERS TEST SUITE');
  console.log('===============================================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1400,960']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 960 });

  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  try {
    // STEP 1: Login
    console.log(`[STEP 1] Logging in at ${BASE_URL}/login...`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));
    await page.type('input[type="email"]', 'ines.okafor@aedentek.com');
    await page.type('input[autocomplete="current-password"]', 'password123');
    await page.click('.lg-submit');
    await new Promise((r) => setTimeout(r, 1200));

    // STEP 2: Navigate to Dashboard / Today
    console.log(`[STEP 2] Navigating to ${BASE_URL}/today...`);
    await page.goto(`${BASE_URL}/today`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    // STEP 3: Inspect Sidebar: verify PEOPLE -> Human Resources does NOT have Shifts
    console.log('[STEP 3] Inspecting Human Resources subs under PEOPLE in Sidebar...');
    const hrInfo = await page.evaluate(() => {
      const groups = Array.from(document.querySelectorAll('.side__group'));
      const peopleGroup = groups.find((g) => {
        const lbl = g.querySelector('.side__label');
        return lbl && lbl.textContent.trim().toUpperCase() === 'PEOPLE';
      });
      if (!peopleGroup) return { error: 'PEOPLE group not found' };

      const hrContainer = Array.from(peopleGroup.querySelectorAll(':scope > div')).find((div) => {
        const item = div.querySelector('.nav__item');
        return item && item.textContent.includes('Human Resources');
      });
      if (!hrContainer) return { error: 'Human Resources container not found' };

      const subs = Array.from(hrContainer.querySelectorAll('.nav__subs .nav__sub')).map((s) => ({
        label: s.textContent.trim(),
        href: s.getAttribute('href')
      }));

      return {
        hasHr: true,
        subs
      };
    });

    console.log('Human Resources sub-items:', hrInfo.subs);
    assert.ok(hrInfo.hasHr, 'Human Resources container should exist under PEOPLE');
    const hasShiftsInHr = hrInfo.subs.some((s) => s.label.toLowerCase() === 'shifts');
    assert.equal(hasShiftsInHr, false, 'Shifts must NOT be present under Human Resources');
    console.log('✓ Confirmed: Shifts successfully removed from Human Resources!');

    // STEP 4: Inspect MASTERS section and Masters dropdown
    console.log('[STEP 4] Inspecting Masters dropdown under MASTERS in Sidebar...');
    const mastersInfo = await page.evaluate(() => {
      const groups = Array.from(document.querySelectorAll('.side__group'));
      const mastersGroup = groups.find((g) => {
        const lbl = g.querySelector('.side__label');
        return lbl && lbl.textContent.trim().toUpperCase() === 'MASTERS';
      });
      if (!mastersGroup) return { error: 'MASTERS group not found' };

      const mastersContainer = Array.from(mastersGroup.querySelectorAll(':scope > div')).find((div) => {
        const item = div.querySelector('.nav__item');
        return item && item.textContent.includes('Masters');
      });
      if (!mastersContainer) return { error: 'Masters container not found' };

      const subs = Array.from(mastersContainer.querySelectorAll('.nav__subs .nav__sub')).map((s) => ({
        label: s.textContent.trim(),
        href: s.getAttribute('href')
      }));

      return {
        hasMasters: true,
        isOpen: mastersContainer.querySelector('.nav__item.is-open') !== null,
        subs
      };
    });

    // If Masters is not currently open, click to open it
    if (!mastersInfo.subs || mastersInfo.subs.length === 0) {
      console.log('Opening Masters dropdown...');
      const mastersItem = await page.$('.side__group[aria-label="Masters"] .nav__item');
      if (mastersItem) await mastersItem.click();
      await new Promise((r) => setTimeout(r, 600));
    }

    const mastersInfoAfterClick = await page.evaluate(() => {
      const groups = Array.from(document.querySelectorAll('.side__group'));
      const mastersGroup = groups.find((g) => {
        const lbl = g.querySelector('.side__label');
        return lbl && lbl.textContent.trim().toUpperCase() === 'MASTERS';
      });
      if (!mastersGroup) return { error: 'MASTERS group not found' };

      const mastersContainer = Array.from(mastersGroup.querySelectorAll(':scope > div')).find((div) => {
        const item = div.querySelector('.nav__item');
        return item && item.textContent.includes('Masters');
      });
      if (!mastersContainer) return { error: 'Masters container not found' };

      const subs = Array.from(mastersContainer.querySelectorAll('.nav__subs .nav__sub')).map((s) => ({
        label: s.textContent.trim(),
        href: s.getAttribute('href')
      }));

      return {
        hasMasters: true,
        isOpen: mastersContainer.querySelector('.nav__item.is-open') !== null,
        subs
      };
    });

    console.log('Masters sub-items:', mastersInfoAfterClick.subs);
    const shiftSubInMasters = mastersInfoAfterClick.subs.find((s) => s.label.toLowerCase() === 'shifts');
    assert.ok(shiftSubInMasters, 'Shifts must be present as a sub-item under Masters');
    assert.equal(shiftSubInMasters.href, '/hr/shifts', 'Shifts sub-item href must be /hr/shifts');
    console.log('✓ Confirmed: Shifts is present under Masters with href /hr/shifts!');

    // Screenshot of Masters expanded
    const shotMastersExpanded = path.join(OUT, 'sidebar_masters_with_shifts_expanded.png');
    await page.screenshot({ path: shotMastersExpanded, fullPage: false });
    console.log(`Saved screenshot: ${shotMastersExpanded}`);

    // STEP 5: Click Shifts under Masters
    console.log('[STEP 5] Clicking Shifts sub-item under Masters dropdown...');
    await page.evaluate(() => {
      const subs = Array.from(document.querySelectorAll('.side__group[aria-label="Masters"] .nav__sub'));
      const shiftLink = subs.find((a) => a.textContent.trim().toLowerCase() === 'shifts');
      if (shiftLink) shiftLink.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Verify current URL and active states
    const activeStates = await page.evaluate(() => {
      const path = location.pathname;
      const crumbs = Array.from(document.querySelectorAll('.crumbs span, .crumbs a')).map((el) => el.textContent.trim()).filter((t) => t && t !== '›' && t !== '>');
      const pageTitle = document.querySelector('.phead h1, h1')?.textContent.trim();

      const mastersItem = document.querySelector('.side__group[aria-label="Masters"] .nav__item');
      const mastersIsOpen = mastersItem ? mastersItem.classList.contains('is-open') : false;
      const mastersIsActive = mastersItem ? mastersItem.classList.contains('is-active') : false;

      const hrItem = document.querySelector('.side__group[aria-label="People"] .nav__item');
      const hrIsOpen = hrItem ? hrItem.classList.contains('is-open') : false;
      const hrIsActive = hrItem ? hrItem.classList.contains('is-active') : false;

      const activeSubs = Array.from(document.querySelectorAll('.nav__sub.is-active')).map((s) => ({
        label: s.textContent.trim(),
        href: s.getAttribute('href'),
        parentGroup: s.closest('.side__group')?.getAttribute('aria-label')
      }));

      return {
        path,
        crumbs,
        pageTitle,
        mastersIsOpen,
        mastersIsActive,
        hrIsOpen,
        hrIsActive,
        activeSubs
      };
    });

    console.log('Active state on /hr/shifts:', activeStates);
    assert.equal(activeStates.path, '/hr/shifts', 'URL must be /hr/shifts');
    assert.equal(activeStates.pageTitle, 'Shifts', 'Page title must be Shifts');
    assert.ok(activeStates.mastersIsActive, 'Masters parent item must be is-active');
    assert.ok(activeStates.mastersIsOpen, 'Masters parent item must be is-open');
    assert.equal(activeStates.hrIsActive, false, 'Human Resources must NOT be is-active');
    assert.equal(activeStates.hrIsOpen, false, 'Human Resources must NOT be is-open');
    assert.equal(activeStates.activeSubs.length, 1, 'Only one sub-item should be active');
    assert.equal(activeStates.activeSubs[0].label, 'Shifts');
    assert.equal(activeStates.activeSubs[0].parentGroup, 'Masters');
    assert.deepEqual(activeStates.crumbs, ['Workspace', 'Masters', 'Shifts'], 'Breadcrumbs must be Workspace > Masters > Shifts');
    console.log('✓ Confirmed: Shifts under Masters is actively highlighted and Masters is open with correct breadcrumbs!');

    // Screenshot on /hr/shifts
    const shotShiftsActive = path.join(OUT, 'sidebar_shifts_under_masters_active.png');
    await page.screenshot({ path: shotShiftsActive, fullPage: false });
    console.log(`Saved screenshot: ${shotShiftsActive}`);

    // STEP 6: Direct navigation to /hr/shifts
    console.log(`[STEP 6] Direct navigation to ${BASE_URL}/hr/shifts...`);
    await page.goto(`${BASE_URL}/hr/shifts`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    const directNavStates = await page.evaluate(() => {
      const mastersItem = document.querySelector('.side__group[aria-label="Masters"] .nav__item');
      const hrItem = document.querySelector('.side__group[aria-label="People"] .nav__item');
      const activeSubs = Array.from(document.querySelectorAll('.nav__sub.is-active')).map((s) => ({
        label: s.textContent.trim(),
        href: s.getAttribute('href'),
        parentGroup: s.closest('.side__group')?.getAttribute('aria-label')
      }));

      return {
        mastersIsOpen: mastersItem?.classList.contains('is-open'),
        mastersIsActive: mastersItem?.classList.contains('is-active'),
        hrIsOpen: hrItem?.classList.contains('is-open'),
        hrIsActive: hrItem?.classList.contains('is-active'),
        activeSubs
      };
    });

    console.log('Direct navigation states:', directNavStates);
    assert.ok(directNavStates.mastersIsActive, 'Masters parent item must be is-active on direct load');
    assert.ok(directNavStates.mastersIsOpen, 'Masters parent item must be is-open on direct load');
    assert.equal(directNavStates.hrIsActive, false, 'Human Resources must be inactive on direct load');
    assert.equal(directNavStates.activeSubs[0].label, 'Shifts');
    console.log('✓ Confirmed: Direct navigation to /hr/shifts automatically expands Masters!');

    // STEP 7: Test direct navigation to /masters/shifts (redirect test)
    console.log(`[STEP 7] Direct navigation to ${BASE_URL}/masters/shifts (redirect test)...`);
    await page.goto(`${BASE_URL}/masters/shifts`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    const redirectPath = await page.evaluate(() => location.pathname);
    console.log('Redirected URL from /masters/shifts:', redirectPath);
    assert.equal(redirectPath, '/hr/shifts', '/masters/shifts should cleanly route to /hr/shifts');
    console.log('✓ Confirmed: /masters/shifts cleanly redirects to /hr/shifts!');

    // STEP 8: Navigate to /hr/staff (Employees)
    console.log(`[STEP 8] Navigating to ${BASE_URL}/hr/staff...`);
    await page.goto(`${BASE_URL}/hr/staff`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    const staffStates = await page.evaluate(() => {
      const mastersItem = document.querySelector('.side__group[aria-label="Masters"] .nav__item');
      const hrItem = document.querySelector('.side__group[aria-label="People"] .nav__item');
      const hrSubs = Array.from(document.querySelectorAll('.side__group[aria-label="People"] .nav__sub')).map((s) => s.textContent.trim());
      const activeSubs = Array.from(document.querySelectorAll('.nav__sub.is-active')).map((s) => ({
        label: s.textContent.trim(),
        href: s.getAttribute('href'),
        parentGroup: s.closest('.side__group')?.getAttribute('aria-label')
      }));

      return {
        mastersIsOpen: mastersItem?.classList.contains('is-open'),
        mastersIsActive: mastersItem?.classList.contains('is-active'),
        hrIsOpen: hrItem?.classList.contains('is-open'),
        hrIsActive: hrItem?.classList.contains('is-active'),
        hrSubs,
        activeSubs
      };
    });

    console.log('State on /hr/staff:', staffStates);
    assert.ok(staffStates.hrIsActive, 'Human Resources must be active on /hr/staff');
    assert.ok(staffStates.hrIsOpen, 'Human Resources must be open on /hr/staff');
    assert.equal(staffStates.mastersIsActive, false, 'Masters must be inactive on /hr/staff');
    assert.equal(staffStates.mastersIsOpen, false, 'Masters must be closed on /hr/staff');
    assert.equal(staffStates.hrSubs.includes('Shifts'), false, 'Shifts must NOT be in Human Resources sub-items');
    assert.equal(staffStates.activeSubs[0].label, 'Employees');
    console.log('✓ Confirmed: HR page opens HR section normally without Shifts!');

    // Screenshot of HR active without shifts
    const shotHrWithoutShifts = path.join(OUT, 'sidebar_hr_without_shifts.png');
    await page.screenshot({ path: shotHrWithoutShifts, fullPage: false });
    console.log(`Saved screenshot: ${shotHrWithoutShifts}`);

    console.log('\n===============================================================');
    console.log('ALL VERIFICATIONS PASSED (100% GREEN)');
    console.log('===============================================================');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
