// Integration tests: server-side pagination, project stage master + per-project timeline,
// agreement monthly billing (with / without GST) and EMI initial payment.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.NODE_ENV = 'test';
process.env.PORT = '5099';

const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { default: ProjectStage } = await import('../src/models/ProjectStage.js');
const { default: Client } = await import('../src/models/Client.js');
const { default: Emi } = await import('../src/models/accounts/Emi.js');
const { paginateArray } = await import('../src/middleware/paginate.js');
const { computeEmi, validateEmiInput } = await import('../src/utils/emiEngine.js');
const { agreementMonths } = await import('../src/controllers/clientSubController.js');

const PORT = 5099;
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

const TAG = `ZZENH${Date.now().toString().slice(-6)}`;
const near = (a, b, t = 0.011) => Math.abs(a - b) <= t;

async function run() {
  await connectDB();
  server = app.listen(PORT);
  let clientId;
  const emiIds = [];
  try {
    // ============================================================ 6. SERVER-SIDE PAGINATION
    await test('PG-01', 'Pagination', 'paginateArray slices 10 per page with correct metadata', () => {
      const items = Array.from({ length: 25 }, (_, i) => i + 1);
      const p1 = paginateArray(items, { page: '1' });
      assert.deepEqual(p1.items, items.slice(0, 10));
      assert.deepEqual(p1.pagination, { page: 1, limit: 10, total: 25, totalPages: 3, hasNext: true, hasPrev: false, from: 1, to: 10 });
      const p3 = paginateArray(items, { page: '3' });
      assert.deepEqual(p3.items, [21, 22, 23, 24, 25]);
      assert.equal(p3.pagination.hasNext, false); assert.equal(p3.pagination.from, 21); assert.equal(p3.pagination.to, 25);
    });
    await test('PG-02', 'Pagination', 'out-of-range / invalid page numbers are clamped; limit is capped at 100', () => {
      const items = Array.from({ length: 25 }, (_, i) => i);
      assert.equal(paginateArray(items, { page: '99' }).pagination.page, 3);
      assert.equal(paginateArray(items, { page: '-4' }).pagination.page, 1);
      assert.equal(paginateArray(items, { page: 'abc' }).pagination.page, 1);
      assert.equal(paginateArray(items, { page: '1', limit: '5000' }).pagination.limit, 100);
      assert.equal(paginateArray([], { page: '1' }).pagination.totalPages, 1);
      assert.equal(paginateArray([], { page: '1' }).pagination.from, 0);
    });

    // create 25 stages tagged for the live API pagination checks
    for (let i = 1; i <= 25; i += 1) {
      const r = await request('POST', '/api/project-stages', { name: `${TAG} Stage ${String(i).padStart(2, '0')}`, sequence: 1000 + i, status: i % 5 === 0 ? 'Inactive' : 'Active' });
      assert.equal(r.status, 201);
    }
    await test('PG-03', 'Pagination', 'API returns only 10 rows for ?page=1 with a pagination block', async () => {
      const r = await request('GET', `/api/project-stages?q=${TAG}&page=1`);
      assert.equal(r.status, 200);
      assert.equal(r.body.data.length, 10);
      assert.equal(r.body.pagination.total, 25); assert.equal(r.body.pagination.totalPages, 3);
      assert.equal(r.body.pagination.hasNext, true); assert.equal(r.body.pagination.hasPrev, false);
    });
    await test('PG-04', 'Pagination', 'page 2 returns the next 10 and page 3 the remaining 5 (no overlap)', async () => {
      const a = (await request('GET', `/api/project-stages?q=${TAG}&page=1`)).body.data.map((x) => x._id);
      const b = (await request('GET', `/api/project-stages?q=${TAG}&page=2`)).body;
      const c = (await request('GET', `/api/project-stages?q=${TAG}&page=3`)).body;
      assert.equal(b.data.length, 10); assert.equal(c.data.length, 5);
      assert.equal(new Set([...a, ...b.data.map((x) => x._id), ...c.data.map((x) => x._id)]).size, 25);
      assert.equal(c.pagination.hasNext, false); assert.equal(c.pagination.from, 21); assert.equal(c.pagination.to, 25);
    });
    await test('PG-05', 'Pagination', 'filters are applied BEFORE paging (status=Active → 20 rows → 2 pages)', async () => {
      const r = await request('GET', `/api/project-stages?q=${TAG}&status=Active&page=1`);
      assert.equal(r.body.pagination.total, 20); assert.equal(r.body.pagination.totalPages, 2);
      assert.ok(r.body.data.every((x) => x.status === 'Active'));
    });
    await test('PG-06', 'Pagination', 'custom ?limit= is honoured', async () => {
      const r = await request('GET', `/api/project-stages?q=${TAG}&page=2&limit=7`);
      assert.equal(r.body.data.length, 7); assert.equal(r.body.pagination.limit, 7); assert.equal(r.body.pagination.totalPages, 4);
    });
    await test('PG-07', 'Pagination', 'requests WITHOUT ?page= still return the full list (no pagination block)', async () => {
      const r = await request('GET', `/api/project-stages?q=${TAG}`);
      assert.equal(r.body.data.length, 25); assert.equal(r.body.pagination, undefined);
    });
    await test('PG-08', 'Pagination', 'KPI block describes the whole set, not the page', async () => {
      const r = await request('GET', `/api/project-stages?q=${TAG}&page=1`);
      assert.ok(r.body.kpis.total >= 25); assert.ok(r.body.kpis.active >= 20);
    });
    await test('PG-09', 'Pagination', 'server-side ordering ?sort=&dir= is applied before slicing', async () => {
      const asc = (await request('GET', `/api/project-stages?q=${TAG}&page=1&sort=name&dir=asc`)).body.data;
      const desc = (await request('GET', `/api/project-stages?q=${TAG}&page=1&sort=name&dir=desc`)).body.data;
      assert.equal(asc[0].name, `${TAG} Stage 01`); assert.equal(desc[0].name, `${TAG} Stage 25`);
    });
    await test('PG-10', 'Pagination', 'works on other modules (clients, service types, invoices, HR, accounts)', async () => {
      for (const u of ['/api/clients', '/api/service-types', '/api/invoices', '/api/propagations', '/api/staff', '/api/hr/leave', '/api/hr/staff-attendance', '/api/accounts/expenses', '/api/accounts/sales', '/api/accounts/emi', '/api/accounts/assets']) {
        const r = await request('GET', `${u}?page=1&limit=10`);
        assert.equal(r.status, 200, u);
        assert.ok(r.body.pagination && r.body.data.length <= 10, `${u} not paginated`);
        assert.equal(r.body.pagination.total >= r.body.data.length, true);
      }
    });
    await test('PG-11', 'Pagination', 'error responses are never altered by the middleware', async () => {
      const r = await request('GET', '/api/clients/does-not-exist?page=1');
      assert.equal(r.status, 404); assert.equal(r.body.pagination, undefined);
    });

    // ============================================================ 7. PROJECT STAGE MASTER
    let stageA, stageB, stageInactive;
    await test('STG-01', 'Project stage master', 'create / read stages with sequence and status', async () => {
      const a = await request('POST', '/api/project-stages', { name: `${TAG} Discovery`, sequence: 1, description: 'd' });
      const b = await request('POST', '/api/project-stages', { name: `${TAG} Build`, sequence: 2 });
      const c = await request('POST', '/api/project-stages', { name: `${TAG} Legacy`, status: 'Inactive' });
      assert.equal(a.status, 201); stageA = a.body.data._id; stageB = b.body.data._id; stageInactive = c.body.data._id;
      assert.equal((await request('GET', `/api/project-stages/${stageA}`)).body.data.name, `${TAG} Discovery`);
    });
    await test('STG-02', 'Project stage master', 'validation: name required, duplicate (case-insensitive) 409, bad status 400, bad sequence 400', async () => {
      assert.equal((await request('POST', '/api/project-stages', { name: ' ' })).status, 400);
      assert.equal((await request('POST', '/api/project-stages', { name: `${TAG} discovery` })).status, 409);
      assert.equal((await request('POST', '/api/project-stages', { name: `${TAG} X`, status: 'Maybe' })).status, 400);
      assert.equal((await request('POST', '/api/project-stages', { name: `${TAG} Y`, sequence: -2 })).status, 400);
    });
    await test('STG-03', 'Project stage master', '?status=Active lists ONLY active stages (used by the project timeline picker)', async () => {
      const r = await request('GET', `/api/project-stages?status=Active&q=${TAG}`);
      assert.ok(r.body.data.every((x) => x.status === 'Active'));
      assert.ok(r.body.data.some((x) => x._id === stageA) && !r.body.data.some((x) => x._id === stageInactive));
    });
    await test('STG-04', 'Project stage master', 'update + toggle status; duplicate rename rejected; 404 for unknown id', async () => {
      const u = await request('PUT', `/api/project-stages/${stageB}`, { description: 'Build it', status: 'Inactive' });
      assert.equal(u.body.data.status, 'Inactive');
      assert.equal((await request('PUT', `/api/project-stages/${stageB}`, { status: 'Active' })).body.data.status, 'Active');
      assert.equal((await request('PUT', `/api/project-stages/${stageB}`, { name: `${TAG} Discovery` })).status, 409);
      assert.equal((await request('PUT', '/api/project-stages/000000000000000000000000', { name: 'x' })).status, 404);
    });

    // ============================================================ 7. PER-PROJECT STAGE TIMELINE
    const created = await request('POST', '/api/clients', { company: `${TAG} Co`, name: 'T', email: 't@zz.io', phone: '1', agreementFrom: '2026-04-12', agreementTo: '2027-04-11' });
    clientId = created.body.data.clientId;
    let proj1, proj2;
    await test('TL-01', 'Project timeline', 'project created with a chosen set of stages (each project differs)', async () => {
      const r1 = await request('POST', `/api/clients/${clientId}/projects`, { title: 'P1', stageIds: [stageA, stageB] });
      assert.equal(r1.status, 201);
      const r2 = await request('POST', `/api/clients/${clientId}/projects`, { title: 'P2', stageIds: [stageB] });
      proj1 = r1.body.data.projects[0]; proj2 = r2.body.data.projects[1];
      assert.deepEqual(proj1.stages.map((s) => s.name), [`${TAG} Discovery`, `${TAG} Build`]);
      assert.equal(proj2.stages.length, 1); assert.equal(proj1.stages.every((s) => s.status === 'Pending'), true);
      assert.equal(proj1.progress, 0);
    });
    await test('TL-02', 'Project timeline', 'inactive or unknown stages cannot be added (400)', async () => {
      assert.equal((await request('POST', `/api/clients/${clientId}/projects`, { title: 'X', stageIds: [stageInactive] })).status, 400);
      assert.equal((await request('POST', `/api/clients/${clientId}/projects`, { title: 'X', stageIds: ['nope'] })).status, 400);
      assert.equal((await request('POST', `/api/clients/${clientId}/projects`, { title: 'X', stageIds: '5' })).status, 400);
    });
    await test('TL-03', 'Project timeline', 'completing stages drives progress (50% → 100% auto-Completed)', async () => {
      const g = (await request('GET', `/api/clients/${clientId}`)).body.data.projects.find((p) => p.id === proj1.id);
      const s1 = g.stages[0].id; const s2 = g.stages[1].id;
      const u1 = await request('PUT', `/api/clients/${clientId}/projects/${proj1.id}/stages/${s1}`, { status: 'Completed' });
      let p = u1.body.data.projects.find((x) => x.id === proj1.id);
      assert.equal(p.progress, 50); assert.ok(p.stages[0].completedDate);
      const u2 = await request('PUT', `/api/clients/${clientId}/projects/${proj1.id}/stages/${s2}`, { status: 'Completed' });
      p = u2.body.data.projects.find((x) => x.id === proj1.id);
      assert.equal(p.progress, 100); assert.equal(p.status, 'Completed');
      const back = await request('PUT', `/api/clients/${clientId}/projects/${proj1.id}/stages/${s2}`, { status: 'In Progress' });
      p = back.body.data.projects.find((x) => x.id === proj1.id);
      assert.equal(p.progress, 50); assert.equal(p.status, 'In Progress'); assert.equal(p.stages[1].completedDate, '');
    });
    await test('TL-04', 'Project timeline', 'stage dates validated; invalid status rejected; unknown entry 404', async () => {
      const g = (await request('GET', `/api/clients/${clientId}`)).body.data.projects.find((p) => p.id === proj1.id);
      const sid = g.stages[0].id;
      assert.equal((await request('PUT', `/api/clients/${clientId}/projects/${proj1.id}/stages/${sid}`, { startDate: '2026-05-01', dueDate: '2026-04-01' })).status, 400);
      assert.equal((await request('PUT', `/api/clients/${clientId}/projects/${proj1.id}/stages/${sid}`, { status: 'Done' })).status, 400);
      assert.equal((await request('PUT', `/api/clients/${clientId}/projects/${proj1.id}/stages/nope`, { status: 'Pending' })).status, 404);
      const ok = await request('PUT', `/api/clients/${clientId}/projects/${proj1.id}/stages/${sid}`, { startDate: '2026-05-01', dueDate: '2026-06-01', notes: 'n' });
      assert.equal(ok.status, 200);
    });
    await test('TL-05', 'Project timeline', 'add a stage to a project (duplicate 409, inactive 400) and remove a stage', async () => {
      const extra = (await request('POST', '/api/project-stages', { name: `${TAG} Extra`, sequence: 9 })).body.data._id;
      const add = await request('POST', `/api/clients/${clientId}/projects/${proj2.id}/stages`, { stageId: extra });
      assert.equal(add.status, 201);
      const p = add.body.data.projects.find((x) => x.id === proj2.id);
      assert.equal(p.stages.length, 2); assert.equal(p.stages[1].name, `${TAG} Extra`);
      assert.equal((await request('POST', `/api/clients/${clientId}/projects/${proj2.id}/stages`, { stageId: extra })).status, 409);
      assert.equal((await request('POST', `/api/clients/${clientId}/projects/${proj2.id}/stages`, { stageId: stageInactive })).status, 400);
      const rm = await request('DELETE', `/api/clients/${clientId}/projects/${proj2.id}/stages/${p.stages[0].id}`);
      const q = rm.body.data.projects.find((x) => x.id === proj2.id);
      assert.equal(q.stages.length, 1); assert.equal(q.stages[0].order, 1);
      assert.equal((await request('DELETE', `/api/clients/${clientId}/projects/${proj2.id}/stages/nope`)).status, 404);
    });
    await test('TL-06', 'Project timeline', 'editing a project keeps existing stage progress when its stage list is re-sent', async () => {
      const g = (await request('GET', `/api/clients/${clientId}`)).body.data.projects.find((p) => p.id === proj1.id);
      const ids = g.stages.map((s) => s.stageId);
      const u = await request('PUT', `/api/clients/${clientId}/projects/${proj1.id}`, { title: 'P1 renamed', stageIds: ids });
      const p = u.body.data.projects.find((x) => x.id === proj1.id);
      assert.equal(p.title, 'P1 renamed'); assert.equal(p.stages[0].status, 'Completed');
      const dropped = await request('PUT', `/api/clients/${clientId}/projects/${proj1.id}`, { stageIds: [ids[0]] });
      assert.equal(dropped.body.data.projects.find((x) => x.id === proj1.id).stages.length, 1);
    });

    // ============================================================ 2. AGREEMENT MONTHLY BILLING
    await test('BL-01', 'Monthly billing', 'month enumeration follows the agreement From → To dates', () => {
      assert.equal(agreementMonths('2026-04-12', '2027-04-11').length, 12);
      assert.equal(agreementMonths('2026-01-31', '2026-04-30').map((m) => m.dueDate).join(), '2026-01-31,2026-02-28,2026-03-31,2026-04-30');
      assert.equal(agreementMonths('2026-05-01', '2026-04-01').length, 0);
      assert.equal(agreementMonths('', '').length, 0);
    });
    await test('BL-02', 'Monthly billing', 'WITHOUT GST: 12 months × ₹10,000 = ₹1,20,000, no GST', async () => {
      const r = await request('PUT', `/api/clients/${clientId}/billing`, { amount: 10000, gstMode: 'Without GST' });
      assert.equal(r.status, 200);
      assert.equal(r.body.kpis.months, 12); assert.equal(r.body.kpis.totalValue, 120000); assert.equal(r.body.kpis.totalGst, 0);
      assert.equal(r.body.data.monthlySchedule[0].month, '2026-04'); assert.equal(r.body.data.monthlySchedule[11].month, '2027-03');
    });
    await test('BL-03', 'Monthly billing', 'WITH GST @18%: ₹10,000 → ₹1,800 GST → ₹11,800 / month (₹1,41,600 total)', async () => {
      const r = await request('PUT', `/api/clients/${clientId}/billing`, { amount: 10000, gstMode: 'With GST', gstRate: 18 });
      assert.equal(r.body.kpis.totalGst, 21600); assert.equal(r.body.kpis.totalValue, 141600); assert.equal(r.body.kpis.totalBase, 120000);
      const row = r.body.data.monthlySchedule[0];
      assert.equal(row.baseAmount, 10000); assert.equal(row.gstAmount, 1800); assert.equal(row.totalAmount, 11800);
    });
    await test('BL-04', 'Monthly billing', 'validation: negative amount, bad GST option, GST rate > 100, missing agreement dates', async () => {
      assert.equal((await request('PUT', `/api/clients/${clientId}/billing`, { amount: -1 })).status, 400);
      assert.equal((await request('PUT', `/api/clients/${clientId}/billing`, { gstMode: 'Inclusive' })).status, 400);
      assert.equal((await request('PUT', `/api/clients/${clientId}/billing`, { gstRate: 150 })).status, 400);
      const nodates = (await request('POST', '/api/clients', { company: `${TAG} NoDates`, name: 'n', email: 'n@zz.io' })).body.data.clientId;
      assert.equal((await request('PUT', `/api/clients/${nodates}/billing`, { amount: 5 })).status, 400);
    });
    await test('BL-05', 'Monthly billing', 'billing list is paged on the server: page 1 = 10 months, page 2 = 2 months', async () => {
      const p1 = await request('GET', `/api/clients/${clientId}/billing?page=1`);
      const p2 = await request('GET', `/api/clients/${clientId}/billing?page=2`);
      assert.equal(p1.body.data.length, 10); assert.equal(p2.body.data.length, 2);
      assert.equal(p1.body.pagination.total, 12); assert.equal(p1.body.kpis.totalValue, 141600);
      assert.equal(p2.body.data[0].month, '2027-02'); assert.equal(p2.body.data[1].month, '2027-03');
    });
    let paidId;
    await test('BL-06', 'Monthly billing', 'mark a month PAID (date stamped) and back to PENDING; status filter works', async () => {
      const list = (await request('GET', `/api/clients/${clientId}/billing`)).body.data;
      paidId = list[0].id;
      const r = await request('PUT', `/api/clients/${clientId}/billing/rows/${paidId}`, { status: 'Paid' });
      assert.equal(r.status, 200); assert.equal(r.body.kpis.paidMonths, 1); assert.equal(r.body.kpis.totalPaid, 11800); assert.equal(r.body.kpis.totalPending, 129800);
      const paidRow = r.body.data.monthlySchedule.find((x) => x.id === paidId); assert.ok(paidRow.paidDate);
      const f = await request('GET', `/api/clients/${clientId}/billing?status=Paid`);
      assert.equal(f.body.data.length, 1);
      assert.equal((await request('GET', `/api/clients/${clientId}/billing?status=Pending`)).body.data.length, 11);
      assert.equal((await request('PUT', `/api/clients/${clientId}/billing/rows/${paidId}`, { status: 'Late' })).status, 400);
    });
    await test('BL-07', 'Monthly billing', 'changing the amount re-prices PENDING months but never touches PAID ones', async () => {
      const r = await request('PUT', `/api/clients/${clientId}/billing`, { amount: 20000, gstMode: 'Without GST' });
      const rows = r.body.data.monthlySchedule;
      const paid = rows.find((x) => x.id === paidId);
      assert.equal(paid.status, 'Paid'); assert.equal(paid.totalAmount, 11800);
      assert.equal(rows.filter((x) => x.status === 'Pending').every((x) => x.totalAmount === 20000 && x.gstAmount === 0), true);
      assert.equal(r.body.kpis.months, 12);
    });
    await test('BL-08', 'Monthly billing', 'edit a month amount (GST recalculated); extra manual month; delete month', async () => {
      await request('PUT', `/api/clients/${clientId}/billing`, { amount: 10000, gstMode: 'With GST', gstRate: 12 });
      const list = (await request('GET', `/api/clients/${clientId}/billing?status=Pending`)).body.data;
      const id2 = list[0].id;
      const e = await request('PUT', `/api/clients/${clientId}/billing/rows/${id2}`, { baseAmount: 5000, notes: 'discounted' });
      const row = e.body.data.monthlySchedule.find((x) => x.id === id2);
      assert.equal(row.baseAmount, 5000); assert.equal(row.gstAmount, 600); assert.equal(row.totalAmount, 5600); assert.equal(row.notes, 'discounted');
      const add = await request('POST', `/api/clients/${clientId}/billing/rows`, { month: '2027-06', baseAmount: 1000 });
      assert.equal(add.status, 201); assert.equal(add.body.kpis.months, 13);
      const manual = add.body.data.monthlySchedule.find((x) => x.manual);
      assert.equal(manual.totalAmount, 1120);
      assert.equal((await request('POST', `/api/clients/${clientId}/billing/rows`, { month: 'June' })).status, 400);
      const del = await request('DELETE', `/api/clients/${clientId}/billing/rows/${manual.id}`);
      assert.equal(del.body.kpis.months, 12);
      assert.equal((await request('DELETE', `/api/clients/${clientId}/billing/rows/nope`)).status, 404);
      assert.equal((await request('PUT', `/api/clients/${clientId}/billing/rows/nope`, { notes: 'x' })).status, 404);
    });
    await test('BL-09', 'Monthly billing', 'changing the agreement dates regenerates the schedule (extend to 18 months)', async () => {
      const u = await request('PUT', `/api/clients/${clientId}`, { agreementTo: '2027-10-11' });
      assert.equal(u.status, 200);
      const b = await request('GET', `/api/clients/${clientId}/billing`);
      assert.equal(b.body.kpis.months, 18);
      assert.ok(b.body.data.find((x) => x.id === paidId && x.status === 'Paid'), 'paid month preserved');
    });
    await test('BL-10', 'Monthly billing', 'registering a client WITH monthly billing generates the schedule at once', async () => {
      const r = await request('POST', '/api/clients', { company: `${TAG} Billed`, name: 'b', email: 'b@zz.io', agreementFrom: '2026-01-01', agreementTo: '2026-06-30', monthlyBilling: { amount: 2500, gstMode: 'With GST', gstRate: 18 } });
      assert.equal(r.status, 201); assert.equal(r.body.data.monthlySchedule.length, 6);
      assert.equal(r.body.data.monthlySchedule[0].totalAmount, 2950);
      assert.equal((await request('POST', '/api/clients', { company: `${TAG} Bad`, name: 'b', email: 'b@zz.io', monthlyBilling: { amount: 1, gstMode: 'Nope' } })).status, 400);
    });
    await test('BL-11', 'Monthly billing', 'clear billing removes unpaid months and keeps paid ones', async () => {
      const r = await request('DELETE', `/api/clients/${clientId}/billing`);
      assert.equal(r.status, 200);
      assert.equal(r.body.data.monthlySchedule.length, 1); assert.equal(r.body.data.monthlySchedule[0].status, 'Paid');
      assert.equal(r.body.data.monthlyBilling.amount, 0);
    });
    await test('LS-01', 'Paged client lists', '/lists/:name pages embedded tables on the server (invoices filter by project, documents hide file bytes)', async () => {
      const c = await Client.findOne({ clientId });
      for (let i = 1; i <= 23; i += 1) c.invoices.push({ id: `inv-${i}`, invoiceNumber: `ZZ-${i}`, totalAmount: 100, projectId: i <= 15 ? proj1.id : '' });
      c.documents.push({ id: 'doc-x', name: 'D', data: 'data:application/pdf;base64,AAAA' });
      await c.save();
      const p1 = await request('GET', `/api/clients/${clientId}/lists/invoices?page=1`);
      const p3 = await request('GET', `/api/clients/${clientId}/lists/invoices?page=3`);
      assert.equal(p1.body.data.length, 10); assert.equal(p3.body.data.length, 3); assert.equal(p1.body.pagination.total, 23);
      const byProj = await request('GET', `/api/clients/${clientId}/lists/invoices?page=1&projectId=${proj1.id}`);
      assert.equal(byProj.body.pagination.total, 15);
      assert.equal((await request('GET', `/api/clients/${clientId}/lists/invoices?page=1&projectId=none`)).body.pagination.total, 8);
      const docs = await request('GET', `/api/clients/${clientId}/lists/documents?page=1`);
      assert.equal(docs.body.data[0].data, undefined); assert.equal(docs.body.data[0].hasFile, true);
      assert.equal((await request('GET', `/api/clients/${clientId}/lists/bogus?page=1`)).status, 404);
    });

    // ============================================================ 3. EMI INITIAL PAYMENT
    await test('EM-01', 'EMI initial payment', 'engine: financed = amount − initial; EMI is smaller; total cost = initial + payable + charges', () => {
      const base = computeEmi({ principal: 100000, emiCount: 12, interestRate: 12, startDate: '2026-01-15', processingCharges: 500, transactionFee: 10 });
      const down = computeEmi({ principal: 100000, emiCount: 12, interestRate: 12, startDate: '2026-01-15', processingCharges: 500, transactionFee: 10, initialPayment: 25000 });
      assert.equal(base.initialPayment, 0); assert.equal(base.financedAmount, 100000);
      assert.equal(down.initialPayment, 25000); assert.equal(down.financedAmount, 75000);
      assert.ok(near(down.emiAmount, 6663.66), `EMI ${down.emiAmount}`);
      assert.ok(down.emiAmount < base.emiAmount);
      assert.ok(near(down.totalCost, 25000 + down.totalPayable + 500 + 120, 0.02));
      assert.ok(near(down.totalInterest, down.totalPayable - 75000, 0.02));
      assert.equal(down.schedule[11].balance, 0);
    });
    await test('EM-02', 'EMI initial payment', 'validation: negative or ≥ product amount is rejected', () => {
      const ok = { productName: 'P', category: 'C', principal: 1000, emiCount: 6, interestRate: 0, startDate: '2026-01-01' };
      assert.deepEqual(validateEmiInput({ ...ok, initialPayment: 200 }), []);
      assert.ok(validateEmiInput({ ...ok, initialPayment: -1 })[0].includes('Initial payment'));
      assert.ok(validateEmiInput({ ...ok, initialPayment: 1000 })[0].includes('less than'));
      assert.ok(validateEmiInput({ ...ok, initialPayment: 'abc' })[0].includes('Initial payment'));
    });
    await test('EM-03', 'EMI initial payment', 'API: create with initial payment stores + returns derived values', async () => {
      const r = await request('POST', '/api/accounts/emi', { productName: `${TAG} Treadmill`, category: 'Gym Equipment', principal: 120000, emiCount: 12, interestRate: 0, startDate: '2026-01-10', initialPayment: 20000, processingCharges: 300 });
      assert.equal(r.status, 201); emiIds.push(r.body.data._id);
      assert.equal(r.body.data.initialPayment, 20000); assert.equal(r.body.data.financedAmount, 100000);
      assert.ok(near(r.body.data.emiAmount, 8333.33)); assert.ok(near(r.body.data.totalCost, 20000 + 100000 + 300));
    });
    await test('EM-04', 'EMI initial payment', 'API: initial payment ≥ amount returns 400; calculate preview honours it', async () => {
      const bad = await request('POST', '/api/accounts/emi', { productName: `${TAG} Bad`, category: 'X', principal: 1000, emiCount: 6, interestRate: 0, startDate: '2026-01-10', initialPayment: 1000 });
      assert.equal(bad.status, 400);
      const calc = await request('POST', '/api/accounts/emi/calculate', { productName: 'p', category: 'c', principal: 1200, emiCount: 6, interestRate: 0, startDate: '2026-01-10', initialPayment: 200 });
      assert.equal(calc.body.data.emiAmount, 166.67); assert.equal(calc.body.data.financedAmount, 1000);
    });
    await test('EM-05', 'EMI initial payment', 'API: update the initial payment recalculates; legacy plans (no initial payment) are unchanged', async () => {
      const u = await request('PUT', `/api/accounts/emi/${emiIds[0]}`, { initialPayment: 60000 });
      assert.equal(u.status, 200); assert.equal(u.body.data.financedAmount, 60000); assert.ok(near(u.body.data.emiAmount, 5000));
      const legacy = await Emi.create({ emiNumber: `${TAG}-LEG`, productName: `${TAG} Legacy`, category: 'Old', principal: 12000, emiCount: 12, interestRate: 0, startDate: '2026-01-01' });
      emiIds.push(String(legacy._id));
      const g = await request('GET', `/api/accounts/emi/${legacy._id}`);
      assert.equal(g.body.data.initialPayment, 0); assert.equal(g.body.data.emiAmount, 1000); assert.equal(g.body.data.financedAmount, 12000);
    });
    await test('EM-06', 'EMI initial payment', 'delete EMI plans', async () => {
      for (const id of emiIds) assert.equal((await request('DELETE', `/api/accounts/emi/${id}`)).status, 200);
      emiIds.length = 0;
    });
  } finally {
    await ProjectStage.deleteMany({ name: new RegExp(`^${TAG}`) });
    await Client.deleteMany({ company: new RegExp(`^${TAG}`) });
    for (const id of emiIds) await Emi.findByIdAndDelete(id);
    await Emi.deleteMany({ productName: new RegExp(`^${TAG}`) });
    await new Promise((r) => server.close(r));
    await disconnectDB();
  }
  const failed = results.filter((r) => r.status === 'FAIL');
  fs.writeFileSync(path.join(__dirname, 'enhancements-results.json'), JSON.stringify({ ranAt: new Date().toISOString(), total: results.length, passed: results.length - failed.length, failed: failed.length, results }, null, 2));
  console.log(`\n${results.length - failed.length}/${results.length} backend tests passed`);
  if (failed.length) process.exit(1);
}
run().catch((e) => { console.error(e); process.exit(1); });
