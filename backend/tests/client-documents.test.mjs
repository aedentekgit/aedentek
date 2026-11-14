// Documents rows from the Register / Edit client page (Name, Upload, Action).
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.NODE_ENV = 'test';
process.env.PORT = '5097';
const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { default: Client } = await import('../src/models/Client.js');
const BASE = 'http://localhost:5097';
let server;
const request = (method, p, body) => new Promise((resolve, reject) => {
  const req = http.request(new URL(p, BASE), { method, headers: { 'Content-Type': 'application/json' } }, (res) => {
    let d = ''; res.on('data', (c) => (d += c));
    res.on('end', () => { try { resolve({ status: res.statusCode, body: d ? JSON.parse(d) : {} }); } catch { resolve({ status: res.statusCode, raw: d }); } });
  });
  req.on('error', reject); if (body) req.write(JSON.stringify(body)); req.end();
});
const results = [];
const test = async (id, name, fn) => { try { await fn(); results.push({ id, feature: 'Client documents', name, status: 'PASS' }); console.log(`✓ [${id}] ${name}`); } catch (e) { results.push({ id, feature: 'Client documents', name, status: 'FAIL', error: e.message }); console.log(`✗ [${id}] ${name}\n    ${e.message}`); } };
const TAG = `ZZDOC${Date.now().toString().slice(-6)}`;
const pdf = (t) => 'data:application/pdf;base64,' + Buffer.from(`%PDF-1.4 ${t} `.repeat(200)).toString('base64');

await connectDB();
server = app.listen(5097);
let id; let docA; let docB;
try {
  await test('DOC-01', 'register with several document rows (name + file) stores them as contracts', async () => {
    const r = await request('POST', '/api/clients', { company: `${TAG} Co`, name: 'n', email: 'n@zz.io', documents: [{ name: 'MSA', data: pdf('a'), type: 'PDF' }, { name: 'NDA', data: pdf('b'), type: 'PDF' }] });
    assert.equal(r.status, 201); id = r.body.data.clientId;
    assert.equal(r.body.data.documents.length, 2);
    assert.deepEqual(r.body.data.documents.map((d) => d.name), ['MSA', 'NDA']);
    assert.ok(r.body.data.documents.every((d) => d.data.startsWith('data:application/pdf') && /KB|MB/.test(d.size) && d.id));
    docA = r.body.data.documents[0].id; docB = r.body.data.documents[1].id;
  });
  await test('DOC-02', 'validation: missing name, missing file for a new row, malformed file → 400', async () => {
    const base = { company: `${TAG} Bad`, name: 'n', email: 'n@zz.io' };
    assert.equal((await request('POST', '/api/clients', { ...base, documents: [{ name: ' ', data: pdf('x') }] })).status, 400);
    assert.equal((await request('POST', '/api/clients', { ...base, documents: [{ name: 'X' }] })).status, 400);
    assert.equal((await request('POST', '/api/clients', { ...base, documents: [{ name: 'X', data: 'not-a-data-url' }] })).status, 400);
    assert.equal((await request('POST', '/api/clients', { ...base, documents: 'x' })).status, 400);
  });
  await test('DOC-03', 'edit: renaming a row keeps its file; omitting a row deletes it; new row is added', async () => {
    const r = await request('PUT', `/api/clients/${id}`, { documents: [{ id: docA, name: 'MSA (signed)' }, { name: 'SOW', data: pdf('c') }] });
    assert.equal(r.status, 200);
    const d = r.body.data.documents;
    assert.equal(d.length, 2);
    assert.equal(d[0].id, docA); assert.equal(d[0].name, 'MSA (signed)'); assert.ok(d[0].data.startsWith('data:application/pdf'));
    assert.equal(d[1].name, 'SOW'); assert.ok(!d.some((x) => x.id === docB));
  });
  await test('DOC-04', 'edit: replacing the file of an existing row; contract metadata (category/dates) is preserved', async () => {
    const c = await Client.findOne({ clientId: id });
    c.documents[0].category = 'MSA'; c.documents[0].startDate = '2026-01-01'; c.documents[0].endDate = '2026-12-31'; await c.save();
    const r = await request('PUT', `/api/clients/${id}`, { documents: [{ id: docA, name: 'MSA v2', data: pdf('zzzz') }] });
    const d = r.body.data.documents[0];
    assert.equal(d.name, 'MSA v2'); assert.equal(d.category, 'MSA'); assert.equal(d.startDate, '2026-01-01');
    assert.equal(r.body.data.documents.length, 1);
  });
  await test('DOC-05', 'edit without a documents field leaves them untouched; empty list clears them', async () => {
    const r = await request('PUT', `/api/clients/${id}`, { city: 'Pune' });
    assert.equal(r.body.data.documents.length, 1);
    const cleared = await request('PUT', `/api/clients/${id}`, { documents: [] });
    assert.equal(cleared.body.data.documents.length, 0);
  });
  await test('DOC-06', 'large payloads (3 × ~3 MB files) are accepted by the API body limit', async () => {
    const big = 'data:application/pdf;base64,' + Buffer.alloc(3 * 1024 * 1024, 7).toString('base64');
    const r = await request('PUT', `/api/clients/${id}`, { documents: [{ name: 'a', data: big }, { name: 'b', data: big }, { name: 'c', data: big }] });
    assert.equal(r.status, 200); assert.equal(r.body.data.documents.length, 3);
    assert.match(r.body.data.documents[0].size, /3\.0 MB/);
  });
} finally {
  await Client.deleteMany({ company: new RegExp(`^${TAG}`) });
  await new Promise((r) => server.close(r));
  await disconnectDB();
}
const failed = results.filter((r) => r.status === 'FAIL');
fs.writeFileSync(path.join(__dirname, 'client-documents-results.json'), JSON.stringify({ ranAt: new Date().toISOString(), total: results.length, passed: results.length - failed.length, failed: failed.length, results }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} backend tests passed`);
process.exit(failed.length ? 1 : 0);
