# Test Case Report — Finance Settings 3-Section: Compact Header/Footer + Reduced Icons + Default-Closed
Date: 2026-11-14 · Files: `frontend/assets/finance-DfxZzuIj.js` (default-closed state + `fin-sec` markers), `frontend/assets/signin-styles.css` (scoped compact CSS) · Test: `frontend/test/test-finance-settings-compact.mjs`
Environments: local dev (`:1234` frontend + `:5001` backend, MongoDB local)

## 1. What was asked
On the Tax, Banking & Invoice Settings page (`/finance/settings`) with its
**3 sections** (Invoice Sender / Banking & Wire / GST & HSN Slabs):
1. The cards **default to closed** (collapsed) — like the reference image — so the
   default view looks clean; the user opens a section when they want to edit it.
2. **Reduce the header and footer row heights** (they looked oversized/
   unprofessional at default).
3. **Reduce the icon sizes** on these 3 sections.

## 2. What changed
### 2a. Default-closed state (`frontend/assets/finance-DfxZzuIj.js`)
- `openSec` initial state for the 3 settings sections flipped `true → false`:
  `{ invoiceSender: false, bankDetails: false, gstSettings: false }`.
  Each section's form body and its footer Save row are hidden while collapsed
  (existing `display: openSec.x ? … : 'none'` behaviour), so the default page
  shows only the compact section headers.
- Each section wrapper got a `className: 'fin-sec'` marker so the compact CSS
  can target exactly these 3 cards (other admin-hub cards, e.g. the Settings
  profile hub, are unaffected).

### 2b. Scoped compact CSS (`frontend/assets/signin-styles.css`)
New `html body .finance-settings-hub .fin-sec …` rules:
- **Header row**: `padding 12px 20px` (was 20px 24px) + title/sub type scaled
  down (title `--fs-lg`, sub `--fs-xs`) → row height ~64px (was ~74px).
- **Footer (`.form-save-row`)**: `padding-top 10px` (was 18px), buttons
  `34px` tall / `12.5px` text (was 38px / 13px).
- **Footer bottom space**: the big gap under "Save profile" came from the
  row's 24px bottom margin **plus** the card's 24px bottom padding. Both reduced:
  `.form-save-row` → `margin: 6px 24px 0` and `> .card` → `padding-bottom: 14px`.
  Measured card bottom space below the button: **80px → 46px region**, visually
  snug.
- **Chevron icon button**: `28×28px` button (was 34×34) with a `14px` icon
  (was 16px).

## 3. Test cases (headless, 1440×900, light theme, per-tab navigation)
| # | Scenario | Expected | Result |
|---|---|---|---|
| 1 | `/finance/settings/invoiceSender` default | section starts collapsed (`aria-expanded=false`, 0 visible form fields, footer hidden) | ✅ PASS |
| 2 | Same — compact metrics | header row 64px · chevron 28×28 · icon 14px | ✅ PASS |
| 3 | `/finance/settings/bankDetails` default | same collapsed + compact metrics | ✅ PASS |
| 4 | `/finance/settings/gstSettings` default | same collapsed + compact metrics | ✅ PASS |
| 5 | Click chevron on Invoice Sender | full form visible (12 fields), footer Save row visible, compact footer (10px pad, 34px buttons) | ✅ PASS |
| 5b | Footer bottom space | row `margin-bottom:0` + card `padding-bottom:14px` (was 24px+24px) | ✅ PASS |
| 6 | Click chevron again | section collapses back (0 fields, `aria-expanded=false`) | ✅ PASS |
| 7 | GST tab chevron | opens independently (4 fields, `aria-expanded=true`) | ✅ PASS |
| 8 | No uncaught page errors | 0 `pageerror` events | ✅ PASS |

**Totals: 31/31 assertions PASS.** Artifacts in `frontend/test-reports/`:
`fin_settings_collapsed_default.png`, `fin_settings_section_open.png`.

## 4. Scope notes
- Changes are scoped to the 3 settings section cards via `.fin-sec` — the
  generic `admin-hub` / `finance-settings-hub` card rules (used by the Accounts
  settings hub etc.) are untouched, so only this page's 3 sections changed.
- Collapsed default is a **client-side state** (`useState` init); no API or data
  shape change. Opening a section still loads the full form exactly as before.
- Each section is a **tab** (`/finance/settings/<tabId>`); only the active tab's
  card is displayed. All 3 tabs now start closed independently.
