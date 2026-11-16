import puppeteer from 'puppeteer';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const BASE_URL = 'http://localhost:1234';

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await sleep(800);

  if (await page.$('.lg-dev__item')) {
    await page.click('.lg-dev__item');
    await sleep(300);
    await page.click('.lg-submit');
    await sleep(1500);
  }

  console.log('Current URL after login:', page.url());
  console.log('Navigating to /calendar...');
  await page.evaluate(() => window.__navigate && window.__navigate('/calendar'));
  await page.waitForSelector('.ca-wrap', { timeout: 9000 });
  await sleep(1000);

  const calData = await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('.ca-chip'));
    const moreBtns = Array.from(document.querySelectorAll('.ca-more'));
    const caCells = Array.from(document.querySelectorAll('.ca-cell'));
    const allTlActs = Array.from(document.querySelectorAll('.tl-act'));
    const tlActsInCalendar = allTlActs.filter(el => el.closest('.ca-wrap') || el.className.includes('ca-'));

    return {
      chipsCount: chips.length,
      moreBtnsCount: moreBtns.length,
      tlActsTotalCount: allTlActs.length,
      tlActsInCalendarCount: tlActsInCalendar.length,
      tlActsInCalendar: tlActsInCalendar.map(el => ({
        tag: el.tagName,
        className: el.className,
        dataset: Object.assign({}, el.dataset),
        title: el.getAttribute('title'),
        aria: el.getAttribute('aria-label'),
        rect: {
          w: Math.round(el.getBoundingClientRect().width),
          h: Math.round(el.getBoundingClientRect().height)
        }
      })),
      chipsSamples: chips.slice(0, 10).map(c => ({
        tag: c.tagName,
        className: c.className,
        text: c.textContent.trim(),
        isTlAct: c.classList.contains('tl-act'),
        dataset: Object.assign({}, c.dataset),
        rect: {
          w: Math.round(c.getBoundingClientRect().width),
          h: Math.round(c.getBoundingClientRect().height)
        }
      })),
      moreSamples: moreBtns.map(m => ({
        tag: m.tagName,
        className: m.className,
        text: m.textContent.trim(),
        isTlAct: m.classList.contains('tl-act'),
        rect: {
          w: Math.round(m.getBoundingClientRect().width),
          h: Math.round(m.getBoundingClientRect().height)
        }
      }))
    };
  });

  console.log('Calendar inspection result:');
  console.log(JSON.stringify(calData, null, 2));

  await page.screenshot({ path: 'test-reports/calendar_page_inspected.png' });
  await browser.close();
}

run().catch(console.error);
