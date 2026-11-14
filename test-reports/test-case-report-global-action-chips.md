# Test Case Report — Global Action-Icon Chips + Deploy Artifact Fix
Date: 2026-11-14 · Commits: `5816a11` (chips engine) + `632d051` (raw-frontend image)
Environments: `crm.aedentek.in` (live) + staging/dev

## 1. What was asked
Apply the round, colour-coded action-icon treatment (eye=blue **view**, pencil=amber
**edit**, trash=red **delete**, teal **download**, sky **send**, cobalt **star**)
**globally** — to nav, sections, popups, and every page's action icons — not just the
table "Actions" columns.

## 2. What changed
### 2a. Global chip engine (`frontend/assets/global-themed-controls.js`)
Added `enhanceActionButtons()` running on a `MutationObserver` alongside the existing
table one. It classifies any button/link by `title` / `aria-label` / label text / icon
and adds the same `tl-act tl-act--<kind>` round-chip classes the table system uses:
- Recognised kinds: **view, edit, delete, download, send, star** (reuse the existing
  `.tl-act` CSS + per-kind colours/icons + dark-theme support — no new CSS needed).
- **Deliberately skipped** (so we don't clobber real UI): primary CTAs
  (`.btn--primary`, e.g. "Register New Client", "Save profile"), close/menu/theme/nav
  chrome (sidebar toggle, bell, account, close), switches, form submit buttons, and
  long text-only labels.
- Applied in: table Actions columns, toolbar action buttons (Export/Print/Preview),
  card/section tool buttons, popup/drawer footer actions, page-header tools.

### 2b. Pre-existing deploy defect found & fixed (important)
While verifying on the VPS I found the live site was logging **"Unexpected token '<'"**:
the Docker image was baking the **Vite `npm run build` dist**, but this app is
**hand‑maintained** — `index.html` loads standalone files
(`global-themed-controls.js`, `date-range.js`, `signin-styles.css`, `index-*.js/css`)
that the `dist` build **omits / renames**. So on the VPS those requests fell back to
`index.html` (HTML), and the **global-controls engine (where the new chips live) was not
actually running live**.

Fix (`Dockerfile` + `.dockerignore`): the image now serves the **raw `frontend/` source**
— exactly what the `:3000` dev server serves — instead of the incomplete `dist`.
Verified safe: all referenced raw files are present, `import.meta.env` is guarded,
and no Vite‑dev‑only network refs remain.

## 3. Test cases (headless, against live `https://crm.aedentek.in`)
| # | Scenario | Expected | Result |
|---|---|---|---|
| 1 | Sign-in on live | Dashboard renders | ✅ PASS (`dash:true`) |
| 2 | `/clients/companies` | view/edit/delete + toolbar download chips | ✅ PASS (10 chips: view3/edit3/delete3/download1) |
| 3 | `/finance/invoices` | invoice action chips | ✅ PASS (13 chips: view4/edit4/delete4/download1) |
| 4 | `/hr` | staff edit/delete chips | ✅ PASS (12 chips: edit6/delete6) |
| 5 | `/settings` | delete profile chip | ✅ PASS (1 chip: delete) |
| 6 | Primary CTAs not chipped | "Register New Client"/"Save profile" keep their look | ✅ PASS (0 chipped CTAs) |
| 7 | Chrome (bell/sidebar/account/close) not chipped | untouched | ✅ PASS |
| 8 | Page errors | **no** "Unexpected token '<'" / no HTML fallback for JS/CSS | ✅ PASS (none) |
| 9 | Standalone assets serve as JS/CSS | 200 + correct body (`/**`, `var`, …) not `<!doc` | ✅ PASS |
| 10 | Per-env DBs intact | live→`aedentek_crm_live`, staging→`aedentek_crm_staging` | ✅ PASS |
| 11 | Other VPS projects unaffected | smartfin `:5061` & shaz `:5055` → 200 | ✅ PASS |

**Totals: all checks PASS, 0 uncaught page errors on live.**

## 4. Scope note
- These changes ship the **global chips** and the **deploy-artifact fix**. Both were
  committed & pushed to GitHub and redeployed via `git pull → docker compose build/up`.
- The **Clients dropdown** change requested earlier ("Directory / Service Types /
  Project Stages / New Client", with "don't deploy") is **still local-only** in
  `frontend/assets/index-DG0_cRQu.js` and was deliberately **not** included in these
  deploys — the VPS still shows the original single-item Clients dropdown.
