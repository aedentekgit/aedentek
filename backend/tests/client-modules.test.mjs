// Integration tests for: Service Type master, login credentials (active-only types),
// client registration with logo/agreement, projects CRUD, invoice<->project link, contracts CRUD.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.NODE_ENV = 'test';
process.env.PORT = '5098';

const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { default: ServiceType } = await import('../src/models/ServiceType.js');
const { default: Client } = await import('../src/models/Client.js');

const PORT = 5098;
const BASE = `http://localhost:${PORT}`;
let server;

const request = (method, p, body) =>
  new Promise((resolve, reject) => {
    const req = http.request(new URL(p, BASE), { method, headers: { 'Content-Type': 'application/json' } }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => { try { resolve({ status: res.statusCode, body: d ? JSON.parse(d) : {} }); } catch { resolve({ status: res.statusCode, raw: d }); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });

const results = [];
const test = async (id, feature, name, fn) => {
  try { await fn(); results.push({ id, feature, name, status: 'PASS' }); console.log(`✓ [${id}] ${name}`); }
  catch (e) { results.push({ id, feature, name, status: 'FAIL', error: e.message }); console.log(`✗ [${id}] ${name}\n    ${e.message}`); }
};

const TAG = `ZZTEST-${Date.now()}`;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PDF = 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4 test contract body '.repeat(50)).toString('base64');

async function run() {
  await connectDB();
  server = app.listen(PORT);
  const createdTypes = [];
  let clientId;
  try {
    // ---------------------------------------------------------- 1 + 2: service types & login credentials
    let activeId, inactiveId;
    await test('ST-01', 'Service Type CRUD', 'create active service type', async () => {
      const r = await request('POST', '/api/service-types', { name: `${TAG} Azure`, code: 'AZ', description: 'Azure', status: 'Active' });
      assert.equal(r.status, 201); assert.equal(r.body.data.status, 'Active');
      activeId = r.body.data._id; createdTypes.push(activeId);
    });
    await test('ST-02', 'Service Type CRUD', 'create inactive service type', async () => {
      const r = await request('POST', '/api/service-types', { name: `${TAG} Legacy FTP`, status: 'Inactive' });
      assert.equal(r.status, 201); inactiveId = r.body.data._id; createdTypes.push(inactiveId);
    });
    await test('ST-03', 'Service Type CRUD', 'name is required (400)', async () => {
      assert.equal((await request('POST', '/api/service-types', { name: '  ' })).status, 400);
    });
    await test('ST-04', 'Service Type CRUD', 'duplicate name rejected case-insensitively (409)', async () => {
      assert.equal((await request('POST', '/api/service-types', { name: `${TAG} azure` })).status, 409);
    });
    await test('ST-05', 'Service Type CRUD', 'invalid status rejected (400)', async () => {
      assert.equal((await request('POST', '/api/service-types', { name: `${TAG} Bad`, status: 'Maybe' })).status, 400);
    });
    await test('ST-06', 'Service Type CRUD', 'list returns both; ?status=Active returns only active', async () => {
      const all = await request('GET', '/api/service-types');
      assert.ok(all.body.data.some((t) => t._id === activeId) && all.body.data.some((t) => t._id === inactiveId));
      const act = await request('GET', '/api/service-types?status=Active');
      assert.ok(act.body.data.length > 0 && act.body.data.every((t) => t.status === 'Active'));
      assert.ok(act.body.data.some((t) => t._id === activeId));
      assert.ok(!act.body.data.some((t) => t._id === inactiveId));
    });
    await test('ST-07', 'Service Type CRUD', 'search filter ?q=', async () => {
      const r = await request('GET', `/api/service-types?q=${encodeURIComponent(TAG + ' Legacy')}`);
      assert.equal(r.body.data.length, 1);
    });
    await test('ST-08', 'Service Type CRUD', 'get by id + 404 for unknown', async () => {
      assert.equal((await request('GET', `/api/service-types/${activeId}`)).body.data.name, `${TAG} Azure`);
      assert.equal((await request('GET', '/api/service-types/000000000000000000000000')).status, 404);
    });
    await test('ST-09', 'Service Type CRUD', 'update fields and toggle status', async () => {
      const u = await request('PUT', `/api/service-types/${activeId}`, { description: 'Azure cloud', status: 'Inactive' });
      assert.equal(u.status, 200); assert.equal(u.body.data.status, 'Inactive'); assert.equal(u.body.data.description, 'Azure cloud');
      const back = await request('PUT', `/api/service-types/${activeId}`, { status: 'Active' });
      assert.equal(back.body.data.status, 'Active');
    });
    await test('ST-10', 'Service Type CRUD', 'update to a duplicate name rejected (409)', async () => {
      assert.equal((await request('PUT', `/api/service-types/${inactiveId}`, { name: `${TAG} Azure` })).status, 409);
    });

    // ---------------------------------------------------------- 5: client registration with logo + agreement
    await test('CL-01', 'Client registration', 'create client with logo, agreement dates and document', async () => {
      const r = await request('POST', '/api/clients', {
        company: `${TAG} Co`, name: 'Test Person', email: 't@zz.io', phone: '+91 90000 00000',
        logo: PNG, agreementFrom: '2026-01-01', agreementTo: '2026-12-31',
        agreementDocument: { name: 'agreement.pdf', type: 'PDF', size: '1 KB', uploadedAt: '2026-01-01', data: PDF }
      });
      assert.equal(r.status, 201);
      clientId = r.body.data.clientId;
      assert.equal(r.body.data.logo, PNG);
      assert.equal(r.body.data.agreementFrom, '2026-01-01');
      assert.equal(r.body.data.agreementTo, '2026-12-31');
      assert.equal(r.body.data.agreementDocument.name, 'agreement.pdf');
      assert.equal(r.body.data.agreementDocument.data, PDF);
    });
    await test('CL-02', 'Client registration', 'agreement end before start rejected (400)', async () => {
      const r = await request('POST', '/api/clients', { company: `${TAG} Bad`, name: 'X', email: 'x@zz.io', agreementFrom: '2026-05-01', agreementTo: '2026-04-01' });
      assert.equal(r.status, 400);
    });
    await test('CL-03', 'Client registration', 'list endpoint omits heavy document/agreement file data', async () => {
      const r = await request('GET', `/api/clients?q=${TAG}`);
      const c = r.body.data.find((x) => x.clientId === clientId);
      assert.ok(c); assert.ok(!c.agreementDocument?.data); assert.equal(c.agreementFrom, '2026-01-01');
    });
    await test('CL-04', 'Client registration', 'detail endpoint returns agreement document data', async () => {
      assert.equal((await request('GET', `/api/clients/${clientId}`)).body.data.agreementDocument.data, PDF);
    });
    await test('CL-05', 'Client registration', 'update agreement dates; invalid range rejected; document removable', async () => {
      const u = await request('PUT', `/api/clients/${clientId}`, { agreementFrom: '2026-02-01', agreementTo: '2027-01-31' });
      assert.equal(u.status, 200); assert.equal(u.body.data.agreementTo, '2027-01-31');
      assert.equal((await request('PUT', `/api/clients/${clientId}`, { agreementTo: '2026-01-01' })).status, 400);
      const rm = await request('PUT', `/api/clients/${clientId}`, { agreementDocument: {} });
      assert.ok(!rm.body.data.agreementDocument?.name);
    });

    // ---------------------------------------------------------- 1 + 2: login credentials use active types only
    let credId;
    await test('LC-01', 'Login credentials', 'add login with ACTIVE service type succeeds', async () => {
      const r = await request('POST', `/api/clients/${clientId}/credentials`, { type: `${TAG} Azure`, label: 'Azure Portal', username: 'admin', password: 'pw1' });
      assert.equal(r.status, 201); credId = r.body.data.credentials[0].id;
    });
    await test('LC-02', 'Login credentials', 'add login with INACTIVE service type rejected (400)', async () => {
      const r = await request('POST', `/api/clients/${clientId}/credentials`, { type: `${TAG} Legacy FTP`, label: 'FTP', username: 'u', password: 'p' });
      assert.equal(r.status, 400); assert.match(r.body.message, /inactive/i);
    });
    await test('LC-03', 'Login credentials', 'switching a login to an inactive type rejected; editing other fields allowed', async () => {
      assert.equal((await request('PUT', `/api/clients/${clientId}/credentials/${credId}`, { type: `${TAG} Legacy FTP` })).status, 400);
      const ok = await request('PUT', `/api/clients/${clientId}/credentials/${credId}`, { username: 'root' });
      assert.equal(ok.status, 200); assert.equal(ok.body.data.credentials[0].username, 'root');
    });

    // ---------------------------------------------------------- 3: projects CRUD
    let p1, p2;
    await test('PR-01', 'Projects CRUD', 'create project (progress derived from milestones)', async () => {
      const r = await request('POST', `/api/clients/${clientId}/projects`, { title: 'Portal Revamp', contractValue: 500000, totalMilestones: 4, milestonesCompleted: 1, leadEngineer: 'Hanna', startDate: '2026-02-01', targetDate: '2026-09-30', status: 'In Progress' });
      assert.equal(r.status, 201);
      const p = r.body.data.projects[0]; p1 = p.id;
      assert.equal(p.progress, 25); assert.equal(p.status, 'In Progress'); assert.equal(p.contractValue, 500000);
    });
    await test('PR-02', 'Projects CRUD', 'title required (400)', async () => {
      assert.equal((await request('POST', `/api/clients/${clientId}/projects`, { title: '' })).status, 400);
    });
    await test('PR-03', 'Projects CRUD', 'completed milestones > total rejected (400)', async () => {
      assert.equal((await request('POST', `/api/clients/${clientId}/projects`, { title: 'X', totalMilestones: 2, milestonesCompleted: 3 })).status, 400);
    });
    await test('PR-04', 'Projects CRUD', 'target before start rejected (400)', async () => {
      assert.equal((await request('POST', `/api/clients/${clientId}/projects`, { title: 'X', startDate: '2026-05-01', targetDate: '2026-04-01' })).status, 400);
    });
    await test('PR-05', 'Projects CRUD', 'negative contract value rejected (400)', async () => {
      assert.equal((await request('POST', `/api/clients/${clientId}/projects`, { title: 'X', contractValue: -5 })).status, 400);
    });
    await test('PR-06', 'Projects CRUD', 'create second project', async () => {
      const r = await request('POST', `/api/clients/${clientId}/projects`, { title: 'Mobile App', contractValue: 250000, totalMilestones: 2 });
      assert.equal(r.status, 201); p2 = r.body.data.projects[1].id;
    });
    await test('PR-07', 'Projects CRUD', 'update project recalculates progress; 100% auto-completes', async () => {
      const u = await request('PUT', `/api/clients/${clientId}/projects/${p1}`, { milestonesCompleted: 4 });
      const p = u.body.data.projects.find((x) => x.id === p1);
      assert.equal(p.progress, 100); assert.equal(p.status, 'Completed');
      const back = await request('PUT', `/api/clients/${clientId}/projects/${p1}`, { milestonesCompleted: 2, title: 'Portal Revamp v2' });
      const q = back.body.data.projects.find((x) => x.id === p1);
      assert.equal(q.progress, 50); assert.equal(q.status, 'In Progress'); assert.equal(q.title, 'Portal Revamp v2');
    });
    await test('PR-08', 'Projects CRUD', 'update/delete unknown project returns 404', async () => {
      assert.equal((await request('PUT', `/api/clients/${clientId}/projects/nope`, { title: 'z' })).status, 404);
      assert.equal((await request('DELETE', `/api/clients/${clientId}/projects/nope`)).status, 404);
    });

    // ---------------------------------------------------------- 4: invoices linked to project id
    await test('IV-01', 'Invoice ↔ Project', 'seed invoices created for the test client', async () => {
      const c = await Client.findOne({ clientId });
      c.invoices.push({ id: 'inv-zz-1', invoiceNumber: 'ZZ-0001', totalAmount: 100000, status: 'Paid' });
      c.invoices.push({ id: 'inv-zz-2', invoiceNumber: 'ZZ-0002', totalAmount: 50000, status: 'Sent' });
      await c.save();
    });
    await test('IV-02', 'Invoice ↔ Project', 'link invoice to project id', async () => {
      const r = await request('PUT', `/api/clients/${clientId}/invoices/inv-zz-1`, { projectId: p1 });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.invoices.find((i) => i.id === 'inv-zz-1').projectId, p1);
    });
    await test('IV-03', 'Invoice ↔ Project', 'invoice values group by project id', async () => {
      await request('PUT', `/api/clients/${clientId}/invoices/inv-zz-2`, { projectId: p1 });
      const c = (await request('GET', `/api/clients/${clientId}`)).body.data;
      const total = c.invoices.filter((i) => i.projectId === p1).reduce((s, i) => s + i.totalAmount, 0);
      assert.equal(total, 150000);
      assert.equal(c.invoices.filter((i) => i.projectId === p2).length, 0);
    });
    await test('IV-04', 'Invoice ↔ Project', 'linking to a foreign project id rejected (400); unknown invoice 404', async () => {
      assert.equal((await request('PUT', `/api/clients/${clientId}/invoices/inv-zz-1`, { projectId: 'proj-foreign' })).status, 400);
      assert.equal((await request('PUT', `/api/clients/${clientId}/invoices/none`, { projectId: p1 })).status, 404);
    });
    await test('IV-05', 'Invoice ↔ Project', 'unlink invoice (empty projectId)', async () => {
      const r = await request('PUT', `/api/clients/${clientId}/invoices/inv-zz-2`, { projectId: '' });
      assert.equal(r.body.data.invoices.find((i) => i.id === 'inv-zz-2').projectId, '');
    });
    await test('IV-06', 'Invoice ↔ Project', 'deleting a project unassigns its invoices', async () => {
      const d = await request('DELETE', `/api/clients/${clientId}/projects/${p1}`);
      assert.equal(d.status, 200);
      assert.ok(!d.body.data.projects.some((x) => x.id === p1));
      assert.equal(d.body.data.invoices.find((i) => i.id === 'inv-zz-1').projectId, '');
    });
    await test('IV-07', 'Invoice ↔ Project', 'seeded Omni Retail invoices carry project ids', async () => {
      const r = await request('GET', '/api/clients/client-omni-retail');
      if (r.status !== 200) return; // directory may have been customised
      assert.ok(r.body.data.invoices.every((i) => !i.projectId || r.body.data.projects.some((p) => p.id === i.projectId)));
    });

    // ---------------------------------------------------------- 6: contracts CRUD
    let d1;
    await test('CT-01', 'Contracts CRUD', 'create contract with file, category and validity dates', async () => {
      const r = await request('POST', `/api/clients/${clientId}/documents`, { name: 'MSA 2026', category: 'MSA', startDate: '2026-01-01', endDate: '2026-12-31', notes: 'Annual', data: PDF, type: 'PDF' });
      assert.equal(r.status, 201);
      const d = r.body.data.documents[0]; d1 = d.id;
      assert.equal(d.category, 'MSA'); assert.equal(d.data, PDF); assert.match(d.size, /KB|MB/);
    });
    await test('CT-02', 'Contracts CRUD', 'name required (400)', async () => {
      assert.equal((await request('POST', `/api/clients/${clientId}/documents`, { name: ' ' })).status, 400);
    });
    await test('CT-03', 'Contracts CRUD', 'invalid category rejected (400)', async () => {
      assert.equal((await request('POST', `/api/clients/${clientId}/documents`, { name: 'X', category: 'Zzz' })).status, 400);
    });
    await test('CT-04', 'Contracts CRUD', 'end before start rejected (400)', async () => {
      assert.equal((await request('POST', `/api/clients/${clientId}/documents`, { name: 'X', startDate: '2026-05-01', endDate: '2026-01-01' })).status, 400);
    });
    await test('CT-05', 'Contracts CRUD', 'update metadata keeps the uploaded file', async () => {
      const u = await request('PUT', `/api/clients/${clientId}/documents/${d1}`, { name: 'MSA 2026 (signed)', category: 'SOW', endDate: '2027-03-31' });
      assert.equal(u.status, 200);
      const d = u.body.data.documents.find((x) => x.id === d1);
      assert.equal(d.name, 'MSA 2026 (signed)'); assert.equal(d.category, 'SOW'); assert.equal(d.endDate, '2027-03-31'); assert.equal(d.data, PDF);
    });
    await test('CT-06', 'Contracts CRUD', 'update can replace the file', async () => {
      const u = await request('PUT', `/api/clients/${clientId}/documents/${d1}`, { data: PNG, type: 'PNG' });
      const d = u.body.data.documents.find((x) => x.id === d1);
      assert.equal(d.data, PNG); assert.equal(d.type, 'PNG');
    });
    await test('CT-07', 'Contracts CRUD', 'update with end before start rejected (400); unknown id 404', async () => {
      assert.equal((await request('PUT', `/api/clients/${clientId}/documents/${d1}`, { endDate: '2020-01-01' })).status, 400);
      assert.equal((await request('PUT', `/api/clients/${clientId}/documents/nope`, { name: 'q' })).status, 404);
    });
    await test('CT-08', 'Contracts CRUD', 'delete contract', async () => {
      const d = await request('DELETE', `/api/clients/${clientId}/documents/${d1}`);
      assert.equal(d.status, 200); assert.ok(!d.body.data.documents.some((x) => x.id === d1));
      assert.equal((await request('DELETE', `/api/clients/${clientId}/documents/${d1}`)).status, 404);
    });

    // ---------------------------------------------------------- cleanup deletes
    await test('ST-11', 'Service Type CRUD', 'delete service types (and 404 afterwards)', async () => {
      for (const id of createdTypes) assert.equal((await request('DELETE', `/api/service-types/${id}`)).status, 200);
      assert.equal((await request('DELETE', `/api/service-types/${createdTypes[0]}`)).status, 404);
      createdTypes.length = 0;
    });
  } finally {
    for (const id of createdTypes) await ServiceType.findByIdAndDelete(id);
    await Client.deleteMany({ company: new RegExp(`^${TAG}`) });
    await new Promise((r) => server.close(r));
    await disconnectDB();
  }
  const failed = results.filter((r) => r.status === 'FAIL');
  fs.writeFileSync(path.join(__dirname, 'client-modules-results.json'), JSON.stringify({ ranAt: new Date().toISOString(), total: results.length, passed: results.length - failed.length, failed: failed.length, results }, null, 2));
  console.log(`\n${results.length - failed.length}/${results.length} backend tests passed`);
  if (failed.length) process.exit(1);
}

run().catch((e) => { console.error(e); process.exit(1); });
