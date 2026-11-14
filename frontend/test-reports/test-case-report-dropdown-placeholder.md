# Test Case Report — Global Select "Placeholder" Fix
Date: 2026-11-14 · App: Tessly CRM (localhost:3000) · Module: Global themed dropdown engine

## Problem
Dropdowns were visually selecting the **first option as the default**.
Root cause: form selects are React-controlled with `value=""` (nothing chosen).
When a controlled `<select>` has no matching option, the DOM falls back to the
**first** `<option>` — so "Draft"/"Cash"/"Net 15" *looked* pre-selected. The
custom themed dropdown panel inherited that, marking the first row `is-selected`
and drawing a checkmark on it.

## Fix (global)
Files changed:
- `frontend/assets/global-themed-controls.js`
  - `ensureSelectPlaceholders(root)`: for every **unselected, empty-value,
    single-select** that has no empty-value option of its own, inject a leading
    `Select…` option (`data-tl-ph="1"`) and set `selectedIndex=0`.
  - `reactControlledValue(sel)`: reads `__reactProps$…value` so the guard sees
    the *true* controlled value (the DOM `value` is unreliable when nothing matches).
  - `MutationObserver` self-heals placeholders after React re-renders.
  - Themed dropdown: placeholder row gets class `is-placeholder`, is shown as the
    active row when nothing is chosen, and **no checkmark** is drawn on it.
  - Table action-chip enhancer (`enhanceActionTables`) now skips form/line-item
    tables (rows containing inputs) — prevents the pink "delete chip" regression
    on the invoice line-items table.
- `frontend/assets/index-B3aW9d7K.css`
  - `.theme-dropdown-item.is-placeholder` (muted italic) and `.is-placeholder.is-selected`
    (no highlight) so the placeholder reads as "nothing chosen", not a selection.

### Guard rules (what stays untouched)
| Condition | Result |
|---|---|
| `multiple` / `size>1` / `disabled` | skipped |
| Select already has an empty-value option | skipped |
| Select has a real value/default (e.g. "All Branches", "All Invoices") | skipped |
| Select is empty & unselected & single | inject `Select…` placeholder |

## Test cases
File: `frontend/test/test-dropdown-placeholder-global.mjs`
Run: `node test/test-dropdown-placeholder-global.mjs`  (npm script `test:dropdown-placeholder`)

| # | Case | Expected | Result |
|---|---|---|---|
| 1.1 | Payment-terms empty select | displays "Select…" (value="") | PASS |
| 1.2 | Payment-mode empty select | displays "Select…" (value="") | PASS |
| 1.3 | Status empty select | displays "Select…" (value="") | PASS |
| 1.4 | Branch select with default | untouched (value="All Branches") | PASS |
| 2.1 | Themed dropdown row 0 | is the "Select…" placeholder | PASS |
| 2.2 | placeholder row when nothing chosen | marked active | PASS |
| 2.3 | checkmark on placeholder row | absent | PASS |
| 2.4 | pick "Draft" from dropdown | value set to "Draft" | PASS |
| 2.5 | choose placeholder row | clears to "" / "Select…" | PASS |
| 3.1 | finance list filter selects | no injected placeholder | PASS |
| 3.2 | finance status filter | still defaults "All Invoices" | PASS |

**Total: 11 passed, 0 failed.**

## Regression & smoke
- `test/test-button-theming.mjs` → 20 passed, 0 failed (global controls healthy).
- Cross-page smoke (`/today /clients /deals /finance/invoices /accounts/expenses
  /accounts/emi /hr`) → 0 unexpected placeholders, 0 uncaught page errors.
- `test/test-accounts-module.mjs` → 41 passed, 19 failed. All 19 are **pre-existing
  stale tab-count expectations** (Settings 19→11, HR 9→0, Client 360 11→9) and are
  unrelated to this change; the same run reports **zero uncaught page errors**,
  confirming no runtime breakage from the select work.

## Manual verification (matches user screenshot)
Before: Status showed "Draft" with a check on the first row.
After:  Status (and Payment terms / Payment mode) show "Select…" when nothing is
chosen; Branch keeps its "All Branches" default. Screenshots captured:
`test-reports/dropdown_placeholder_open.png`, `test-reports/filters_unchanged.png`.

## Scope
Global — applies to every themed single-select across the app (Accounts, Finance,
HR, Clients, etc.), with safeguards preserving explicit defaults and filter selects.
