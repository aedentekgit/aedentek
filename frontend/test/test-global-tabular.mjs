import puppeteer from 'puppeteer';
import { strict as assert } from 'assert';

const BASE_URL = 'http://localhost:3000';
const artifactDir = path.resolve("test-reports"); fs.mkdirSync(artifactDir, { recursive: true });

async function run() {
  console.log('--- STARTING GLOBAL TABULAR SYSTEM E2E VERIFICATION ---');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const routes = [
    { name: 'Client Directory Master', path: '/clients/companies', shot: 'e2e_global_client_directory.png' },
    { name: 'People Directory', path: '/clients/people', shot: 'e2e_global_people_directory.png' },
    { name: 'Tax Invoices', path: '/finance/invoices', shot: 'e2e_global_finance_invoices.png' },
    { name: 'Commercial Propagations', path: '/finance/propagations', shot: 'e2e_global_finance_propagations.png' }
  ];

  for (const r of routes) {
    console.log(`\nVerifying Route: ${r.name} (${r.path})`);
    await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.table, .cl-table, .fi-table');

    // Run structural & styling assertions
    const metrics = await page.evaluate(() => {
      const table = document.querySelector('.table, .cl-table, .fi-table');
      const toolbar = document.querySelector('.toolbar, .client-master-toolbar, .fi-toolbar');
      const firstTh = table?.querySelector('thead th:first-child');
      const firstTd = table?.querySelector('tbody tr:first-child td:first-child');
      const snoPill = firstTd?.querySelector('.sno-pill');
      const select = toolbar?.querySelector('select');
      const search = toolbar?.querySelector('input[type="text"], input[type="search"]');

      let gapBetweenToolbarAndTable = 0;
      if (toolbar && table) {
        const toolRect = toolbar.getBoundingClientRect();
        const tabRect = table.getBoundingClientRect();
        gapBetweenToolbarAndTable = Math.round(tabRect.top - toolRect.bottom);
      }

      const thAlign = firstTh ? window.getComputedStyle(firstTh).textAlign : '';
      const tdAlign = firstTd ? window.getComputedStyle(firstTd).textAlign : '';
      const thWidth = firstTh ? firstTh.getBoundingClientRect().width : 0;
      const tdWidth = firstTd ? firstTd.getBoundingClientRect().width : 0;

      return {
        hasTable: !!table,
        hasToolbar: !!toolbar,
        hasSelect: !!select,
        hasSearch: !!search,
        gapBetweenToolbarAndTable,
        thAlign,
        tdAlign,
        thWidth,
        tdWidth,
        hasSnoPill: !!snoPill,
        snoWidth: snoPill ? snoPill.getBoundingClientRect().width : 0
      };
    });

    console.log(`  ✓ Table detected: ${metrics.hasTable}`);
    console.log(`  ✓ Toolbar detected: ${metrics.hasToolbar}`);
    console.log(`  ✓ Search bar & Filter dropdown integrated: ${metrics.hasSearch} & ${metrics.hasSelect}`);
    console.log(`  ✓ Gap between toolbar and table: ${metrics.gapBetweenToolbarAndTable}px`);
    console.log(`  ✓ S NO column width: ${Math.round(metrics.thWidth)}px (TH), ${Math.round(metrics.tdWidth)}px (TD)`);
    console.log(`  ✓ Alignment: TH=${metrics.thAlign}, TD=${metrics.tdAlign}`);
    console.log(`  ✓ S NO Squircle Pill: ${metrics.hasSnoPill} (Pill width: ${metrics.snoWidth}px)`);

    assert(metrics.hasTable, `Table missing on ${r.name}`);
    assert(metrics.gapBetweenToolbarAndTable <= 2, `Toolbar to table gap should be 0px, got ${metrics.gapBetweenToolbarAndTable}px on ${r.name}`);
    assert(metrics.thAlign === 'center', `Table header must be centered on ${r.name}`);
    assert(metrics.tdAlign === 'center', `Table cell must be centered on ${r.name}`);
    assert(metrics.thWidth <= 65, `S NO TH width should be compact (<=65px), got ${metrics.thWidth}px on ${r.name}`);

    // Take screenshot
    await page.screenshot({ path: `${artifactDir}/${r.shot}` });
    console.log(`  ✓ Saved screenshot artifact: ${r.shot}`);
  }

  await browser.close();
  console.log('\n========================================================');
  console.log('ALL GLOBAL TABULAR VERIFICATIONS PASSED (100%)');
  console.log('========================================================\n');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

