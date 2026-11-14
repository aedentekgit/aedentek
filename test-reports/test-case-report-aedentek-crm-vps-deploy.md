# Aedentek CRM (Tessly) — Docker → GitHub → VPS Deploy + Test Case Report
Target: `crm.aedentek.com` (live) + `staging.crm.aedentek.com` / `dev.crm.aedentek.com` (staging)
VPS: `201.18.218.148` · Deploy path: **GitHub → VPS → Docker** · Date: 2026-11-14

## 1. Deployment path
1. **GitHub** = source of truth: `github.com/aedentekgit/aedentek` (public, `main`).
   Commits: `f98342a` full app → `db0b9f3` tests/reports → `5366dcc` Docker assets →
   `bf3b86e` SPA root-route fix → `e15e2f2` VPS deploy + TLS scripts.
2. **VPS clone**: `/var/www/aedentek-crm-docker` (git clone of the repo).
3. **Docker build** (multi-stage: Vite build → Node backend serving SPA + uploads).
4. **docker compose up** → 2 isolated containers.
5. **nginx** vhost `aedentek-crm` (HTTP now; HTTPS ready-to-activate once DNS exists).

## 2. Environment matrix (ISOLATION — the core requirement)
| Concern | Live | Staging | Dev |
|---|---|---|---|
| Container | `aedentek-crm-live` | `aedentek-crm-staging` | *(reuses staging)* |
| Host port | **5063** | **5064** | *(5064)* |
| **Mongo DB** | `aedentek_crm_live` | `aedentek_crm_staging` | **`aedentek_crm_staging`** |
| **Upload folder** | `/var/www/aedentek-crm-docker/uploads/live` | `/var/www/aedentek-crm-docker/uploads/staging` | **`…/uploads/staging`** |
| nginx host | `crm.aedentek.com` | `staging.crm.aedentek.com` | `dev.crm.aedentek.com` |

✔ Staging **and** dev/testing both use the **staging DB + staging upload folder**, exactly as requested.
✔ Live is fully separate (own DB + own uploads). No shared mutable state between live and staging.

## 3. Test cases (run against the live deploy)
### 3.1 Per-environment DB binding  (PASS)
- `GET :5063/api/health` → `database.name = aedentek_crm_live`
- `GET :5064/api/health` → `database.name = aedentek_crm_staging`
- Via nginx Host-header: `crm.aedentek.com`→live, `staging.`/`dev.`→staging DBs

### 3.2 Upload folder isolation  (PASS)
- `POST /api/uploads` on live writes to `uploads/live/` only
- `POST /api/uploads` on staging writes to `uploads/staging/` only
- Verified on-disk: two probe PNGs landed in the correct dir each; then cleaned up.

### 3.3 SPA serving  (PASS)
- `GET /` → 200, serves built `index.html` (title "Tessly — the sales desk…")
- `GET /today` (deep link) → 200 via SPA fallback
- Static assets (`/assets/…`) → 200

### 3.4 No impact on other projects / DBs  (PASS — critical regression guard)
- **Other DBs untouched**: shared Mongo still holds `abayamcrm_live/staging`, `shaz_live/staging`,
  `smartfin_live/staging`, `Jayam_*`, `Makkal_*`, `vaagaimeterauto_*`, `abayam_crm` — none renamed/moved.
- Only **two** new DBs added: `aedentek_crm_live`, `aedentek_crm_staging`.
- **Other containers/apps healthy**: smartfin (`:5061`) → 200, shaz (`:5055`) → 200, all 8 PM2
  meter-auto/abayam apps still online.
- **Ports**: 5063/5064 chosen only after confirming they were free (5055/5056/5061/5062 already used).

### 3.5 Seeding  (PASS, idempotent)
- Seeders only insert when a collection is empty → each env got initial data
  (live: 3 clients / 4 invoices; staging: 3 clients / 4 invoices) without touching other DBs.

## 4. What's live now vs. what still needs DNS
- **LIVE NOW (HTTP)**: `http://crm.aedentek.com` (live) and
  `http://staging.crm.aedentek.com` / `http://dev.crm.aedentek.com` (staging) route correctly.
- **BLOCKED ON DNS**: Let's Encrypt TLS. Currently:
  - `crm.aedentek.com`, `staging.`, `dev.` have **no A records**.
  - Even `aedentek.com` points to a *different* IP (`88.222.243.229`), not `201.18.218.148`.
  - **Action needed** (in your DNS provider): add
    `crm.aedentek.com → 201.18.218.148`, `staging.crm.aedentek.com → 201.18.218.148`,
    `dev.crm.aedentek.com → 201.18.218.148`.
  - Then run once on the VPS: `bash /var/www/aedentek-crm-docker/deploy/enable-https-nginx.sh`
    (writes the 443 vhost + obtains certs). HTTP vhost stays as the ACME webroot/redirect.

## 5. Files added to the repo
- `Dockerfile` (2-stage), `.dockerignore`, `docker-compose.yml`
- `backend/src/server.js` — serves built SPA + `/uploads` from `UPLOAD_DIR`, `/api/uploads`
- `deploy/aedentek-crm-deploy.sh`, `deploy/enable-https-nginx.sh`

## 6. Verdict
- Deployed via **Docker → GitHub → VPS** ✅
- Staging + dev share the **staging** DB & upload folder; live is isolated ✅
- **No effect on other projects or their DB values** ✅
- App fully functional over HTTP ✅
- **Only open item: point the 3 hostnames at the VPS IP, then run the TLS script.**
