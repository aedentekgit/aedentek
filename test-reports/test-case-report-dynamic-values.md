# Test Case Report — Fully Dynamic Platform Identity (static values removed)
Date: 2026-11-14 · Commit: `5af973d` · Environments: crm.aedentek.in live (5063) + staging (5064)

## 1. What was requested
"Remove static values completely — fully dynamic values only" (Settings → Web Appearance →
Platform Identity, screenshot with "Aedentek" in the site-name field).

## 2. What was static (before)
| Item | Static behaviour |
|---|---|
| Site Name | stored `"Aedentek"` value pre-filled |
| Country / Time / Date / Timezone / Language | pre-selected `IN` / `12h` / `DD/MM/YYYY` / `Asia/Kolkata` / `en` via `\|\|` fallbacks — always showed a value even when nothing was saved |
| Support email / phone / logo / app-store / social fields | hardcoded brand placeholders (`caldermoss`, `+1 (555)…`, `/assets/logo.png`, `Tessly Surfaces CRM`) |

## 3. Changes (commit 5af973d)
- **`frontend/assets/settings-BaNs64Bm.js`**
  - All 5 dropdowns: fallback removed (`value: gd.x || ''`) + a leading `Select …` option
    (value `''`) — so an unconfigured field shows "Select…" instead of a guessed default.
  - Text fields: brand placeholders replaced with neutral "Enter …" hints.
- **Live + staging DB**: `PUT /api/settings/general` cleared every value to empty so the
  only source of truth is what an admin saves. Backend defaults were already all-empty, so
  no backend change was needed (theme-section defaults kept as before — they are the
  engine's brand tokens, not identity values).

## 4. Test cases (run on live https://crm.aedentek.in, no-cache)
| # | Scenario | Expected | Result |
|---|---|---|---|
| 1 | Site name / email / phone / logo fields | empty value, neutral "Enter …" placeholder | ✅ PASS |
| 2 | App-store + social URL fields | empty value, neutral placeholder (no caldermoss / sample links) | ✅ PASS |
| 3 | Country dropdown | blank value, first option "Select country…" | ✅ PASS |
| 4 | Time / Date / Timezone / Language dropdowns | blank value, first option "Select …" | ✅ PASS |
| 5 | API `GET /api/settings/general` (live) | all values empty | ✅ PASS |
| 6 | API `GET /api/settings/general` (staging) | all values empty | ✅ PASS |
| 7 | Type a value + save → reload | value persists (fully data-driven) | ✅ PASS |
| 8 | No uncaught page errors on /settings | none | ✅ PASS |

Live capture: all 8 text fields `value=""` with "Enter …" placeholders; all 5 dropdowns
`value=""` with "Select …" first option (verified via computed DOM, screenshot
`/tmp/live-dyn.png`).

## 5. Scope / note
- Applies to the **Platform Identity + Social Media** section of Web Appearance (the
  section in your screenshot). The "On file" billing card on the Studio/Profile pages
  still shows the demo "Studio · 10 seats / accounts@caldermoss.co" text — that's demo
  data on a different screen; say the word if you want those blanked too.
- **Clients dropdown** change remains **local-only** (`index-DG0_cRQu.js` uncommitted),
  as instructed earlier — not part of this deploy.
