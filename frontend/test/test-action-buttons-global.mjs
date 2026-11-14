import puppeteer from 'puppeteer';
import { strict as assert } from 'assert';
import path from 'path';
import fs from 'node:fs';

const BASE_URL = 'http://localhost:3000';
const artifactDir = path.resolve("test-reports"); fs.mkdirSync(artifactDir, { recursive: true });

async function run() {
  console.log('--- STARTING GLOBAL ICON-ONLY ACTION BUTTONS AUDIT ---');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. ACCOUNTS SALES & INVOICING
  console.log('\n=== 1. ACCOUNTS SALES & INVOICING (/accounts/sales) ===');
  await page.goto(`${BASE_URL}/accounts/sales`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.table, .table--stack');

  const salesAudit = await page.evaluate(() => {
    const rows = document.querySelectorAll('tbody tr[data-row]');
    if (!rows.length) return { rowCount: 0 };
    const firstRow = rows[0];
    const actionCell = firstRow.querySelector('td.acct-actions-cell, td:last-child');
    const buttons = actionCell ? Array.from(actionCell.querySelectorAll('button')) : [];

    return {
      rowCount: rows.length,
      buttonCount: buttons.length,
      buttons: buttons.map(b => {
        const style = window.getComputedStyle(b);
        const svg = b.querySelector('svg');
        return {
          title: b.getAttribute('title') || b.getAttribute('aria-label') || '',
          text: b.textContent.trim(),
          hasSvg: !!svg,
          width: Math.round(b.getBoundingClientRect().width),
          height: Math.round(b.getBoundingClientRect().height),
          bg: style.backgroundColor,
          color: style.color,
          className: b.className
        };
      })
    };
  });

  console.log(`  ✓ Inward rows: ${salesAudit.rowCount}, action buttons in first row: ${salesAudit.buttonCount}`);
  salesAudit.buttons.forEach((b, i) => {
    console.log(`    [Button ${i + 1}] title="${b.title}", text="${b.text}", hasSvg=${b.hasSvg}, size=${b.width}x${b.height}, color=${b.color}, bg=${b.bg}`);
    assert(b.hasSvg, `Button ${i + 1} must have an SVG icon`);
    assert(b.text === '', `Button ${i + 1} must be icon-only with zero text, got "${b.text}"`);
    assert(b.width >= 28 && b.width <= 36, `Button width must be ~32px, got ${b.width}px`);
    assert(b.height >= 28 && b.height <= 36, `Button height must be ~32px, got ${b.height}px`);
  });
  assert(salesAudit.buttonCount >= 4, `Inward table must have 4 action buttons (Edit, Collect, Print, Delete), got ${salesAudit.buttonCount}`);
  await page.screenshot({ path: path.join(artifactDir, 'action_buttons_sales.png') });
  console.log('  ✓ Saved screenshot: action_buttons_sales.png');

  // 2. ACCOUNTS EXPENSES
  console.log('\n=== 2. ACCOUNTS EXPENSES (/accounts/expenses) ===');
  await page.goto(`${BASE_URL}/accounts/expenses`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.table, .table--stack');

  const expAudit = await page.evaluate(() => {
    const rows = document.querySelectorAll('tbody tr[data-row]');
    if (!rows.length) return { rowCount: 0 };
    const firstRow = rows[0];
    const actionCell = firstRow.querySelector('td.acct-actions-cell, td:last-child');
    const buttons = actionCell ? Array.from(actionCell.querySelectorAll('button')) : [];

    return {
      rowCount: rows.length,
      buttonCount: buttons.length,
      buttons: buttons.map(b => ({
        title: b.getAttribute('title') || b.getAttribute('aria-label') || '',
        text: b.textContent.trim(),
        hasSvg: !!b.querySelector('svg'),
        width: Math.round(b.getBoundingClientRect().width),
        height: Math.round(b.getBoundingClientRect().height),
        color: window.getComputedStyle(b).color,
        bg: window.getComputedStyle(b).backgroundColor
      }))
    };
  });

  console.log(`  ✓ Expenses rows: ${expAudit.rowCount}, action buttons: ${expAudit.buttonCount}`);
  expAudit.buttons.forEach((b, i) => {
    console.log(`    [Button ${i + 1}] title="${b.title}", text="${b.text}", hasSvg=${b.hasSvg}, size=${b.width}x${b.height}`);
    assert(b.hasSvg, `Button ${i + 1} must have an SVG icon`);
    assert(b.text === '', `Button ${i + 1} must be icon-only, got "${b.text}"`);
  });
  await page.screenshot({ path: path.join(artifactDir, 'action_buttons_expenses.png') });
  console.log('  ✓ Saved screenshot: action_buttons_expenses.png');

  // 3. HR EMPLOYEES
  console.log('\n=== 3. HR EMPLOYEES ROSTER (/hr/staff) ===');
  await page.goto(`${BASE_URL}/hr/staff`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.table, .table--stack');

  const hrAudit = await page.evaluate(() => {
    const rows = document.querySelectorAll('tbody tr[data-row]');
    if (!rows.length) return { rowCount: 0 };
    const firstRow = rows[0];
    const actionCell = firstRow.querySelector('td.hr-actions-cell, td:last-child');
    const buttons = actionCell ? Array.from(actionCell.querySelectorAll('button')) : [];

    return {
      rowCount: rows.length,
      buttonCount: buttons.length,
      buttons: buttons.map(b => ({
        title: b.getAttribute('title') || b.getAttribute('aria-label') || '',
        text: b.textContent.trim(),
        hasSvg: !!b.querySelector('svg'),
        width: Math.round(b.getBoundingClientRect().width),
        height: Math.round(b.getBoundingClientRect().height)
      }))
    };
  });

  console.log(`  ✓ HR rows: ${hrAudit.rowCount}, action buttons: ${hrAudit.buttonCount}`);
  hrAudit.buttons.forEach((b, i) => {
    console.log(`    [Button ${i + 1}] title="${b.title}", text="${b.text}", hasSvg=${b.hasSvg}`);
    assert(b.hasSvg, `Button ${i + 1} must have an SVG icon`);
    assert(b.text === '', `Button ${i + 1} must be icon-only, got "${b.text}"`);
  });
  await page.screenshot({ path: path.join(artifactDir, 'action_buttons_hr.png') });
  console.log('  ✓ Saved screenshot: action_buttons_hr.png');

  // 4. CLIENT DIRECTORY MASTER
  console.log('\n=== 4. CLIENT DIRECTORY MASTER (/clients/companies) ===');
  await page.goto(`${BASE_URL}/clients/companies`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.table, .cl-table');

  const clientAudit = await page.evaluate(() => {
    const rows = document.querySelectorAll('tbody tr');
    if (!rows.length) return { rowCount: 0 };
    const firstRow = rows[0];
    const actionCell = firstRow.querySelector('td:last-child');
    const btn = actionCell ? actionCell.querySelector('button') : null;

    return {
      rowCount: rows.length,
      hasBtn: !!btn,
      title: btn ? btn.getAttribute('title') || btn.getAttribute('aria-label') : '',
      text: btn ? btn.textContent.trim() : '',
      hasSvg: btn ? !!btn.querySelector('svg') : false,
      width: btn ? Math.round(btn.getBoundingClientRect().width) : 0,
      height: btn ? Math.round(btn.getBoundingClientRect().height) : 0,
      color: btn ? window.getComputedStyle(btn).color : '',
      bg: btn ? window.getComputedStyle(btn).backgroundColor : ''
    };
  });

  console.log(`  ✓ Client rows: ${clientAudit.rowCount}, button: title="${clientAudit.title}", text="${clientAudit.text}", hasSvg=${clientAudit.hasSvg}, size=${clientAudit.width}x${clientAudit.height}, color=${clientAudit.color}`);
  assert(clientAudit.hasBtn, 'Client directory action button must exist');
  assert(clientAudit.hasSvg, 'Client directory action button must have an SVG icon');
  assert(clientAudit.text === '', `Client directory action button must be icon-only with zero text, got "${clientAudit.text}"`);
  await page.screenshot({ path: path.join(artifactDir, 'action_buttons_clients.png') });
  console.log('  ✓ Saved screenshot: action_buttons_clients.png');

  // 5. FINANCE TAX INVOICES
  console.log('\n=== 5. FINANCE TAX INVOICES (/finance/invoices) ===');
  await page.goto(`${BASE_URL}/finance/invoices`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.table, .fi-table');

  const financeAudit = await page.evaluate(() => {
    const rows = document.querySelectorAll('tbody tr');
    if (!rows.length) return { rowCount: 0 };
    const firstRow = rows[0];
    const actionCell = firstRow.querySelector('td:last-child');
    const btn = actionCell ? actionCell.querySelector('button') : null;

    return {
      rowCount: rows.length,
      hasBtn: !!btn,
      title: btn ? btn.getAttribute('title') || btn.getAttribute('aria-label') : '',
      text: btn ? btn.textContent.trim() : '',
      hasSvg: btn ? !!btn.querySelector('svg') : false,
      width: btn ? Math.round(btn.getBoundingClientRect().width) : 0,
      height: btn ? Math.round(btn.getBoundingClientRect().height) : 0
    };
  });

  console.log(`  ✓ Finance rows: ${financeAudit.rowCount}, button: title="${financeAudit.title}", text="${financeAudit.text}", hasSvg=${financeAudit.hasSvg}`);
  assert(financeAudit.hasBtn, 'Finance invoice action button must exist');
  assert(financeAudit.hasSvg, 'Finance invoice action button must have an SVG icon');
  assert(financeAudit.text === '', `Finance invoice action button must be icon-only, got "${financeAudit.text}"`);
  await page.screenshot({ path: path.join(artifactDir, 'action_buttons_finance.png') });
  console.log('  ✓ Saved screenshot: action_buttons_finance.png');

  await browser.close();
  console.log('\n========================================================');
  console.log('ALL GLOBAL ACTION BUTTONS AUDITS PASSED (100%)');
  console.log('========================================================\n');
}

run().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});

