# Test Case Report — Global Card Left-Accent Border in Theme Colour
Date: 2026-11-14 · Engine: `frontend/assets/global-themed-controls.js` (card-accent engine) · Test: `frontend/test/test-card-accent-border.mjs`
Environments: local dev (`:1234` frontend + `:5001` backend, MongoDB local)

## 1. What was asked
Implement the **left-side border strip on cards** (as shown in the reference
screenshot — a vertical accent border along the card's left edge) **globally,
coloured with the theme colour** (the live `--primary` from the theme engine),
across every card in the app.

## 2. What changed
### 2a. Global card-accent engine (`frontend/assets/global-themed-controls.js`)
New `GLOBAL CARD LEFT-ACCENT BORDER` section, same pattern as the existing
table-header theme engine:

- A `:root:root:root:root:root .card` rule (padded specificity + `!important`)
  injects `border-left: 4px solid var(--primary)` on **every** `.card`,
  appended to `<body>` after the per-page CSS so it wins source order too.
- Because the border reads **`var(--primary)`**, it automatically follows the
  theme engine: default light `#7627c4`, dark-mode `#b88bf8`, and any custom
  primary chosen in Settings (`__tlApplyTheme` live-updates it) — no extra code
  needed for theme switching.
- No view/component code touched; one global rule covers all cards (tables,
  masters, forms, KPI cards, modals).

### 2b. Test harness (`frontend/test/test-card-accent-border.mjs`)
Headless Puppeteer suite using the standard local static server + `/api` proxy
to the running backend, logging in as the seeded admin user.

## 3. Test cases (headless, 1440×900)
| # | Scenario | Expected | Result |
|---|---|---|---|
| 1 | `/clients/project-stages` light — card accent | 4px solid left border, colour = `#7627c4` (rgb(118,39,196)) | ✅ PASS |
| 2 | `/finance/invoices` light — card accent | same rule applies on another module's cards | ✅ PASS |
| 3 | Dark mode toggle | accent switches to dark primary `#b88bf8` (rgb(184,139,248)) | ✅ PASS |
| 4 | Custom primary via `__tlApplyTheme('#0ea5e9')` | accent live-updates to rgb(14,165,233) | ✅ PASS |
| 5 | Restore default theme | accent back to `#7627c4`, 4px width unchanged | ✅ PASS |
| 6 | No uncaught page errors | 0 `pageerror` events across all routes | ✅ PASS |

**Totals: 14/14 assertions PASS.** Artifacts in `frontend/test-reports/`:
`card_accent_stages.png`, `card_accent_invoices.png`,
`card_accent_custom_primary.png`.

## 4. Scope notes
- The accent is **4px** wide, using the same rounded card shape (`--r-card`);
  the left edge of the border follows the card's existing corner radius, matching
  the reference image.
- Applies to **all** `.card` elements app-wide — including card headers that are
  intentionally hidden (e.g. some HR table cards); the border remains on the card
  body in those cases.
- Follows the global theme engine exactly: changing the primary colour in
  Settings (or switching dark/light) re-tints every accent border instantly with
  zero extra work.
