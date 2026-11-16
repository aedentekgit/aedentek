# Test Case Report — Tabular Search Bar: Left-Aligned Globally + Placeholder Removed
Date: 2026-11-14 · Engine: `frontend/assets/global-themed-controls.js` (search-left engine) · Test: `frontend/test/test-tabular-search-left.mjs`
Environments: local dev (`:1234` frontend + `:5001` backend, MongoDB local)

## 1. What was asked
In **tabular** (table) views, the search bar sits on the **left** side only, and its
placeholder text is **removed** — applied **globally** to every tabular view, not
just the Project Stages page shown in the request.

## 2. What changed
### 2a. Global search-left engine (`frontend/assets/global-themed-controls.js`)
New `GLOBAL TABULAR SEARCH-LEFT LAYOUT` section, alongside the existing
table-header theme engine:

- **Lift-to-left reparenting**: any search control found inside a card's
  right-hand tool cluster (`header.card__head > .card__tools`) is moved to be the
  **first child** of the card header, so it renders on the left next to the card
  title. Filters/action buttons stay in the right-hand `.card__tools` cluster
  (pushed right with `margin-left:auto`).
- **Self-healing**: a `MutationObserver` re-runs the lift on any card-header /
  tools cluster re-render, so React re-renders never undo the layout. Idempotent —
  a head that already has a correctly-placed `.tl-search-left-field` first child is
  skipped.
- **Placeholder text removal**: `::placeholder { color: transparent !important }`
  scoped to `.card__head`, `.card__tools`, `.toolbar` and `.toolbar__search`
  inputs only. Non-tabular search fields (global command palette, sign-in, form
  fields) are **not** affected.
- No changes to view code: Project Stages, Service Types, Leave history and every
  other card-header search are fixed by the one global rule.

### 2b. Test harness (`frontend/test/test-tabular-search-left.mjs`)
Headless Puppeteer suite with the standard local static server + `/api` proxy to
the running backend, logging in as the seeded admin user.

## 3. Test cases (headless, 1440×900, light theme)
| # | Scenario | Expected | Result |
|---|---|---|---|
| 1 | `/clients/project-stages` — search in card tools | Search lifted to first child of card header (left), x=24px | ✅ PASS |
| 2 | `/clients/project-stages` — filter/actions cluster | "All statuses" select + "Add Stage" stay on the right | ✅ PASS |
| 3 | `/clients/project-stages` — placeholder | `::placeholder` colour transparent (text visually removed) | ✅ PASS |
| 4 | Live search after reparenting | Typing "Design" filters the stage table (Design row remains, S NO re-indexed) | ✅ PASS |
| 5 | `/clients/service-types` — same three checks | lift + right-side tools + transparent placeholder | ✅ PASS |
| 6 | `/hr/leave` — "Leave history" card | Search field lifted in DOM (first child). Card head itself is `display:none` via **pre-existing** global CSS (`.card:has(.table) > .card__head`) — geometry checks skipped, DOM lift verified | ✅ PASS (note) |
| 7 | `/finance/invoices` — toolbar search (already left) | Placeholder still blanked for toolbar tabular searches | ✅ PASS |
| 8 | `/clients/companies` — toolbar search (already left) | Same as #7 | ✅ PASS |
| 9 | No uncaught page errors across all routes | 0 `pageerror` events | ✅ PASS |

**Totals: 17/17 assertions PASS (0 uncaught errors).** Artifacts in
`frontend/test-reports/`: `tabular_search_left_stages.png`,
`tabular_search_left_service_types.png`, `tabular_search_left_leave.png`.

## 4. Scope notes
- The lift applies to **card-header** tool clusters. Views that already keep their
  search in a dedicated left toolbar (Invoices, Propagations, Client Directory,
  Accounts masters, HR masters) were not moved — their search was already on the
  left. Their placeholders are blanked by the same global rule.
- `/hr/leave`'s "Leave history" head is hidden by the pre-existing rule
  `.card:has(.table) > .card__head { display:none }` in `signin-styles.css`, so
  there is nothing visible to move there; the DOM lift is still applied so that if
  that hide-rule ever goes, the layout is correct by default. (Left untouched to
  avoid changing unrelated behaviour.)
- Frontend dev server now runs on **`http://localhost:1234`** (changed this
  session; proxy still targets backend `:5001`).
