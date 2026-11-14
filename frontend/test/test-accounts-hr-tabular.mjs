import puppeteer from 'puppeteer';
import { strict as assert } from 'assert';

const BASE_URL = 'http://localhost:3000';
const artifactDir = path.resolve("test-reports"); fs.mkdirSync(artifactDir, { recursive: true });

async function run() {
  console.log('--- VERIFYING ACCOUNTS & HR GLOBAL TABULAR THEME ---');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const routes = [
    { name: 'Accounts Expenses', path: '/accounts/expenses', shot: 'e2e_accounts_expenses_global.png' },
    { name: 'Accounts Inward', path: '/accounts/sales', shot: 'e2e_accounts_sales_global.png' },
    { name: 'HR Employees Roster', path: '/hr/staff', shot: 'e2e_hr_staff_global.png' },
    { name: 'HR Attendance Ledger', path: '/hr/attendance', shot: 'e2e_hr_attendance_global.png' }
  ];

  for (const r of routes) {
    console.log(`\nTesting Route: ${r.name} (${r.path})`);
    await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.table, .table--stack');

    const metrics = await page.evaluate(() => {
      const table = document.querySelector('.table');
      const card = table?.closest('.card');
      const cardHead = card?.querySelector('.card__head');
      const cardHeadVisible = cardHead && window.getComputedStyle(cardHead).display !== 'none';
      const toolbar = card?.querySelector('.toolbar, .acct-toolbar, .hr-toolbar');
      const firstTh = table?.querySelector('thead th:first-child');
      const firstTd = table?.querySelector('tbody tr:first-child td:first-child');
      const snoPill = firstTd?.querySelector('.sno-pill');

      let gapBetweenToolbarAndTable = 0;
      if (toolbar && table) {
        const toolRect = toolbar.getBoundingClientRect();
        const tabRect = table.getBoundingClientRect();
        gapBetweenToolbarAndTable = Math.round(tabRect.top - toolRect.bottom);
      }

      const thText = firstTh?.textContent.trim();
      const thWidth = firstTh ? firstTh.getBoundingClientRect().width : 0;
      const tdWidth = firstTd ? firstTd.getBoundingClientRect().width : 0;
      const thAlign = firstTh ? window.getComputedStyle(firstTh).textAlign : '';
      const tdAlign = firstTd ? window.getComputedStyle(firstTd).textAlign : '';

      return {
        hasTable: !!table,
        hasToolbar: !!toolbar,
        cardHeadHidden: !cardHeadVisible,
        firstThText: thText,
        thWidth: Math.round(thWidth),
        tdWidth: Math.round(tdWidth),
        thAlign,
        tdAlign,
        hasSnoPill: !!snoPill,
        gapBetweenToolbarAndTable
      };
    });

    console.log(`  ✓ Table detected: ${metrics.hasTable}`);
    console.log(`  ✓ Toolbar detected: ${metrics.hasToolbar}`);
    console.log(`  ✓ Redundant card header hidden: ${metrics.cardHeadHidden}`);
    console.log(`  ✓ First TH text: "${metrics.firstThText}" (Width: ${metrics.thWidth}px)`);
    console.log(`  ✓ First TD S NO Pill: ${metrics.hasSnoPill} (Width: ${metrics.tdWidth}px)`);
    console.log(`  ✓ Alignment: TH=${metrics.thAlign}, TD=${metrics.tdAlign}`);
    console.log(`  ✓ Gap between toolbar and table: ${metrics.gapBetweenToolbarAndTable}px`);

    assert(metrics.hasTable, `Table missing on ${r.name}`);
    assert(metrics.cardHeadHidden, `Redundant card header should be hidden on ${r.name}`);
    assert(metrics.firstThText === 'S NO' || metrics.firstThText === 'S No', `First TH must be S No, got "${metrics.firstThText}" on ${r.name}`);
    assert(metrics.hasSnoPill, `First TD must contain .sno-pill squircle badge on ${r.name}`);
    assert(metrics.thWidth <= 65, `S NO TH width must be <= 65px, got ${metrics.thWidth}px on ${r.name}`);
    assert(metrics.gapBetweenToolbarAndTable <= 2, `Toolbar to table gap must be 0px, got ${metrics.gapBetweenToolbarAndTable}px on ${r.name}`);
    assert(metrics.thAlign === 'center', `Table header must be centered on ${r.name}`);
    assert(metrics.tdAlign === 'center', `Table cell must be centered on ${r.name}`);

    await page.screenshot({ path: `${artifactDir}/${r.shot}` });
    console.log(`  ✓ Screenshot saved: ${r.shot}`);
  }

  await browser.close();
  console.log('\n========================================================');
  console.log('ALL ACCOUNTS & HR TABULAR VERIFICATIONS PASSED (100%)');
  console.log('========================================================\n');
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

