import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB } from './config/db.js';
import settingsProfileRoutes from './routes/settingsProfileRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import gstTaxRateRoutes from './routes/gstTaxRateRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import propagationRoutes from './routes/propagationRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import serviceTypeRoutes from './routes/serviceTypeRoutes.js';
import projectStageRoutes from './routes/projectStageRoutes.js';
import { paginateResponses } from './middleware/paginate.js';
import { authenticateUser } from './middleware/rbac.js';
import authRoutes from './routes/authRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import hrRoutes from './routes/hrRoutes.js';
import accountsRoutes from './routes/accountsRoutes.js';
import { seedFinanceData } from './utils/seedFinance.js';
import { seedHrData } from './utils/seedHr.js';
import { seedAccountsData } from './utils/seedAccounts.js';
import { seedUserData } from './utils/seedUsers.js';
import { seedRoles } from './controllers/roleController.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Per-environment static/paths (defined early so the root route can use them).
// In Docker the built SPA is at ../public and uploads are bind-mounted at UPLOAD_DIR.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.resolve(__dirname, '../public');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(__dirname, '../uploads');
const HAS_SPA = fs.existsSync(PUBLIC_DIR);
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Enable CORS for frontend clients
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:1234';
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or localhost
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin === clientOrigin) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in development
      }
    },
    credentials: true,
  })
);

// Body parsing with 10MB limit for base64 logos, seals, and QR assets
app.use(express.json({ limit: '40mb' }));
app.use(express.urlencoded({ extended: true, limit: '40mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Root: serve the built SPA when present (production/Docker); otherwise the
// JSON API overview. The full JSON overview stays available at GET /api.
const apiOverview = (res) => res.status(200).json({
    name: 'Aedentek CRM Backend API',
    status: 'online',
    version: '1.0.0',
    screensLocation: 'frontend/ folder',
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      name: mongoose.connection.name || 'none',
    },
    endpoints: {
      health: 'GET /api/health',
      settings: 'GET, PUT /api/settings',
      settingsSection: 'GET, PUT, PATCH /api/settings/:section',
      resetSettings: 'POST /api/settings/reset',
      gstRates: 'GET, POST /api/gst-rates',
      gstRateById: 'GET, PUT, DELETE /api/gst-rates/:id',
      invoices: 'GET, POST /api/invoices',
      invoiceById: 'GET, PUT, DELETE /api/invoices/:id',
      invoicePayment: 'POST /api/invoices/:id/payment',
      propagations: 'GET, POST /api/propagations',
      propagationById: 'GET, PUT, DELETE /api/propagations/:id',
      convertPropagation: 'POST /api/propagations/:id/convert',
      clients: 'GET, POST /api/clients',
      clientById: 'GET, PUT, DELETE /api/clients/:id',
      clientWebsites: 'POST, DELETE /api/clients/:id/websites',
      clientCredentials: 'POST, DELETE /api/clients/:id/credentials',
      resetClients: 'POST /api/clients/reset',
      hrStaff: 'GET, POST /api/staff',
      hrAttendance: 'GET, POST /api/hr/staff-attendance',
      hrPunch: 'POST /api/hr/staff-attendance/punch',
      hrLeave: 'GET, POST /api/hr/leave',
      hrLeaveBalance: 'GET /api/hr/leave/balance/:staffRef',
      hrLeaveTypes: 'GET, POST /api/hr/leave-types',
      hrBranches: 'GET, POST /api/hr/branches',
      hrShifts: 'GET, POST /api/hr/shifts',
      hrSalaryStructures: 'GET, POST /api/salary-structures',
      hrAdvances: 'GET, POST /api/hr/advances',
      hrAdjustments: 'GET, POST /api/hr/adjustments',
      hrPayroll: 'GET, POST /api/hr/payroll/run',
      accountsChart: 'GET /api/accounts/chart-of-accounts',
      accountsJournal: 'GET /api/accounts/journal',
      accountsDashboard: 'GET /api/accounts/dashboard',
      accountsSales: 'GET, POST /api/accounts/sales',
      accountsExpenses: 'GET, POST /api/accounts/expenses',
      accountsInwardExpenses: 'GET /api/accounts/inward-expenses',
      accountsEmi: 'GET, POST /api/accounts/emi',
      accountsStockInward: 'GET, POST /api/accounts/stock-inward',
      accountsCreditNotes: 'GET, POST /api/accounts/credit-notes',
      accountsAssets: 'GET, POST /api/accounts/assets',
      accountsAdjustment: 'GET, POST /api/accounts/adjustment-entry',
      accountsBanking: 'GET /api/accounts/banking/transactions',
      accountsReports: 'GET /api/accounts/reports/trial-balance',
    },
  });

app.get('/', (req, res) => {
  if (HAS_SPA) return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  apiOverview(res);
});

app.get('/api/health', (req, res) => {
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbState = dbStateMap[mongoose.connection.readyState] || 'unknown';

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      connection: dbState,
      name: mongoose.connection.name || null,
    },
  });
});

// ---------------------------------------------------------------
// Static assets & uploads (per-environment, isolated via UPLOAD_DIR mount)
// ---------------------------------------------------------------
if (HAS_SPA) {
  app.use(express.static(PUBLIC_DIR, { index: false }));
  app.use('/uploads', express.static(UPLOAD_DIR));
}

// Minimal upload endpoint: store base64 file, return a /uploads/<name> URL
app.post('/api/uploads', authenticateUser, (req, res) => {
  const { filename, data, contentType } = req.body || {};
  if (!filename || !data) return res.status(400).json({ success: false, message: 'filename and base64 data are required' });
  const safeName = String(filename).replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(-80);
  const ext = path.extname(safeName) || '.bin';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  try {
    fs.writeFileSync(path.join(UPLOAD_DIR, name), Buffer.from(String(data), 'base64'));
    res.status(200).json({ success: true, url: `/uploads/${name}`, contentType: contentType || 'application/octet-stream' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Upload failed: ' + err.message });
  }
});

// SPA fallback: any unknown GET path returns the built index.html
if (HAS_SPA) {
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path === '/') return next(); // handled by the root route above
    if (req.path.startsWith('/api/') || req.path === '/api') return next();
    if (req.path.startsWith('/uploads/')) return next();
    return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });
}

// Mount API routes
app.use('/api', authenticateUser);
app.use('/api', paginateResponses);
app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/settings-profiles', settingsProfileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/gst-rates', gstTaxRateRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/propagations', propagationRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/service-types', serviceTypeRoutes);
app.use('/api/project-stages', projectStageRoutes);
app.use('/api', hrRoutes);
app.use('/api/accounts', accountsRoutes);

// Fallback error and 404 handlers (JSON only)
app.use(notFound);
app.use(errorHandler);

// Start server function
export const startServer = async () => {
  try {
    await connectDB();
    await seedFinanceData();
    await seedHrData();
    await seedAccountsData();
    await seedRoles();
    await seedUserData();
    const server = app.listen(PORT, () => {
      console.log(`[Server] Aedentek CRM Backend running on http://localhost:${PORT}`);
      console.log(`[Server] API Health check available at http://localhost:${PORT}/api/health`);
    });
    return server;
  } catch (err) {
    console.error(`[Server] Startup error: ${err.message}`);
    process.exit(1);
  }
};

// Auto start if executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
