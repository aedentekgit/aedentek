# Test Case Verification Report: Moving Branches under Masters Section on Sidebar

**Date:** November 15, 2026  
**Route Tested:** [`/hr/branches`](http://localhost:1234/hr/branches) & [`/masters/branches`](http://localhost:1234/masters/branches)  
**Status:** PASS (100% Green)

---

## Executive Summary

The **Branches** module has been moved from `PEOPLE` > `Human Resources` to the `MASTERS` section on the sidebar.
- **Removed from Human Resources:** The `Branches` sub-item was removed from the `Human Resources` dropdown under the `PEOPLE` section.
- **Added under Masters:** `Branches` is now registered as a sub-item under `Masters` with `href: '/hr/branches'`.
- **Master Route Detection & Auto-Expand:** Added `/hr/branches` and `/masters/branches` to `MASTER_HREFS`. When visiting `/hr/branches`, the `Masters` dropdown automatically opens and highlights `Branches` active, while `Human Resources` remains inactive and closed.
- **Direct Navigation & Aliasing:** Direct access to `/masters/branches` automatically redirects/resolves to `/hr/branches`.
- **Breadcrumb Updated:** On the Branches page, the breadcrumb now reflects `Workspace > Masters > Branches` with a clickable link to Masters.

---

## Navigation Hierarchy Comparison

### Before
```
PEOPLE
  Human Resources ▾
    Employees
    Branches               <-- Previously nested here
    Attendance
    Leave Requests
    Shifts
    Salary Structures
    Salary Advances
    Payroll Adjustments
    Payroll & Payslips
MASTERS
  Masters ▸
    Service Types
    Project Stages
    Expense Categories
    Asset Categories
    Leave Types
```

### After
```
PEOPLE
  Human Resources ▾
    Employees
    Attendance
    Leave Requests
    Shifts
    Salary Structures
    Salary Advances
    Payroll Adjustments
    Payroll & Payslips
MASTERS
  Masters ▾
    Service Types
    Project Stages
    Expense Categories
    Asset Categories
    Leave Types
    Branches               <-- Successfully moved under Masters!
```

---

## Test Results Matrix

| Test Step | Verification Description | Expected Result | Measured Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-BRANCH-01** | Verify `Branches` removed from `Human Resources` | `hrSubs.includes('Branches') === false` | `false` | **PASS** |
| **TC-BRANCH-02** | Verify `Branches` present in `Masters` dropdown | `branches` present with `href="/hr/branches"` | `true` (`/hr/branches`) | **PASS** |
| **TC-BRANCH-03** | Clicking `Branches` under `Masters` | Navigates to `/hr/branches` | Navigated to `/hr/branches` | **PASS** |
| **TC-BRANCH-04** | Sidebar state on `/hr/branches` | `Masters` active & open, `Branches` sub-item active | `mastersIsActive: true, is-open: true, Branches: active` | **PASS** |
| **TC-BRANCH-05** | `Human Resources` state on `/hr/branches` | `Human Resources` inactive and closed | `hrIsActive: false, hrIsOpen: false` | **PASS** |
| **TC-BRANCH-06** | Breadcrumbs on Branches page | `Workspace > Masters > Branches` | `['Workspace', 'Masters', 'Branches']` | **PASS** |
| **TC-BRANCH-07** | Direct navigation to `/hr/branches` | URL loads, `Masters` expands, `Branches` active | `mastersIsOpen: true, activeSubs: ['Branches']` | **PASS** |
| **TC-BRANCH-08** | Direct navigation to `/masters/branches` | Cleanly redirects to `/hr/branches` | Redirected to `/hr/branches` | **PASS** |
| **TC-BRANCH-09** | Navigation to HR page (`/hr/staff`) | `Human Resources` active & open with no `Branches` in subs | `hrIsOpen: true, Employees: active, Branches in HR: false` | **PASS** |
| **TC-BRANCH-10** | Console & Runtime Stability | Zero browser errors | `0 errors` | **PASS** |

---

## Visual Verification Artifacts

- Masters Dropdown Expanded: [sidebar_masters_with_branches_expanded.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/sidebar_masters_with_branches_expanded.png)
- Branches Active under Masters: [sidebar_branches_under_masters_active.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/sidebar_branches_under_masters_active.png)
- Human Resources (`/hr/staff`) without Branches: [sidebar_hr_employees_active_no_branches.png](file:///Users/aedenteka/Downloads/Projects/CRM/Aedentek%20CRM/Aedentek%20CRM/test-reports/sidebar_hr_employees_active_no_branches.png)

---

## Automated Test Command

Run test suite:
```bash
node frontend/test/test-branches-under-masters-sidebar.mjs
```
