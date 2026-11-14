# Aedentek CRM — Full Stack Platform

A complete CRM platform structured with separated **frontend** and **backend** architectures.

```
Template 1/
├── frontend/               # Complete CRM frontend screens & static assets
│   ├── assets/             # Bundled application scripts, styles & UI modules
│   ├── dist/               # Production build output
│   ├── test/               # Puppeteer end-to-end integration test suites
│   ├── index.html          # Single Page Application entry point
│   ├── vite.config.js      # Vite dev server with proxy to backend API (:5001)
│   └── package.json        # Frontend scripts and dependencies
│
├── backend/                # Pure Node.js + Express REST API with MongoDB
│   ├── src/
│   │   ├── config/db.js    # Mongoose MongoDB connection & event handlers
│   │   ├── models/         # Mongoose models for Admin Settings & GST Slabs
│   │   │   ├── AdminSettings.js
│   │   │   └── GstTaxRate.js
│   │   ├── controllers/    # Settings & GST Slabs controllers
│   │   │   ├── settingsController.js
│   │   │   └── gstTaxRateController.js
│   │   ├── routes/         # Express routes for /api/settings and /api/gst-rates
│   │   │   ├── settingsRoutes.js
│   │   │   └── gstTaxRateRoutes.js
│   │   ├── middleware/     # Global JSON error handling & 404 handler (no HTML pages)
│   │   ├── utils/          # Clean non-static default settings schema (Section 17)
│   │   └── server.js       # Express server initialization, CORS & healthcheck
│   ├── tests/              # Backend integration tests
│   ├── .env.example        # Environment variable template
│   ├── .env                # Local environment configuration
│   └── package.json        # Backend dependencies & scripts
│
├── package.json            # Root workspace task runner
└── README.md               # Architecture and setup documentation
```

---

## Architecture Principles

1. **Clean Separation of Concerns**:
   - The **frontend** houses all interactive screens (Sales Desk, Kanban, Pipeline, Deals, Clients, Projects, Invoices, Calendar, Outreach, Reports, Settings, Help).
   - The **backend** is strictly a **REST API** powered by Node.js, Express, and MongoDB. As specified, **there are no backend-rendered HTML pages / views**; the backend delivers pure JSON data.

2. **Admin Settings Specification (All 16 Sections)**:
   Every section from the specification is modeled and validated with its clean non-static representation:
   1. `invoiceSender` — Corporate coordinates, billing email, GSTIN, PAN, signatory seal, and logo
   2. `bankDetails` — Clearing bank, account types, IFSC, SWIFT, UPI VPA, and QR code
   3. `gstSettings` — Global GST toggles, default HSN, default tax types, and LUT numbers
   4. `theme` — Primary/secondary color tokens, Day/Night/Auto mode, typography tokens
   5. `smtp` — Mail server credentials, port, TLS/SSL encryption, and verified sender
   6. `msg91` — DLT-approved SMS sender IDs, auth keys, and template identifiers
   7. `otp` — Passcode length (4 or 6 digits), expiry windows, and retry limits
   8. `firebase` — Web Push API key, project ID, VAPID key, and service account JSON
   9. `mobileapp` — Mobile client metadata, semantic build version, and APK endpoints
   10. `navigation` — Public page module visibility toggles (home, courses, gallery, videos, blogs, about, contact)
   11. `general` — Platform branding, official phone/email, currency, store links (iOS, Android, Mac, Windows)
   12. `social` — Instagram, Facebook, LinkedIn, X, WhatsApp Business, and YouTube links
   13. `desktopUpdate` — Auto-update distribution coordinates for macOS and Windows
   14. `razorpay` — Merchant Key ID, Key Secret, in-app mobile payment toggles
   15. `vimeo` — Vimeo API credentials, OAuth bearer token, and player status
   16. `security` — DevTools protection, screenshot guard, and Google reCAPTCHA v2/v3

3. **Statutory GST & HSN Tax Slabs**:
   - Independent tax rate collection with pre-save automated computation:
     $$\text{CGST} = \frac{\text{gstRate}}{2}, \quad \text{SGST} = \frac{\text{gstRate}}{2}, \quad \text{IGST} = \text{gstRate}$$
   - Support for `Standard`, `Zero-Rated`, and `Exempted` scopes.

---

## Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **MongoDB**: v6.0+ running on `mongodb://127.0.0.1:27017` (or remote MongoDB Atlas URI)

### 2. Backend Setup
```bash
cd backend
npm install
npm run dev
```
The backend server runs at `http://localhost:5001`.
- Health check: `GET http://localhost:5001/api/health`
- Root overview: `GET http://localhost:5001/`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The Vite development server runs at `http://localhost:3000`.
All requests to `/api/*` are automatically proxied to the backend on `http://localhost:5001`.

### 4. Running Both from Root
```bash
# Start backend
npm run backend:dev

# Start frontend (in a separate terminal)
npm run frontend
```

---

## Backend API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check endpoint returning database connectivity state |
| `GET` | `/api/settings` | Retrieve all 16 Admin Settings sections (clean non-static defaults if uninitialized) |
| `PUT` | `/api/settings` | Update all or multiple sections |
| `GET` | `/api/settings/:section` | Fetch a single section (e.g. `/api/settings/theme`, `/api/settings/invoiceSender`) |
| `PUT` / `PATCH` | `/api/settings/:section` | Update a single section |
| `POST` | `/api/settings/reset` | Reset all settings back to clean non-static defaults (Section 17) |
| `GET` | `/api/gst-rates` | List all statutory GST & HSN tax rate slabs |
| `POST` | `/api/gst-rates` | Create new GST tax slab (auto-computes CGST, SGST, IGST) |
| `GET` | `/api/gst-rates/:id` | Fetch specific GST tax slab |
| `PUT` | `/api/gst-rates/:id` | Update tax slab (auto-recalculates CGST, SGST, IGST) |
| `DELETE` | `/api/gst-rates/:id` | Delete tax slab |

---

## Testing

### Run Backend Tests
```bash
npm run test:backend
# or: cd backend && npm test
```

### Run Frontend Tests
```bash
npm run test:frontend
# or: cd frontend && npm test
```

