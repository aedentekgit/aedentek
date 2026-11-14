/**
 * SETTINGS PAGE — THEME-BASED UI/UX TEST
 * ------------------------------------------------------------------
 * Headless Chrome against the real backend. Verifies the container-wise Settings
 * (admin hub) page: Web Appearance split into Theme & Typography / Platform Identity /
 * Social Media containers, theme tokens, a real save round-trip, light/dark, mobile.
 *
 * Run: node test/test-settings-theme-ui.mjs   (backend must be running on :5001)
 */
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8101;
const API_TARGET = { host: 'localhost', port: 5001 };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const appDir = path.resolve(process.cwd().endsWith('frontend') ? '.' : 'frontend');
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const pr = http.request({ host: API_TARGET.host, port: API_TARGET.port, path: req.url, method: req.method, headers: req.headers }, (up) => { res.writeHead(up.statusCode, up.headers); up.pipe(res); });
    pr.on('error', () => { res.writeHead(502); res.end('{}'); });
    req.pipe(pr);
    return;
  }
  const reqPath = req.url.split('?')[0];
  let filePath = path.join(appDir, reqPath === '/' ? 'index.html' : reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = path.join(appDir, 'index.html');
  fs.readFile(filePath, (err, c) => { if (err) { res.writeHead(500); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' }); res.end(c); });
});

server.listen(PORT, async () => {
  console.log(`[TEST-SETTINGS-THEME-UI] Listening on http://localhost:${PORT}`);
  let passed = 0;
  let failed = 0;
  const assert = (c, m) => { if (c) { console.log(`  ✓ [PASS] ${m}`); passed++; } else { console.error(`  ✗ [FAIL] ${m}`); failed++; } };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const R = (fn, ...a) => page.evaluate(fn, ...a);
  const load = async (route = '/settings/theme') => {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.admin-hub .card form', { timeout: 15000 });
    await sleep(900);
  };
  const type = async (sel, text) => { await page.focus(sel); await R((x) => document.querySelector(x).select(), sel); await page.keyboard.press('Backspace'); if (text) await page.type(sel, text); await sleep(350); };
  const all0 = await (await fetch(`http://localhost:${API_TARGET.port}/api/settings`)).json();
  const original = { theme: all0.data.theme, general: all0.data.general };

  const probe = (v, prop = 'backgroundColor') => R((vv, pp) => { const d = document.createElement('span'); d.style[pp] = `var(${vv})`; document.body.appendChild(d); const c = getComputedStyle(d)[pp]; d.remove(); return c; }, v, prop);
  const setSelect = (i, v) => R((idx, val) => { const s = document.querySelectorAll('.admin-group select')[idx]; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, val); s.dispatchEvent(new Event('change', { bubbles: true })); }, i, v);

  console.log('=== 1. WEB APPEARANCE IS SPLIT INTO THEMED CONTAINERS ===');
  await load();
  const card = await probe('--card'); const line = await probe('--line', 'borderTopColor'); const line2 = await probe('--line-2', 'borderTopColor'); const card2 = await probe('--card-2'); const primary = await probe('--primary');
  const st = await R(() => {
    const groups = [...document.querySelectorAll('.admin-group')];
    const info = groups.map((g) => {
      const cs = getComputedStyle(g); const r = g.getBoundingClientRect();
      return { title: g.querySelector('.admin-group__title')?.innerText, desc: g.querySelector('.admin-group__desc')?.innerText, ico: !!g.querySelector('.admin-group__ico svg'), bg: cs.backgroundColor, border: cs.borderTopColor, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow !== 'none', top: r.top, bottom: r.bottom, left: r.left, right: r.right, labels: [...g.querySelectorAll('.field > span:first-child')].map((l) => l.innerText.trim()), toggles: [...g.querySelectorAll('.admin-toggle-row b')].map((b) => b.innerText), headBorder: getComputedStyle(g.querySelector('.admin-group__head')).borderBottomWidth };
    });
    const outer = document.querySelector('.admin-hub > .card');
    const o = getComputedStyle(outer);
    const bar = document.querySelector('.admin-hub .st-actions');
    const br = bar.getBoundingClientRect();
    return {
      info, outerBg: o.backgroundColor, outerBorder: o.borderTopWidth, outerShadow: o.boxShadow, heading: outer.querySelector('.card__title')?.innerText, badge: outer.querySelector('.chip')?.innerText,
      barBg: getComputedStyle(bar).backgroundColor, barBorder: getComputedStyle(bar).borderTopWidth, barRadius: getComputedStyle(bar).borderTopLeftRadius, barTop: br.top, barButtons: [...bar.querySelectorAll('button')].map((b) => b.innerText.trim()), barPos: getComputedStyle(bar).position,
      kpis: document.querySelectorAll('.admin-hub .kpis .kpi').length, tabs: document.querySelectorAll('nav.tabs .tab').length, gapVar: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gap')) || 16
    };
  });
  assert(st.info.length === 3 && st.info.map((g) => g.title).join('|') === 'Theme & Typography|Platform Identity|Social Media', `three containers: ${st.info.map((g) => g.title).join(' | ')}`);
  assert(st.info.every((g) => g.ico && g.desc && g.desc.length > 10), 'each container has an icon tile, a title and a description');
  assert(st.info.every((g) => g.bg === card && g.border === line && g.shadow && g.radius === '20px' && g.headBorder === '1px'), 'every container is a theme card: --card surface, --line border, card radius and shadow, divided header');
  assert(st.info.every((g, i, a) => i === 0 || (g.top > a[i - 1].bottom && Math.round(g.top - a[i - 1].bottom) === Math.round(st.gapVar) && Math.abs(g.left - a[0].left) < 1 && Math.abs(g.right - a[0].right) < 1)), `containers are separate, stacked, the same width, with the standard page gap (${st.gapVar}px) between them`);
  assert(st.info[0].labels.join('|') === 'PRIMARY THEME COLOR (HEX)|SECONDARY THEME COLOR (HEX)|THEME MODE|THEME TYPE|HEADER FONT FAMILY|PARAGRAPH FONT FAMILY' && /Public Theme Switcher/.test(st.info[0].toggles.join()), 'Theme & Typography holds the colours, mode, type, fonts and the public theme switcher');
  assert(st.info[1].labels[0] === 'PLATFORM SITE NAME' && st.info[1].labels.length === 9 && /Contact Form/.test(st.info[1].toggles.join()), `Platform Identity holds site name, contacts, currency, logo, store links and the contact-form toggle (${st.info[1].labels.length} fields)`);
  assert(st.info[2].labels.length === 6 && st.info[2].labels[0] === 'INSTAGRAM PROFILE URL' && st.info[2].labels[5] === 'YOUTUBE CHANNEL URL', 'Social Media holds the six channel URLs');
  assert(st.outerBg === 'rgba(0, 0, 0, 0)' && st.outerBorder === '0px' && st.outerShadow === 'none' && st.heading === 'Web Appearance' && /Module 1 of 10/.test(st.badge), 'the page heading row ("Web Appearance" + Module badge) sits above the containers without a box of its own');
  assert(st.barBg === card && st.barBorder === '1px' && st.barRadius === '20px' && st.barButtons.join() === 'Discard,Save Web Appearance Changes' && st.barPos !== 'sticky', 'Discard / Save sit in their own themed container at the bottom');
  assert(st.barTop > st.info[2].bottom, 'the action container comes after the last group');
  assert(st.kpis === 4 && st.tabs >= 8, 'the four status tiles and the section tabs are intact');
  const noWidgets = await R(() => document.querySelectorAll('.admin-color, .admin-seg, .admin-font, .admin-font__preview, .admin-subhead').length);
  assert(noWidgets === 0, 'no extra widgets: the plain inputs, dropdowns and toggles are used (only the container layout changed)');

  console.log('\n=== 2. FIELDS INSIDE THE CONTAINERS ===');
  const fl = await R(() => {
    const input = document.querySelector('.admin-group input.input');
    const sel = document.querySelector('.admin-group select.select');
    const label = document.querySelector('.admin-group .field > span:first-child');
    const tog = document.querySelector('.admin-group .admin-toggle-row');
    return { h: Math.round(input.getBoundingClientRect().height), selH: Math.round(sel.getBoundingClientRect().height), bg: getComputedStyle(input).backgroundColor, border: getComputedStyle(input).borderTopColor, caps: getComputedStyle(label).textTransform, togBg: getComputedStyle(tog).backgroundColor, cols: getComputedStyle(document.querySelector('.admin-group__body')).gridTemplateColumns.split(' ').length, rows: (() => { const tops = {}; [...document.querySelectorAll('.admin-group:first-of-type .field')].forEach((f) => { const t = Math.round(f.getBoundingClientRect().top); tops[t] = (tops[t] || 0) + 1; }); return Object.values(tops); })(), helper: document.querySelectorAll('.admin-group .admin-field-desc').length };
  });
  assert(fl.h === 44 && fl.selH === 44 && fl.bg === card && fl.border === line2, `inputs and dropdowns: 44px, --card surface, --line-2 border`);
  assert(fl.caps === 'uppercase' && fl.togBg === card2 && fl.cols === 3 && fl.helper > 20, 'small-caps labels, --card-2 toggle tiles, three columns, helper text kept');
  assert(fl.rows.join() === '3,3', `Theme & Typography: 3 fields per line, 2 full lines (${fl.rows.join(' + ')})`);
  const lines = await R(() => [...document.querySelectorAll('.admin-group')].map((g) => { const tops = {}; [...g.querySelectorAll('.field')].forEach((f) => { const t = Math.round(f.getBoundingClientRect().top); tops[t] = (tops[t] || 0) + 1; }); const w = [...g.querySelectorAll('.field')].map((f) => Math.round(f.getBoundingClientRect().width)); const tog = [...g.querySelectorAll('.admin-toggle-row')].map((t) => Math.round(t.getBoundingClientRect().width)); const body = Math.round(g.querySelector('.admin-group__body').getBoundingClientRect().width); return { rows: Object.values(tops), widthSpread: Math.max(...w) - Math.min(...w), tog, body }; }));
  assert(lines.every((l) => l.rows.every((n) => n === 3)), `every line in every container holds 3 fields (${lines.map((l) => l.rows.join('+')).join(' | ')})`);
  assert(lines.every((l) => l.widthSpread <= 1), 'the three fields on a line are equal width');
  assert(lines.every((l) => l.tog.every((t) => t >= l.body - 60)), 'toggle tiles span the full line');
  await page.focus('.admin-group input.input'); await sleep(200);
  const focus = await R(() => getComputedStyle(document.querySelector('.admin-group input.input')).borderTopColor);
  assert(focus === primary, 'focused field shows the theme primary colour');

  console.log('\n=== 3. SAVE ROUND-TRIP (then restored) ===');
  await type('.admin-group input.input', '#3366ff');
  await setSelect(0, 'Night'); await setSelect(1, 'Dark'); await setSelect(2, 'Inter');
  await type('.admin-group:nth-of-type(2) input.input', 'Container QA Site');
  await sleep(250);
  await R(() => document.querySelector('.admin-hub .st-actions .btn--primary').click());
  await sleep(1600);
  const saved = await R(async () => { const d = (await (await fetch('/api/settings')).json()).data; return { theme: d.theme, general: d.general }; });
  assert(saved.theme.primaryColor === '#3366ff' && saved.theme.mode === 'Night' && saved.theme.type === 'Dark' && saved.theme.headerFont === 'Inter', `Theme container saved (${saved.theme.primaryColor} / ${saved.theme.mode} / ${saved.theme.type} / ${saved.theme.headerFont})`);
  assert(saved.general.siteName === 'Container QA Site', 'Platform Identity container saved with the same Save button');
  await load();
  const back = await R(() => ({ hex: document.querySelector('.admin-group input.input').value, mode: document.querySelectorAll('.admin-group select')[0].value, site: document.querySelectorAll('.admin-group')[1].querySelector('input.input').value }));
  assert(back.hex === '#3366ff' && back.mode === 'Night' && back.site === 'Container QA Site', 'after a reload the saved values come back into their containers');
  await page.evaluate(async (t, g) => {
    await fetch('/api/settings/theme', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) });
    await fetch('/api/settings/general', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(g) });
  }, original.theme, original.general);
  const rest = await R(async () => { const d = (await (await fetch('/api/settings')).json()).data; return { theme: d.theme, general: d.general }; });
  assert(rest.theme.primaryColor === original.theme.primaryColor && rest.theme.mode === original.theme.mode && rest.general.siteName === original.general.siteName, 'settings restored to their original values');

  console.log('\n=== 4. OTHER SECTIONS: ONE THEMED CONTAINER EACH ===');
  for (const sec of ['smtp', 'razorpay', 'security']) {
    await load(`/settings/${sec}`);
    const o = await R(() => {
      const c = document.querySelector('.admin-hub > .card');
      const cs = getComputedStyle(c);
      return { cards: document.querySelectorAll('.admin-hub > .card').length, bg: cs.backgroundColor, border: cs.borderTopWidth, head: getComputedStyle(c.querySelector('.card__head')).borderBottomWidth, groups: document.querySelectorAll('.admin-group').length, cols: getComputedStyle(c.querySelector('.form-grid')).gridTemplateColumns.split(' ').length, h: Math.round(c.querySelector('input.input, select.select').getBoundingClientRect().height) };
    });
    assert(o.cards === 1 && o.bg === card && o.border === '1px' && o.head === '1px' && o.groups === 0 && o.h === 44 && o.cols === 3, `/settings/${sec}: a single themed container with a header band, 44px fields, 3 per line`);
  }

  console.log('\n=== 5. LIGHT / DARK / MOBILE ===');
  await load();
  await R(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await sleep(500);
  const dk = await R(() => ({ g: getComputedStyle(document.querySelector('.admin-group')).backgroundColor, bar: getComputedStyle(document.querySelector('.admin-hub .st-actions')).backgroundColor }));
  const dkCard = await probe('--card');
  assert(dk.g === dkCard && dk.bar === dkCard && dkCard !== card, `dark mode: containers follow --card (${dkCard})`);
  await R(() => document.documentElement.setAttribute('data-theme', 'light'));
  await page.setViewport({ width: 390, height: 800 });
  await sleep(600);
  const mob = await R(() => ({ cols: getComputedStyle(document.querySelector('.admin-group__body')).gridTemplateColumns.split(' ').length, noScroll: document.documentElement.scrollWidth <= innerWidth, fits: [...document.querySelectorAll('.admin-group, .admin-hub .st-actions')].every((e) => e.getBoundingClientRect().right <= innerWidth + 1) }));
  await page.setViewport({ width: 900, height: 900 });
  await sleep(500);
  const tab = await R(() => getComputedStyle(document.querySelector('.admin-group__body')).gridTemplateColumns.split(' ').length);
  assert(tab === 2, 'tablet width (900px): two fields per line');
  assert(mob.cols === 1 && mob.noScroll && mob.fits, 'phone: containers stack in one column, no sideways scroll');
  assert(errors.length === 0, `zero uncaught page errors (${errors.length})`);
  errors.slice(0, 5).forEach((e) => console.error('   ->', e));

  console.log(`\nSETTINGS THEME UI TEST RESULT: ${passed} passed, ${failed} failed`);
  await browser.close(); server.close(); process.exit(failed > 0 ? 1 : 0);
});
