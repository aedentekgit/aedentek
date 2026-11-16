import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:1234';
const OUT = path.resolve('test-reports');
fs.mkdirSync(OUT, { recursive: true });

async function run() {
  console.log('===============================================================');
  console.log('SIDEBAR PROJECTS UNDER CLIENTS DROPDOWN TEST SUITE');
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

    // STEP 2: Navigate to /clients/companies
    console.log(`[STEP 2] Navigating to ${BASE_URL}/clients/companies...`);
    await page.goto(`${BASE_URL}/clients/companies`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    // Inspect Workspace group items in Sidebar
    const workspaceInfo = await page.evaluate(() => {
      const groups = Array.from(document.querySelectorAll('.side__group'));
      const wsGroup = groups.find((g) => {
        const lbl = g.querySelector('.side__label');
        return lbl && lbl.textContent.trim().toUpperCase() === 'WORKSPACE';
      });
      if (!wsGroup) return { error: 'Workspace group not found' };

      const items = Array.from(wsGroup.querySelectorAll(':scope > div > .nav__item'));
      const topLevelNames = items.map((el) => {
        const span = el.querySelector('span');
        return span ? span.textContent.trim() : el.textContent.trim();
      });

      // Find Clients item & its subs
      const clientsContainer = items.find((el) => {
        const span = el.querySelector('span');
        return span && span.textContent.trim() === 'Clients';
      })?.parentElement;

      let subs = [];
      if (clientsContainer) {
        subs = Array.from(clientsContainer.querySelectorAll('.nav__subs .nav__sub')).map((s) => ({
          label: s.textContent.trim(),
          href: s.getAttribute('href'),
          isActive: s.classList.contains('is-active')
        }));
      }

      return {
        topLevelNames,
        clientsIsOpen: clientsContainer ? !!clientsContainer.querySelector('.nav__item.is-open') : false,
        clientsIsActive: clientsContainer ? !!clientsContainer.querySelector('.nav__item.is-active') : false,
        subs
      };
    });

    console.log('Top-level items under WORKSPACE:', workspaceInfo.topLevelNames);
    assert.deepEqual(
      workspaceInfo.topLevelNames,
      ['Dashboard', 'Clients', 'Deals'],
      'WORKSPACE must contain Dashboard, Clients, Deals (Projects must NOT be a top-level item)'
    );
    console.log('✓ Top-level Projects item successfully removed from WORKSPACE!');

    console.log('Clients dropdown sub-items:', workspaceInfo.subs);
    assert.equal(workspaceInfo.subs.length, 3, 'Clients dropdown must have exactly 3 sub-items');

    const subLabels = workspaceInfo.subs.map((s) => s.label);
    assert.deepEqual(
      subLabels,
      ['New Clients', 'Directory', 'Projects'],
      'Clients dropdown flow must be: 1. New Clients, 2. Directory, 3. Projects'
    );
    console.log('✓ Clients dropdown items verified in exact required flow: New Clients -> Directory -> Projects!');

    // Check hrefs
    assert.equal(workspaceInfo.subs[0].href, '/clients/new', 'New Clients links to /clients/new');
    assert.equal(workspaceInfo.subs[1].href, '/clients/companies', 'Directory links to /clients/companies');
    assert.equal(workspaceInfo.subs[2].href, '/projects', 'Projects links to /projects');
    console.log('✓ All sub-item href links verified (/clients/new, /clients/companies, /projects)!');

    // On /clients/companies, Directory must be active
    assert.equal(workspaceInfo.subs[0].isActive, false, 'New Clients is not active');
    assert.equal(workspaceInfo.subs[1].isActive, true, 'Directory is active');
    assert.equal(workspaceInfo.subs[2].isActive, false, 'Projects is not active');
    assert.equal(workspaceInfo.clientsIsActive, true, 'Clients parent is active');
    console.log('✓ Directory is properly highlighted active on /clients/companies.');

    const shot1 = path.join(OUT, 'sidebar_clients_dropdown_expanded.png');
    await page.screenshot({ path: shot1, fullPage: false });
    console.log(`✓ Screenshot captured: ${shot1}\n`);

    // STEP 3: Click 'Projects' under Clients dropdown
    console.log('[STEP 3] Clicking "Projects" under Clients dropdown...');
    await page.evaluate(() => {
      const projLink = Array.from(document.querySelectorAll('.nav__subs .nav__sub')).find(
        (el) => el.textContent.trim() === 'Projects'
      );
      if (projLink) projLink.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Verify current URL
    const currentUrl = page.url();
    console.log('Current URL after clicking Projects:', currentUrl);
    assert.ok(currentUrl.endsWith('/projects'), 'URL must end with /projects');

    // Check sidebar active states on /projects
    const projState = await page.evaluate(() => {
      const clientsItem = Array.from(document.querySelectorAll('.nav__item')).find((el) => {
        const span = el.querySelector('span');
        return span && span.textContent.trim() === 'Clients';
      });
      const clientsContainer = clientsItem?.parentElement;
      const subs = Array.from(clientsContainer?.querySelectorAll('.nav__subs .nav__sub') || []).map((s) => ({
        label: s.textContent.trim(),
        href: s.getAttribute('href'),
        isActive: s.classList.contains('is-active')
      }));

      return {
        clientsIsOpen: !!clientsItem?.classList.contains('is-open'),
        clientsIsActive: !!clientsItem?.classList.contains('is-active'),
        subs
      };
    });

    console.log('On /projects - Clients parent is active:', projState.clientsIsActive, 'open:', projState.clientsIsOpen);
    console.log('On /projects - Sub-items active status:', projState.subs);

    assert.equal(projState.clientsIsActive, true, 'Clients parent is active on /projects');
    assert.equal(projState.clientsIsOpen, true, 'Clients dropdown remains open on /projects');
    assert.equal(projState.subs.find((s) => s.label === 'Projects')?.isActive, true, 'Projects sub-item is active');
    assert.equal(projState.subs.find((s) => s.label === 'Directory')?.isActive, false, 'Directory sub-item is NOT active');
    assert.equal(projState.subs.find((s) => s.label === 'New Clients')?.isActive, false, 'New Clients sub-item is NOT active');
    console.log('✓ Projects sub-item is active and highlighted under Clients dropdown!');

    const shot2 = path.join(OUT, 'sidebar_projects_under_clients_active.png');
    await page.screenshot({ path: shot2, fullPage: false });
    console.log(`✓ Screenshot captured: ${shot2}\n`);

    // STEP 4: Click 'New Clients' under Clients dropdown
    console.log('[STEP 4] Clicking "New Clients" under Clients dropdown...');
    await page.evaluate(() => {
      const newLink = Array.from(document.querySelectorAll('.nav__subs .nav__sub')).find(
        (el) => el.textContent.trim() === 'New Clients'
      );
      if (newLink) newLink.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const newUrl = page.url();
    console.log('Current URL after clicking New Clients:', newUrl);
    assert.ok(newUrl.endsWith('/clients/new'), 'URL must end with /clients/new');

    const newState = await page.evaluate(() => {
      const clientsItem = Array.from(document.querySelectorAll('.nav__item')).find((el) => {
        const span = el.querySelector('span');
        return span && span.textContent.trim() === 'Clients';
      });
      const clientsContainer = clientsItem?.parentElement;
      const subs = Array.from(clientsContainer?.querySelectorAll('.nav__subs .nav__sub') || []).map((s) => ({
        label: s.textContent.trim(),
        href: s.getAttribute('href'),
        isActive: s.classList.contains('is-active')
      }));

      return {
        clientsIsOpen: !!clientsItem?.classList.contains('is-open'),
        clientsIsActive: !!clientsItem?.classList.contains('is-active'),
        subs
      };
    });

    assert.equal(newState.clientsIsActive, true, 'Clients parent is active on /clients/new');
    assert.equal(newState.subs.find((s) => s.label === 'New Clients')?.isActive, true, 'New Clients is active');
    assert.equal(newState.subs.find((s) => s.label === 'Directory')?.isActive, false, 'Directory is NOT active');
    assert.equal(newState.subs.find((s) => s.label === 'Projects')?.isActive, false, 'Projects is NOT active');
    console.log('✓ New Clients sub-item is active and highlighted on /clients/new!');

    const shot3 = path.join(OUT, 'sidebar_new_clients_active.png');
    await page.screenshot({ path: shot3, fullPage: false });
    console.log(`✓ Screenshot captured: ${shot3}\n`);

    // STEP 5: Direct URL Navigation to /projects
    console.log(`[STEP 5] Direct navigation to ${BASE_URL}/projects...`);
    await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    const directProjState = await page.evaluate(() => {
      const clientsItem = Array.from(document.querySelectorAll('.nav__item')).find((el) => {
        const span = el.querySelector('span');
        return span && span.textContent.trim() === 'Clients';
      });
      const clientsContainer = clientsItem?.parentElement;
      const subs = Array.from(clientsContainer?.querySelectorAll('.nav__subs .nav__sub') || []).map((s) => ({
        label: s.textContent.trim(),
        isActive: s.classList.contains('is-active')
      }));
      return {
        clientsIsOpen: !!clientsItem?.classList.contains('is-open'),
        clientsIsActive: !!clientsItem?.classList.contains('is-active'),
        subs
      };
    });
    assert.equal(directProjState.clientsIsActive, true);
    assert.equal(directProjState.clientsIsOpen, true);
    assert.equal(directProjState.subs.find((s) => s.label === 'Projects')?.isActive, true);
    console.log('✓ Direct navigation to /projects correctly expanded Clients and highlighted Projects sub-item.\n');

    // STEP 6: Direct URL Navigation to /clients/projects (redirect test)
    console.log(`[STEP 6] Direct navigation to ${BASE_URL}/clients/projects (redirect test)...`);
    await page.goto(`${BASE_URL}/clients/projects`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    const redirectUrl = page.url();
    console.log('Redirected URL from /clients/projects:', redirectUrl);
    assert.ok(redirectUrl.endsWith('/projects'), 'Redirected cleanly to /projects');

    const redirectState = await page.evaluate(() => {
      const clientsItem = Array.from(document.querySelectorAll('.nav__item')).find((el) => {
        const span = el.querySelector('span');
        return span && span.textContent.trim() === 'Clients';
      });
      const clientsContainer = clientsItem?.parentElement;
      const subs = Array.from(clientsContainer?.querySelectorAll('.nav__subs .nav__sub') || []).map((s) => ({
        label: s.textContent.trim(),
        isActive: s.classList.contains('is-active')
      }));
      return {
        clientsIsOpen: !!clientsItem?.classList.contains('is-open'),
        clientsIsActive: !!clientsItem?.classList.contains('is-active'),
        subs
      };
    });
    assert.equal(redirectState.clientsIsActive, true);
    assert.equal(redirectState.clientsIsOpen, true);
    assert.equal(redirectState.subs.find((s) => s.label === 'Projects')?.isActive, true);
    console.log('✓ /clients/projects cleanly redirected to /projects with Projects sub-item active.\n');

    // STEP 7: Check console errors
    console.log('[STEP 7] Checking browser console errors...');
    const criticalErrors = pageErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('ResizeObserver')
    );
    console.log(`Total critical browser errors encountered: ${criticalErrors.length}`);
    if (criticalErrors.length > 0) {
      console.warn('Page errors:', criticalErrors);
    }
    assert.equal(criticalErrors.length, 0, 'No critical page errors should occur');
    console.log('✓ 0 browser errors detected.\n');

    console.log('===============================================================');
    console.log('ALL TESTS PASSED: SIDEBAR PROJECTS UNDER CLIENTS VERIFIED');
    console.log('===============================================================');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
