# Test Case Report: Full E2E Sweep — Every Page & Flow (Admin / Manager / Staff)

**Date:** November 17, 2026
**Scope:** All 45 routes across 15 modules (Dashboard, Clients, Deals, Projects, Inbox, Calendar, Outreach, Finance, Accounts, HR, Team, Playbooks, Settings, Support, Profile) × 3 roles, plus authentication flows and every backend API suite.
**Environment:** Isolated E2E server `http://localhost:5002` (Express serving the SPA) on a **clone** of the real database (`aedentek_crm_e2e`), so create/edit/delete tests never touched `aedentek_crm`. Spot-checked again on the normal dev setup (`:1234` Vite → `:5001` API).
**Status:** ✅ PASS after fixes — 0 failures in the final run (backend 1,203/1,203 assertions · browser 143/143 checks)
**Bugs found & fixed:** 9 (5 critical security, 4 functional)

**Evidence**
- Admin dashboard: [Admin_today.png](test-reports/e2e-full-sweep/Admin_today.png) · Admin salary: [Admin_hr_salary.png](test-reports/e2e-full-sweep/Admin_hr_salary.png) · Admin invoices: [Admin_finance_invoices.png](test-reports/e2e-full-sweep/Admin_finance_invoices.png)
- Manager accounts: [Manager_accounts_dashboard.png](test-reports/e2e-full-sweep/Manager_accounts_dashboard.png) · Manager payroll (blocked): [Manager_hr_payroll.png](test-reports/e2e-full-sweep/Manager_hr_payroll.png)
- Staff clients: [Staff_clients_companies.png](test-reports/e2e-full-sweep/Staff_clients_companies.png) · Staff salary (blocked): [Staff_hr_salary.png](test-reports/e2e-full-sweep/Staff_hr_salary.png) · Staff settings (blocked): [Staff_settings.png](test-reports/e2e-full-sweep/Staff_settings.png)
- Raw per-page results: [sweep-results.json](test-reports/e2e-full-sweep/sweep-results.json)

---

## 1. Summary

| Area | Before fixes | After fixes |
|---|---|---|
| Backend API suites (CRUD, finance, HR, accounts, EMI, invoices…) | 23/23 suites green, 1,182 assertions | 24/24 suites green, **1,203 assertions** (new auth-hardening suite added) |
| Pages load without JS errors / failed API calls | 135/135 (but roles were not enforced) | 135/135 |
| Role restrictions enforced in the UI | ❌ **0 of 47** restricted pages blocked — Staff could open Salary, Payroll, Accounts, Settings | ✅ 47/47 blocked as designed |
| API rejects requests without login | ❌ No — every endpoint answered as **Admin** | ✅ 401 |
| Auth flows (8) | not covered | ✅ 8/8 |

The pages themselves and the business flows (CRUD, invoices, payroll, EMI, ledgers) were healthy. The serious problems were all in **authentication and role-based access**, and several of them are exploitable on the live deployment today (see §4).

---

## 2. Bugs Found & Fixed

| ID | Severity | Bug | Root cause | Fix |
|---|---|---|---|---|
| B1 | 🔴 Critical | **Password backdoor**: `dev1234`, `password123`, `marble88` signed in to the 8 seeded accounts (incl. Admin `admin@tessly.local`) in **every environment, production included**; any account with an empty username also matched; outside production *every* account accepted them | Hard-coded "dev convenience" in `User.comparePassword` (`backend/src/models/User.js`); `e.startsWith('')` is always true | Master passwords only when `NODE_ENV=test` (or explicit `ALLOW_INSECURE_DEV_AUTH=true`). All real logins check the bcrypt/scrypt hash. Seeded test passwords still work because they are real hashes |
| B2 | 🔴 Critical | **No login required for the API** — a request with no token was treated as **Admin** (e.g. `curl /api/salary-structures` returned all salaries) | `authenticateUser` fell back to `ROLES.ADMIN` (`backend/src/middleware/rbac.js`) | No verified JWT → `401 AUTH_REQUIRED`. Fallback kept only for `NODE_ENV=test` |
| B3 | 🔴 Critical | **Privilege escalation**: a Staff/Manager token plus header `X-User-Role: Admin` got Admin access | Role taken as `roleHeader \|\| decoded.role` — the client header overrode the signed token | The signed JWT role is authoritative; headers are ignored when a token is present |
| B4 | 🔴 Critical | Mock tokens (`Bearer admin-token`) and `?role=Admin` granted Admin in any environment; a query string containing `/api/auth/login` skipped authentication | Test shortcuts not gated; public-path check used `originalUrl.includes(...)` | Mock tokens/query role test-only; public paths matched exactly (query string excluded) |
| B5 | 🔴 Critical | **Frontend role mix-up**: any signed-in user without a demo profile became demo Admin "Ines Okafor" (`u1`) after a page reload — Staff saw Salary, Payroll, Accounts, Settings, and the fetch wrapper sent `X-User-Role: Admin` to the server (this was the "Head of specification sales (Admin)" banner seen earlier) | `enter()` and session restore defaulted `me` to `u1`; role lived only in `window.__currentRole`, which is lost on reload | Role resolved from the session JWT (`getJwtRole`); signed-in account added as its own profile from the JWT; fetch wrapper no longer sends role headers when a token exists (`index-DG0_cRQu.js`, `ui-D4_WaMI9.js`) |
| B6 | 🟠 High | `POST /api/uploads` accepted files from anyone | Route registered before the auth middleware (`backend/src/server.js`) | Route now requires authentication |
| B7 | 🟠 High | Offline login: when the API was unreachable (or returned non-JSON) the login screen signed the user in client-side with any password | Fallback in `submitAuth()` not limited to dev mode | Offline fallback only in Vite dev mode; otherwise "Cannot reach the server". Dev quick-login now signs in through the backend with the seeded test accounts |
| B8 | 🟡 Medium | Once roles were enforced, **every page for Manager/Staff** got `403` on `GET /api/settings` (theme, invoice issuer, bank and GST details are needed by everyone) | Whole settings router was Admin-only | Non-admins can **read** only `theme`, `invoiceSender`, `bankDetails`, `gstSettings`; SMTP / MSG91 / OTP / Firebase / Razorpay / security sections, all writes and reset stay Admin-only |
| B9 | 🟡 Medium | Manager on **HR → Leave** got `403` loading leave types for the form dropdown; login screen showed a 401 / "Session expired" from a theme fetch before sign-in | Leave-types GET was Admin-only; theme sync ran before login | Managers may read leave types (create/edit/delete stay Admin); theme sync waits for a session and re-runs right after login |

---

## 3. Test Cases

### 3.1 Page sweep — 45 routes × 3 roles (135 checks)
Each check logs in through the real login form, opens the route with a full page load, and fails on: any JS exception, any failed `/api` call (other than an expected 403 on a blocked page), redirect to login, near-empty page, error text (`NaN`, `undefined`, `Invalid Date`, `[object Object]`, "something went wrong"), or a role mismatch (page shown when it should be blocked, or blocked when it should be allowed — expectations mirror `getRouteRequirements()` in the app).

| # | Page / route | Admin | Manager | Staff |
|---|---|---|---|---|
| P01 | `/today` | ✅ Loads | ✅ Loads | ✅ Loads |
| P02 | `/clients/companies` | ✅ Loads | ✅ Loads | ✅ Loads |
| P03 | `/clients/new` | ✅ Loads | ✅ Loads | ✅ Loads |
| P04 | `/clients/service-types` | ✅ Loads | 🔒 Blocked (expected) | 🔒 Blocked (expected) |
| P05 | `/clients/project-stages` | ✅ Loads | 🔒 Blocked (expected) | 🔒 Blocked (expected) |
| P06 | `/deals/board` | ✅ Loads | ✅ Loads | ✅ Loads |
| P07 | `/deals/forecast` | ✅ Loads | ✅ Loads | ✅ Loads |
| P08 | `/projects` | ✅ Loads | ✅ Loads | ✅ Loads |
| P09 | `/inbox` | ✅ Loads | ✅ Loads | ✅ Loads |
| P10 | `/calendar` | ✅ Loads | ✅ Loads | ✅ Loads |
| P11 | `/outreach/sequences` | ✅ Loads | ✅ Loads | ✅ Loads |
| P12 | `/finance/invoices` | ✅ Loads | ✅ Loads | 🔒 Blocked (expected) |
| P13 | `/finance/propagations` | ✅ Loads | ✅ Loads | 🔒 Blocked (expected) |
| P14 | `/finance/settings` | ✅ Loads | 🔒 Blocked (expected) | 🔒 Blocked (expected) |
| P15 | `/accounts/dashboard` | ✅ Loads | ✅ Loads | 🔒 Blocked (expected) |
| P16 | `/accounts/sales` | ✅ Loads | ✅ Loads | 🔒 Blocked (expected) |
| P17 | `/accounts/credit-notes` | ✅ Loads | ✅ Loads | 🔒 Blocked (expected) |
| P18 | `/accounts/expenses` | ✅ Loads | ✅ Loads | 🔒 Blocked (expected) |
| P19 | `/accounts/expense-categories` | ✅ Loads | 🔒 Blocked (expected) | 🔒 Blocked (expected) |
| P20 | `/accounts/inward-expenses` | ✅ Loads | ✅ Loads | 🔒 Blocked (expected) |
| P21 | `/accounts/assets` | ✅ Loads | ✅ Loads | 🔒 Blocked (expected) |
| P22 | `/accounts/asset-categories` | ✅ Loads | 🔒 Blocked (expected) | 🔒 Blocked (expected) |
| P23 | `/accounts/emi` | ✅ Loads | ✅ Loads | 🔒 Blocked (expected) |
| P24 | `/accounts/adjustment-entry` | ✅ Loads | ✅ Loads | 🔒 Blocked (expected) |
| P25 | `/accounts/reports` | ✅ Loads | ✅ Loads | 🔒 Blocked (expected) |
| P26 | `/hr/staff` | ✅ Loads | ✅ Loads | 🔒 Blocked (expected) |
| P27 | `/hr/staff/new` | ✅ Loads | ✅ Loads | 🔒 Blocked (expected) |
| P28 | `/hr/employees` | ✅ Loads | ✅ Loads | 🔒 Blocked (expected) |
| P29 | `/hr/attendance` | ✅ Loads | ✅ Loads | 🔒 Blocked (expected) |
| P30 | `/hr/leave` | ✅ Loads | ✅ Loads | 🔒 Blocked (expected) |
| P31 | `/hr/leave-types` | ✅ Loads | 🔒 Blocked (expected) | 🔒 Blocked (expected) |
| P32 | `/hr/shifts` | ✅ Loads | 🔒 Blocked (expected) | 🔒 Blocked (expected) |
| P33 | `/hr/branches` | ✅ Loads | 🔒 Blocked (expected) | 🔒 Blocked (expected) |
| P34 | `/hr/salary` | ✅ Loads | 🔒 Blocked (expected) | 🔒 Blocked (expected) |
| P35 | `/hr/payroll` | ✅ Loads | 🔒 Blocked (expected) | 🔒 Blocked (expected) |
| P36 | `/hr/advances` | ✅ Loads | 🔒 Blocked (expected) | 🔒 Blocked (expected) |
| P37 | `/hr/adjustments` | ✅ Loads | 🔒 Blocked (expected) | 🔒 Blocked (expected) |
| P38 | `/hr/offer-letters` | ✅ Loads | ✅ Loads | 🔒 Blocked (expected) |
| P39 | `/hr/offer-letter-templates` | ✅ Loads | ✅ Loads | 🔒 Blocked (expected) |
| P40 | `/team` | ✅ Loads | ✅ Loads | 🔒 Blocked (expected) |
| P41 | `/library` | ✅ Loads | ✅ Loads | ✅ Loads |
| P42 | `/settings` | ✅ Loads | 🔒 Blocked (expected) | 🔒 Blocked (expected) |
| P43 | `/settings/theme` | ✅ Loads | 🔒 Blocked (expected) | 🔒 Blocked (expected) |
| P44 | `/support` | ✅ Loads | ✅ Loads | ✅ Loads |
| P45 | `/profile` | ✅ Loads | ✅ Loads | ✅ Loads |

**Result:** 88 pages load correctly, 47 are correctly blocked, **0 failures**.

### 3.2 Authentication flows (browser)

| # | Flow | Result |
|---|---|---|
| F01 | Unauthenticated deep link redirects to login | ✅ PASS |
| F02 | Login page shows no "Session expired" toast when signed out | ✅ PASS |
| F03 | Wrong password is rejected with an error | ✅ PASS |
| F04 | "dev1234" backdoor password does not sign in (non-dev build) | ✅ PASS |
| F05 | Admin: role survives page reload (header shows own name, not demo admin) | ✅ PASS |
| F06 | Manager: role survives page reload (header shows own name, not demo admin) | ✅ PASS |
| F07 | Staff: role survives page reload (header shows own name, not demo admin) | ✅ PASS |
| F08 | Logout clears session and returns to login | ✅ PASS |

### 3.3 API security matrix (`backend/tests/auth-hardening.test.mjs`, run in production-style auth mode)

| # | Request | Expected | Result |
|---|---|---|---|
| S01 | No credentials → `/api/salary-structures` | 401 | ✅ |
| S02 | No credentials → `/api/clients` | 401 | ✅ |
| S03 | `Bearer admin-token` (mock) | 401 | ✅ |
| S04 | `X-User-Role: Admin`, no token | 401 | ✅ |
| S05 | `?role=Admin`, no token | 401 | ✅ |
| S06 | `?x=/api/auth/login` bypass attempt | 401 | ✅ |
| S07 | Tampered JWT signature | 401 | ✅ |
| S08 | Staff JWT → salary structures | 403 | ✅ |
| S09 | Staff JWT + `X-User-Role: Admin` → salary | 403 | ✅ |
| S10 | Staff JWT → `/api/settings/smtp` | 403 | ✅ |
| S11 | Staff JWT → `PUT /api/settings/theme` | 403 | ✅ |
| S12 | Staff JWT → `/api/settings` returns only theme/invoiceSender/bankDetails/gstSettings | 200, no secrets | ✅ |
| S13 | Staff JWT → accounts dashboard | 403 | ✅ |
| S14 | Staff JWT → clients | 200 | ✅ |
| S15 | Manager JWT → payroll | 403 | ✅ |
| S16 | Manager JWT + `X-User-Role: Admin` → payroll | 403 | ✅ |
| S17 | Manager JWT → staff list | 200 | ✅ |
| S18 | Admin JWT → salary structures | 200 | ✅ |
| S19 | Upload without credentials | 401 | ✅ |
| S20 | `/api/health` stays public | 200 | ✅ |
| S21 | `/api/auth/login` stays public | not `AUTH_REQUIRED` | ✅ |

Login check on the real accounts: `admin@`, `manager@`, `staff@tessly.local`, `ines@`/`tomas@`/`priya@caldermoss.co`, `rahul.sen@`, `ines.okafor@aedentek.com` all sign in with their seeded passwords ✅; `dev1234` is rejected for every account ✅.

### 3.4 Backend business-flow suites (run against the cloned DB)

| Suite | Assertions | Result |
|---|---|---|
| accounts | 153 | ✅ |
| accounts-attachments | 13 | ✅ |
| api (settings integration) | 9 | ✅ |
| auth | 14 | ✅ |
| **auth-hardening (new)** | 21 | ✅ |
| branch | 34 | ✅ |
| client (Client 360) | 10 | ✅ |
| client-documents | 6 | ✅ |
| client-modules | 42 | ✅ |
| crud-sweep | 249 | ✅ |
| dashboard-range | 15 | ✅ |
| emi / emi-date / emi-fees | 73 / 39 / 61 | ✅ |
| enhancements | 39 | ✅ |
| expense-crud | 65 | ✅ |
| finance (invoices & propagations) | 10 | ✅ |
| hr (staff, attendance, leave, payroll) | 134 | ✅ |
| invoice-builder / invoice-crud / invoice-discount | 28 / 43 / 41 | ✅ |
| inward-expense | 42 | ✅ |
| rbac | 14 | ✅ |
| settings-profiles | 48 | ✅ |
| **Total** | **1,203** | **✅ 0 failed** |

Two tests in `auth` and `rbac` were updated because they asserted the old rule "Staff gets 403 on `GET /api/settings`"; they now assert the new rule (shared sections only, credentials and writes blocked).

### 3.5 Existing frontend UI suites (`frontend/test/*.mjs`)
These were run on the fixed code **and** on an untouched checkout of the last commit for comparison. They fail the same way on both (stale ports, old bundle file names and selectors, timeouts), so the failures predate this work. `test-login.mjs` went from 17 passed / 8 failed (baseline) to **21 passed / 7 failed**; the 7 remaining failures are the same ones that fail on the baseline (old design assertions such as expecting a "Sign in" heading). That test now mocks the login API on its static server instead of relying on the removed offline-login bypass.

---

## 4. Action Required (not changed — deployment decisions)

1. **Deploy these fixes to live and staging soon.** Until then, `crm.aedentek.com` answers API requests without login as Admin (B2) and accepts `dev1234` for `admin@tessly.local` (B1).
2. **Set `JWT_SECRET`** for the live and staging containers (`docker-compose.yml` sets none, so tokens are signed with the fallback secret written in `backend/src/middleware/rbac.js` — anyone with the source can forge an Admin token). The server now logs a warning at startup when it is missing. Changing it signs everyone out once.
3. **Seeded demo accounts run in production** (`seedUserData()` runs at every start) with passwords published in `backend/src/utils/seedUsers.js`, including Admin `admin@tessly.local / password123`. Disable or change these on live.
4. **MongoDB admin password is committed** in `docker-compose.yml`. Move it to an env file/secret and rotate it.
5. `aarav.nair@aedentek.com` has an empty email in the database, so signing in with that email fails; he can sign in with username `aarav.nair`.

---

## 5. How to Re-run

```bash
# backend suites (use a throwaway DB — several suites clean data)
cd backend && MONGODB_URI=mongodb://127.0.0.1:27017/aedentek_crm_e2e npm test
# browser sweep (start the "backend-e2e" config from .claude/launch.json first)
cd frontend && E2E_BASE=http://localhost:5002 node test/e2e-all-pages.mjs
```

A backup of the real database taken before testing is at `/tmp/crm-e2e/aedentek_crm-backup-20261117.archive`.
