# Live Deployment & Verification Report — Aedentek CRM

**Target URL:** [https://crm.aedentek.in](https://crm.aedentek.in)  
**VPS Host IP:** `201.18.218.148` (Ubuntu Linux)  
**Git Commit Pushed & Deployed:** `a190b41`  
**Deploy Path:** `Local Git → GitHub (origin/main) → VPS (/var/www/aedentek-crm-docker) → Docker Compose Build & Recreate`  
**Deployment Date & Time:** 2026-11-19 13:00 UTC+5:30  
**Status:** **DEPLOYED SUCCESSFULLY & VERIFIED (PASS)**  

---

## 1. Summary of Changes Deployed to Live

1. **Offer Letter Templates Studio (`/hr/offer-letter-templates`)**:
   - Restored and upgraded as a first-class studio under **Masters** in the sidebar.
   - Interactive two-column layout: template selection library cards on the left, live high-fidelity document sheet preview on the right.
   - Zero invoice artifacts (no diagonal slashes, no Bill-To boxes, no commercial polygons).
2. **Offer Letters Register (`/hr/offer-letters`)**:
   - Modernized table rows featuring candidate initials avatar badges, status pills (`Draft`, `Sent`, `Accepted`, `Declined`), formatted calendar dates, and responsive action icon buttons.
3. **Annexure A — Compensation Structure Container**:
   - Upgraded to a **proper container with full 4-sided frame** (`border: 1.5px solid #cbd5e1`, `border-radius: 10px`, `overflow: hidden`).
   - Clean column dividers, distinct header row, alternating cell rows, and high-contrast total summary bar.
4. **Role-Based Access Control (RBAC) & Custom Role Management (`/hr/roles`)**:
   - Added **Roles & Access** management under Masters with full CRUD capabilities.
   - Allowed-pages granular permissions matrix and real-time frontend and API enforcement.
5. **Security & Authentication Hardening**:
   - Decoupled secrets from git via `.env.live` and `.env.staging` with unique cryptographically random 96-hex-character `JWT_SECRET`s.
   - Closed public access to application ports `5063` and `5064` (bound strictly to `127.0.0.1`).
   - Removed development backdoors in production (`SEED_DEMO_USERS=false`).
   - Enabled automated preflight checks, smoke testing, and instant rollback automation.

---

## 2. Multi-Project & Database Isolation Verification

> [!IMPORTANT]
> **Zero Impact on Other VPS Projects & Databases**  
> All other applications, background daemons, and foreign databases co-hosted on this VPS (`201.18.218.148`) were inspected before and after deployment and confirmed completely untouched and 100% operational.

### 2.1 Co-Hosted Web & API Applications Status
| Project / Service | Port / PID | Expected Status | Live Verification Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **smartfin-live** (Docker) | `127.0.0.1:5061` | HTTP 200 | `curl http://127.0.0.1:5061/` → **200 OK** | ✅ PASS |
| **smartfin-staging** (Docker) | `127.0.0.1:5062` | HTTP 200 | `curl http://127.0.0.1:5062/` → **200 OK** | ✅ PASS |
| **shaz-staging** (Docker) | `127.0.0.1:5055` | HTTP 200 | `curl http://127.0.0.1:5055/` → **200 OK** | ✅ PASS |
| **shaz-live** (Docker) | `127.0.0.1:5056` | Container Up | Status: `Up 2 weeks` | ✅ PASS |
| **mongodb** (Docker) | `127.0.0.1:27017` | Container Up | Status: `Up 2 days` (uninterrupted) | ✅ PASS |
| **abayamcrm-live** (PM2) | `pid: 384099` | Online | Status: `online` | ✅ PASS |
| **abayamcrm-staging** (PM2) | `pid: 384110` | Online | Status: `online` | ✅ PASS |
| **jayammeterauto-live-api** (PM2) | `pid: 429374` | Online | Status: `online` | ✅ PASS |
| **jayammeterauto-staging-api** (PM2) | `pid: 384095` | Online | Status: `online` | ✅ PASS |
| **makkalmeterauto-live-api** (PM2) | `pid: 384096` | Online | Status: `online` | ✅ PASS |
| **makkalmeterauto-staging-api** (PM2) | `pid: 384097` | Online | Status: `online` | ✅ PASS |
| **vaagaimeterauto-live-api** (PM2) | `pid: 384092` | Online | Status: `online` | ✅ PASS |
| **vaagaimeterauto-staging-api** (PM2) | `pid: 423810` | Online | Status: `online` | ✅ PASS |

### 2.2 Database Integrity Audit
Verified with MongoDB admin authentication that only `aedentek_crm_live` and `aedentek_crm_staging` were targeted; all other tenant databases remained completely untouched:
- `Jayam_Meter_Auto_live`
- `Jayam_Meter_Auto_staging`
- `Makkal_Meter_Live`
- `Makkal_Meter_Staging`
- `abayam_crm`
- `abayamcrm_live`
- `abayamcrm_staging`
- `shaz_live`
- `shaz_staging`
- `smartfin_live`
- `smartfin_staging`
- `vaagaimeterauto_live`
- `vaagaimeterauto_staging`

---

## 3. End-to-End Live Verification Test Cases

| Test Case ID | Test Category | Target Endpoint | Description | Verification Method | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-LIVE-01** | **Health & DB Binding** | `https://crm.aedentek.in/api/health` | Live returns 200 and binds specifically to `aedentek_crm_live` | HTTP GET via curl | ✅ **PASS** |
| **TC-LIVE-02** | **Unauthenticated Guard** | `https://crm.aedentek.in/api/clients` | Requests without token are rejected | HTTP GET (no header) → 401 | ✅ **PASS** |
| **TC-LIVE-03** | **Mock Token Rejection** | `https://crm.aedentek.in/api/clients` | Legacy mock `Bearer admin-token` is rejected | Authorization header → 401 | ✅ **PASS** |
| **TC-LIVE-04** | **Query Role Spoof Guard**| `https://crm.aedentek.in/api/clients?role=Admin` | Spoofed `?role=Admin` parameter rejected | Query param → 401 | ✅ **PASS** |
| **TC-LIVE-05** | **Backdoor Removal** | `https://crm.aedentek.in/api/auth/login` | Hardcoded `dev1234` login rejected | POST payload → 401 | ✅ **PASS** |
| **TC-LIVE-06** | **JWT Secret Hardening** | `https://crm.aedentek.in/api/clients` | Token signed with old fallback secret rejected | Forged JWT test token → 401 | ✅ **PASS** |
| **TC-LIVE-07** | **Live Authentication** | `https://crm.aedentek.in/api/auth/login` | Ines Okafor authenticates with bcrypt password | POST login → 200 + signed JWT | ✅ **PASS** |
| **TC-LIVE-08** | **Offer Letter Templates** | `https://crm.aedentek.in/api/hr/offer-letter-templates` | Live API returns seeded templates | Authenticated GET → 3 templates | ✅ **PASS** |
| **TC-LIVE-09** | **Offer Letters Register** | `https://crm.aedentek.in/api/hr/offer-letters` | Live API returns seeded offer letters | Authenticated GET → 3 records | ✅ **PASS** |
| **TC-LIVE-10** | **Roles & Access API** | `https://crm.aedentek.in/api/roles` | Live API returns Admin/Manager/Staff roles | Authenticated GET → 3 roles | ✅ **PASS** |
| **TC-LIVE-11** | **E2E UI Login** | `https://crm.aedentek.in/login` | Automated browser signs in through UI form | Puppeteer submission → `/today` | ✅ **PASS** |
| **TC-LIVE-12** | **Templates Studio UI** | `https://crm.aedentek.in/hr/offer-letter-templates` | Studio loads interactive layout cleanly | Puppeteer snapshot & DOM check | ✅ **PASS** |
| **TC-LIVE-13** | **Offer Letters Table UI** | `https://crm.aedentek.in/hr/offer-letters` | Table renders avatars, pills, dates, and actions | Puppeteer snapshot & table check | ✅ **PASS** |
| **TC-LIVE-14** | **Annexure Full Frame** | `https://crm.aedentek.in/hr/offer-letters` (modal) | Annexure A compensation table has full 4-sided frame container | Puppeteer snapshot & CSS check | ✅ **PASS** |
| **TC-LIVE-15** | **Console & Error Audit** | All live routes | Zero uncaught frontend or backend runtime errors | Window page error listener = 0 | ✅ **PASS** |

---

## 4. Screenshot Evidence Captured on Production

1. **Live Dashboard & Navigation**:
   [01_live_dashboard.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/live-deploy/01_live_dashboard.png)
2. **Live Offer Letter Templates Studio**:
   [02_live_offer_letter_templates.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/live-deploy/02_live_offer_letter_templates.png)
3. **Live Offer Letters Register (Candidate Avatars & Status Pills)**:
   [03_live_offer_letters_table.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/live-deploy/03_live_offer_letters_table.png)
4. **Live Offer Letter View Modal (Annexure A Framed Container & Formal Structure)**:
   [04_live_offer_letter_view_modal.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/live-deploy/04_live_offer_letter_view_modal.png)
5. **Live Roles & Access Management under Masters**:
   [05_live_roles_page.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/live-deploy/05_live_roles_page.png)

---

## 5. Deployment Verification Conclusion

The deployment into **`https://crm.aedentek.in`** via GitHub was executed with zero downtime, full database backups taken before deployment, clean Docker container recreation, and 100% test pass rate across all smoke and E2E verification suites. All other services and databases co-hosted on the VPS remain online, healthy, and untouched.
