// Invoice-sender / bank profiles and GST slabs with a single DEFAULT that new documents use.
// Non-destructive: only records tagged by this run are created and removed; original defaults and
// settings are restored afterwards.
import http from 'node:http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.NODE_ENV = 'test';
process.env.PORT = '5095';

const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { SettingsProfile } = await import('../src/models/SettingsProfile.js');
const { AdminSettings } = await import('../src/models/AdminSettings.js');
const { GstTaxRate } = await import('../src/models/GstTaxRate.js');
const { default: Invoice } = await import('../src/models/Invoice.js');
const PORT = 5095;

const req = (method, p, body) => new Promise((resolve, reject) => {
  const r = http.request(new URL(p, `http://localhost:${PORT}`), { method, headers: { 'Content-Type': 'application/json' } }, (res) => {
    let d = ''; res.on('data', (c) => (d += c));
    res.on('end', () => { let j; try { j = d ? JSON.parse(d) : {}; } catch { j = { raw: d }; } resolve({ status: res.statusCode, body: j }); });
  });
  r.on('error', reject); if (body) r.write(JSON.stringify(body)); r.end();
});
const TAG = `QA-PROF-${Date.now()}`;
const results = [];
const check = (id, label, ok, detail = '') => { results.push({ id, label, ok: !!ok, detail }); console.log(`  ${ok ? '✓' : '✗'} ${id} ${label}${ok ? '' : ' — ' + detail}`); };
const base = '/api/settings-profiles';
const ghost = new mongoose.Types.ObjectId().toString();
const settings = async () => (await req('GET', '/api/settings')).body.data;
const list = async (type) => (await req('GET', `${base}?type=${type}`)).body.data;
const defOf = async (type) => (await list(type)).find((x) => x.isDefault);
const sender = (n, extra = {}) => ({ companyName: `${TAG} ${n}`, companyEmail: `${n.toLowerCase()}@qa.example.com`, companyAddress: `${n} Street`, companyGst: n === 'A' ? '33AABCA9988C1Z4' : '33AAFCE7781K1ZQ', ...extra });
const bank = (n, extra = {}) => ({ bankName: `${TAG} ${n} Bank`, accountName: `${TAG} ${n}`, accountNumber: `9000${n.length}0012345`, ifsc: `QA${n}0000001`, ...extra });

await connectDB();
const origSettings = await AdminSettings.findOne({ identifier: 'master_admin_settings' }).lean();
const origProfiles = await SettingsProfile.find({}).lean();
const origSlabs = await GstTaxRate.find({}).lean();
const wasEmptyProfiles = origProfiles.length === 0;
const wasEmptySlabs = origSlabs.length === 0;
const server = app.listen(PORT);
try {
  console.log('\nINVOICE SENDER PROFILES');
  let r = await req('POST', base, { type: 'invoiceSender', data: sender('A') });
  const a = r.body.data || {};
  check('S-01', wasEmptyProfiles ? 'create first profile → 201 and it becomes the default' : 'create profile → 201', r.status === 201 && (!wasEmptyProfiles || a.isDefault === true), `HTTP ${r.status}`);
  if (!a.isDefault) await req('POST', `${base}/${a._id}/default`);
  check('S-02', 'default is mirrored into settings.invoiceSender', (await settings()).invoiceSender.companyName === `${TAG} A`);
  r = await req('POST', base, { type: 'invoiceSender', data: sender('B') });
  const b = r.body.data || {};
  check('S-03', 'second profile is NOT the default and settings are unchanged', r.status === 201 && b.isDefault === false && (await settings()).invoiceSender.companyName === `${TAG} A`);
  let l = await list('invoiceSender');
  const ia = l.findIndex((x) => x._id === a._id), ib = l.findIndex((x) => x._id === b._id);
  check('S-04', 'list keeps creation order (A before B), exactly one default', ia >= 0 && ib > ia && l.filter((x) => x.isDefault).length === 1);
  r = await req('POST', `${base}/${b._id}/default`);
  check('S-05', 'set B as default → 200', r.status === 200 && r.body.data.isDefault === true);
  l = await list('invoiceSender');
  const ia2 = l.findIndex((x) => x._id === a._id), ib2 = l.findIndex((x) => x._id === b._id);
  check('S-06', 'exactly one default (B); A cleared; B did NOT move to the top (order unchanged)', l.filter((x) => x.isDefault).length === 1 && l.find((x) => x.isDefault)._id === b._id && ib2 > ia2 && ia2 === ia && ib2 === ib);
  check('S-07', 'settings now mirror B', (await settings()).invoiceSender.companyName === `${TAG} B`);
  r = await req('PUT', `${base}/${b._id}`, { data: { companyAddress: 'Updated Road 9' } });
  check('S-08', 'edit the default profile → mirrored to settings', r.status === 200 && (await settings()).invoiceSender.companyAddress === 'Updated Road 9');
  r = await req('PUT', `${base}/${a._id}`, { data: { companyAddress: 'Other Road 1' } });
  check('S-09', 'edit a non-default profile does not touch settings', r.status === 200 && (await settings()).invoiceSender.companyAddress === 'Updated Road 9');

  console.log('\nVALIDATION');
  for (const [id, label, body] of [
    ['V-01', 'missing company name', { type: 'invoiceSender', data: sender('X', { companyName: '' }) }],
    ['V-02', 'missing billing email', { type: 'invoiceSender', data: sender('X', { companyEmail: '' }) }],
    ['V-03', 'invalid email', { type: 'invoiceSender', data: sender('X', { companyEmail: 'not-an-email' }) }],
    ['V-04', 'missing address', { type: 'invoiceSender', data: sender('X', { companyAddress: '' }) }],
    ['V-05', 'invalid status value', { type: 'invoiceSender', data: sender('X', { status: 'Weird' }) }],
    ['V-06', 'unknown type', { type: 'nonsense', data: {} }],
    ['V-06b', 'invalid company GSTIN', { type: 'invoiceSender', data: sender('X', { companyGst: 'GST-BAD' }) }],
    ['V-06c', 'invalid company PAN', { type: 'invoiceSender', data: sender('X', { companyPan: '123' }) }],
    ['V-07', 'bank without account number', { type: 'bankDetails', data: bank('X', { accountNumber: '' }) }],
    ['V-08', 'bank with invalid account type', { type: 'bankDetails', data: bank('X', { accountType: 'Gold' }) }],
  ]) check(id, `${label} → 400`, (await req('POST', base, body)).status === 400);
  check('V-09', 'update with blank company name → 400', (await req('PUT', `${base}/${a._id}`, { data: { companyName: '' } })).status === 400);
  check('V-10', 'update unknown id → 404', (await req('PUT', `${base}/${ghost}`, { data: {} })).status === 404);
  check('V-11', 'set default unknown id → 404', (await req('POST', `${base}/${ghost}/default`)).status === 404);
  check('V-12', 'delete unknown id → 404', (await req('DELETE', `${base}/${ghost}`)).status === 404);
  check('V-13', 'list with invalid type → 400', (await req('GET', `${base}?type=zzz`)).status === 400);
  check('V-14', 'invalid creates added nothing', (await list('invoiceSender')).filter((x) => String(x.label).includes(TAG)).length === 2);

  console.log('\nNEW DOCUMENTS USE THE DEFAULT');
  r = await req('POST', '/api/invoices', { clientName: `${TAG} Client`, title: `${TAG} Inv`, items: [{ description: 'x', price: 100, qty: 1 }], subtotal: 100, totalAmount: 118, balance: 118 });
  const inv = r.body.data || {};
  check('N-01', 'new invoice snapshots the default sender (B)', inv.companyName === `${TAG} B` && inv.companyGst === '33AAFCE7781K1ZQ', `${inv.companyName}`);
  await req('POST', `${base}/${a._id}/default`);
  r = await req('POST', '/api/invoices', { clientName: `${TAG} Client2`, title: `${TAG} Inv2`, items: [{ description: 'x', price: 100, qty: 1 }], subtotal: 100, totalAmount: 118, balance: 118 });
  check('N-02', 'after changing the default, the next invoice uses A', (r.body.data || {}).companyName === `${TAG} A`);
  check('N-03', 'earlier invoice keeps its original sender (snapshot)', (await Invoice.findOne({ _id: inv._id })).companyName === `${TAG} B`);
  r = await req('POST', '/api/invoices', { clientName: `${TAG} Client3`, title: `${TAG} Inv3`, companyName: 'Explicit Co', items: [{ description: 'x', price: 1, qty: 1 }] });
  check('N-04', 'an explicit company on the request wins over the default', (r.body.data || {}).companyName === 'Explicit Co');

  console.log('\nBANK PROFILES');
  r = await req('POST', base, { type: 'bankDetails', data: bank('One') });
  const k1 = r.body.data || {};
  r = await req('POST', base, { type: 'bankDetails', data: bank('Twoo') });
  const k2 = r.body.data || {};
  if (!k1.isDefault) await req('POST', `${base}/${k1._id}/default`);
  check('K-01', 'a bank profile can be the default and is mirrored', (await settings()).bankDetails.accountNumber === k1.data.accountNumber);
  await req('POST', `${base}/${k2._id}/default`);
  check('K-02', 'set default switches the mirrored bank account', (await settings()).bankDetails.accountNumber === k2.data.accountNumber);
  r = await req('POST', '/api/invoices', { clientName: `${TAG} Client4`, title: `${TAG} Inv4`, items: [{ description: 'x', price: 1, qty: 1 }] });
  check('K-03', 'new invoice carries the default bank account', ((r.body.data || {}).bankDetails || {}).accountNumber === k2.data.accountNumber);
  r = await req('DELETE', `${base}/${k2._id}`);
  const dk = await defOf('bankDetails');
  check('K-04', 'deleting the default bank promotes another and mirrors it', r.status === 200 && !!dk && (await settings()).bankDetails.accountNumber === dk.data.accountNumber, JSON.stringify(dk && dk.data.accountNumber));
  r = await req('DELETE', `${base}/${k1._id}`);
  const dk2 = await defOf('bankDetails');
  check('K-05', wasEmptyProfiles ? 'deleting the last bank profile clears the mirrored bank details' : 'deleting another bank profile keeps one default mirrored', r.status === 200 && (wasEmptyProfiles ? !(await settings()).bankDetails.accountNumber : (!!dk2 && (await settings()).bankDetails.accountNumber === dk2.data.accountNumber)));

  console.log('\nDELETE (sender)');
  r = await req('DELETE', `${base}/${a._id}`);
  const ds = await defOf('invoiceSender');
  check('D-01', 'delete the default sender → 200 and another profile is promoted', r.status === 200 && !!ds && ds._id !== a._id);
  check('D-02', 'settings mirror the promoted profile', !!ds && (await settings()).invoiceSender.companyName === ds.data.companyName);
  check('D-03', 'second delete → 404', (await req('DELETE', `${base}/${a._id}`)).status === 404);
  await req('DELETE', `${base}/${b._id}`);
  const ds2 = await defOf('invoiceSender');
  check('D-04', wasEmptyProfiles ? 'deleting the last sender clears settings.invoiceSender' : 'deleting another sender keeps one default mirrored', wasEmptyProfiles ? (!ds2 && !(await settings()).invoiceSender.companyName) : (!!ds2 && (await settings()).invoiceSender.companyName === ds2.data.companyName));

  console.log('\nGST SLABS: SET AS DEFAULT');
  r = await req('POST', '/api/gst-rates', { hsnCode: '998001', gstRate: 18, serviceName: `${TAG} One`, taxType: 'Standard' });
  const g1 = r.body.data || {};
  check('G-01', wasEmptySlabs ? 'first slab becomes the default' : 'create slab → 201', r.status === 201 && (!wasEmptySlabs || g1.isDefault === true));
  if (!g1.isDefault) await req('POST', `/api/gst-rates/${g1._id}/default`);
  check('G-02', 'default HSN and rate are mirrored into GST settings', (await settings()).gstSettings.defaultHsn === '998001' && (await settings()).gstSettings.defaultGstRate === 18);
  r = await req('POST', '/api/gst-rates', { hsnCode: '998002', gstRate: 12, serviceName: `${TAG} Two`, taxType: 'Standard' });
  const g2 = r.body.data || {};
  check('G-03', 'second slab is not the default', g2.isDefault === false);
  r = await req('POST', `/api/gst-rates/${g2._id}/default`);
  check('G-04', 'set slab 2 as default → 200', r.status === 200 && r.body.data.isDefault === true);
  const all = (await req('GET', '/api/gst-rates')).body.data;
  check('G-05', 'only one default slab (slab 2)', all.filter((x) => x.isDefault).length === 1 && all.find((x) => x.isDefault)._id === g2._id);
  check('G-06', 'GST settings mirror slab 2 (998002 / 12%)', (await settings()).gstSettings.defaultHsn === '998002' && (await settings()).gstSettings.defaultGstRate === 12);
  r = await req('POST', '/api/gst-rates', { hsnCode: '998003', gstRate: 5, serviceName: `${TAG} Three`, taxType: 'Standard', status: 'Inactive' });
  const g3 = r.body.data || {};
  check('G-07', 'an inactive slab cannot be made the default → 400', (await req('POST', `/api/gst-rates/${g3._id}/default`)).status === 400);
  check('G-08', 'set default unknown id → 404', (await req('POST', `/api/gst-rates/${ghost}/default`)).status === 404);
  r = await req('DELETE', `/api/gst-rates/${g2._id}`);
  const after = (await req('GET', '/api/gst-rates')).body.data;
  const promoted = after.find((x) => x.isDefault);
  check('G-09', 'deleting the default slab promotes an active one', r.status === 200 && !!promoted && promoted.status !== 'Inactive');
  check('G-10', 'GST settings follow the promoted slab', !!promoted && (await settings()).gstSettings.defaultHsn === promoted.hsnCode && (await settings()).gstSettings.defaultGstRate === promoted.gstRate);
} finally {
  // remove ONLY this run's tagged records, then restore original defaults and settings
  const rx = new RegExp(TAG);
  await Invoice.deleteMany({ clientName: rx });
  await SettingsProfile.deleteMany({ label: rx });
  await GstTaxRate.deleteMany({ serviceName: rx });
  for (const pr of origProfiles) await SettingsProfile.updateOne({ _id: pr._id }, { isDefault: pr.isDefault });
  for (const sl of origSlabs) await GstTaxRate.updateOne({ _id: sl._id }, { isDefault: sl.isDefault });
  if (origSettings) {
    const s = await AdminSettings.findOne({ identifier: 'master_admin_settings' });
    for (const k of ['invoiceSender', 'bankDetails', 'gstSettings']) { s[k] = origSettings[k]; s.markModified(k); }
    await s.save();
  }
  server.close();
  await disconnectDB();
}
const failed = results.filter((x) => !x.ok);
fs.writeFileSync(path.join(__dirname, 'settings-profiles-results.json'), JSON.stringify(results, null, 2));
console.log(`\nSETTINGS PROFILES: ${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
