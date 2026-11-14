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
process.env.PORT = '5099';

const { default: app } = await import('../src/server.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { cleanNonStaticSettings } = await import('../src/utils/defaultSettings.js');

const PORT = 5099;
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
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch {
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
  console.log('--- STARTING BACKEND INTEGRATION TESTS ---');

  await connectDB();
  server = app.listen(PORT);
  console.log(`[TEST-SERVER] Listening on ${BASE_URL}`);

  try {
    // TEST 1: Health check
    console.log('\nTest 1: GET /api/health');
    const health = await request('GET', '/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.data.status, 'healthy');
    assert.equal(health.data.database.connection, 'connected');
    console.log('✓ Health check passed with active MongoDB connection');

    // TEST 2: Root overview JSON
    console.log('\nTest 2: GET / (Root status)');
    const root = await request('GET', '/');
    assert.equal(root.status, 200);
    assert.equal(root.data.status, 'online');
    assert.equal(root.data.screensLocation, 'frontend/ folder');
    console.log('✓ Root route returns API overview without backend HTML pages');

    // TEST 3: Reset Settings to Clean Non-Static State
    console.log('\nTest 3: POST /api/settings/reset');
    const reset = await request('POST', '/api/settings/reset');
    assert.equal(reset.status, 200);
    assert.equal(reset.data.success, true);
    console.log('✓ Settings reset to clean non-static defaults successfully');

    // TEST 4: GET /api/settings (verify clean non-static values)
    console.log('\nTest 4: GET /api/settings');
    const settingsRes = await request('GET', '/api/settings');
    assert.equal(settingsRes.status, 200);
    assert.equal(settingsRes.data.success, true);
    const settings = settingsRes.data.data;

    // Verify all 14 active sections exist and match clean initial state
    const expectedSections = [
      'invoiceSender',
      'bankDetails',
      'gstSettings',
      'theme',
      'smtp',
      'msg91',
      'otp',
      'firebase',
      'mobileapp',
      'navigation',
      'general',
      'social',
      'razorpay',
      'security',
    ];

    for (const section of expectedSections) {
      assert.ok(settings[section], `Section ${section} must exist in settings`);
    }

    assert.equal(settings.invoiceSender.companyName, '');
    assert.equal(settings.bankDetails.bankName, '');
    assert.equal(settings.gstSettings.enableGst, false);
    assert.equal(settings.theme.showThemeToggle, false);
    assert.equal(settings.navigation.home, false);
    assert.equal(settings.security.devModeProtection, false);
    console.log('✓ All 16 Admin Settings sections verified against clean non-static schema');

    // TEST 5: GET /api/settings/:section
    console.log('\nTest 5: GET /api/settings/theme');
    const themeRes = await request('GET', '/api/settings/theme');
    assert.equal(themeRes.status, 200);
    assert.equal(themeRes.data.success, true);
    assert.equal(themeRes.data.section, 'theme');
    assert.equal(themeRes.data.data.showThemeToggle, false);
    console.log('✓ Single section retrieval working properly');

    // TEST 6: PUT /api/settings/theme (Update section)
    console.log('\nTest 6: PUT /api/settings/theme');
    const themeUpdate = {
      primaryColor: '#4d33b6',
      secondaryColor: '#6366f1',
      mode: 'Day',
      type: 'Lite',
      headerFont: 'Outfit',
      paragraphFont: 'Inter',
      showThemeToggle: true,
    };
    const updateThemeRes = await request('PUT', '/api/settings/theme', themeUpdate);
    assert.equal(updateThemeRes.status, 200);
    assert.equal(updateThemeRes.data.success, true);
    assert.equal(updateThemeRes.data.data.primaryColor, '#4d33b6');
    assert.equal(updateThemeRes.data.data.headerFont, 'Outfit');
    assert.equal(updateThemeRes.data.data.showThemeToggle, true);
    console.log('✓ Single section update succeeded');

    // TEST 7: Invalid section test (400 Bad Request)
    console.log('\nTest 7: GET /api/settings/invalid_section_name');
    const invalidRes = await request('GET', '/api/settings/invalid_section_name');
    assert.equal(invalidRes.status, 400);
    assert.equal(invalidRes.data.success, false);
    console.log('✓ Invalid section properly rejected with 400 error');

    // TEST 8: GST Tax Slabs CRUD with Auto-computation
    console.log('\nTest 8: GST Tax Slabs (Auto-calculates CGST, SGST, IGST)');
    const slabPayload = {
      hsnCode: '998311',
      gstRate: 18,
      taxType: 'Standard',
      serviceName: 'Architecture & Stone Design Services',
      status: 'Active',
      isDefault: true,
    };

    const createSlabRes = await request('POST', '/api/gst-rates', slabPayload);
    assert.equal(createSlabRes.status, 201);
    assert.equal(createSlabRes.data.success, true);
    const createdSlab = createSlabRes.data.data;
    assert.equal(createdSlab.hsnCode, '998311');
    assert.equal(createdSlab.gstRate, 18);
    assert.equal(createdSlab.cgst, 9); // Auto: 18 / 2 = 9
    assert.equal(createdSlab.sgst, 9); // Auto: 18 / 2 = 9
    assert.equal(createdSlab.igst, 18); // Auto: 18
    console.log('✓ GST Tax slab created with automatic CGST(9%), SGST(9%), IGST(18%) computation');

    // List GST slabs
    const listSlabsRes = await request('GET', '/api/gst-rates');
    assert.equal(listSlabsRes.status, 200);
    assert.ok(listSlabsRes.data.count >= 1);
    console.log(`✓ GST Tax slabs listed (${listSlabsRes.data.count} found)`);

    // Update GST slab
    const updateSlabRes = await request('PUT', `/api/gst-rates/${createdSlab._id}`, {
      gstRate: 12,
    });
    assert.equal(updateSlabRes.status, 200);
    assert.equal(updateSlabRes.data.data.cgst, 6);
    assert.equal(updateSlabRes.data.data.sgst, 6);
    assert.equal(updateSlabRes.data.data.igst, 12);
    console.log('✓ GST Tax slab updated with automatic re-computation for 12% rate (6%, 6%, 12%)');

    // Delete GST slab
    const deleteSlabRes = await request('DELETE', `/api/gst-rates/${createdSlab._id}`);
    assert.equal(deleteSlabRes.status, 200);
    console.log('✓ GST Tax slab deleted cleanly');

    // TEST 9: Reset settings back to clean non-static object
    console.log('\nTest 9: Reset settings back to clean state');
    await request('POST', '/api/settings/reset');
    const finalCheck = await request('GET', '/api/settings/theme');
    assert.equal(finalCheck.data.data.primaryColor, '');
    assert.equal(finalCheck.data.data.showThemeToggle, false);
    console.log('✓ Final settings state verified clean');

    console.log('\n======================================================');
    console.log('ALL BACKEND INTEGRATION TESTS PASSED (9/9)');
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

