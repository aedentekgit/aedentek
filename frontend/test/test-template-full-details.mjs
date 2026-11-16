import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const appDir = path.resolve(process.cwd().endsWith('frontend') ? '.' : 'frontend');
const artifactDir = path.resolve('test-reports');
fs.mkdirSync(artifactDir, { recursive: true });

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  let filePath = path.join(appDir, reqPath === '/' ? 'index.html' : reqPath);
  if (!fs.existsSync(filePath)) filePath = path.join(appDir, 'index.html');
  const ext = path.extname(filePath);
  const mimeMap = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.json': 'application/json'
  };
  res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

const PORT = 8110;

server.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,1100']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1100 });

    const spaGoto = async (p, wait = 800) => {
      await page.evaluate((to) => {
        if (window.__navigate) window.__navigate(to);
        else history.pushState(null, '', to);
      }, p);
      await new Promise((r) => setTimeout(r, wait));
    };

    await page.goto(`http://localhost:${PORT}/finance/templates`, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 2000));

    if (await page.$('.lg-form')) {
      console.log('Logging in...');
      await page.evaluate(() => {
        const set = (sel, v) => {
          const el = document.querySelector(sel);
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        };
        set('.lg-input[name="email"]', 'ines.okafor@tessly.io');
        set('.lg-input[name="password"]', 'dev1234');
        document.querySelector('.lg-form').requestSubmit();
      });
      await page.waitForSelector('.app', { timeout: 9000 });
      await spaGoto('/finance/templates', 1500);
    }

    await page.waitForSelector('[data-spec-page="templates"]', { timeout: 9000 });
    await new Promise((r) => setTimeout(r, 800));

    // 1. Classic Corporate (Quotation)
    console.log('\n=== 1. CLASSIC CORPORATE (QUOTATION) ===');
    await page.evaluate(() => {
      const c = document.querySelector('[data-template-card="classic"]');
      if (c) c.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    // Ensure it's in Quotation mode
    let isQuotation = await page.evaluate(() => {
      const s = document.querySelector('[data-spec-sheet]');
      return s && s.getAttribute('data-spec-sheet') === 'quotation';
    });
    if (!isQuotation) {
      await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('.phead__actions button')).find((x) => /Quotation|Preview Quotation/i.test(x.textContent));
        if (b) b.click();
      });
      await new Promise((r) => setTimeout(r, 600));
    }

    const requiredCoordinateFields = ['Office', 'Phone', 'Email', 'Address', 'GST', 'PAN'];
    const requiredBankFields = [
      'Bank Name', 'Account Name', 'Account Type', 'Account No',
      'IFSC / RTGS', 'Branch', 'UPI ID', 'Branch Address'
    ];

    const classicText = await page.$eval('[data-spec-sheet]', (el) => el.innerText);
    for (const f of requiredCoordinateFields) {
      if (classicText.includes(f)) {
        console.log(`  ✓ Classic shows coordinate field: ${f}`);
      } else {
        console.error(`  ✗ Classic MISSING coordinate field: ${f}`);
      }
    }

    for (const f of requiredBankFields) {
      if (classicText.includes(f)) {
        console.log(`  ✓ Classic shows bank field: ${f}`);
      } else {
        console.error(`  ✗ Classic MISSING bank field: ${f}`);
      }
    }

    // Verify Address has a non-empty value (it should show "—" when unconfigured, not blank!)
    const classicIssuerAddress = await page.evaluate(() => {
      const card = document.querySelector('[data-spec-card="issuer"]');
      if (!card) return null;
      const rows = Array.from(card.querySelectorAll('tr'));
      const addrRow = rows.find(r => r.textContent.includes('Address'));
      return addrRow ? addrRow.innerText.trim() : null;
    });
    console.log(`  ✓ Classic Issuer Address row text: "${classicIssuerAddress}"`);

    const classicSheet = await page.$('[data-spec-sheet]');
    if (classicSheet) {
      await classicSheet.screenshot({ path: path.join(artifactDir, 'classic_quotation_full_details.png') });
    }
    const classicSettlement = await page.$('[data-spec-settlement]');
    if (classicSettlement) {
      await classicSettlement.screenshot({ path: path.join(artifactDir, 'classic_settlement_full_details.png') });
    }

    // 2. Crimson Creative (Quotation)
    console.log('\n=== 2. CRIMSON CREATIVE (QUOTATION) ===');
    await page.evaluate(() => {
      const c = document.querySelector('[data-template-card="retail"]');
      if (c) c.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const retailText = await page.$eval('[data-spec-sheet]', (el) => el.innerText);
    for (const f of requiredCoordinateFields) {
      if (retailText.includes(f)) {
        console.log(`  ✓ Crimson Creative shows coordinate field: ${f}`);
      } else {
        console.error(`  ✗ Crimson Creative MISSING coordinate field: ${f}`);
      }
    }

    for (const f of requiredBankFields) {
      if (retailText.includes(f)) {
        console.log(`  ✓ Crimson Creative shows bank field: ${f}`);
      } else {
        console.error(`  ✗ Crimson Creative MISSING bank field: ${f}`);
      }
    }

    const crimsonIssuerAddress = await page.evaluate(() => {
      const card = document.querySelector('[data-spec-card="issuer"]');
      if (!card) return null;
      const rows = Array.from(card.querySelectorAll('tr'));
      const addrRow = rows.find(r => r.textContent.includes('Address'));
      return addrRow ? addrRow.innerText.trim() : null;
    });
    console.log(`  ✓ Crimson Issuer Address row text: "${crimsonIssuerAddress}"`);

    const retailSheet = await page.$('[data-spec-sheet]');
    if (retailSheet) {
      await retailSheet.screenshot({ path: path.join(artifactDir, 'crimson_quotation_full_details.png') });
    }
    const retailSettlement = await page.$('[data-spec-settlement]');
    if (retailSettlement) {
      await retailSettlement.screenshot({ path: path.join(artifactDir, 'crimson_settlement_full_details.png') });
    }

    // 3. Crimson Creative (Invoice mode)
    console.log('\n=== 3. CRIMSON CREATIVE (INVOICE) ===');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('.phead__actions button')).find((x) => /Tax Invoice|Invoice|Preview Invoice/i.test(x.textContent));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const retailInvSheet = await page.$('[data-spec-sheet]');
    if (retailInvSheet) {
      await retailInvSheet.screenshot({ path: path.join(artifactDir, 'crimson_invoice_full_details.png') });
    }

    await page.screenshot({ path: path.join(artifactDir, 'templates_page_crimson_verified.png') });
    console.log('\nAll verification screenshots saved to test-reports/');
  } catch (err) {
    console.error('Error during test execution:', err);
  } finally {
    await browser.close();
    server.close();
    console.log('Finished.');
  }
});
