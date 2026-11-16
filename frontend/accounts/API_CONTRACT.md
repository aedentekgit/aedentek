# Accounts & Finance — API Contract & Frontend Integration Brief

**Contract version:** 1.0
**Backend base:** `http://localhost:5001` (vite proxies `/api/*` → `:5001`)
**Frontend dev server:** `http://localhost:1234`

> The frontend calls `/api/...` with **relative** paths.

---

## A. THE ARCHITECTURE — read this first

This module is a **double-entry accounting system**. Every module posts to one
**General Ledger**. The four financial statements are pure aggregations over
that ledger. Build to that shape; do not compute balances independently in
each module.

```
Sales ─┐
Expenses ─┐
Stock Inward ─┤
Credit Notes ─┤──► postJournal() ──► GeneralLedger ──► Trial Balance
Assets ─┤        (balanced lines)         │              P&L
JVs ─┤                                 │              Balance Sheet
Banking Transfers ─┘                     └──►        GL Book
```

### Chart of Accounts (seeded, fixed)

| Code | Name | Type | Normal |
|---|---|---|---|
| 1000 | Cash & Bank Master | Asset | Debit |
| 1010 | Cash on Hand / Petty Cash | Asset | Debit |
| 1020 | Commercial Bank Accounts | Asset | Debit |
| 1100 | Accounts Receivable | Asset | Debit |
| 1300 | Merchandise & Supplements Inventory | Asset | Debit |
| 1500 | Gym Equipment & Fixed Assets | Asset | Debit |
| 1600 | Accumulated Depreciation | Asset | Credit (contra) |
| 2000 | Accounts Payable (Vendors) | Liability | Credit |
| 2100 | Unearned Membership Revenue | Liability | Credit |
| 2200 | Sales Tax / GST Payable | Liability | Credit |
| 3000 | Owner's Equity & Retained Earnings | Equity | Credit |
| 4000 | Sales Revenue (Retail POS) | Revenue | Credit |
| 4100 | Membership Plan Revenue | Revenue | Credit |
| 4200 | Personal Training Revenue | Revenue | Credit |
| 4900 | Sales Returns & Credit Notes | Contra Revenue | Debit |
| 5000 | Operating Expenses (OPEX) | Expense | Debit |
| 5100 | Rent Expense | Expense | Debit |
| 5200 | Electricity & Utilities | Expense | Debit |
| 5300 | Maintenance & Repairs | Expense | Debit |
| 5400 | Marketing & Advertising | Expense | Debit |
| 5500 | Staff Salaries & Payroll | Expense | Debit |
| 5600 | Depreciation Expense | Expense | Debit |

---

## B. Response envelope

```js
{ success: true, message: 'Human readable', data: <payload>, kpis?: {...} }
// error
{ success: false, message: 'Reason' }   // HTTP 4xx/5xx
```

---

## C. Endpoints

### Chart of Accounts & General Ledger
| Method | Path | Notes |
|---|---|---|
| GET | `/api/accounts/chart-of-accounts` | `data: Account[]` — the seeded COA |
| GET | `/api/accounts/journal` | `?from=&to=&account=&sourceModule=&branch=&q=` → `data: JournalEntry[]` (the GL book) |
| GET | `/api/accounts/journal/:id` | `data: JournalEntry` |

### 1. Sales — `/api/accounts/sales`
| Method | Path | Notes |
|---|---|---|
| GET | `/api/accounts/sales` | `?status=&branch=&q=` → `data: SalesInvoice[]`, `kpis: {totalInvoices,totalSales,collectedRevenue,outstandingReceivables}` |
| GET | `/api/accounts/sales/:id` | `data: SalesInvoice` |
| POST | `/api/accounts/sales` | creates + posts GL. `kpis` same shape |
| PUT | `/api/accounts/sales/:id` | updates + reverses/reposts GL |
| DELETE | `/api/accounts/sales/:id` | deletes + reverses GL |
| POST | `/api/accounts/sales/:id/collect` | body `{ amount, paymentMode, notes }` → partial/settled |

**SalesInvoice shape**
```js
{ _id, invoiceNumber, customer, invoiceDate, dueDate, paymentTerms,
  items: [{ productService, quantity, rate, subtotal }],
  subtotal, discount, tax, grandTotal, paidAmount, outstandingAmount,
  paymentMode, status, branch, notes, createdAt }
```
Status: `Draft | Approved | Sent | Partially Paid | Paid | Overdue | Cancelled`

**Computed server-side**
```
subtotal        = Σ (quantity × rate)
grandTotal      = max(0, subtotal − discount + tax)
outstandingAmount = max(0, grandTotal − paidAmount)
status: paidAmount === grandTotal          -> 'Paid'
        0 < paidAmount < grandTotal        -> 'Partially Paid'
        paidAmount === 0 && past dueDate   -> 'Overdue'
        otherwise                          -> body status (Approved/Sent)
```

**GL posting on approve/sent/paid**
```
Debit  1100 Accounts Receivable      grandTotal
Credit 4000 Sales Revenue            grandTotal − tax
Credit 2200 Tax Payable             tax
(if paidAmount > 0)
Debit  1010/1020 Cash/Bank           paidAmount
Credit 1100 Accounts Receivable      paidAmount
```

### 2. Accounts Overview — `/api/accounts/dashboard`
| Method | Path | Returns |
|---|---|---|
| GET | `/api/accounts/dashboard` | `?branch=&from=&to=` → `data: { kpis, pending, trends, expenseMix }` |

```js
kpis: { totalSales, totalExpenses, totalReceivables, totalCredits,
        totalAssets, cashBalance, bankBalance, netProfit }
pending: { salesInvoices, payments, expenses, journalVouchers, creditNotes }
trends: [{ period: 'YYYY-MM', income, expense }]   // 6 months
expenseMix: [{ category, amount }]
```

### 3. Expenses — `/api/accounts/expenses`
| Method | Path | Notes |
|---|---|---|
| GET | `/api/accounts/expenses` | `?category=&branch=&q=&from=&to=` → `data`, `kpis: {totalExpenses, operatingOverhead, topCategory}` |
| POST/PUT/DELETE | `/api/accounts/expenses[/:id]` | POST/POST+PUT post GL |

```js
{ _id, title, category, amount, paymentMode, branch, date, notes }
```
**GL:** `Debit 5xxx Expense (category account) amount` / `Credit 1010 or 1020 amount`

### 4. Expense Categories — `/api/accounts/expense-categories`
`GET` (kpis `{total, active, inactive}`) · `POST` · `PUT /:id` · `DELETE /:id`
```js
{ _id, code: 'EXP-001', name, description, branch, status: 'Active'|'Inactive',
  accountCode: '5100' }   // optional COA link used for GL posting
```

### 5. Stock Inward — `/api/accounts/stock-inward`
`GET` (kpis `{totalInwards,totalProcuredValue,paidToSuppliers,accountsPayable}`) ·
`POST` · `PUT /:id` · `DELETE /:id` · `GET /:id`

```js
{ _id, inwardNumber, supplier, supplierInvoice, date, category, branch,
  items: [{ sku, description, quantity, unitCost, sellingPrice, lineTotal }],
  totalAmount, paidAmount, balanceDue, status, notes }
```
**Computed:** `lineTotal = quantity × unitCost`; `totalAmount = Σ lineTotal`;
`balanceDue = max(0, totalAmount − paidAmount)`; `paidAmount = Σ split payments`.
**GL:** `Debit 1300 Inventory totalAmount` / `Credit 1020 paidAmount` / `Credit 2000 Accounts Payable balanceDue`

### 6. Credit Notes — `/api/accounts/credit-notes`
`GET` (kpis `{totalNotes,totalCreditValue,refundedCash,appliedToInvoices}`) ·
`POST` · `PUT /:id` · `DELETE /:id` · `POST /:id/apply` (body `{ invoiceId }`)

```js
{ _id, creditNoteNumber, customer, referenceInvoice, reason,
  items: [{ description, quantity, rate, totalCredit }],
  totalCredit, settlementMethod /* 'Apply to Invoice'|'Direct Refund'|'Store Credit' */,
  refundedAmount, appliedAmount, status, branch, notes }
```
**Apply to Invoice:** new invoice outstanding = `max(0, outstanding − totalCredit)`;
invoice paid = `paid + totalCredit`; if outstanding becomes 0 → invoice status `Paid`.
**GL:** `Debit 4900 Contra Revenue totalCredit` / `Credit 1100 AR totalCredit` (applied)
or `Credit 1010/1020 Cash refundedAmount` (refunded).

### 7. Asset Records — `/api/accounts/assets`
`GET` (kpis `{totalFixedAssets,netBookValue,totalUnits,depreciationRecorded}`) ·
`POST` · `PUT /:id` · `DELETE /:id` · `POST /:id/depreciate` (body `{ period }`)

```js
{ _id, assetId, assetName, category, quantity, purchaseDate, purchaseCost,
  currentValue, usefulLifeYears, depreciationMethod /* 'Straight Line'|'Reducing Balance' */,
  depreciationRate, salvageValue, accumulatedDepreciation, location,
  assignedEmployee, paymentType, status, branch }
```
**Depreciation engine**
```
Straight Line:  annualDep = (purchaseCost − salvageValue) / usefulLifeYears
Reducing Balance: annualDep = currentValue × (depreciationRate / 100)
bookValue = max(salvageValue, purchaseCost − accumulatedDepreciation)
```
**GL on purchase:** `Debit 1500 Fixed Assets purchaseCost` / `Credit 1010/1020 purchaseCost`
**GL on depreciation run:** `Debit 5600 Depreciation Expense dep` / `Credit 1600 Accumulated Depreciation dep`

### 8. Asset Categories — `/api/accounts/asset-categories`
`GET` (kpis `{total,active,linkedBranches}`) · `POST` · `PUT /:id` · `DELETE /:id`
```js
{ _id, code: 'AC-001', name, description, branch, status }
```
**Seed exactly these 6:**
`AC-001 Gym Equipment` · `AC-002 IT & Electronics` · `AC-003 Furniture & Fixtures` ·
`AC-004 Vehicles` · `AC-005 Buildings` · `AC-006 Other Assets`

### 9. Adjustment Entry / JV — `/api/accounts/adjustment-entry`
`GET` (kpis `{totalJVs,postedEntries,draftEntries,totalValueAdjusted}`) ·
`POST` · `PUT /:id` · `DELETE /:id` · `POST /:id/post` · `POST /:id/reverse`

```js
{ _id, entryNumber: 'JV-000001', date, entryType, referenceNumber, narration,
  debitAccount, creditAccount, amount, status, branch }
```
**Rules**
- `amount > 0`, `debitAccount !== creditAccount`
- Status `Draft | Pending Approval | Approved | Posted | Rejected | Reversed`
- **POST** → status `Posted`, writes an immutable GL entry, and the JV becomes
  **locked**: PUT/DELETE return **409** with a message saying to reverse it.
- **REVERSE** → creates an offsetting JV (debit↔credit swapped) with status
  `Reversed`, and posts the contra entry to the GL.
- **Balanced-entry validation** on the manual Journal write: reject with
  `"Unbalanced entry rejected! Total Debit (X) must equal Total Credit (Y)."`

### 10. Banking & Payments — `/api/accounts/banking` *(the UI page was removed; the API stays because the dashboard cash/bank balances and the ledger use it)*
| Method | Path | Notes |
|---|---|---|
| GET | `/api/accounts/banking/transactions` | unified cash book: `data: [{ date, reference, category, description, paymentMode, inflow, outflow, balance, branch }]`, `kpis: {totalInflows,totalOutflows,netCashFlow,cashBalance,bankBalance}` |
| GET | `/api/accounts/banking/accounts` | `data: BankAccount[]`, `kpis: {totalAccounts,activeAccounts,totalBalance}` |
| POST/PUT/DELETE | `/api/accounts/banking/accounts[/:id]` | Bank account master |
| GET | `/api/accounts/banking/transfers` | `data: BankTransfer[]` |
| POST | `/api/accounts/banking/transfers` | creates + moves balances + posts contra GL |
| DELETE | `/api/accounts/banking/transfers/:id` | reverses the transfer |

**BankAccount:** `{ _id, accountNumber, accountName, accountType /* Checking / Current | Savings | Petty Cash | Merchant POS Terminal */, bankName, ifsc, openingBalance, currentBalance, status, branch }`
**BankTransfer:** `{ _id, transferNumber, fromAccount, toAccount, amount, transferType /* Bank to Bank | Cash to Bank | Bank to Cash */, referenceNumber, status, branch }`

Transfer effect: `from.currentBalance -= amount`, `to.currentBalance += amount`;
GL: `Debit <to account> amount` / `Credit <from account> amount`.

### 11. Financial Reports — `/api/accounts/reports`
| Method | Path | Returns |
|---|---|---|
| GET | `/api/accounts/reports/balance-sheet` | `?asOf=` → `{ assets:{current,fixed,netFixed,total}, liabilities:{current,total}, equity:{capital,currentPeriodProfit,total}, totals:{assets,liabilitiesEquity,balanced} }` |
| GET | `/api/accounts/reports/profit-loss` | `?from=&to=` → `{ revenue:{membership,pos,returns,gross,net}, cogs, grossProfit, opex:{total,byCategory}, netProfit }` |
| GET | `/api/accounts/reports/trial-balance` | `?asOf=` → `{ rows:[{code,name,debit,credit}], totals:{debit,credit,balanced} }` |
| GET | `/api/accounts/reports/general-ledger` | `?from=&to=&account=&q=` → `{ rows:[{date,accountCode,accountName,sourceModule,sourceId,reference,description,debit,credit,branch}] }` |

**Trial Balance rule:** `Σ debits === Σ credits` → `balanced: true`.
**Balance Sheet rule:** `totalAssets === totalLiabilities + totalEquity` → `balanced: true`.

---

## D. Data shapes for the GL

### Account
```js
{ _id, code: '1100', name: 'Accounts Receivable', type: 'Asset'|'Liability'|'Equity'|'Revenue'|'Contra Revenue'|'Expense', normalBalance: 'Debit'|'Credit', group: 'Liquid Assets', active }
```

### JournalEntry (immutable once posted)
```js
{ _id, entryNumber, date, description, sourceModule, sourceId, reference,
  branch, lines: [{ accountCode, accountName, debit, credit }],
  totalDebit, totalCredit, balanced, postedAt, reversedBy, createdAt }
```
`totalDebit === totalCredit` is enforced on write.

---

## E. Cross-module rules the backend implements (the client must not duplicate these)

| Trigger | Effect |
|---|---|
| Invoice approved/sent/paid | Posts the AR/Revenue/Tax GL lines; cash line when paid |
| Invoice paid | Inventory quantity decrements for stock items |
| Credit note applied | Invoice outstanding reduced, invoice status → Paid when cleared |
| Expense created | Posts debit expense account / credit cash or bank |
| Stock inward created | Posts debit inventory / credit bank + payable |
| Asset purchased | Posts debit fixed assets / credit cash or bank |
| Depreciation run | Posts debit depreciation expense / credit accumulated depreciation |
| JV posted | Writes an immutable GL entry and locks the JV |
| JV reversed | Writes a contra GL entry, original becomes `Reversed` |
| Bank transfer | Moves balances and posts a contra GL entry |
| Payroll marked Paid (HR module) | Debit 5500 Salary Expense / Credit 1020 Bank |

---

## F. Frontend integration requirements

### Route
All 11 modules live under **`/accounts`**. The app router derives the page key from
the **first** path segment, so `/accounts/<anything>` loads the Accounts chunk.

| Page | URL | `route.sub` |
|---|---|---|
| Accounts Overview | `/accounts/dashboard` | `dashboard` |
| Sales | `/accounts/sales` | `sales` |
| Expenses | `/accounts/expenses` | `expenses` |
| Expense Categories | `/accounts/expense-categories` | `expense-categories` |
| Stock Inward | `/accounts/stock-inward` | `stock-inward` |
| Credit Notes | `/accounts/credit-notes` | `credit-notes` |
| Asset Records | `/accounts/assets` | `assets` |
| Asset Categories | `/accounts/asset-categories` | `asset-categories` |
| Adjustment Entry | `/accounts/adjustment-entry` | `adjustment-entry` |
| Financial Reports | `/accounts/reports` | `reports` |

The Accounts chunk is a single module that reads `route.sub` and renders the
matching page. Default to `dashboard` for an unknown value.

### Shared UI bundle — import contract

```js
import {
  A as jsxRuntime,
  D as toast,
  Ft as ReactHooks,      // { useState, useEffect, useMemo, useRef, useLayoutEffect }
  R as mutateState,
  b as closeDrawer,
  c as EmptyState,
  ct as formatDateFull,
  ft as formatCurrency,
  g as SearchInput,
  h as StatusPill,
  i as CheckboxToggle,
  lt as formatLongDate,
  m as PageHeader,
  mt as formatNumber,
  pt as formatCompactCurrency,
  r as Card,
  s as ModalDrawer,
  vt as Icon,
  w as openDrawer,
  xt as generateId,
  y as Tabs
} from './ui-D4_WaMI9.js';

const { jsx, jsxs, Fragment } = jsxRuntime();
```

### ⚠️ CRITICAL — React calling convention

The shared bundle exposes React's **automatic** runtime. In that runtime the
**third argument of `jsx()` / `jsxs()` is a KEY, not children**.

```js
// ✅ CORRECT — children go inside props
jsx('div', { className: 'x', children: [ jsx('span', { children: 'hi' }) ] })
jsx('span', { children: 'hi' })

// ❌ WRONG — this passes the array as the KEY and renders an empty element
jsx('div', { className: 'x' }, [ jsx('span', { children: 'hi' }) ])
```

**`frontend/assets/hr-Hr7xK2mQ.js` is a working reference** — read the top of that
file and copy its `jsx` / `jsxs` usage exactly.

### Page shell (ALL 11 pages)

```jsx
jsxs('div', { className: 'page accounts' }, [
  jsx(PageHeader, { crumbs: [...], title: meta.title, sub: meta.sub }),
  jsx(Tabs, { active: sub, label: 'Accounts modules', items: ACCOUNT_MODULES }),
  jsx('div', { className: 'acct-stack' }, content)
])
```

`<PageHeader/>` **immediately followed by** `<Tabs>` is mandatory — that adjacency
is what makes the global `.phead + .tabs` / `.phead:has(+ .tabs)` rules merge the
header and section bar into one card (the Settings look). Render `<Tabs/>` with
`href` values of `/accounts/<sub>` and an `icon` per module.

### Component patterns — copy from `frontend/assets/hr-Hr7xK2mQ.js`

Read that file. It is readable, hand-written source that already follows the house
style. Non-negotiables:

1. Stat cards: `.kpis` / `.kpi` with `data-tone` (`cobalt|amber|teal|violet|rose|slate`).
2. Tables: `.table-wrap` + `.table` (+ `.table--stack` for responsive stacking).
   **Never nest a `<tr>` inside a `<tr>`** — a single `<thead><tr>…</tr></thead>`.
3. Forms: `.form-grid` + `.field` + `.input` / `.select` / `.textarea`.
4. Buttons: `btn btn--primary`, `btn btn--ghost`, `btn btn--sm`. Icons via `<Icon name="..."/>`.
5. Empty states: `<EmptyState .../>`.
6. Toasts: `toast('Message', { icon: 'check' })`.
7. Deletes must go through the app's `confirmModal` (imported as `S as confirmModal`
   from the ui bundle) — never a bare `window.confirm()`.
8. Currency is **₹ (INR)** — use `formatCurrency` / `formatCompactCurrency`.
9. Modals: `<ModalDrawer .../>`.

### Theme tokens (never hardcode a colour)

```css
--card  --card-2  --raised  --well  --line  --line-2
--text  --muted  --faint  --primary  --on-primary  --primary-ink
--good  --bad  --warn  --amber  --teal  --violet  --rose  --citron  --pill  --on-pill
--r-card  --r-ctl  --r-tile  --gap  --gutter  --fs-*  --shadow  --shadow-pop
```

### CSS file
Create `frontend/assets/accounts-<hash>.css` for page-specific styles only.
Prefix every class with `acct-`. Do not restyle shared components.

---

## G. Behavioural requirements

1. **Full CRUD** on every module that has records: Sales, Expenses, Expense
   Categories, Stock Inward, Credit Notes, Assets, Asset Categories, Adjustment
   Entry, Bank Accounts, Transfers.
2. **Data comes from the API**, never from local mock state. Fetch on mount and
   re-fetch after every successful mutation.
3. **Never crash when the backend is down.** Use the `apiFetch` helper:
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
4. **Server-side math is authoritative.** The client may *preview* a value
   (grand total, balance due, book value) but the server owns the truth.
5. **The Financial Reports page** renders 4 sub-tabs (Balance Sheet, P&L, Trial
   Balance, GL Book), each fetching its own endpoint.
6. **The Banking page** renders 3 sub-tabs (Transactions, Transfers, Accounts).
7. The Accounts Overview renders 8 KPI cards, a pending-actions widget, and 3
   charts (income vs expense bar, cash-flow line, expense donut) using the
   shared `charts` chunk (`./charts-RP94NVff.js`) if available — otherwise a
   simple CSS bar breakdown is acceptable.

---

### EMI plans — `/api/accounts/emi` (replaces the Stock Inward screen)

The Stock Inward API (`/api/accounts/stock-inward`) is unchanged because Sales and the ledger depend on it, but the UI route `/accounts/stock-inward` is replaced by `/accounts/emi` ("EMI").

| Method | Path | Purpose |
|---|---|---|
| GET | `/emi?category=&status=&branch=&q=` | List + `kpis` `{ totalPlans, activeEmis, monthlyOutflow, outstanding }` |
| GET | `/emi/:id` | One plan, with the full instalment `schedule` |
| POST | `/emi` | Create |
| PUT | `/emi/:id` | Update (derived values recomputed) |
| POST | `/emi/:id/pay` | Mark the next EMI as paid (409 when complete) |
| POST | `/emi/calculate` | Preview the calculation without saving |
| DELETE | `/emi/:id` | Delete |

Input: `productName`, `category`, `principal`, `emiCount` (whole number 1–600), `interestRate` (% per year, 0–100), `startDate` (YYYY-MM-DD), `emiDate` (YYYY-MM-DD, optional — defaults to `startDate`), optional `paidCount`, `initialPayment`, `processingCharges`, `transactionFee`, `branch`, `notes`.

Computed by the server (client-supplied values are ignored): `emiAmount` (reducing balance, `P·r·(1+r)^n / ((1+r)^n − 1)`, `r = rate/1200`; `P/n` at 0 %), `totalPayable`, `totalInterest`, `emiDate` (effective EMI deduction date), `endDate` (= emiDate + (n − 1) months, day clamped to month length), `endMonth` (`YYYY-MM`), `durationMonths`. The first EMI is due on the emiDate (or startDate if omitted).

Live fields on every row: `status` (`Active` / `Overdue` when the next due date has passed / `Completed`), `nextDueDate`, `outstandingAmount`, `remainingCount`.
