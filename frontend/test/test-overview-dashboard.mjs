import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const artifactDir = path.resolve("test-reports"); fs.mkdirSync(artifactDir, { recursive: true });

async function run() {
  console.log('--- TESTING ACCOUNTS OVERVIEW BENTO DASHBOARD ---');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // 1. Authenticate
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.setItem('aedentek_crm_token', 'mock-token');
    localStorage.setItem('aedentek_crm_user', JSON.stringify({ id: 'u1', name: 'Ines Okafor', role: 'Executive' }));
  });

  // 2. Navigate to /accounts/dashboard (Overview)
  await page.goto('http://localhost:3000/accounts/dashboard', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // 3. Verify Elements
  const audit = await page.evaluate(() => {
    const kpiCards = document.querySelectorAll('.acct-bento-kpis .kpi');
    const sparklines = document.querySelectorAll('.acct-bento-kpis .kpi__spark');
    const telemetryItems = document.querySelectorAll('.acct-telemetry-ribbon .acct-telemetry-item');
    const chartSvg = document.querySelector('.chart svg');
    const chartLines = document.querySelectorAll('.chart [data-line]');
    const chartAreas = document.querySelectorAll('.chart [data-area]');
    const docketRows = document.querySelectorAll('.acct-docket-row');
    const mixBars = document.querySelectorAll('.acct-mix-row');
    const donutHole = document.querySelector('.acct-donut__hole');
    const flowCols = document.querySelectorAll('.acct-flow-col');
    const headerActions = document.querySelectorAll('.phead__actions .btn');

    return {
      kpiCount: kpiCards.length,
      sparklineCount: sparklines.length,
      telemetryCount: telemetryItems.length,
      hasChart: !!chartSvg,
      chartLineCount: chartLines.length,
      chartAreaCount: chartAreas.length,
      docketRowCount: docketRows.length,
      mixBarCount: mixBars.length,
      hasDonutHole: !!donutHole,
      donutHoleText: donutHole ? donutHole.innerText.trim().replace(/\n/g, ' ') : null,
      flowColCount: flowCols.length,
      headerActionCount: headerActions.length,
      headerActionTexts: Array.from(headerActions).map(b => b.innerText.trim())
    };
  });

  console.log('Audit Results:', JSON.stringify(audit, null, 2));

  // Assertions
  if (audit.kpiCount !== 4) throw new Error(`Expected 4 executive KPI cards, got ${audit.kpiCount}`);
  if (audit.sparklineCount !== 4) throw new Error(`Expected 4 sparklines, got ${audit.sparklineCount}`);
  if (audit.telemetryCount !== 4) throw new Error(`Expected 4 telemetry ribbon items, got ${audit.telemetryCount}`);
  if (!audit.hasChart) throw new Error('LineAreaChart SVG was not rendered');
  if (audit.chartLineCount !== 2) throw new Error(`Expected 2 chart lines (Revenue, Spend), got ${audit.chartLineCount}`);
  if (audit.docketRowCount < 5) throw new Error(`Expected at least 5 docket rows, got ${audit.docketRowCount}`);
  if (audit.mixBarCount < 3) throw new Error(`Expected at least 3 mix bars, got ${audit.mixBarCount}`);
  if (audit.flowColCount !== 6) throw new Error(`Expected 6 flow columns, got ${audit.flowColCount}`);
  if (audit.headerActionCount !== 2) throw new Error(`Expected 2 header actions, got ${audit.headerActionCount}`);

  console.log('✓ All DOM and Chart element assertions passed!');

  // Desktop Screenshot (1440px)
  const desktopPath = path.join(artifactDir, 'overview_bento_desktop.png');
  await page.screenshot({ path: desktopPath, fullPage: false });
  console.log(`✓ Saved desktop screenshot: ${desktopPath}`);

  // Dark Mode Screenshot
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await new Promise(r => setTimeout(r, 600));
  const darkPath = path.join(artifactDir, 'overview_bento_dark.png');
  await page.screenshot({ path: darkPath, fullPage: false });
  console.log(`✓ Saved dark mode screenshot: ${darkPath}`);

  // Switch back to light mode for tablet & mobile
  await page.evaluate(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  // Tablet Screenshot (900px)
  await page.setViewport({ width: 900, height: 1100, deviceScaleFactor: 2 });
  await new Promise(r => setTimeout(r, 600));
  const tabletPath = path.join(artifactDir, 'overview_bento_tablet.png');
  await page.screenshot({ path: tabletPath, fullPage: false });
  console.log(`✓ Saved tablet screenshot: ${tabletPath}`);

  // Mobile Screenshot (420px)
  await page.setViewport({ width: 420, height: 1200, deviceScaleFactor: 2 });
  await new Promise(r => setTimeout(r, 600));
  const mobilePath = path.join(artifactDir, 'overview_bento_mobile.png');
  await page.screenshot({ path: mobilePath, fullPage: false });
  console.log(`✓ Saved mobile screenshot: ${mobilePath}`);

  await browser.close();
  console.log('--- ALL OVERVIEW TESTS PASSED SUCCESSFULLY! ---');
}

run().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});

