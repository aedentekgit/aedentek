import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:1234';
const OUT = path.resolve('test-reports');
fs.mkdirSync(OUT, { recursive: true });

async function run() {
  console.log('===============================================================');
  console.log('INBOX FIXED VIEWPORT (NO OUTER SCROLLING) TEST SUITE');
  console.log('===============================================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

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

    // STEP 2: Navigate to /inbox
    console.log(`[STEP 2] Navigating to ${BASE_URL}/inbox at 1440x900...`);
    await page.goto(`${BASE_URL}/inbox`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));

    // Wait for inbox elements to render
    await page.waitForSelector('.page.ib', { timeout: 5000 });
    await page.waitForSelector('.ib-grid', { timeout: 5000 });
    await page.waitForSelector('.ib-threads', { timeout: 5000 });
    await page.waitForSelector('.ib-conv', { timeout: 5000 });
    await page.waitForSelector('.ib-compose', { timeout: 5000 });

    // STEP 3: Validate No Outer Scroll at 1440x900
    console.log('[STEP 3] Validating outer window scrolling is locked (height = 900px)...');
    const scrollMetrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const winH = window.innerHeight;
      const winW = window.innerWidth;
      const scrollH = Math.max(doc.scrollHeight, body.scrollHeight);
      const scrollYBefore = window.scrollY;

      // Attempt to scroll window
      window.scrollTo(0, 500);
      const scrollYAfter = window.scrollY;

      // Layout elements
      const app = document.querySelector('.app');
      const side = document.querySelector('.side');
      const main = document.querySelector('.main');
      const ibPage = document.querySelector('.page.ib');
      const ibGrid = document.querySelector('.ib-grid');
      const ibThreads = document.querySelector('.ib-threads');
      const ibMsgs = document.querySelector('.ib-msgs');
      const ibCompose = document.querySelector('.ib-compose');

      const sideRect = side ? side.getBoundingClientRect() : null;
      const gridRect = ibGrid ? ibGrid.getBoundingClientRect() : null;
      const composeRect = ibCompose ? ibCompose.getBoundingClientRect() : null;

      const threadsComputed = ibThreads ? window.getComputedStyle(ibThreads) : null;
      const msgsComputed = ibMsgs ? window.getComputedStyle(ibMsgs) : null;
      const gridComputed = ibGrid ? window.getComputedStyle(ibGrid) : null;

      return {
        winH,
        winW,
        scrollH,
        scrollYBefore,
        scrollYAfter,
        canScrollWindow: scrollH > winH + 2 || scrollYAfter > 0,
        sideRect: sideRect ? { top: sideRect.top, bottom: sideRect.bottom, height: sideRect.height } : null,
        gridRect: gridRect ? { top: gridRect.top, bottom: gridRect.bottom, height: gridRect.height } : null,
        composeRect: composeRect ? { top: composeRect.top, bottom: composeRect.bottom, height: composeRect.height } : null,
        threadsOverflowY: threadsComputed ? threadsComputed.overflowY : null,
        msgsOverflowY: msgsComputed ? msgsComputed.overflowY : null,
        gridHeight: gridComputed ? gridComputed.height : null
      };
    });

    console.log('Scroll Metrics (1440x900):', {
      windowHeight: scrollMetrics.winH,
      documentScrollHeight: scrollMetrics.scrollH,
      scrollYBefore: scrollMetrics.scrollYBefore,
      scrollYAfterAttempt: scrollMetrics.scrollYAfter,
      canScrollWindow: scrollMetrics.canScrollWindow
    });

    console.log('Layout Alignment (1440x900):', {
      sideBottom: scrollMetrics.sideRect?.bottom,
      gridBottom: scrollMetrics.gridRect?.bottom,
      composeBottom: scrollMetrics.composeRect?.bottom
    });

    // Assertions for 1440x900
    assert.equal(scrollMetrics.scrollYBefore, 0, 'Initial scrollY must be 0');
    assert.equal(scrollMetrics.scrollYAfter, 0, 'Window scroll must not move when scrolled');
    assert.ok(
      scrollMetrics.scrollH <= scrollMetrics.winH + 2,
      `Document scroll height (${scrollMetrics.scrollH}px) must not exceed viewport height (${scrollMetrics.winH}px)`
    );
    assert.equal(scrollMetrics.canScrollWindow, false, 'Outer window must NOT be scrollable');
    assert.ok(
      scrollMetrics.composeRect && scrollMetrics.composeRect.bottom <= scrollMetrics.winH,
      `Composer bottom (${scrollMetrics.composeRect?.bottom}px) must be inside viewport (${scrollMetrics.winH}px)`
    );
    assert.ok(
      scrollMetrics.threadsOverflowY === 'auto' || scrollMetrics.threadsOverflowY === 'scroll',
      'Thread list must have internal overflow-y: auto'
    );
    assert.ok(
      scrollMetrics.msgsOverflowY === 'auto' || scrollMetrics.msgsOverflowY === 'scroll',
      'Messages panel must have internal overflow-y: auto'
    );

    // Save screenshot for 1440x900
    const shot1440 = path.join(OUT, 'inbox_fixed_no_scroll.png');
    await page.screenshot({ path: shot1440, fullPage: false });
    console.log(`Saved screenshot: ${shot1440}`);

    // STEP 4: Test Internal Scrolling Inside Threads & Messages
    console.log('[STEP 4] Testing internal scrolling inside thread list and messages...');
    const internalScrollResult = await page.evaluate(() => {
      const threads = document.querySelector('.ib-threads');
      const msgs = document.querySelector('.ib-msgs');

      // Inject extra messages to verify inner scroll capability under overflow
      if (msgs) {
        for (let i = 0; i < 20; i++) {
          const div = document.createElement('div');
          div.className = 'ib-msg' + (i % 2 === 0 ? ' is-me' : '');
          div.innerHTML = `<p>Overflow test message ${i + 1}: Ensuring inner scroll works without window scrolling.</p><small>Just now</small>`;
          msgs.appendChild(div);
        }
      }

      let threadsScrollable = false;
      let msgsScrollable = false;

      if (threads) {
        threadsScrollable = threads.scrollHeight > threads.clientHeight;
      }

      if (msgs) {
        const origTop = msgs.scrollTop;
        msgs.scrollTop = 250;
        const scrolledTop = msgs.scrollTop;
        msgsScrollable = msgs.scrollHeight > msgs.clientHeight && scrolledTop > 0;
      }

      return {
        threadsScrollHeight: threads?.scrollHeight,
        threadsClientHeight: threads?.clientHeight,
        msgsScrollHeight: msgs?.scrollHeight,
        msgsClientHeight: msgs?.clientHeight,
        msgsScrollable,
        windowScrollYAfterInnerScroll: window.scrollY,
        docScrollHeight: document.documentElement.scrollHeight
      };
    });
    console.log('Internal scroll capacity under load:', internalScrollResult);
    assert.ok(internalScrollResult.msgsScrollable, 'Messages container must scroll internally when overflowing');
    assert.equal(internalScrollResult.windowScrollYAfterInnerScroll, 0, 'Window scroll must stay 0 during inner scrolling');
    assert.equal(internalScrollResult.docScrollHeight, 900, 'Document scroll height must remain exactly 900px');

    // STEP 5: Test Switching Threads & Interactive Composer
    console.log('[STEP 5] Testing thread selection and composer focus...');
    const threadItems = await page.$$('.ib-thread');
    if (threadItems.length > 1) {
      await threadItems[1].click();
      await new Promise((r) => setTimeout(r, 600));

      const activeAfterClick = await page.evaluate(() => {
        const active = document.querySelector('.ib-thread.is-on');
        const subj = document.querySelector('.ib-subject');
        const compose = document.querySelector('.ib-compose');
        const winH = window.innerHeight;
        const composeRect = compose ? compose.getBoundingClientRect() : null;
        return {
          hasActiveThread: !!active,
          subjectText: subj ? subj.textContent.trim() : null,
          composeVisible: composeRect ? composeRect.bottom <= winH : false,
          windowScrollY: window.scrollY
        };
      });
      console.log('State after clicking second thread:', activeAfterClick);
      assert.ok(activeAfterClick.hasActiveThread, 'Second thread should be active');
      assert.ok(activeAfterClick.composeVisible, 'Composer must stay visible within viewport');
      assert.equal(activeAfterClick.windowScrollY, 0, 'Window scroll must remain 0 after thread switch');
    }

    // STEP 6: Test Responsive Viewport (1200x800)
    console.log('[STEP 6] Testing smaller desktop viewport (1200x800)...');
    await page.setViewport({ width: 1200, height: 800 });
    await new Promise((r) => setTimeout(r, 600));

    const metrics800 = await page.evaluate(() => {
      window.scrollTo(0, 500);
      const doc = document.documentElement;
      const winH = window.innerHeight;
      const scrollH = doc.scrollHeight;
      const scrollY = window.scrollY;
      const compose = document.querySelector('.ib-compose');
      const composeRect = compose ? compose.getBoundingClientRect() : null;
      return {
        winH,
        scrollH,
        scrollY,
        isScrollLocked: scrollH <= winH + 2 && scrollY === 0,
        composeVisible: composeRect ? composeRect.bottom <= winH : false
      };
    });
    console.log('Metrics at 1200x800:', metrics800);
    assert.ok(metrics800.isScrollLocked, '1200x800 viewport must remain scroll-locked');
    assert.ok(metrics800.composeVisible, 'Composer must remain visible in 1200x800');

    const shot1200 = path.join(OUT, 'inbox_fixed_1200x800.png');
    await page.screenshot({ path: shot1200, fullPage: false });
    console.log(`Saved screenshot: ${shot1200}`);

    // STEP 7: Verify No Errors
    console.log('[STEP 7] Checking browser console errors...');
    const criticalErrors = pageErrors.filter((e) => !e.includes('favicon'));
    console.log('Critical Errors:', criticalErrors);
    assert.equal(criticalErrors.length, 0, `Expected 0 critical errors, found ${criticalErrors.length}`);

    console.log('\n===============================================================');
    console.log('ALL INBOX FIXED VIEWPORT TESTS PASSED SUCCESSFULLY! (100% GREEN)');
    console.log('===============================================================\n');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
