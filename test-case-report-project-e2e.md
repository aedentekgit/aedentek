# Project-Wide End-to-End (E2E) Test Case Verification Report

**Project:** Aedentek CRM (Tessly) — Full-Stack Platform  
**Date:** November 18, 2026  
**Environment:** Frontend Vite SPA (`http://localhost:1234`) + Backend Express/MongoDB API (`http://localhost:5001`, DB: `aedentek_crm`)  
**Overall Status:** ✅ **PASS — 100% GREEN**  
- **Backend API & Integration Suites:** **25 / 25 suites passed** (0 failures)
- **Full 45-Route × 3-Role + Auth Flows Browser Sweep:** **143 / 143 checks passed** (0 failures, 48/48 restricted pages properly blocked with 403)
- **Employee Onboarding, Auth Key & RBAC Browser E2E:** **8 / 8 passed**
- **Token Refresh, Reload Persistence & Auto-Logout E2E:** **26 / 26 passed**
- **Client Login Credentials (No Login Label) UI Verification:** **2 / 2 passed**

**Evidence & Raw Outputs:**
- Backend 25-suite summary: [backend-e2e-summary.json](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/backend-e2e-summary.json)
- 45-Route × 3-Role sweep JSON: [results.json](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/e2e-project-sweep/results.json)
- Client Login Credentials (no Login Label): [client_login_credentials_no_label.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/e2e-project-sweep/client_login_credentials_no_label.png) · [client_add_login_modal_no_label.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/e2e-project-sweep/client_add_login_modal_no_label.png)
- Employee Portal Access & Directory: [01_add_employee_portal_access.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/employee-rbac-auth-key/01_add_employee_portal_access.png) · [02_employee_directory_login_access.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/employee-rbac-auth-key/02_employee_directory_login_access.png)
- Role Restrictions & Forged Auth Key Auto-Logout: [04_staff_403_access_restricted.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/employee-rbac-auth-key/04_staff_403_access_restricted.png) · [06_manager_403_admin_page.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/employee-rbac-auth-key/06_manager_403_admin_page.png) · [07_forged_authkey_auto_logout.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/employee-rbac-auth-key/07_forged_authkey_auto_logout.png)

---

## 1. Executive Summary

| Verification Layer | Suite / Script | Scope | Result | Status |
|:---|:---|:---|:---|:---:|
| **Backend API & Business Logic** | All 25 `backend/tests/*.test.mjs` | Auth, RBAC, Hardening, Employee Auth Key, Clients, Projects, Documents, Invoices, Discounts, Propagations, Accounts, Expenses, EMI, HR, Payroll, Branches, Settings | **25/25 suites passed** | **PASS** |
| **Frontend 45-Route × 3-Role Sweep** | [e2e-all-pages.mjs](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/test/e2e-all-pages.mjs) | 15 modules (45 routes) × Admin, Manager, Staff + 8 auth/session flows; JS error, API error, blank page, error-text, and RBAC checks | **143/143 checks passed** (48 restricted as expected) | **PASS** |
| **Employee RBAC & Auth Key E2E** | [test-employee-rbac-auth-key.mjs](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/test/test-employee-rbac-auth-key.mjs) | Add Employee (Role, Username, Password), Directory badges, non-email username login, `X-Auth-Key` + `Bearer` verification, 403 guards, forged key auto-logout | **8/8 cases passed** | **PASS** |
| **Token Refresh & Auto-Logout E2E** | [test-token-refresh-and-auto-logout.mjs](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/test/test-token-refresh-and-auto-logout.mjs) | Login persistence across reloads, deep-link reload, `/api/auth/refresh` valid & expired tokens, 401 auto-logout, manual sign-out | **26/26 assertions passed** | **PASS** |
| **Client Login Credentials UI Check** | Puppeteer live check on `/clients/companies` | Verified `LOGIN LABEL` column removed (7 columns) and `Login Label *` input removed from Add Login modal | **2/2 checks passed** | **PASS** |

### Issues Found & Resolved During This E2E Run
1. **Unauthenticated Deep-Link URL Redirect ([index-DG0_cRQu.js](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/assets/index-DG0_cRQu.js#L494))**: Unauthenticated deep links (e.g. `/hr/salary`) rendered the login view while leaving the URL on `/hr/salary`; updated boot routing so unauthenticated visits to protected routes cleanly redirect to `/signin`.
2. **HR Test Hash Assertion ([hr.test.mjs](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/backend/tests/hr.test.mjs#L199))**: `hr.test.mjs` checked strictly for legacy `scrypt$` prefix after employee portal hashing was standardized to `bcrypt` (`$2`); updated the assertion to accept both bcrypt `$2` and `scrypt$`.
3. **E2E Suite Selectors ([e2e-all-pages.mjs](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/test/e2e-all-pages.mjs), [test-token-refresh-and-auto-logout.mjs](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/frontend/test/test-token-refresh-and-auto-logout.mjs))**: Updated login selectors from `input[type="email"]` to `input[name="email"]` (for username/email login), added `/hr/offer-letter-templates` to `ADMIN_ONLY`, and accepted both `/login` and `/signin` paths.

---

## 2. Backend API & Business-Logic Verification (25/25 Suites Passed)

| # | Test Suite | Module / Domain Covered | Duration | Status |
|:---|:---|:---|---:|:---:|
| 1 | `accounts-attachments.test.mjs` | Accounts voucher attachments upload & linking | 1,031 ms | **PASS** |
| 2 | `accounts.test.mjs` | Chart of accounts, double-entry journal, sales, credit notes, assets, adjustments, financial reports | 1,207 ms | **PASS** |
| 3 | `api.test.mjs` | Health check, all 16 Admin Settings sections, GST tax slabs | 781 ms | **PASS** |
| 4 | `auth-hardening.test.mjs` | Strict production-mode auth: 401 on missing/forged/mock tokens, header spoofing blocked, public path checks | 794 ms | **PASS** |
| 5 | `auth.test.mjs` | Bcrypt user seeding, login (Admin/Manager/Staff), JWT verification, logout, token refresh | 841 ms | **PASS** |
| 6 | `branch.test.mjs` | Branches master CRUD, default branch selection, options endpoint | 827 ms | **PASS** |
| 7 | `client-documents.test.mjs` | Client contracts & documents array upload/edit/delete | 893 ms | **PASS** |
| 8 | `client-modules.test.mjs` | Client websites, login credentials, projects, service types, project stages | 871 ms | **PASS** |
| 9 | `client.test.mjs` | Client 360 directory CRUD, KPIs, timelines, billing schedules | 862 ms | **PASS** |
| 10 | `crud-sweep.test.mjs` | Cross-module CRUD lifecycle sweep across all core entities | 1,179 ms | **PASS** |
| 11 | `dashboard-range.test.mjs` | Accounts dashboard date-range filtering & aggregation | 957 ms | **PASS** |
| 12 | `emi-date.test.mjs` | EMI schedule date handling & installment due dates | 797 ms | **PASS** |
| 13 | `emi-fees.test.mjs` | EMI processing fees, late charges & ledger entries | 791 ms | **PASS** |
| 14 | `emi.test.mjs` | EMI creation, payment recording, status transitions & reversals | 836 ms | **PASS** |
| 15 | `employee-rbac-auth-key.test.mjs` | Employee role/username/password onboarding, `X-Auth-Key` validation, live role sync, key revocation, privilege-escalation guard | 1,806 ms | **PASS** |
| 16 | `enhancements.test.mjs` | Cross-cutting enhancements across clients, finance, HR & pagination | 1,041 ms | **PASS** |
| 17 | `expense-crud.test.mjs` | Expense & category CRUD + double-entry ledger reconciliation | 1,034 ms | **PASS** |
| 18 | `finance.test.mjs` | Invoices, payments, commercial propagations & conversion | 1,036 ms | **PASS** |
| 19 | `hr.test.mjs` | HR & Payroll (134 assertions): staff CRUD, salary structures, biometric punch, leaves, advances, adjustments, payroll runs & reversals | 1,010 ms | **PASS** |
| 20 | `invoice-builder.test.mjs` | Invoice builder line-item math, GST split (CGST/SGST/IGST) | 848 ms | **PASS** |
| 21 | `invoice-crud.test.mjs` | Invoice create, update, payment & delete flows | 926 ms | **PASS** |
| 22 | `invoice-discount.test.mjs` | Invoice flat & percentage discount calculations | 921 ms | **PASS** |
| 23 | `inward-expense.test.mjs` | Inward & expense combined ledger entries and cleanup | 937 ms | **PASS** |
| 24 | `rbac.test.mjs` | Role permissions matrix & 403 boundary checks across Admin/Manager/Staff | 895 ms | **PASS** |
| 25 | `settings-profiles.test.mjs` | Multi-profile sender/billing settings CRUD & switching | 883 ms | **PASS** |

---

## 3. Full Browser E2E Sweep — Auth Flows & All 45 Routes × 3 Roles (143/143 Passed)

### 3.1 Authentication & Session Flows (8/8 Passed)

| ID | Flow Verified | Expected Outcome | Status |
|:---|:---|:---|:---:|
| **FLOW-01** | Unauthenticated deep link (`/hr/salary`) | Redirects to `/signin` (no protected content rendered) | **PASS** |
| **FLOW-02** | Fresh login page state | No spurious `"Session expired"` toast when signed out | **PASS** |
| **FLOW-03** | Wrong password submission | Rejected, remains on `/login` or `/signin` with invalid-credentials message | **PASS** |
| **FLOW-04** | Legacy `dev1234` password rejection | Rejected even for seeded accounts | **PASS** |
| **FLOW-05** | Admin role persistence on page reload | JWT role stays `Admin`, displays own name (not mismatched profile) | **PASS** |
| **FLOW-06** | Manager role persistence on page reload | JWT role stays `Manager`, displays own name, 403 screen shows Manager account | **PASS** |
| **FLOW-07** | Staff role persistence on page reload | JWT role stays `Staff`, displays own name, 403 screen shows Staff account | **PASS** |
| **FLOW-08** | Logout & post-logout route guard | Clears storage, returns to `/signin`, `/clients/companies` redirects back to `/signin` | **PASS** |

### 3.2 All 45 Routes × 3 Roles (135/135 Passed — 0 JS Errors, 0 Unexpected API Errors, 0 Blank Pages)

| # | Route | Admin | Manager | Staff |
|:---|:---|:---:|:---:|:---:|
| P01 | `/today` | ✅ PASS | ✅ PASS | ✅ PASS |
| P02 | `/clients/companies` | ✅ PASS | ✅ PASS | ✅ PASS |
| P03 | `/clients/new` | ✅ PASS | ✅ PASS | ✅ PASS |
| P04 | `/clients/service-types` | ✅ PASS | 🔒 403 (expected) | 🔒 403 (expected) |
| P05 | `/clients/project-stages` | ✅ PASS | 🔒 403 (expected) | 🔒 403 (expected) |
| P06 | `/deals/board` | ✅ PASS | ✅ PASS | ✅ PASS |
| P07 | `/deals/forecast` | ✅ PASS | ✅ PASS | ✅ PASS |
| P08 | `/projects` | ✅ PASS | ✅ PASS | ✅ PASS |
| P09 | `/inbox` | ✅ PASS | ✅ PASS | ✅ PASS |
| P10 | `/calendar` | ✅ PASS | ✅ PASS | ✅ PASS |
| P11 | `/outreach/sequences` | ✅ PASS | ✅ PASS | ✅ PASS |
| P12 | `/finance/invoices` | ✅ PASS | ✅ PASS | 🔒 403 (expected) |
| P13 | `/finance/propagations` | ✅ PASS | ✅ PASS | 🔒 403 (expected) |
| P14 | `/finance/settings` | ✅ PASS | 🔒 403 (expected) | 🔒 403 (expected) |
| P15 | `/accounts/dashboard` | ✅ PASS | ✅ PASS | 🔒 403 (expected) |
| P16 | `/accounts/sales` | ✅ PASS | ✅ PASS | 🔒 403 (expected) |
| P17 | `/accounts/credit-notes` | ✅ PASS | ✅ PASS | 🔒 403 (expected) |
| P18 | `/accounts/expenses` | ✅ PASS | ✅ PASS | 🔒 403 (expected) |
| P19 | `/accounts/expense-categories` | ✅ PASS | 🔒 403 (expected) | 🔒 403 (expected) |
| P20 | `/accounts/inward-expenses` | ✅ PASS | ✅ PASS | 🔒 403 (expected) |
| P21 | `/accounts/assets` | ✅ PASS | ✅ PASS | 🔒 403 (expected) |
| P22 | `/accounts/asset-categories` | ✅ PASS | 🔒 403 (expected) | 🔒 403 (expected) |
| P23 | `/accounts/emi` | ✅ PASS | ✅ PASS | 🔒 403 (expected) |
| P24 | `/accounts/adjustment-entry` | ✅ PASS | ✅ PASS | 🔒 403 (expected) |
| P25 | `/accounts/reports` | ✅ PASS | ✅ PASS | 🔒 403 (expected) |
| P26 | `/hr/staff` | ✅ PASS | ✅ PASS | 🔒 403 (expected) |
| P27 | `/hr/staff/new` | ✅ PASS | ✅ PASS | 🔒 403 (expected) |
| P28 | `/hr/employees` | ✅ PASS | ✅ PASS | 🔒 403 (expected) |
| P29 | `/hr/attendance` | ✅ PASS | ✅ PASS | 🔒 403 (expected) |
| P30 | `/hr/leave` | ✅ PASS | ✅ PASS | 🔒 403 (expected) |
| P31 | `/hr/leave-types` | ✅ PASS | 🔒 403 (expected) | 🔒 403 (expected) |
| P32 | `/hr/shifts` | ✅ PASS | 🔒 403 (expected) | 🔒 403 (expected) |
| P33 | `/hr/branches` | ✅ PASS | 🔒 403 (expected) | 🔒 403 (expected) |
| P34 | `/hr/salary` | ✅ PASS | 🔒 403 (expected) | 🔒 403 (expected) |
| P35 | `/hr/payroll` | ✅ PASS | 🔒 403 (expected) | 🔒 403 (expected) |
| P36 | `/hr/advances` | ✅ PASS | 🔒 403 (expected) | 🔒 403 (expected) |
| P37 | `/hr/adjustments` | ✅ PASS | 🔒 403 (expected) | 🔒 403 (expected) |
| P38 | `/hr/offer-letters` | ✅ PASS | ✅ PASS | 🔒 403 (expected) |
| P39 | `/hr/offer-letter-templates` | ✅ PASS | 🔒 403 (expected) | 🔒 403 (expected) |
| P40 | `/team` | ✅ PASS | ✅ PASS | 🔒 403 (expected) |
| P41 | `/library` | ✅ PASS | ✅ PASS | ✅ PASS |
| P42 | `/settings` | ✅ PASS | 🔒 403 (expected) | 🔒 403 (expected) |
| P43 | `/settings/theme` | ✅ PASS | 🔒 403 (expected) | 🔒 403 (expected) |
| P44 | `/support` | ✅ PASS | ✅ PASS | ✅ PASS |
| P45 | `/profile` | ✅ PASS | ✅ PASS | ✅ PASS |

---

## 4. Feature-Specific E2E Verification Summary

1. **Employee Role, Username, Password + Auth Key + RBAC** (Full detail in [test-case-report-employee-rbac-auth-key.md](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-case-report-employee-rbac-auth-key.md)):
   - Backend: **14/14 PASS** (`employee-rbac-auth-key.test.mjs`)
   - Frontend Puppeteer E2E: **8/8 PASS** (`test-employee-rbac-auth-key.mjs`)
2. **Token Refresh, Reload Persistence & Auto-Logout**:
   - Frontend Puppeteer E2E: **26/26 PASS** (`test-token-refresh-and-auto-logout.mjs`)
3. **Client Login Credentials — Login Label Removed**:
   - Table verified at 7 columns (`S NO`, `Service Type`, `Login URL`, `Username`, `Password`, `Notes`, `Actions`) with no `Login Label` header or modal field, and API CRUD (`POST`/`PUT`/`DELETE`) verified without `label`.
4. **Admin Account Provisioning (`admin@gmail.com`)**:
   - Verified login (`200 OK`, Admin JWT + `authKey`) and wrong-password rejection (`401`) on local environment.
