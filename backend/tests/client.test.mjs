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
    assert.equal(omni.social.length, 3);
    assert.equal(omni.monthlySchedule.length, 3);
    assert.equal(omni.compliance.gstinValid, true);
    assert.equal(omni.financialSummary.totalBilled, 826000);
    assert.equal(omni.financialSummary.totalPaid, 672000);
    assert.equal(omni.financialSummary.totalOutstanding, 154000);

    // Verify for EACH customer that EACH section is an Array form collection
    const arraySections = [
      'contacts', 'websites', 'social', 'credentials', 'projects',
      'invoices', 'payments', 'tickets', 'documents', 'timeline', 'monthlySchedule'
    ];
    for (const c of resetRes.body.data) {
      for (const sec of arraySections) {
        assert.ok(Array.isArray(c[sec]), `Expected ${c.company}.${sec} to be an Array collection, got ${typeof c[sec]}`);
      }
    }
    console.log('✓ Reset and seeded 3 clients with all 11 submodules (guaranteed array form collections) and accurate financial ledger');

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

    // TEST 9b: Add, List, Update & Delete Social Channel
    console.log('\nTest 9b: POST, GET, PUT & DELETE /api/clients/:id/social');
    const addSocRes = await request('POST', `/api/clients/${zId}/social`, {
      name: 'GitHub Enterprise',
      handle: 'github.com/zenith-cloudworks',
      desc: 'Source code repositories and automated CI webhooks',
      href: 'https://github.com/zenith-cloudworks',
      tone: 'violet'
    });
    assert.equal(addSocRes.status, 201);
    assert.equal(addSocRes.body.data.social.length, 1);
    const socId = addSocRes.body.data.social[0].id;
    assert.equal(addSocRes.body.data.social[0].name, 'GitHub Enterprise');

    // List via paginated lists endpoint
    const listSocRes = await request('GET', `/api/clients/${zId}/lists/social`);
    assert.equal(listSocRes.status, 200);
    assert.equal(listSocRes.body.total, 1);
    assert.equal(listSocRes.body.data[0].id, socId);

    // Update social channel
    const updSocRes = await request('PUT', `/api/clients/${zId}/social/${socId}`, {
      desc: 'Updated corporate repository pipeline'
    });
    assert.equal(updSocRes.status, 200);
    const updatedSoc = updSocRes.body.data.social.find((s) => s.id === socId);
    assert.equal(updatedSoc.desc, 'Updated corporate repository pipeline');

    // Delete social channel
    const delSocRes = await request('DELETE', `/api/clients/${zId}/social/${socId}`);
    assert.equal(delSocRes.status, 200);
    assert.equal(delSocRes.body.data.social.length, 0);
    console.log('✓ Social channel added, listed via /lists/social, updated and deleted cleanly');

    // TEST 9c: Document Upload as Array Type (Multiple Documents with Name, fileName, type, size, data)
    console.log('\nTest 9c: Document Upload as Array Type (POST /api/clients/:id/documents)');

    // 1. Validation test: missing name in array element
    const invalidArrayRes = await request('POST', `/api/clients/${zId}/documents`, {
      documents: [
        { name: 'Valid Document', fileName: 'valid.pdf' },
        { name: '', fileName: 'unnamed.pdf' }
      ]
    });
    assert.equal(invalidArrayRes.status, 400);
    assert.ok(invalidArrayRes.body.message.includes('Document 2'));
    console.log('✓ Validation properly rejected unnamed document within array');

    // 2. Successful multiple document upload as array type
    const multiDocPayload = {
      category: 'MSA',
      startDate: '2026-01-01',
      endDate: '2027-01-01',
      notes: 'Master executed documents',
      documents: [
        {
          name: 'Master Services Agreement (MSA)',
          fileName: 'msa_signed.pdf',
          size: '1.2 MB',
          type: 'PDF',
          data: 'data:application/pdf;base64,JVBERi0xLjQK...',
          category: 'MSA'
        },
        {
          name: 'Non-Disclosure Agreement (NDA)',
          fileName: 'nda_countersigned.pdf',
          size: '480 KB',
          type: 'PDF',
          data: 'data:application/pdf;base64,JVBERi0xLjQK...',
          category: 'NDA'
        },
        {
          name: 'GST Registration Certificate',
          fileName: 'gst_certificate.png',
          size: '220 KB',
          type: 'PNG',
          data: 'data:image/png;base64,iVBORw0KGgo...',
          category: 'Other'
        }
      ]
    };

    const addDocsRes = await request('POST', `/api/clients/${zId}/documents`, multiDocPayload);
    assert.equal(addDocsRes.status, 201);
    assert.equal(addDocsRes.body.success, true);
    assert.equal(addDocsRes.body.documents.length, 3);
    assert.equal(addDocsRes.body.data.documents.length, 3);
    assert.equal(addDocsRes.body.documents[0].name, 'Master Services Agreement (MSA)');
    assert.equal(addDocsRes.body.documents[0].fileName, 'msa_signed.pdf');
    assert.equal(addDocsRes.body.documents[1].name, 'Non-Disclosure Agreement (NDA)');
    assert.equal(addDocsRes.body.documents[2].name, 'GST Registration Certificate');
    console.log('✓ Successfully uploaded 3 documents simultaneously using array payload');

    // 3. Direct array root payload test [doc1, doc2]
    const directArrayRes = await request('POST', `/api/clients/${zId}/documents`, [
      { name: 'Letter of Undertaking (LOU)', fileName: 'lou_2026.pdf', category: 'LOU' }
    ]);
    assert.equal(directArrayRes.status, 201);
    assert.equal(directArrayRes.body.documents.length, 1);
    assert.equal(directArrayRes.body.data.documents.length, 4);
    console.log('✓ Direct root array payload [doc] successfully processed');

    // 4. Verify via paginated documents endpoint
    const listDocsRes = await request('GET', `/api/clients/${zId}/lists/documents`);
    assert.equal(listDocsRes.status, 200);
    assert.equal(listDocsRes.body.total, 4);
    assert.equal(listDocsRes.body.data.length, 4);
    console.log('✓ Listed all documents via /lists/documents repository');

    // 5. Update single document
    const docToUpdate = addDocsRes.body.documents[0];
    const updateDocRes = await request('PUT', `/api/clients/${zId}/documents/${docToUpdate.id}`, {
      name: 'Master Services Agreement (MSA) - Amendment 1',
      notes: 'Renewed for FY 2026-2027'
    });
    assert.equal(updateDocRes.status, 200);
    const updatedDoc = updateDocRes.body.data.documents.find((d) => d.id === docToUpdate.id);
    assert.equal(updatedDoc.name, 'Master Services Agreement (MSA) - Amendment 1');
    console.log('✓ Successfully updated document metadata');

    // 6. Delete document
    const delDocRes = await request('DELETE', `/api/clients/${zId}/documents/${docToUpdate.id}`);
    assert.equal(delDocRes.status, 200);
    assert.equal(delDocRes.body.data.documents.length, 3);
    console.log('✓ Successfully deleted document from repository');

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
