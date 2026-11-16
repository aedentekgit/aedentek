# Test Case Report — EMI Date: Full CRUD Functionality & Schedule Parity

**Date:** 2026-11-15  
**Module:** Accounts & Finance → EMI (`/accounts/emi`)  
**Files Modified:**
- `backend/src/models/accounts/Emi.js`
- `backend/src/utils/emiEngine.js`
- `backend/src/controllers/accounts/acctEmiController.js`
- `backend/src/utils/seedAccounts.js`
- `frontend/assets/accounts-Acc7mK2p.js`
- `frontend/accounts/API_CONTRACT.md`
- `backend/package.json`
- `frontend/package.json`

**Test Suites:**
- Backend Integration & Engine: `backend/tests/emi-date.test.mjs` (`npm run test:emi-date`)
- Frontend Headless Chrome E2E: `frontend/test/test-emi-date-ui.mjs` (`npm run test:emi-date`)

**Visual Artifacts Captured:**
- `test-reports/emi_date_modal.png` (Modal drawer showing "EMI date" input field & live preview calculation)
- `test-reports/emi_date_table.png` (EMI register table showing the new "EMI DATE" column)

---

## 1. Requirement & Scope

### 1.1 Objective
Add **EMI date** (`emiDate`) functionality to the EMI management system across the full stack with complete CRUD (Create, Read, Update, Delete) support, live amortisation schedule alignment, table integration, and end-to-end test verification.

### 1.2 Functional Specification
1. **Model & Storage**:
   - `emiDate` field stored as `String` (`YYYY-MM-DD`).
   - Defaults to `startDate` if omitted, ensuring 100% backward compatibility with existing records, scripts, and tests.
2. **Business Engine (`emiEngine.js`)**:
   - Validates `emiDate` against strict YYYY-MM-DD calendar date formatting.
   - The first instalment falls due on `effectiveEmiDate = emiDate || startDate`.
   - Every subsequent instalment falls due one calendar month later (`addMonths(effectiveEmiDate, i - 1)`).
   - `endDate` and `endMonth` reflect the instalment duration computed from the effective EMI date.
   - `progressOf` derives `nextDueDate` from the active instalment schedule.
3. **API Endpoints (`/api/accounts/emi`)**:
   - **POST `/api/accounts/emi` (Create)**: Accepts `emiDate`. Returns 201 with stored `emiDate` and recalculated schedule.
   - **GET `/api/accounts/emi` (Read List)**: Exposes `emiDate` on every plan item.
   - **GET `/api/accounts/emi/:id` (Read Single)**: Returns full plan details including `emiDate` and schedule rows with `dueDate` starting from `emiDate`.
   - **POST `/api/accounts/emi/calculate` (Preview)**: Computes schedule, monthly EMI, total interest, and `endDate` using `emiDate`.
   - **PUT `/api/accounts/emi/:id` (Update)**: Allows modifying `emiDate` (or other terms). Recalculates `endDate`, `endMonth`, and instalments.
   - **DELETE `/api/accounts/emi/:id` (Delete)**: Removes the plan record from database; returns 404 on subsequent lookups.
4. **Frontend UI (`accounts-Acc7mK2p.js`)**:
   - **Modal Drawer**:
     - Added `<input type="date" name="emiDate" />` labeled `EMI date` placed immediately next to `Start date *`.
     - When setting `Start date`, `EMI date` automatically synchronizes if empty.
     - Live preview displays `EMI date` and recalculates `End date` / `End month` dynamically.
   - **Register Table**:
     - Added `EMI DATE` column header between `START` and `END MONTH`.
     - Table cells render formatted dates via `shortDate(row.emiDate || row.startDate)`.
   - **Edit & Delete Actions**:
     - Pre-fills current `emiDate` in the edit drawer.
     - Table refreshes upon save or deletion.

---

## 2. Implementation Details

### 2.1 Backend Changes
1. **`backend/src/models/accounts/Emi.js`**:
   ```javascript
   startDate: { type: String, required: true },
   emiDate: { type: String, default: '' },
   paidCount: { type: Number, default: 0, min: 0 },
   ```
2. **`backend/src/utils/emiEngine.js`**:
   - Validation:
     ```javascript
     if (b.emiDate !== undefined && b.emiDate !== '' && b.emiDate !== null) {
       if (!parseYmd(b.emiDate)) errors.push('EMI date must be a valid date (YYYY-MM-DD)');
     }
     ```
   - Amortisation calculation:
     ```javascript
     const effectiveEmiDate = (emiDate && String(emiDate).trim()) || startDate;
     // Schedule rows:
     schedule.push({
       no: i,
       dueDate: addMonths(effectiveEmiDate, i - 1),
       ...
     });
     ```
3. **`backend/src/controllers/accounts/acctEmiController.js`**:
   - Whitelisted `emiDate` in `FIELDS`.
   - Normalised in `clean()` helper: if `emiDate` is empty, safely defaults to `startDate`.
   - Preserved in `updateEmi()` merged object.

### 2.2 Frontend Changes
1. **`frontend/assets/accounts-Acc7mK2p.js`**:
   - `previewEmi()`: Calculates `effectiveEmiDate = emiDate || startDate` and returns `emiDate`.
   - `EmiDrawer`:
     - Added `emiDate` state with initialisation from `emi.emiDate || emi.startDate`.
     - Form input:
       ```javascript
       jsx(AcctField, { label: 'EMI date', children: jsx('input', {
         className: 'input',
         type: 'date',
         name: 'emiDate',
         value: values.emiDate,
         onChange: (ev) => setValue('emiDate', ev.target.value)
       }) })
       ```
     - Preview breakdown includes `PreviewRow({ label: 'EMI date', value: shortDate(...) })`.
   - `EmiPage`:
     - Added `'EMI date'` to `AcctTable` `head` array.
     - Added corresponding `<td>` in `renderRow`.

---

## 3. Test Cases & Verification Results

### 3.1 Backend Integration Test Cases (`backend/tests/emi-date.test.mjs`)
Executed via: `node tests/emi-date.test.mjs` (Port 5102, isolated MongoDB instance)

| # | Test Scenario | Expected Outcome | Result |
|---|---------------|------------------|:------:|
| 1 | Engine: Custom `emiDate` in `computeEmi` | Payload exposes `emiDate`; schedule instalment #1 falls due on `emiDate` (`2026-10-05`); instalment #2 is `2026-11-05` | ✅ PASS |
| 2 | Engine: `endDate` calculation | `endDate` is `2027-09-05` (12 instalments starting from `2026-10-05`) | ✅ PASS |
| 3 | Engine: Omitted/blank `emiDate` fallback | Falls back to `startDate`; schedule and `endDate` compute from `startDate` | ✅ PASS |
| 4 | Validation: Valid `YYYY-MM-DD` | Returns 0 errors | ✅ PASS |
| 5 | Validation: Non-date string (`"invalid-date"`) | Returns validation error: `"EMI date must be a valid date (YYYY-MM-DD)"` | ✅ PASS |
| 6 | Validation: Invalid calendar date (`"2026-02-31"`) | Rejected by `parseYmd` check | ✅ PASS |
| 7 | Progress: `nextDueDate` computation | `nextDueDate` matches `emiDate` for unpaid plan (`2099-05-15`) | ✅ PASS |
| 8 | Progress: Status determination | Future `emiDate` results in `status: "Active"` | ✅ PASS |
| 9 | API CREATE: POST with custom `emiDate` | HTTP 201 Created; returns stored `startDate` and `emiDate` | ✅ PASS |
| 10 | API CREATE: Next due date alignment | `data.nextDueDate` equals `emiDate` (`2026-10-10`) | ✅ PASS |
| 11 | API CREATE: End date derivation | `data.endDate` reflects `2027-09-10` | ✅ PASS |
| 12 | API CREATE: Omitted `emiDate` | HTTP 201 Created; `emiDate` defaults to `startDate` | ✅ PASS |
| 13 | API CREATE: Invalid `emiDate` payload | HTTP 400 Bad Request with descriptive error message | ✅ PASS |
| 14 | API READ: GET list filter | HTTP 200; records in list include `emiDate` property | ✅ PASS |
| 15 | API READ: GET single plan by ID | HTTP 200; includes `emiDate` and full 12-instalment schedule | ✅ PASS |
| 16 | API READ: Schedule instalment due dates | First instalment is `2026-10-10`, 12th instalment is `2027-09-10` | ✅ PASS |
| 17 | API PREVIEW: POST `/calculate` | Returns HTTP 200 with calculated `emiDate` and schedule | ✅ PASS |
| 18 | API UPDATE: PUT update `emiDate` | HTTP 200; updates `emiDate` to `2026-10-20`; updates `nextDueDate` | ✅ PASS |
| 19 | API UPDATE: Recalculate `endDate` on update | `endDate` recalculated to `2027-09-20` | ✅ PASS |
| 20 | API UPDATE: Invalid `emiDate` on PUT | HTTP 400 Bad Request; record remains unchanged | ✅ PASS |
| 21 | API UPDATE: Unrelated field update | Updating `notes` retains previously stored `emiDate` | ✅ PASS |
| 22 | API DELETE: DELETE plan by ID | HTTP 200; plan removed from MongoDB | ✅ PASS |
| 23 | API DELETE: Subsequent lookup verification | GET `/api/accounts/emi/:id` returns HTTP 404 Not Found | ✅ PASS |

**Backend Test Result:** 39 passed, 0 failed.

---

### 3.2 Frontend End-to-End Test Cases (`frontend/test/test-emi-date-ui.mjs`)
Executed via: `node test/test-emi-date-ui.mjs` (Headless Chromium, Viewport 1600×1000)

| # | Test Scenario | Expected Outcome | Result |
|---|---------------|------------------|:------:|
| 1 | Table Column Header | `table thead th` contains `"EMI DATE"` | ✅ PASS |
| 2 | Column Header Position | `"EMI DATE"` is positioned between `"START"` and `"END MONTH"` | ✅ PASS |
| 3 | Seeded Records Display | Seeded plans render formatted EMI dates in the table rows | ✅ PASS |
| 4 | Form Field Existence | `input[name="emiDate"]` exists with `type="date"` | ✅ PASS |
| 5 | Form Field Label | Label is `"EMI date"` | ✅ PASS |
| 6 | Form Auto-sync | Entering `startDate` auto-syncs `emiDate` when empty | ✅ PASS |
| 7 | Live Preview Display | Preview box displays `EMI date: Nov 10` | ✅ PASS |
| 8 | Live Preview End Date | Preview box displays `End date: Oct 10` | ✅ PASS |
| 9 | Live Preview End Month | Preview box displays `End month: Oct 2027 · 12 months` | ✅ PASS |
| 10 | Plan Creation in UI | Form submits successfully; toast appears; drawer closes | ✅ PASS |
| 11 | Register Row Appearance | New row appears in table with product name | ✅ PASS |
| 12 | Table Start Date Cell | Displays `Nov 1` | ✅ PASS |
| 13 | Table EMI Date Cell | Displays custom EMI date `Nov 10` | ✅ PASS |
| 14 | Table End Month Cell | Displays `Oct 2027` | ✅ PASS |
| 15 | API Parity Verification | `GET /api/accounts/emi` contains `startDate="2026-11-01"` & `emiDate="2026-11-10"` | ✅ PASS |
| 16 | API Schedule Verification | Schedule row 0 `dueDate` is `"2026-11-10"`, `endDate` is `"2027-10-10"` | ✅ PASS |
| 17 | Edit Drawer Pre-fill | Opening edit drawer pre-fills existing `emiDate` (`2026-11-10`) | ✅ PASS |
| 18 | Edit Live Recalculation | Changing `emiDate` to `2026-11-20` updates preview `End date` to `Oct 20` | ✅ PASS |
| 19 | Edit Save Persistence | Saving edit updates table cell to `Nov 20` | ✅ PASS |
| 20 | Backend Edit Parity | `GET /api/accounts/emi/:id` confirms stored `emiDate="2026-11-20"` | ✅ PASS |
| 21 | Delete Confirmation Modal | Clicking trash icon opens confirmation modal `"Delete this EMI plan"` | ✅ PASS |
| 22 | Plan Deletion Removal | Confirming delete removes row from the table | ✅ PASS |
| 23 | API Deletion Verification | API returns HTTP 404 for deleted plan | ✅ PASS |
| 24 | Console & Runtime Audit | 0 uncaught JavaScript page errors or unhandled exceptions | ✅ PASS |

**Frontend E2E Test Result:** 27 passed, 0 failed.

---

## 4. Overall Test Summary

```
======================================================================
TEST SUITE SUMMARY: EMI DATE FULL CRUD
======================================================================
1. Backend Engine & API Integration: 39 assertions PASS / 0 FAIL
2. Frontend E2E Headless Chromium:   27 assertions PASS / 0 FAIL
----------------------------------------------------------------------
TOTAL ASSERTIONS EXECUTED:           66 PASS / 0 FAIL (100% Pass Rate)
======================================================================
```

All CRUD operations (Create with auto-sync and custom override, Read via register table and API, Update with dynamic live recalculation, and Delete with dialog confirmation and database persistence) have been implemented, verified, and audited with zero regressions.
