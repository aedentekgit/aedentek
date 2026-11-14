import puppeteer from 'puppeteer';
import path from 'path';

const artifactDir = path.resolve("test-reports"); fs.mkdirSync(artifactDir, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });
  await page.goto('http://localhost:3000/finance/templates', { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-spec-page="templates"]', { timeout: 9000 });
  
  // Select Classic Corporate
  await page.evaluate(() => {
    const c = document.querySelector('[data-template-card="classic"]');
    if (c) c.click();
    localStorage.setItem('tessly:templateDefault', JSON.stringify({ kind: 'invoice', selected: 'classic' }));
  });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: path.join(artifactDir, 'classic_corporate_exact_full.png'), fullPage: false });
  
  // Also screenshot the sheet element itself
  const sheet = await page.$('[data-spec-sheet]');
  if (sheet) {
    await sheet.screenshot({ path: path.join(artifactDir, 'classic_corporate_sheet_exact.png') });
  }

  await browser.close();
  console.log('Screenshots saved successfully');
})();
