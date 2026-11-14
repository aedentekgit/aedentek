// Commercial Propagations: Edit + Delete (UI + API validation) and the Agreement calculator look.
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.join(__dirname, '../test-reports/propagations');
fs.mkdirSync(OUT, { recursive: true });
const TAG = `ZZP${Date.now().toString().slice(-6)}`;
const results = []; const jsErrors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const api = async (m, u, b) => { const r = await fetch(BASE + u, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, body: await r.json() }; };

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('tessly:formMode', 'wizard'); } catch (e) {} });
  page.on('pageerror', (e) => jsErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404|Failed to load resource/.test(m.text())) jsErrors.push(m.text()); });
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const test = async (id, feature, name, fn) => {
    try { await fn(); results.push({ id, feature, name, status: 'PASS' }); console.log(`✓ [${id}] ${name}`); }
    catch (e) { results.push({ id, feature, name, status: 'FAIL', error: e.message }); console.log(`✗ [${id}] ${name}\n    ${e.message}`); try { await shot('FAIL-' + id); } catch {} }
  };
  const ok = (c, m) => { if (!c) throw new Error(m); };
  const setVal = async (sel, v) => {
    await page.waitForSelector(sel, { timeout: 5000 });
    await page.evaluate((s, val) => { const el = document.querySelector(s); const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); }, sel, v);
  };
  const bodyText = () => page.evaluate(() => document.body.innerText);
  let pid; let pnum;

  try {
    const created = await api('POST', '/api/propagations', { clientName: `${TAG} Client`, title: `${TAG} Scope`, validUntil: '2027-01-31', status: 'Draft', items: [{ description: 'Discovery', rate: 1000, qty: 2 }] });
    pid = created.body.data._id; pnum = created.body.data.propagationNumber;

    // ---------------------------------------------------- API
    await test('PRP-01', 'Propagations API', 'PUT updates fields and recalculates subtotal / total from items', async () => {
      const r = await api('PUT', `/api/propagations/${pid}`, { title: `${TAG} Scope v2`, items: [{ description: 'Discovery', rate: 1000, qty: 2 }, { description: 'Build', rate: 5000, qty: 1 }] });
      ok(r.status === 200 && r.body.data.title === `${TAG} Scope v2` && r.body.data.subtotal === 7000 && r.body.data.total === 7000, JSON.stringify(r.body.data && [r.body.data.subtotal, r.body.data.total]));
    });
    await test('PRP-02', 'Propagations API', 'PUT validation: empty client/title and invalid status → 400; unknown id → 404; number is immutable', async () => {
      ok((await api('PUT', `/api/propagations/${pid}`, { clientName: ' ' })).status === 400, 'client');
      ok((await api('PUT', `/api/propagations/${pid}`, { title: '' })).status === 400, 'title');
      ok((await api('PUT', `/api/propagations/${pid}`, { status: 'Maybe' })).status === 400, 'status');
      ok((await api('PUT', '/api/propagations/000000000000000000000000', { title: 'x' })).status === 404, '404');
      const r = await api('PUT', `/api/propagations/${pid}`, { propagationNumber: 'HACK-1' });
      ok(r.body.data.propagationNumber === pnum, 'number changed');
    });

    // ---------------------------------------------------- UI
    await page.goto(BASE + '/finance/propagations', { waitUntil: 'networkidle0' }); await sleep(1500);
    await page.type('input[placeholder^="Search proposal"]', TAG); await sleep(1200);
    await test('PRP-03', 'Propagations UI', 'each row has Preview, Edit and Delete buttons; total and issue date are shown correctly', async () => {
      const row = await page.evaluate((n) => { const r = [...document.querySelectorAll('tbody tr')].find((x) => x.textContent.includes(n)); return r ? { btns: [...r.querySelectorAll('.action-btn')].map((b) => b.getAttribute('title')), text: r.innerText.replace(/\n/g, ' ') } : null; }, pnum);
      ok(row, 'row not found');
      ok(row.btns.join() === 'Preview Commercial Proposal,Edit Commercial Proposal,Delete Commercial Proposal', row.btns.join());
      ok(/7,000/.test(row.text) && !/T00:00/.test(row.text), row.text);
      await shot('01-propagation-row');
    });
    await test('PRP-04', 'Propagations UI', 'Edit opens a prefilled drawer (client, scope, validity, items, status)', async () => {
      await page.evaluate((n) => [...document.querySelectorAll('tbody tr')].find((x) => x.textContent.includes(n)).querySelector('button[title="Edit Commercial Proposal"]').click(), pnum); await sleep(700);
      ok(/Edit PRP-/.test(await bodyText()), 'drawer title');
      const vals = await page.$$eval('.drawer input.input, [role="dialog"] input.input, .modal input.input', (i) => i.map((x) => x.value));
      ok(vals.includes(`${TAG} Client`) && vals.includes(`${TAG} Scope v2`) && vals.includes('2027-01-31') && vals.includes('Discovery') && vals.includes('Build'), vals.join('|'));
      ok((await page.$eval('#prop-status', (e) => e.value)) === 'Draft', 'status');
      await shot('02-propagation-edit');
    });
    await test('PRP-05', 'Propagations UI', 'saving the edit updates the proposal (title, item added, status → Sent) and the table refreshes', async () => {
      await page.evaluate((t) => { const el = [...document.querySelectorAll('input.input')].find((i) => i.value === t); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, t + ' EDITED'); el.dispatchEvent(new Event('input', { bubbles: true })); }, `${TAG} Scope v2`);
      await setVal('#prop-status', 'Sent'); await sleep(200);
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Save Changes/.test(x.textContent)); b.click(); }); await sleep(1500);
      const d = (await api('GET', `/api/propagations/${pid}`)).body.data;
      ok(d.title === `${TAG} Scope v2 EDITED` && d.status === 'Sent' && d.items.length === 2, JSON.stringify([d.title, d.status, d.items.length]));
      ok((await bodyText()).includes('v2 EDITED'), 'table not refreshed');
    });
    await test('PRP-06', 'Propagations UI', 'edit validation: empty client name is rejected with a message', async () => {
      await page.evaluate((n) => [...document.querySelectorAll('tbody tr')].find((x) => x.textContent.includes(n)).querySelector('button[title="Edit Commercial Proposal"]').click(), pnum); await sleep(700);
      await page.evaluate((t) => { const el = [...document.querySelectorAll('input.input')].find((i) => i.value === t); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ''); el.dispatchEvent(new Event('input', { bubbles: true })); }, `${TAG} Client`);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Save Changes/.test(x.textContent)).click()); await sleep(500);
      ok(/client entity name/i.test(await bodyText()), 'no validation toast');
      await page.evaluate(() => [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Cancel').click()); await sleep(400);
    });
    await test('PRP-07', 'Propagations UI', 'Delete asks for confirmation: Cancel keeps the proposal, Confirm removes it', async () => {
      const del = () => page.evaluate((n) => [...document.querySelectorAll('tbody tr')].find((x) => x.textContent.includes(n)).querySelector('button[title="Delete Commercial Proposal"]').click(), pnum);
      await del(); await sleep(600);
      ok(/Delete PRP-/.test(await bodyText()), 'confirm dialog');
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^Cancel$/.test(x.textContent.trim())); b.click(); }); await sleep(600);
      ok((await api('GET', `/api/propagations/${pid}`)).status === 200, 'deleted despite cancel');
      await del(); await sleep(600);
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^Delete$/.test(x.textContent.trim())); b.click(); }); await sleep(1500);
      ok((await api('GET', `/api/propagations/${pid}`)).status === 404, 'not deleted');
      ok(!(await page.evaluate((n) => [...document.querySelectorAll('tbody tr')].some((x) => x.textContent.includes(n)), pnum)), 'row still visible');
      pid = null;
    });

    // ---------------------------------------------------- Agreement calculator look
    await page.goto(BASE + '/clients/new', { waitUntil: 'networkidle0' }); await sleep(1200);
    await page.click('#wz-demo'); await sleep(400); await page.click('#wz-next'); await sleep(900);
    await test('AG-01', 'Agreement calculator', 'five equal stat tiles in one row + a labelled progress card (no stray background band)', async () => {
      const info = await page.evaluate(() => {
        const g = document.querySelector('.ag-calc__grid');
        const cells = [...g.children].map((c) => { const r = c.getBoundingClientRect(); return { top: Math.round(r.top), w: Math.round(r.width), bg: getComputedStyle(c).backgroundColor, radius: getComputedStyle(c).borderTopLeftRadius }; });
        return { cols: getComputedStyle(g).gridTemplateColumns.split(' ').length, cells, gridBg: getComputedStyle(g).backgroundColor, cap: document.querySelector('.ag-calc__bar-cap')?.innerText.replace(/\n/g, ' ') };
      });
      ok(info.cols === 5 && info.cells.length === 5, JSON.stringify(info));
      ok(new Set(info.cells.map((c) => c.top)).size === 1 && new Set(info.cells.map((c) => c.w)).size === 1, 'tiles aligned: ' + JSON.stringify(info.cells));
      ok(info.gridBg === 'rgba(0, 0, 0, 0)', 'grid background ' + info.gridBg);
      ok(/Agreement progress\s*\d+% elapsed/.test(info.cap), info.cap);
      await shot('03-agreement-calc');
    });
    await test('GEN-01', 'Console health', 'no JavaScript errors were raised during the run', async () => { ok(jsErrors.length === 0, jsErrors.slice(0, 3).join(' | ')); });
  } catch (fatal) {
    console.log('FATAL:', fatal.message); results.push({ id: 'FATAL', feature: 'Harness', name: 'run aborted', status: 'FAIL', error: fatal.message });
  } finally {
    try { if (pid) await api('DELETE', `/api/propagations/${pid}`); } catch (e) {}
    await browser.close();
    const failed = results.filter((r) => r.status === 'FAIL');
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ ranAt: new Date().toISOString(), total: results.length, passed: results.length - failed.length, failed: failed.length, results }, null, 2));
    console.log(`\n${results.length - failed.length}/${results.length} UI tests passed`);
    process.exit(failed.length ? 1 : 0);
  }
})();
