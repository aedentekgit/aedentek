// Expense flow: Title, Description, Category, Amount, Date, Branch, Notes - full CRUD + validation + ledger.
import http from 'node:http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.NODE_ENV = 'test';
process.env.PORT = '5099';

const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { default: Expense } = await import('../src/models/accounts/Expense.js');
const { default: JournalEntry } = await import('../src/models/accounts/JournalEntry.js');
const PORT = 5099;

const req = (method, p, body) => new Promise((resolve, reject) => {
  const r = http.request(new URL(p, `http://localhost:${PORT}`), { method, headers: { 'Content-Type': 'application/json' } }, (res) => {
    let d = ''; res.on('data', (c) => (d += c));
    res.on('end', () => { let j; try { j = d ? JSON.parse(d) : {}; } catch { j = { raw: d }; } resolve({ status: res.statusCode, body: j }); });
  });
  r.on('error', reject); if (body) r.write(JSON.stringify(body)); r.end();
});

const TAG = `QA-EXP-${Date.now()}`;
const results = [];
const check = (id, label, ok, detail = '') => { results.push({ id, label, ok: !!ok, detail }); console.log(`  ${ok ? '✓' : '✗'} ${id} ${label}${ok ? '' : ' — ' + detail}`); };
const base = '/api/accounts/expenses';
const ghost = new mongoose.Types.ObjectId().toString();
const listAll = async (qs = '') => (await req('GET', `${base}${qs}`)).body.data || [];
const journalsFor = async (id) => JournalEntry.find({ sourceModule: 'Expenses', sourceId: String(id) });
const netDebit = (entries) => entries.reduce((s, e) => s + e.lines.reduce((a, l) => a + (l.debit || 0) - (l.credit || 0), 0), 0);

await connectDB();
const server = app.listen(PORT);
try {
  const catRes = await req('GET', '/api/accounts/expense-categories');
  const category = ((catRes.body.data || [])[0] || {}).name || 'Facility Rent';
  const category2 = ((catRes.body.data || [])[1] || {}).name || category;

  console.log('\nCREATE');
  const full = { title: `${TAG} Rent`, description: `${TAG} October office rent`, category, amount: 1500.5, date: '2026-11-03', branch: 'Bandra', notes: `${TAG} ref 77`, paymentMode: 'Bank Transfer' };
  let r = await req('POST', base, full);
  const e1 = r.body.data || {};
  check('C-01', 'create with all fields → 201', r.status === 201 && r.body.success && e1._id, `HTTP ${r.status}`);
  check('C-02', 'Title stored', e1.title === full.title);
  check('C-03', 'Description stored', e1.description === full.description, String(e1.description));
  check('C-04', 'Category stored', e1.category === category);
  check('C-05', 'Amount stored as number (1500.5)', e1.amount === 1500.5);
  check('C-06', 'Date stored', e1.date === '2026-11-03');
  check('C-07', 'Branch stored', e1.branch === 'Bandra');
  check('C-08', 'Notes stored', e1.notes === full.notes);
  r = await req('POST', base, { title: `${TAG} Minimal`, category, amount: 10, date: '2026-11-04' });
  const e2 = r.body.data || {};
  check('C-09', 'create with required fields only → 201', r.status === 201, `HTTP ${r.status}`);
  check('C-10', 'Description defaults to empty', e2.description === '', JSON.stringify(e2.description));
  check('C-11', 'Branch defaults to "All Branches"', e2.branch === 'All Branches', e2.branch);
  check('C-12', 'Notes default to empty', e2.notes === '');
  r = await req('POST', base, { title: `   ${TAG} Trim   `, description: '  padded  ', category, amount: 5, date: '2026-11-04' });
  const e3 = r.body.data || {};
  check('C-13', 'Title and description are trimmed', e3.title === `${TAG} Trim` && e3.description === 'padded', `${e3.title}|${e3.description}`);

  console.log('\nCREATE validation');
  const v = (patch) => ({ title: `${TAG} V`, category, amount: 10, date: '2026-11-04', ...patch });
  for (const [id, label, body] of [
    ['V-01', 'missing title', v({ title: undefined })],
    ['V-02', 'blank (spaces) title', v({ title: '   ' })],
    ['V-03', 'missing category', v({ category: undefined })],
    ['V-04', 'missing amount', v({ amount: undefined })],
    ['V-05', 'zero amount', v({ amount: 0 })],
    ['V-06', 'negative amount', v({ amount: -5 })],
    ['V-07', 'non-numeric amount', v({ amount: 'abc' })],
    ['V-08', 'missing date', v({ date: undefined })],
    ['V-09', 'invalid date text', v({ date: 'not-a-date' })],
    ['V-10', 'impossible date (2026-13-45)', v({ date: '2026-13-45' })],
    ['V-11', 'empty body', {}],
  ]) {
    const x = await req('POST', base, body);
    check(id, `${label} → 400`, x.status === 400 && x.body.success === false, `HTTP ${x.status}`);
  }
  const before = (await listAll()).filter((x) => String(x.title).startsWith(`${TAG} V`)).length;
  check('V-12', 'rejected requests create no records', before === 0, `${before} stray`);

  console.log('\nREAD');
  let list = await listAll();
  const found = list.find((x) => x._id === e1._id);
  check('R-01', 'list returns the new expense with every field', found && found.title === full.title && found.description === full.description && found.category === category && found.amount === 1500.5 && found.date === full.date && found.branch === 'Bandra' && found.notes === full.notes);
  const lr = await req('GET', base);
  check('R-02', 'list includes KPIs', lr.status === 200 && lr.body.kpis && typeof lr.body.kpis.totalExpenses === 'number');
  check('R-03', 'newest date first', list.map((x) => x.date).every((d, i, a) => i === 0 || a[i - 1] >= d));
  check('R-04', 'search by title', (await listAll(`?q=${encodeURIComponent(`${TAG} Rent`)}`)).some((x) => x._id === e1._id));
  check('R-05', 'search by description', (await listAll(`?q=${encodeURIComponent('October office rent')}`)).some((x) => x._id === e1._id));
  check('R-06', 'search by notes', (await listAll(`?q=${encodeURIComponent('ref 77')}`)).some((x) => x._id === e1._id));
  check('R-07', 'search with no match returns none of ours', !(await listAll(`?q=${encodeURIComponent(TAG + ' zzz-none')}`)).some((x) => String(x.title).startsWith(TAG)));
  check('R-08', 'filter by category', (await listAll(`?category=${encodeURIComponent(category)}`)).every((x) => x.category === category));
  check('R-09', 'filter by branch', (await listAll('?branch=Bandra')).every((x) => x.branch === 'Bandra'));
  const ranged = await listAll('?from=2026-11-03&to=2026-11-03');
  check('R-10', 'filter by date range', ranged.length > 0 && ranged.every((x) => x.date === '2026-11-03') && ranged.some((x) => x._id === e1._id));

  console.log('\nLEDGER (create)');
  let js = await journalsFor(e1._id);
  check('L-01', 'a balanced journal entry is posted on create', js.length >= 1 && Math.abs(netDebit(js)) < 0.01);
  const debitTotal = js.flatMap((e) => e.lines).reduce((s, l) => s + (l.debit || 0), 0);
  check('L-02', 'journal debit equals the expense amount (1500.5)', Math.abs(debitTotal - 1500.5) < 0.01, String(debitTotal));

  console.log('\nUPDATE');
  const put = (id, patch) => req('PUT', `${base}/${id}`, patch);
  r = await put(e1._id, { title: `${TAG} Rent v2` });
  check('U-01', 'update Title', r.status === 200 && r.body.data.title === `${TAG} Rent v2`);
  r = await put(e1._id, { description: `${TAG} updated description` });
  check('U-02', 'update Description', r.status === 200 && r.body.data.description === `${TAG} updated description`);
  r = await put(e1._id, { category: category2 });
  check('U-03', 'update Category', r.status === 200 && r.body.data.category === category2);
  r = await put(e1._id, { amount: 2000 });
  check('U-04', 'update Amount', r.status === 200 && r.body.data.amount === 2000);
  r = await put(e1._id, { date: '2026-11-05' });
  check('U-05', 'update Date', r.status === 200 && r.body.data.date === '2026-11-05');
  r = await put(e1._id, { branch: 'Andheri' });
  check('U-06', 'update Branch', r.status === 200 && r.body.data.branch === 'Andheri');
  r = await put(e1._id, { notes: `${TAG} new note` });
  check('U-07', 'update Notes', r.status === 200 && r.body.data.notes === `${TAG} new note`);
  r = await put(e1._id, { description: '' });
  check('U-08', 'Description can be cleared', r.status === 200 && r.body.data.description === '');
  const after = (await listAll()).find((x) => x._id === e1._id);
  check('U-09', 'all updates persisted and untouched fields kept', after && after.title === `${TAG} Rent v2` && after.category === category2 && after.amount === 2000 && after.date === '2026-11-05' && after.branch === 'Andheri' && after.notes === `${TAG} new note` && after.paymentMode === 'Bank Transfer');
  for (const [id, label, patch] of [
    ['U-10', 'blank title', { title: '  ' }], ['U-11', 'zero amount', { amount: 0 }], ['U-12', 'negative amount', { amount: -1 }],
    ['U-13', 'invalid date', { date: 'nope' }], ['U-14', 'blank category', { category: '' }],
  ]) {
    const x = await put(e1._id, patch);
    check(id, `update with ${label} → 400`, x.status === 400, `HTTP ${x.status}`);
  }
  const still = (await listAll()).find((x) => x._id === e1._id);
  check('U-15', 'rejected updates change nothing', still && still.amount === 2000 && still.title === `${TAG} Rent v2`);
  check('U-16', 'update unknown id → 404', (await put(ghost, { title: 'x' })).status === 404);
  check('U-17', 'update malformed id → 4xx', (await put('not-an-id', { title: 'x' })).status >= 400);

  console.log('\nLEDGER (update)');
  js = await journalsFor(e1._id);
  const live = js.filter((e) => !e.reversedBy && !e.reversalOf);
  const liveDebit = live.flatMap((e) => e.lines).reduce((s, l) => s + (l.debit || 0), 0);
  check('L-03', 'after edits the ledger carries exactly the new amount (2000) net of reversals', Math.abs(liveDebit - 2000) < 0.01, String(liveDebit));
  check('L-04', 'ledger stays balanced after edits', Math.abs(netDebit(js)) < 0.01);

  console.log('\nDELETE');
  r = await req('DELETE', `${base}/${e1._id}`);
  check('D-01', 'delete → 200', r.status === 200 && r.body.success, `HTTP ${r.status}`);
  check('D-02', 'record gone from list', !(await listAll()).some((x) => x._id === e1._id));
  check('D-03', 'second delete → 404', (await req('DELETE', `${base}/${e1._id}`)).status === 404);
  check('D-04', 'delete unknown id → 404', (await req('DELETE', `${base}/${ghost}`)).status === 404);
  check('D-05', 'delete malformed id → 4xx', (await req('DELETE', `${base}/not-an-id`)).status >= 400);
  js = await journalsFor(e1._id);
  const liveAfter = js.filter((e) => !e.reversedBy && !e.reversalOf);
  check('L-05', 'delete reverses the ledger (no live entries, net zero)', liveAfter.length === 0 && Math.abs(netDebit(js)) < 0.01, `live=${liveAfter.length} net=${netDebit(js)}`);
  check('D-06', 'other expenses unaffected', (await listAll()).some((x) => x._id === e2._id) && (await listAll()).some((x) => x._id === e3._id));

  console.log('\nREPEAT ENTRIES (same title / amount multiple times)');
  const ids = [];
  for (let i = 0; i < 3; i += 1) { const x = await req('POST', base, { title: `${TAG} Recurring`, category, amount: 100, date: '2026-11-0' + (6 + i) }); ids.push((x.body.data || {})._id); }
  const rec = (await listAll()).filter((x) => x.title === `${TAG} Recurring`);
  check('X-01', 'recording the same expense three times creates three separate rows', rec.length === 3 && new Set(rec.map((x) => x._id)).size === 3, `${rec.length} rows`);
  for (const id of ids) await req('DELETE', `${base}/${id}`);
  check('X-02', 'each can be deleted independently', !(await listAll()).some((x) => x.title === `${TAG} Recurring`));
} finally {
  // remove this run's remaining test data + journal pairs (audit reversals are net zero)
  const mine = await Expense.find({ title: new RegExp(TAG) }).select('_id');
  for (const m of mine) await req('DELETE', `${base}/${m._id}`);
  await Expense.deleteMany({ title: new RegExp(TAG) });
  const js = await JournalEntry.find({ description: new RegExp(TAG) }).select('entryNumber reversedBy reversalOf');
  const nums = js.flatMap((e) => [e.entryNumber, e.reversedBy, e.reversalOf].filter(Boolean));
  await JournalEntry.deleteMany({ $or: [{ description: new RegExp(TAG) }, { entryNumber: { $in: nums } }] });
  server.close();
  await disconnectDB();
}
const failed = results.filter((x) => !x.ok);
fs.writeFileSync(path.join(__dirname, 'expense-crud-results.json'), JSON.stringify(results, null, 2));
console.log(`\nEXPENSE CRUD: ${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
