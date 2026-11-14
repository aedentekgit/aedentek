import puppeteer from 'puppeteer';
import path from 'path';

const artifactDir = path.resolve("test-reports"); fs.mkdirSync(artifactDir, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1250, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000/finance/templates', { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-spec-page="templates"]', { timeout: 9000 });

  // Select retail card
  await page.evaluate(() => {
    const c = document.querySelector('[data-template-card="retail"]');
    if (c) c.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Switch to Quotation
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const qBtn = btns.find(b => b.textContent.includes('Quotation'));
    if (qBtn) qBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Capture full page
  await page.screenshot({ path: path.join(artifactDir, 'template_2_quotation_full_page.png') });

  // Capture sheet element
  const sheet = await page.$('[data-spec-sheet]');
  if (sheet) {
    await sheet.screenshot({ path: path.join(artifactDir, 'template_2_quotation_sheet.png') });
  }

  // Switch back to Invoice
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const invBtn = btns.find(b => b.textContent.includes('Invoice'));
    if (invBtn) invBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));
  const sheetInv = await page.$('[data-spec-sheet]');
  if (sheetInv) {
    await sheetInv.screenshot({ path: path.join(artifactDir, 'template_2_invoice_sheet.png') });
  }

  await browser.close();
  console.log('Quotation & Invoice Template 2 screenshots captured successfully.');
})();

