import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:1234';
const OUT = path.resolve('test-reports');
fs.mkdirSync(OUT, { recursive: true });

async function run() {
  console.log('===============================================================');
  console.log('SIDEBAR BRANCHES UNDER MASTERS TEST SUITE');
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

    // Inspect Sidebar: verify PEOPLE -> Human Resources does NOT have Branches
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
    const hasBranchesInHr = hrInfo.subs.some((s) => s.label.toLowerCase() === 'branches');
    assert.equal(hasBranchesInHr, false, 'Branches must NOT be present under Human Resources');
    console.log('✓ Confirmed: Branches successfully removed from Human Resources!');

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
    const branchSubInMasters = mastersInfoAfterClick.subs.find((s) => s.label.toLowerCase() === 'branches');
    assert.ok(branchSubInMasters, 'Branches must be present as a sub-item under Masters');
    assert.equal(branchSubInMasters.href, '/hr/branches', 'Branches sub-item href must be /hr/branches');
    console.log('✓ Confirmed: Branches is present under Masters with href /hr/branches!');

    // Screenshot of Masters expanded
    const shotMastersExpanded = path.join(OUT, 'sidebar_masters_with_branches_expanded.png');
    await page.screenshot({ path: shotMastersExpanded, fullPage: false });
    console.log(`Saved screenshot: ${shotMastersExpanded}`);

    // STEP 5: Click Branches under Masters
    console.log('[STEP 5] Clicking Branches sub-item under Masters dropdown...');
    await page.evaluate(() => {
      const subs = Array.from(document.querySelectorAll('.side__group[aria-label="Masters"] .nav__sub'));
      const branchLink = subs.find((a) => a.textContent.trim().toLowerCase() === 'branches');
      if (branchLink) branchLink.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Verify current URL and active states
    const activeStates = await page.evaluate(() => {
      const path = location.pathname;
      const crumbs = Array.from(document.querySelectorAll('.crumbs li, .crumbs span, .crumbs a')).map((el) => el.textContent.trim());
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

    console.log('Active state on /hr/branches:', activeStates);
    assert.equal(activeStates.path, '/hr/branches', 'URL must be /hr/branches');
    assert.equal(activeStates.pageTitle, 'Branches', 'Page title must be Branches');
    assert.ok(activeStates.mastersIsActive, 'Masters parent item must be is-active');
    assert.ok(activeStates.mastersIsOpen, 'Masters parent item must be is-open');
    assert.equal(activeStates.hrIsActive, false, 'Human Resources must NOT be is-active');
    assert.equal(activeStates.hrIsOpen, false, 'Human Resources must NOT be is-open');
    assert.equal(activeStates.activeSubs.length, 1, 'Only one sub-item should be active');
    assert.equal(activeStates.activeSubs[0].label, 'Branches');
    assert.equal(activeStates.activeSubs[0].parentGroup, 'Masters');
    console.log('✓ Confirmed: Branches under Masters is actively highlighted and Masters is open!');

    // Screenshot on /hr/branches
    const shotBranchesActive = path.join(OUT, 'sidebar_branches_under_masters_active.png');
    await page.screenshot({ path: shotBranchesActive, fullPage: false });
    console.log(`Saved screenshot: ${shotBranchesActive}`);

    // STEP 6: Direct navigation to /hr/branches
    console.log(`[STEP 6] Direct navigation to ${BASE_URL}/hr/branches...`);
    await page.goto(`${BASE_URL}/hr/branches`, { waitUntil: 'networkidle0' });
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
    assert.equal(directNavStates.activeSubs[0].label, 'Branches');
    console.log('✓ Confirmed: Direct navigation to /hr/branches automatically expands Masters!');

    // STEP 7: Test direct navigation to /masters/branches (redirect test)
    console.log(`[STEP 7] Direct navigation to ${BASE_URL}/masters/branches (redirect test)...`);
    await page.goto(`${BASE_URL}/masters/branches`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    const redirectPath = await page.evaluate(() => location.pathname);
    console.log('Redirected URL from /masters/branches:', redirectPath);
    assert.equal(redirectPath, '/hr/branches', '/masters/branches should cleanly route to /hr/branches');
    console.log('✓ Confirmed: /masters/branches cleanly redirects to /hr/branches!');

    // STEP 8: Navigate to /hr/staff (Employees)
    console.log(`[STEP 8] Navigating to ${BASE_URL}/hr/staff...`);
    await page.goto(`${BASE_URL}/hr/staff`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    const staffStates = await page.evaluate(() => {
      const mastersItem = document.querySelector('.side__group[aria-label="Masters"] .nav__item');
      const hrItem = document.querySelector('.side__group[aria-label="People"] .nav__item');
      const activeSubs = Array.from(document.querySelectorAll('.nav__sub.is-active')).map((s) => ({
        label: s.textContent.trim(),
        href: s.getAttribute('href'),
        parentGroup: s.closest('.side__group')?.getAttribute('aria-label')
      }));
      const hrSubs = Array.from(document.querySelectorAll('.side__group[aria-label="People"] .nav__sub')).map((s) => s.textContent.trim());

      return {
        hrIsOpen: hrItem?.classList.contains('is-open'),
        hrIsActive: hrItem?.classList.contains('is-active'),
        mastersIsOpen: mastersItem?.classList.contains('is-open'),
        mastersIsActive: mastersItem?.classList.contains('is-active'),
        activeSubs,
        hrSubs
      };
    });

    console.log('Staff page states:', staffStates);
    assert.ok(staffStates.hrIsActive, 'Human Resources should be active on /hr/staff');
    assert.ok(staffStates.hrIsOpen, 'Human Resources should be open on /hr/staff');
    assert.equal(staffStates.mastersIsActive, false, 'Masters should be inactive on /hr/staff');
    assert.equal(staffStates.activeSubs[0].label, 'Employees');
    assert.equal(staffStates.hrSubs.includes('Branches'), false, 'Branches must not be in HR subs');
    console.log('✓ Confirmed: /hr/staff correctly opens Human Resources with no Branches in subs!');

    const shotStaff = path.join(OUT, 'sidebar_hr_employees_active_no_branches.png');
    await page.screenshot({ path: shotStaff, fullPage: false });
    console.log(`Saved screenshot: ${shotStaff}`);

    // STEP 9: Console errors
    console.log('[STEP 9] Checking browser console errors...');
    const criticalErrors = pageErrors.filter((e) => !e.includes('favicon'));
    console.log('Critical Errors:', criticalErrors);
    assert.equal(criticalErrors.length, 0, `Expected 0 critical errors, found ${criticalErrors.length}`);

    console.log('\n===============================================================');
    console.log('ALL TESTS PASSED: BRANCHES UNDER MASTERS SECTION VERIFIED');
    console.log('===============================================================\n');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
