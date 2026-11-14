import puppeteer from 'puppeteer';
import path from 'path';

const artifactDir = path.resolve("test-reports"); fs.mkdirSync(artifactDir, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });
  await page.goto('http://localhost:3000/finance/templates', { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-spec-page="templates"]', { timeout: 9000 });

  // 1. Classic Corporate
  await page.evaluate(() => {
    const c = document.querySelector('[data-template-card="classic"]');
    if (c) c.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'preview_1_classic_corporate.png') });

  // 2. Retail Light
  await page.evaluate(() => {
    const c = document.querySelector('[data-template-card="retail"]');
    if (c) c.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'preview_2_retail_light.png') });

  // 3. Settlement Fintech
  await page.evaluate(() => {
    const c = document.querySelector('[data-template-card="fintech"]');
    if (c) c.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'preview_3_settlement_fintech.png') });

  // Re-select classic corporate as default
  await page.evaluate(() => {
    const c = document.querySelector('[data-template-card="classic"]');
    if (c) c.click();
    localStorage.setItem('tessly:templateDefault', JSON.stringify({ kind: 'invoice', selected: 'classic' }));
  });
  await new Promise(r => setTimeout(r, 400));

  await browser.close();
  console.log('Successfully captured previews for all 3 templates');
})();

