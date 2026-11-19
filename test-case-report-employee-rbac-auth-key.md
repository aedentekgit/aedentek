# Test Case Verification Report: Employee Login Credentials (Role, Username, Password), Role-Based Page Access & Auth Key Validation

**Date:** November 18, 2026  
**Module:** HR Employee Onboarding, Authentication (`X-Auth-Key` & JWT Bearer), and Role-Based Access Control (RBAC)  
**Environment:** `http://localhost:1234` (Frontend Vite SPA) & `http://localhost:5001` (Backend Express + MongoDB API)  
**Status:** PASS (100% Green — **71/71 Automated Tests Passed**: 14/14 New Backend Integration + 8/8 New Frontend Puppeteer E2E + 49/49 Regression Auth/RBAC/Hardening Tests)  

**Evidence Artifacts:**
- Add Employee Portal Access Form: [01_add_employee_portal_access.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/employee-rbac-auth-key/01_add_employee_portal_access.png)
- Employee Directory Login Access Badges: [02_employee_directory_login_access.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/employee-rbac-auth-key/02_employee_directory_login_access.png)
- Staff Username Login & Restricted Sidebar: [03_staff_username_login_sidebar.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/employee-rbac-auth-key/03_staff_username_login_sidebar.png)
- Staff Direct URL 403 Access Restricted: [04_staff_403_access_restricted.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/employee-rbac-auth-key/04_staff_403_access_restricted.png)
- Manager HR Directory Access: [05_manager_hr_access.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/employee-rbac-auth-key/05_manager_hr_access.png)
- Manager Admin-Only 403 Restriction: [06_manager_403_admin_page.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/employee-rbac-auth-key/06_manager_403_admin_page.png)
- Forged Auth Key Auto-Logout on Reload: [07_forged_authkey_auto_logout.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/employee-rbac-auth-key/07_forged_authkey_auto_logout.png)

---

## 1. Executive Summary

### Scope Implemented
1. **Employee Role, Username & Password Management (HR Module)**:
   - Enhanced the **Add / Edit Employee** form ([hr-Hr7xK2mQ.js](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/assets/hr-Hr7xK2mQ.js)) with **Enable CRM login**, **Login role (page access)** (`Staff` / `Manager` / `Admin`), **Login username**, **Login password**, **Confirm password**, a dynamic **Role Page Access Scope** callout, and `email` / `phone` fields.
   - Added a **Login Access** column to the Employee Directory displaying each employee's role badge and username (or `No login`).
   - Fixed critical backend synchronization bugs in [hrStaffController.js](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/backend/src/controllers/hrStaffController.js):
     - Properly maps `staff.accessLevel` to both `User.role` and `User.accessLevel` (previously `User.role` always defaulted to `'Staff'`).
     - Eliminated the password corruption bug where editing an employee without changing password overwrote their hash with `'UNCHANGED'`.
     - Prevents plaintext password storage in the `Staff` MongoDB collection, hashes user passwords with `bcrypt`, enforces case-insensitive username/email uniqueness, and blocks `Manager` -> `Admin` privilege escalation (`403`).
     - Syncs `email`, deactivates linked `User` accounts when `createLogin` is disabled or status becomes `Inactive`/`Terminated`, and rotates server-side `authKey` on password reset or deactivation.
2. **Login Validation with Auth Key (`X-Auth-Key` & `Authorization: Bearer`)**:
   - Added per-user server-side `authKey` secret on [User.js](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/backend/src/models/User.js) embedded in the signed JWT (`ak` claim) and returned as `authKey` + `token` on `POST /api/auth/login` and `POST /api/auth/refresh`.
   - Updated [rbac.js](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/backend/src/middleware/rbac.js) (`authenticateUser`) and [authRoutes.js](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/backend/src/routes/authRoutes.js) (`GET /api/auth/verify`, `GET /api/auth/me`) to validate both `Authorization: Bearer <key>` and `X-Auth-Key: <key>` cryptographically **and** against MongoDB (live `active` status, `authKey` revocation, deletion detection, and live role sync).
   - Updated the sign-in screen ([index-DG0_cRQu.js](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/assets/index-DG0_cRQu.js)) to accept **Username or Email** (removing the strict `@` email regex that blocked employee usernames), removed the insecure `dev1234` local bypass, hoisted `window.__performLogout` / `window.__triggerAutoLogout` to module scope so post-reload logouts always succeed, and added boot-time `GET /api/auth/verify` validation.
   - Updated the global fetch interceptor in [ui-D4_WaMI9.js](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/assets/ui-D4_WaMI9.js) to attach both `Authorization: Bearer` and `X-Auth-Key` headers on all `/api/` calls and removed spoofable `X-User-Role` fallback headers.
3. **Role-Based Page & API Access Control**:
   - Enforced consistent page access across sidebar visibility, route guards (`getRouteRequirements` including `/hr/offer-letter-templates`), and backend route middleware (including newly protected [invoiceRoutes.js](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/backend/src/routes/invoiceRoutes.js) and [propagationRoutes.js](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/backend/src/routes/propagationRoutes.js)).
   - Removed client-side `Switch Role` UI overrides from the profile menu and `403 · Access Restricted` page (replaced with **Sign in with Another Account**).

---

## 2. Role-Based Page & API Access Matrix

| Module / Page | Route | API Endpoint(s) | Admin | Manager | Staff |
|:---|:---|:---|:---:|:---:|:---:|
| Dashboard | `/today` | `/api/auth/verify` | Allow | Allow | Allow |
| Clients & Projects | `/clients/*`, `/projects` | `/api/clients/*` | Allow | Allow | Allow |
| Deals, Inbox, Calendar, Outreach | `/deals/*`, `/inbox`, `/calendar`, `/outreach/*` | Workspace | Allow | Allow | Allow |
| Playbooks, Profile, Support | `/library`, `/profile`, `/support` | Shared | Allow | Allow | Allow |
| Invoices & Commercial Propagations | `/finance/invoices`, `/finance/propagations` | `/api/invoices/*`, `/api/propagations/*` | Allow | Allow | **403 Blocked** |
| Finance Tax & Banking Settings | `/finance/settings` | `/api/gst-rates/*`, `/api/settings/*` | Allow | **403 Blocked** | **403 Blocked** |
| Accounts & Financial Reports | `/accounts/*` | `/api/accounts/*` | Allow | Allow | **403 Blocked** |
| HR — Employees, Offer Letters, Attendance, Leave | `/hr/staff`, `/hr/offer-letters`, `/hr/attendance`, `/hr/leave` | `/api/staff/*`, `/api/hr/offer-letters/*`, `/api/hr/staff-attendance/*`, `/api/hr/leave/*` | Allow | Allow | **403 Blocked** |
| HR — Salary, Advances, Adjustments, Payroll | `/hr/salary`, `/hr/advances`, `/hr/adjustments`, `/hr/payroll` | `/api/salary-structures/*`, `/api/hr/advances/*`, `/api/hr/adjustments/*`, `/api/hr/payroll/*` | Allow | **403 Blocked** | **403 Blocked** |
| Masters (Branches, Shifts, Service Types, Stages, Templates) | `/masters/*`, `/hr/branches`, `/hr/shifts`, `/hr/offer-letter-templates`, `/clients/service-types`, etc. | Master APIs | Allow | **403 Blocked** | **403 Blocked** |
| Admin Settings | `/settings` | `/api/settings/*` (writes & secret sections) | Allow | **403 Blocked** | **403 Blocked** |

---

## 3. Backend Integration Test Execution Matrix

**Test File:** [backend/tests/employee-rbac-auth-key.test.mjs](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/backend/tests/employee-rbac-auth-key.test.mjs)

| Test ID | Test Scenario | Expected Result | Actual Result | Status |
|:---|:---|:---|:---|:---:|
| **TC-BE-01** | Create `Staff` employee with username, password & email | `201 Created`; plaintext password stripped from `Staff`; `User` created with bcrypt hash, `role: Staff`, and `authKey` | Verified `Staff.password === ''`, bcrypt `$2...` hash, `User.role === 'Staff'`, 48-char `authKey` | **PASS** |
| **TC-BE-02** | Create `Manager` employee with login | Linked `User.role` and `User.accessLevel` both equal `Manager` | Verified `User.role === 'Manager'` (old Staff-default bug resolved) | **PASS** |
| **TC-BE-03** | Create `Admin` employee with login | Linked `User.role` and `User.accessLevel` both equal `Admin` | Verified `User.role === 'Admin'` | **PASS** |
| **TC-BE-04** | Employee login validation & privilege escalation guard | Duplicate username `400`, password < 6 chars `400`, spaces in username `400`, Manager creating Admin `403` | All 4 negative checks returned exact expected HTTP status | **PASS** |
| **TC-BE-05** | Employee sign-in via **Username + Password** | `200 OK`, signed JWT returned in `token` & `authKey`, accurate `role` & `allowedPages` | Verified for `Staff` and `Admin` usernames | **PASS** |
| **TC-BE-06** | Employee sign-in via **Email + Password** | `200 OK` with matching employee `username` & `role` | Verified `200 OK` | **PASS** |
| **TC-BE-07** | Employee sign-in with wrong password | `401 Unauthorized` | Returned `401` | **PASS** |
| **TC-BE-08** | Auth key validation on `GET /api/auth/verify` | `X-Auth-Key` -> `200`, `Bearer` -> `200`, missing -> `401 AUTH_REQUIRED`, tampered -> `401 INVALID_TOKEN` | All 4 header/key checks passed | **PASS** |
| **TC-BE-09** | Role-based API matrix across Staff / Manager / Admin auth keys | Staff blocked (`403`) on invoices/propagations/accounts/HR/settings; Manager allowed workspace/invoices/accounts/staff, blocked on payroll/salary/branches/settings; Admin allowed all | All 23 endpoint assertions passed | **PASS** |
| **TC-BE-10** | Edit employee profile without changing password | Original password remains valid; `'UNCHANGED'` rejected (`401`) | Original password logged in (`200`); `'UNCHANGED'` rejected (`401`) | **PASS** |
| **TC-BE-11** | Promote employee role (`Staff` -> `Manager`) | Existing `authKey` immediately reflects `Manager` on `/api/auth/verify` & gains `/api/invoices` (`200`), still blocked on `/api/hr/payroll` (`403`) | Live DB role sync verified without re-login | **PASS** |
| **TC-BE-12** | Reset employee password via `PUT /api/staff/:id` | Old `authKey` immediately revoked (`401 AUTH_KEY_REVOKED`), old password fails (`401`), new password logs in (`200`) | Revocation & new login verified | **PASS** |
| **TC-BE-13** | Disable employee login (`createLogin: false`) | Existing `authKey` returns `401 ACCOUNT_DEACTIVATED`; new login returns `403 ACCOUNT_DEACTIVATED` | Immediate revocation & login block verified | **PASS** |
| **TC-BE-14** | Delete employee (`DELETE /api/staff/:id`) | Linked `User` removed; existing `authKey` returns `401 USER_NOT_FOUND`; login fails (`401`) | Cascade deletion & instant revocation verified | **PASS** |

---

## 4. Frontend Puppeteer E2E Browser Test Matrix

**Test File:** [frontend/test/test-employee-rbac-auth-key.mjs](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/test/test-employee-rbac-auth-key.mjs)

| Test ID | Test Scenario | Expected Outcome | Actual Result | Status |
|:---|:---|:---|:---|:---:|
| **TC-UI-01** | Admin signs in on `/signin` and sends `X-Auth-Key` + `Bearer` headers | Lands on `/today`, stores signed JWT in `tessly:authKey` & `tessly:jwt`, fires `/api/auth/verify` with both headers | Signed in at `/today`; intercepted `/api/auth/verify` with `Authorization: Bearer` & `X-Auth-Key` | **PASS** |
| **TC-UI-02** | Add Employee Portal Access step UI & dynamic Page Access Scope | Displays role selector, username, password, confirm password & live Staff scope summary; submits to `/hr/staff` | Created Staff employee via UI; redirected cleanly to `/hr/staff` | **PASS** |
| **TC-UI-03** | Create Manager employee & verify Employee Directory Login Access column | Both created employees show color-coded role pill + username in `LOGIN ACCESS` column | Verified both `Staff` and `Manager` badges + usernames rendered | **PASS** |
| **TC-UI-04** | Staff employee logs in with **non-email Username** + Password | Login form accepts username without `@`, stores `authKey`, hides Invoice/Accounts/HR/Masters/Settings/Team in sidebar | Signed in as `e2e*.staff`; sidebar restricted to 9 workspace items | **PASS** |
| **TC-UI-05** | Staff direct URL access to 6 restricted routes & no client role-switch bypass | `/settings`, `/accounts/dashboard`, `/finance/invoices`, `/hr/staff`, `/hr/payroll`, `/hr/branches` all render `403 · Access Restricted`; no Switch Role option in profile menu | All 6 routes showed 403 card with `Sign in with Another Account`; no Switch Role menu | **PASS** |
| **TC-UI-06** | Manager employee logs in with Username & tests allowed vs Admin-only routes | Sees Invoice, Accounts, HR; hides Masters & Settings; loads `/hr/staff`; blocked (`403`) on `/settings`, `/hr/payroll`, `/hr/salary`, `/hr/offer-letter-templates`, `/finance/settings` | Verified HR access & all 5 Admin-only route blocks | **PASS** |
| **TC-UI-07** | Tampered `authKey` in browser storage on page reload | Boot-time `/api/auth/verify` rejects forged key (`401`), triggers auto-logout to `/signin`, purges all storage keys | Auto-logged out to `/signin`; `tessly:authKey` & `tessly:jwt` purged | **PASS** |
| **TC-UI-08** | Invalid credentials / legacy `dev1234` login attempt on `/signin` | Rejected by backend; error banner displayed; workspace remains locked | Rejected with `"Invalid username/email or password."` | **PASS** |

---

## 5. Regression Suites Re-Verified

| Test Suite | Command | Result |
|:---|:---|:---:|
| Server Authentication & JWT Lifecycle | `node backend/tests/auth.test.mjs` | **14/14 PASS** |
| Backend RBAC Enforcement | `node backend/tests/rbac.test.mjs` | **14/14 PASS** |
| API Auth Hardening (Production Mode) | `node backend/tests/auth-hardening.test.mjs` | **21/21 PASS** |
| Employee RBAC & Auth Key Integration (New) | `node backend/tests/employee-rbac-auth-key.test.mjs` | **14/14 PASS** |
| Employee RBAC & Auth Key Browser E2E (New) | `node frontend/test/test-employee-rbac-auth-key.mjs` | **8/8 PASS** |
| **Grand Total** | | **71/71 PASS (100%)** |
