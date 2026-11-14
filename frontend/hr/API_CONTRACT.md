# HR Module — API Contract & Frontend Integration Brief

**Contract version:** 1.0
**Backend base:** `http://localhost:5001` (vite dev server proxies `/api/*` → `:5001`)
**Frontend dev server:** `http://localhost:5173`

> The frontend calls `/api/...` with **relative** paths. The vite proxy forwards them.

---

## A. Endpoints

All responses follow the app's existing envelope:

```js
// success
{ success: true, message: 'Human readable', data: <payload> }
// list
{ success: true, message: '...', data: [...], kpis?: {...} }
// error
{ success: false, message: 'Reason' }   // HTTP 4xx/5xx
```

### Employees — `/api/staff`

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/api/staff` | `?branch=&department=&status=&q=&page=&limit=` | `data: Staff[]`, `kpis: {totalStaff, activeStaff, onLeave, trainers, branches}` |
| GET | `/api/staff/:id` | — | `data: Staff` |
| POST | `/api/staff` | Staff payload | `201`, `data: Staff` |
| PUT | `/api/staff/:id` | Staff payload | `data: Staff` |
| DELETE | `/api/staff/:id` | — | `data: {id}` |
| GET | `/api/staff/branches` | — | `data: string[]` (distinct branch names) |

### Biometric Attendance — `/api/hr/staff-attendance`

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/api/hr/staff-attendance` | `?month=YYYY-MM&branch=&status=&q=&staffId=` | `data: Attendance[]`, `kpis: {totalLogs, present, late, absent, halfDay, onLeave, workingHours}` |
| POST | `/api/hr/staff-attendance` | `{staffRef, date, status, checkIn, checkOut, remarks}` | `201`, `data: Attendance` |
| POST | `/api/hr/staff-attendance/punch` | `{biometricId, deviceId, timestamp}` | `data: Attendance` (device webhook) |
| PUT | `/api/hr/staff-attendance/:id` | partial | `data: Attendance` |
| DELETE | `/api/hr/staff-attendance/:id` | — | `data: {id}` |

### Leave Requests — `/api/hr/leave`

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/api/hr/leave` | `?status=&staffRef=&q=` | `data: LeaveRequest[]`, `kpis: {pending, approved, rejected}` |
| GET | `/api/hr/leave/balance/:staffRef` | — | `data: [{leaveType, name, paid, monthlyQuota, annualQuota, entitled, used, available}]` |
| POST | `/api/hr/leave` | `{staffRef, leaveType, fromDate, toDate, reason}` | `201`, `data: LeaveRequest` (with computed `days`, `paidDays`, `lopDays`) |
| PUT | `/api/hr/leave/:id` | partial | `data: LeaveRequest` |
| POST | `/api/hr/leave/:id/approve` | — | `data: LeaveRequest` |
| POST | `/api/hr/leave/:id/reject` | `{reason}` | `data: LeaveRequest` |
| DELETE | `/api/hr/leave/:id` | — | `data: {id}` |

### Leave Types — `/api/hr/leave-types`

| Method | Path | Returns |
|---|---|---|
| GET | `/api/hr/leave-types` | `data: LeaveType[]`, `kpis: {total, paid, unpaid}` |
| POST | `/api/hr/leave-types` | `201`, `data: LeaveType` |
| PUT | `/api/hr/leave-types/:id` | `data: LeaveType` |
| DELETE | `/api/hr/leave-types/:id` | `data: {id}` |

### Shifts — `/api/hr/shifts`

| Method | Path | Returns |
|---|---|---|
| GET | `/api/hr/shifts` | `data: Shift[]`, `kpis: {total, active, withAllowance}` |
| POST | `/api/hr/shifts` | `201`, `data: Shift` |
| PUT | `/api/hr/shifts/:id` | `data: Shift` |
| DELETE | `/api/hr/shifts/:id` | `data: {id}` |

### Salary Structures — `/api/salary-structures`

| Method | Path | Returns |
|---|---|---|
| GET | `/api/salary-structures` | `data: SalaryStructure[]`, `kpis: {total, active, totalGross, totalNet}` |
| POST | `/api/salary-structures` | `201`, `data: SalaryStructure` (gross/deductions/net computed server-side) |
| PUT | `/api/salary-structures/:id` | `data: SalaryStructure` |
| DELETE | `/api/salary-structures/:id` | `data: {id}` |

### Salary Advances — `/api/hr/advances`

| Method | Path | Returns |
|---|---|---|
| GET | `/api/hr/advances` | `data: SalaryAdvance[]`, `kpis: {active, outstanding, disbursed}` |
| POST | `/api/hr/advances` | `201`, `data: SalaryAdvance` (`perInstallment` = ceil(amount/installments)) |
| PUT | `/api/hr/advances/:id` | `data: SalaryAdvance` |
| DELETE | `/api/hr/advances/:id` | `data: {id}` |

### Payroll Adjustments — `/api/hr/adjustments`

| Method | Path | Returns |
|---|---|---|
| GET | `/api/hr/adjustments` | `data: PayrollAdjustment[]`, `kpis: {total, credits, deductions}` |
| POST | `/api/hr/adjustments` | `201`, `data: PayrollAdjustment` |
| PUT | `/api/hr/adjustments/:id` | `data: PayrollAdjustment` |
| DELETE | `/api/hr/adjustments/:id` | `data: {id}` |

### Payroll & Payslips — `/api/hr/payroll`

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/hr/payroll` | `?period=&branch=` | `data: PayrollRun[]`, `kpis: {totalRuns, draft, finalized, paid, pendingLeaves}` |
| GET | `/api/hr/payroll/:id` | — | `data: PayrollRun` (with `payslips[]`) |
| POST | `/api/hr/payroll/run` | `{period, branch, autoReconcile}` | `201`, `data: PayrollRun` (payslips computed) |
| POST | `/api/hr/payroll/:id/finalize` | — | `data: PayrollRun` |
| POST | `/api/hr/payroll/:id/pay` | — | `data: PayrollRun` |
| DELETE | `/api/hr/payroll/:id` | — | `data: {id}` (reverses advance recoveries) |

---

## B. Data shapes

### Staff
```js
{
  _id, staffCode, employeeCode, biometricId,
  salutation, firstName, middleName, lastName, name,
  dob, gender, maritalStatus, nationality, bloodGroup,
  department, role, branch, branchRef, shift, shiftName,
  employmentType, joiningDate, status,          // Active|Inactive|On Leave|Terminated
  basic, hra, transportAllowance, telephoneAllowance, foodAllowance,
  specialAllowance, otherEarnings, otherDeductions,
  salary, netSalary,                            // derived server-side
  bankName, accountNumber, ifscCode, iban,
  createLogin, username, accessLevel,           // password NEVER returned
  photo, documents: [{ name, type, size, uploadedAt, url }]
}
```

### StaffAttendance
```js
{ _id, staffRef, staffId, staffName, role, branch, date /*YYYY-MM-DD*/,
  checkIn /*"09:12" | "—"*/, checkOut, workingHours /*"7h 48m"*/,
  status /*Present|Late|Absent|Half Day|On Leave*/, lateMinutes, lateFine,
  deviceId, remarks, isSynthetic /*true when generated by leave approval*/ }
```

### LeaveRequest
```js
{ _id, staffRef, staffId, staffName, leaveType, leaveTypeName, leaveTypeCode,
  fromDate, toDate, days, paidDays, lopDays,
  reason, status /*Pending|Approved|Rejected*/, appliedAt, decidedAt, decidedBy }
```

### LeaveType
```js
{ _id, name, code, monthlyQuota, annualQuota, paid /*bool*/, branch, status /*Active|Inactive*/ }
```

### Shift
```js
{ _id, name, startTime, endTime, lateAfter, lateDeduction,
  lateDeductionPerMin, shiftAllowance, status }
```

### SalaryStructure
```js
{ _id, staffRef, staffId, staffName, branch, effectiveFrom,
  basic, hra, transportAllowance, telephoneAllowance, foodAllowance,
  specialAllowance, otherEarnings, gross,
  pf, esi, tds, otherDeductions, totalDeductions, netSalary, status }
```

### SalaryAdvance
```js
{ _id, staffRef, staffId, staffName, amount, installments, perInstallment,
  recovered, balance, issuedDate, reason, status /*Active|Closed*/ }
```

### PayrollAdjustment
```js
{ _id, staffRef, staffId, staffName, period /*YYYY-MM*/,
  type /*credit|deduction*/, label, amount }
```

### PayrollRun
```js
{ _id, period /*YYYY-MM*/, branch, status /*Draft|Finalized|Paid*/,
  autoReconcile, employeeCount, totalGross, totalDeductions, totalNet,
  processedAt, finalizedAt, paidAt,
  payslips: [{
    payslipNo, staffRef, staffId, staffName, designation, branch,
    grossPay, shiftDifferential, lopDays, lopDeduction,
    credits, advanceRecovery, fixedDeductions, adHocDeductions,
    lateFines, totalEarnings, totalDeductions, netPayout,
    attendance: { present, late, absent, halfDay, onLeave },
    bank: { bankName, accountNumber, ifscCode }
  }] }
```

---

## C. Server-side computed fields (never trust the client)

| Entity | Computed |
|---|---|
| Staff | `name` = first + middle + last; `salary` = basic+hra+transport+telephone+food+special+otherEarnings; `netSalary` = max(0, salary − otherDeductions) |
| Attendance | `workingHours` from checkIn/checkOut; `lateMinutes`/`lateFine` from the staff's shift `lateAfter` |
| LeaveRequest | `days` = inclusive day count; `paidDays`/`lopDays` from leave-type `paid` flag and remaining quota |
| SalaryStructure | `gross` = Σ earnings; `totalDeductions` = pf+esi+tds+otherDeductions; `netSalary` = max(0, gross − totalDeductions) |
| SalaryAdvance | `perInstallment` = ceil(amount / installments); `balance` = amount − recovered |
| PayrollRun | every payslip field (see section D) |

---

## D. Payroll formula (server-side, per employee)

```
M = days in month
B = gross + shiftAllowance
R = B / M
D_lop = absentDays + unpaidLeaveDays + (0.5 * halfDays)
A_lop = round2(B * D_lop / M)
EarnedGross = B - A_lop
TotalEarnings = EarnedGross + credits
PriorDeductions = fixedDeductions + adjustmentDeductions + lateFines
AvailableMargin = max(0, TotalEarnings - PriorDeductions)
Adv = min(scheduledInstallment, AvailableMargin)
NetPay = max(0, TotalEarnings - (PriorDeductions + Adv))
```

---

## E. Frontend integration requirements

### Route
All HR pages live under the **`/hr`** prefix. The app router derives the page key from the
**first** path segment, so `/hr/<anything>` loads the HR chunk.

| Page | URL | `route.sub` |
|---|---|---|
| Employees | `/hr/staff` | `staff` |
| Attendance | `/hr/attendance` | `attendance` |
| Leave Requests | `/hr/leave` | `leave` |
| Leave Types | `/hr/leave-types` | `leave-types` |
| Shifts | `/hr/shifts` | `shifts` |
| Salary Structures | `/hr/salary` | `salary` |
| Salary Advances | `/hr/advances` | `advances` |
| Payroll Adjustments | `/hr/adjustments` | `adjustments` |
| Payroll & Payslips | `/hr/payroll` | `payroll` |

The HR chunk is a single module that reads `route.sub` and renders the matching page.

### Shared UI bundle — import contract

The shared bundle is `frontend/assets/ui-D4_WaMI9.js`. Import ONLY from these aliases:

```js
import {
  A as jsxRuntime,          // { jsx, jsxs, Fragment }
  D as toast,               // toast(msg, { icon })
  Dt as formatDate,
  F as navigateLink,
  Ft as ReactHooks,         // { useState, useEffect, useMemo, useRef, useLayoutEffect }
  H as companyInitial,
  J as dateHelper,
  Mt as ripple,
  Ot as isReducedMotion,
  Pt as gsap,
  Q as dayNames,
  R as mutateState,
  St as scaleDuration,
  X as getUserById,
  Y as useGlobalState,      // global app store
  Z as companyAvatarTone,
  _ as SelectField,
  _t as formatRelativeDate,
  at as formatTime,
  b as animationHelper,
  bt as bounceElement,
  c as EmptyState,
  ct as formatDateFull,
  d as ProgressBar,
  ft as formatCurrency,
  g as SearchInput,
  h as StatusPill,
  i as CheckboxToggle,
  k as transitionHook,
  lt as formatLongDate,
  m as PageHeader,
  mt as formatNumber,
  n as formatPhone,
  nt as TODAY_ISO,
  ot as parseDate,
  pt as formatCompactCurrency,
  r as Card,
  rt as addDays,
  s as ModalDrawer,
  t as UserAvatar,
  u as HighlightText,
  ut as getDaysDiff,
  vt as Icon,
  w as openDrawer,
  wt as gsapFlip,
  xt as generateId,
  y as Tabs,
  yt as jsxRuntime2
} from './ui-D4_WaMI9.js';
```

Also import the shared action helpers from the app bundle when needed:

```js
import { R as mutateState } from './ui-D4_WaMI9.js';
```

`useGlobalState()` returns the app store `{ settings, users, ... }` — HR pages should mostly
NOT need it; they are server-driven. Use it only for the signed-in user identity.

### Component patterns to follow (copy from the existing de-minified pages)

Read `frontend/assets/settings-BaNs64Bm.js` and `frontend/assets/clients-BBlHr9Zo.js` for the
exact house style. Non-negotiables:

1. **Page header + section bar merged into one card.** The page MUST render
   `<PageHeader .../>` immediately followed by a `<nav className="tabs">` so the global
   `.phead + .tabs` / `.phead:has(+ .tabs)` rules merge them. The section bar is the
   primary nav for the 9 HR modules — it uses the shared `Tabs` component (`y`).
2. **Stat cards** use the `.kpis` / `.kpi` markup with `data-tone` (`cobalt|amber|teal|violet|rose|slate`)
   and `data-tile` attributes.
3. **Tables** use `.table-wrap` + `.table` (+ `.table--stack` for responsive stacking).
4. **Forms** use `.form-grid` + `.field` + `.input` / `.select` / `.textarea`, with
   `label` + `span.field__label-row` + `span.field__label`.
5. **Buttons**: `btn btn--primary` (submit), `btn btn--ghost` (secondary), `btn btn--sm` (inline).
   Icons come from `<Icon name="..." />`.
6. **Empty states**: `<EmptyState ... />`.
7. **Toasts**: `toast('Message', { icon: 'check' })`.
8. **Currency**: the app's finance pages use `₹` (INR) — `formatCurrency` / `formatCompactCurrency`
   from the shared bundle handle formatting. HR amounts are INR.
9. **Modals**: `<ModalDrawer ...>` from the shared bundle.

### Theme tokens (use these, never hardcode colours)

```css
--card  --card-2  --raised  --well  --line  --line-2
--text  --muted  --faint  --primary  --on-primary  --primary-ink
--good  --bad  --warn  --amber  --teal  --violet  --rose  --citron  --pill  --on-pill
--r-card  --r-ctl  --r-tile  --gap  --gutter  --fs-*  --shadow  --shadow-pop
```

### CSS file
Create `frontend/assets/hr-<hash>.css` for page-specific styles only. Use the tokens above.
Do not restyle shared components (`.btn`, `.card`, `.phead`, `.tabs`, `.table`, `.kpi`).

---

## F. Behavioural requirements

1. **Full CRUD** on all 9 modules: list, create, edit, delete. Edit and delete are
   performed from the table's action column (Edit opens a modal / inline form; Delete asks
   for confirmation via the app's confirm-modal helper, never a bare `confirm()`).
2. **Data comes from the API**, not from local mock state. Every page fetches on mount and
   re-fetches after a successful mutation.
3. **Handle a backend that is offline** — fall back to an empty state with a clear message
   rather than throwing. Follow the `apiFetch` pattern in `clients-BBlHr9Zo.js`:
   ```js
   async function apiFetch(url, options = {}) {
     try {
       const res = await fetch(url, {
         headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
         ...options
       });
       const data = await res.json();
       return { ok: res.ok, status: res.status, data };
     } catch (err) {
       return { ok: false, error: err.message };
     }
   }
   ```
4. **Server-side math must not be duplicated on the client.** The client may *preview* a
   value (e.g. monthly recovery preview, gross preview) but the server is authoritative.
5. **The section bar must show the active module** and navigating must change the URL
   (`history.pushState` + `popstate`, or plain `<a href>` links — follow the shared `Tabs`
   component, which renders `<a href>`).
