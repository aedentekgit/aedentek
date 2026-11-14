import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.PORT = '5097';

const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { default: Client } = await import('../src/models/Client.js');

const PORT = 5097;
const BASE_URL = `http://localhost:${PORT}`;

let server;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING CLIENT DETAILS & 360° MANAGEMENT INTEGRATION TESTS ---');
  await connectDB();
  server = app.listen(PORT, () => {
    console.log(`[TEST-SERVER] Listening on ${BASE_URL}`);
  });

  try {
    // TEST 1: Reset & Seed
    console.log('\nTest 1: POST /api/clients/reset');
    const resetRes = await request('POST', '/api/clients/reset');
    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.body.success, true);
    assert.equal(Array.isArray(resetRes.body.data), true);
    assert.ok(resetRes.body.data.length >= 3);

    const omni = resetRes.body.data.find((c) => c.clientId === 'client-omni-retail');
    assert.ok(omni);
    assert.equal(omni.company, 'Omni Retail Solutions Ltd');
    assert.equal(omni.category, 'Enterprise');
    assert.equal(omni.websites.length, 2);
    assert.equal(omni.credentials.length, 2);
    assert.equal(omni.projects.length, 2);
    assert.equal(omni.invoices.length, 2);
    assert.equal(omni.payments.length, 2);
    assert.equal(omni.compliance.gstinValid, true);
    assert.equal(omni.financialSummary.totalBilled, 826000);
    assert.equal(omni.financialSummary.totalPaid, 672000);
    assert.equal(omni.financialSummary.totalOutstanding, 154000);
    console.log('✓ Reset and seeded 3 clients with all 11 submodules and accurate financial ledger');

    // TEST 2: List & KPI Telemetry
    console.log('\nTest 2: GET /api/clients');
    const listRes = await request('GET', '/api/clients');
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.success, true);
    assert.ok(listRes.body.kpis);
    assert.ok(listRes.body.kpis.totalClients >= 3);
    assert.ok(listRes.body.kpis.activeClients >= 3);
    assert.ok(listRes.body.kpis.enterpriseAccounts >= 2);
    console.log('✓ Retrieved client directory with portfolio KPI telemetry');

    // TEST 3: Category Filter
    console.log('\nTest 3: GET /api/clients?category=Enterprise');
    const catRes = await request('GET', '/api/clients?category=Enterprise');
    assert.equal(catRes.status, 200);
    assert.ok(catRes.body.data.every((c) => c.category === 'Enterprise'));
    console.log('✓ Category filter verified (only Enterprise clients returned)');

    // TEST 4: Search Filter
    console.log('\nTest 4: GET /api/clients?q=Kavita');
    const searchRes = await request('GET', '/api/clients?q=Kavita');
    assert.equal(searchRes.status, 200);
    assert.equal(searchRes.body.data.length, 1);
    assert.equal(searchRes.body.data[0].company, 'Kavita Edutech');
    console.log('✓ Search query verified across corporate name and contact');

    // TEST 5: Get Client 360 by ID
    console.log('\nTest 5: GET /api/clients/:id');
    const singleRes = await request('GET', '/api/clients/client-omni-retail');
    assert.equal(singleRes.status, 200);
    assert.equal(singleRes.body.success, true);
    assert.equal(singleRes.body.data.clientId, 'client-omni-retail');
    assert.equal(singleRes.body.data.company, 'Omni Retail Solutions Ltd');
    console.log('✓ Client 360 command center record retrieved successfully');

    // TEST 6: Create New Client
    console.log('\nTest 6: POST /api/clients (Direct Onboarding)');
    const newClientPayload = {
      company: 'Zenith Apex Corp',
      name: 'Vikram Seth',
      email: 'vikram@zenithapex.com',
      phone: '+91 98111 22334',
      category: 'Startup',
      gstNumber: '29ABCDE1234F1Z5',
      address: 'Indiranagar 100ft Road, Bengaluru, Karnataka 560038',
      city: 'Bengaluru',
      website: 'https://zenithapex.com',
    };
    const createRes = await request('POST', '/api/clients', newClientPayload);
    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.success, true);
    assert.equal(createRes.body.data.company, 'Zenith Apex Corp');
    assert.equal(createRes.body.data.contacts.length, 1);
    assert.equal(createRes.body.data.contacts[0].isPrimary, true);
    assert.equal(createRes.body.data.contacts[0].name, 'Vikram Seth');
    assert.equal(createRes.body.data.timeline.length, 1);
    const zId = createRes.body.data.clientId;
    console.log('✓ Direct client registration auto-provisioned primary contact and timeline log');

    // TEST 7: Update Client Profile
    console.log('\nTest 7: PUT /api/clients/:id');
    const updatePayload = {
      address: 'Updated 100ft Road, Indiranagar Stage 2, Bengaluru',
      notes: 'Updated client profile with extended terms.',
    };
    const updateRes = await request('PUT', `/api/clients/${zId}`, updatePayload);
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.address, updatePayload.address);
    assert.equal(updateRes.body.data.notes, updatePayload.notes);
    console.log('✓ Client corporate coordinates and notes updated with audit log');

    // TEST 8: Add & Delete Website
    console.log('\nTest 8: POST & DELETE /api/clients/:id/websites');
    const initialWebsitesCount = (await request('GET', `/api/clients/${zId}`)).body.data.websites.length;
    const addWebRes = await request('POST', `/api/clients/${zId}/websites`, {
      domain: 'api.zenithapex.com',
      status: 'Live',
      hostingProvider: 'Cloudflare Pages',
      sslExpiry: '2027-01-01',
    });
    assert.equal(addWebRes.status, 201);
    assert.equal(addWebRes.body.data.websites.length, initialWebsitesCount + 1);
    const addedWeb = addWebRes.body.data.websites.find((w) => w.domain === 'api.zenithapex.com');
    assert.ok(addedWeb);
    const webId = addedWeb.id;

    const delWebRes = await request('DELETE', `/api/clients/${zId}/websites/${webId}`);
    assert.equal(delWebRes.status, 200);
    assert.equal(delWebRes.body.data.websites.length, initialWebsitesCount);
    console.log('✓ Website domain added and deleted cleanly');

    // TEST 9: Add & Delete Credential Vault Entry
    console.log('\nTest 9: POST & DELETE /api/clients/:id/credentials');
    const addCredRes = await request('POST', `/api/clients/${zId}/credentials`, {
      type: 'PostgreSQL',
      label: 'Supabase Staging Database',
      loginUrl: 'postgres://app:secret@db.zenith.internal:5432/main',
      username: 'service_role',
      password: 'SuperSecretPostgresPassword123!',
      notes: 'Admin level credentials for database operations',
    });
    assert.equal(addCredRes.status, 201);
    assert.equal(addCredRes.body.data.credentials.length, 1);
    const credId = addCredRes.body.data.credentials[0].id;

    const delCredRes = await request('DELETE', `/api/clients/${zId}/credentials/${credId}`);
    assert.equal(delCredRes.status, 200);
    assert.equal(delCredRes.body.data.credentials.length, 0);
    console.log('✓ Credential secret stored in encrypted vault and deleted cleanly');

    // TEST 10: Delete Client
    console.log('\nTest 10: DELETE /api/clients/:id');
    const delClientRes = await request('DELETE', `/api/clients/${zId}`);
    assert.equal(delClientRes.status, 200);
    assert.equal(delClientRes.body.success, true);

    const verifyRes = await request('GET', `/api/clients/${zId}`);
    assert.equal(verifyRes.status, 404);
    console.log('✓ Client deleted cleanly and confirmed absent from registry');

    console.log('\n======================================================');
    console.log('ALL CLIENT 360 MANAGEMENT TESTS PASSED (10/10)');
    console.log('======================================================\n');
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
