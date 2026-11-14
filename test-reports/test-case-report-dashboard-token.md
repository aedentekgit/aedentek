# Test Case Report — "Today" → "Dashboard" + Deep-Link Token Validation
Date: 2026-11-14 · Repo commit: `306242a` · Environments: `crm.aedentek.in` (live) + staging/dev
Files changed: `frontend/assets/index-DG0_cRQu.js` (labels, enter/sign-out, gate, boot),
`frontend/assets/ui-D4_WaMI9.js` (store default + `__validateSession` helper).

## 1. What was changed
1. **"Today" → "Dashboard"** — the nav item label (drives sidebar, bottom tab-bar pill,
   and the document title "… · Tessly"), the "g then d" shortcut help text, and the
   brand `aria-label`. The route slug stays `/today` (that page *is* the dashboard).
2. **Deep-link token validation** — the store factory previously defaulted
   `signedIn: true` and persisted it, so any fresh session was auto-signed-in with
   *no token*. Now:
   - Store factory defaults `signedIn: false`, `token: ""`, `tokenExp: 0`.
   - On sign-in the app mints a session token (`token` + `tokenExp = now + 8h`).
   - Sign-out clears the token.
   - The app-shell gate requires a **valid** session (`signedIn && token && tokenExp > now`)
     — a missing, cleared, or expired token shows the sign-in screen instead of the app.
   - Boot redirect sends unauthenticated users to `/signin`, authenticated to `/today`.
   - `window.__validateSession()` helper (exported, no module-load side effect) re-validates
     and forces sign-in if the token is absent/expired.

## 2. Test cases (headless, against `localhost:3000` dev + live `https://crm.aedentek.in`)
| # | Scenario | Expected | Result |
|---|---|---|---|
| 1 | Fresh session, open `/today` | Sign-in screen (no auto-login) | ✅ PASS |
| 2 | Sign in (email + password) | Dashboard visible; sidebar/tab-bar show **"Dashboard"** (no "Today"); title "Dashboard · Tessly" | ✅ PASS |
| 3 | Reload with valid token | Stays on dashboard (session kept) | ✅ PASS |
| 4 | Deep-link `/finance/invoices` with valid token | Loads that page (no forced sign-in) | ✅ PASS |
| 5 | Clear token only, reload `/today` | Sign-in screen | ✅ PASS |
| 6 | Expired token (`tokenExp < now`), reload | Sign-in screen | ✅ PASS |
| 7 | Open `/signin` fresh | Sign-in screen | ✅ PASS |
| 8 | "Dashboard" label present; "Today" absent | `sideDash:true, sideToday:false` | ✅ PASS |

Live verification on `https://crm.aedentek.in`:
- Fresh → `path=/signin`, `signIn:true` ✅
- After sign-in → `dash:true, sideDash:true, sideToday:false, path=/today` ✅
- API endpoints (`/api/health`, `/api/clients`, `/api/invoices`, `/api/settings`) → 200 **JSON** ✅
- `/api/uploads` with empty body → 400 (correct) ✅

**No uncaught page errors** attributable to the auth changes during the run.
(One stray "Unexpected token '<'" console entry during initial asset load — traced to an
unknown non-asset path falling back to the SPA's `index.html`, which is the intended SPA
behavior, not a bug.)

## 3. Note on scope
These are UI/session changes only. They do **not** alter the Docker deployment, DB
isolation, or upload-folder isolation established earlier. Rebuild + redeploy was done:
`git pull → docker compose build → up` (commit `306242a`) on both live (5063) and
staging (5064); each still bound to its own DB (`aedentek_crm_live` / `aedentek_crm_staging`).
