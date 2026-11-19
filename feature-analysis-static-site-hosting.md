# Feature Analysis: Hostinger-style Static Website Hosting inside Tessly CRM

**Date:** November 17, 2026
**Type:** Analysis & design only. No code, config or database was changed.
**Target:** Self-hosted on the existing VPS (Docker Compose + host nginx + certbot + host MongoDB)

---

## ✅ Decisions confirmed (November 17, 2026)

| # | Question | Decision | What it means for the build |
|---|---|---|---|
| 1 | Domain for hosted sites | **B — separate new domain** | Buy one domain only for client sites (e.g. `aedentekhost.in`); sites live at `client.<that-domain>`. Fully isolated from `crm.aedentek.in` |
| 2 | DNS provider | **Hostinger** (VPS + DNS in hPanel) | No DNS-API wildcard certificate needed: add one wildcard **A record `*` → VPS IP** in hPanel, and each site gets its own free Let's Encrypt certificate via HTTP-01 (works with any DNS). See SSL note below |
| 3 | Who uploads | **A — your team only** | No client portal in v1; access controlled by existing Admin/Manager/Staff roles |
| 4 | Upload method | **A — ZIP upload only** | No Git builds in v1 → no build sandbox needed (removes risk §8.4 and webhook work) |
| 5 | Invoicing | **B — reminders only** | Expiry reminders for hosting/domain/SSL; invoices stay manual |
| 6 | Web server | **A — keep nginx** + small host agent for SSL/nginx reloads | Live CRM proxy untouched |
| 7 | Frontend style | **A — same hand-maintained bundle style** | New Hosting pages written like the existing modules |

**SSL approach with Hostinger DNS:** instead of one wildcard certificate (which needs a DNS API), the host agent requests a certificate **per site** the moment a site is created, using the existing `/var/www/letsencrypt` webroot. A new site shows "SSL issuing…" for roughly 10–30 seconds, then goes HTTPS. Let's Encrypt allows 50 new certificates per registered domain per week, which is enough for creating up to ~50 new client sites a week; renewals don't count against it. Client custom domains use the same mechanism after their DNS check passes.

**Resulting v1 scope (≈3 weeks incl. groundwork):** sites per client · ZIP upload with safety checks · free subdomain on the new domain with auto SSL · client custom domains with DNS check + auto SSL · version history + one-click rollback · maintenance mode · SPA/404 settings · expiry reminders · link from Client 360 → Websites. *Later phases:* GitHub deploy, file manager, password protection, analytics, backups, auto invoices, client self-service.

**Still needed from you before building:** the exact new domain name once bought, and a go-ahead to first deploy the security fixes to the live server (Phase 0).

---

## 1. What you are asking for (in one line)

A **"Hosting" module** where your team picks a client, uploads a website (ZIP, folder or Git repo), and Tessly publishes it on your VPS at `clientname.<your-sites-domain>` or the client's own domain, with **automatic SSL, one-click rollback, deploy history, and expiry/billing tracking**. This is the core of what Hostinger's "website / static hosting" panel does, built into the CRM you already use to manage those same clients.

---

## 2. What already exists in the project (and can be reused)

| Already in Tessly | Where | How the hosting feature uses it |
|---|---|---|
| **Client → Websites tab** with `domain`, `status` (Live/Staging/Development/Maintenance), `hostingProvider`, `sslExpiry`, `domainExpiry`, `hostingExpiry` | `backend/src/models/Client.js` (`websiteSubSchema`), routes `/api/clients/:id/websites`, UI tab "Websites" in Client 360 | Each website row gets a **Deploy / Manage hosting** button. Hosting fills `hostingProvider = "Tessly VPS"`, and **auto-updates `sslExpiry`** from the real certificate |
| **Client → Credentials vault** (cPanel, GitHub, Vercel…) | `credentialSubSchema` | Git deploy can reference a stored GitHub token instead of asking again (see security note §8.4) |
| **Client → Projects / project stages** | `projectStageEntrySchema`, `ProjectStage` master | A "Go live" stage can be completed automatically when the first production deploy succeeds |
| **Finance → Invoices** | `Invoice` model, `/api/invoices` | Hosting plans/renewals become invoice line items; `hostingExpiry` drives renewal invoices |
| **RBAC** (Admin / Manager / Staff), JWT auth (hardened in the last task) | `backend/src/middleware/rbac.js` | New `hosting` permission block: Admin full, Manager deploy/rollback, Staff view-only |
| **File uploads** | `POST /api/uploads` (base64 JSON, 40 MB body limit) | **Not suitable** for website bundles; a streaming multipart upload is needed (§6) |
| **VPS stack** | `docker-compose.yml`, `deploy/enable-https-nginx.sh` | nginx already terminates TLS with certbot webroot. The sites engine plugs into this same nginx |

**Gap:** nothing actually *serves* client sites today. The Websites tab is a record-keeping list only.

---

## 3. Feature scope — "Hostinger-like", prioritised

### Must-have (MVP)
1. **Create site** for a client (linked to a Client → Website row): name, slug, plan/quota.
2. **Deploy by ZIP upload or drag-and-drop folder** (up to e.g. 200 MB), with progress bar.
3. **Free subdomain** instantly: `acme.sites.aedentek.in` (wildcard DNS + wildcard SSL, no wait).
4. **Atomic deploys:** every upload becomes an immutable *release*; going live is an instant pointer switch, so visitors never see a half-uploaded site.
5. **One-click rollback** to any of the last N releases (default 10).
6. **Deploy history & logs:** who deployed, when, size, file count, status.
7. **Site settings:** SPA mode (`index.html` fallback for React/Vue builds), custom 404 page, `www` ↔ apex redirect, force HTTPS.
8. **Unpublish / maintenance mode** (serves a branded "under maintenance" page).

### Should-have (what makes it feel like Hostinger)
9. **Custom domains** (`www.clientsite.com`) with a **DNS check wizard** (shows the A/CNAME record to add and turns green when it resolves to the VPS).
10. **Automatic Let's Encrypt SSL** per custom domain plus **auto-renew**. SSL expiry is written back to the client's `sslExpiry`.
11. **File manager:** browse, preview, replace or edit single files (HTML/CSS/JS/text) in the browser; every edit creates a new release, so it can be rolled back.
12. **Git deploy:** connect a GitHub/GitLab repo and branch, deploy on button click or **webhook on push**, with an optional build command (`npm ci && npm run build`, output folder `dist`).
13. **Preview URLs** per release: `r-<id>.acme.sites.aedentek.in` to check before promoting to live.
14. **Password-protect site** (HTTP Basic Auth) for client review before launch.
15. **Expiry and renewal alerts** for hosting, domain and SSL on the Dashboard and Notifications, plus an auto-drafted renewal invoice.

### Nice-to-have (advanced)
16. **Traffic analytics** from nginx access logs: visits, bandwidth, top pages, 404s, per site/day.
17. **Storage and bandwidth quotas** per plan, with warnings at 80%.
18. **Redirect and header rules editor** (301/302 rules, cache headers, security headers).
19. **Scheduled backups** of the live release (off-VPS copy, e.g. S3/Backblaze) and one-click restore.
20. **Client portal view** (read-only link for the client to see their site status, SSL and expiry).
21. **Audit log** of every hosting action (deploy, rollback, domain change, delete).

---

## 4. Recommended architecture (fits your current VPS)

```
                Internet
                   │  :80 / :443
            ┌──────▼───────┐
            │ host nginx   │  crm.aedentek.in        → 127.0.0.1:5063 (CRM live)
            │              │  staging.crm.aedentek.in→ 127.0.0.1:5064
            │              │  *.sites.aedentek.in  ┐
            │              │  custom domains       ├→ static files: /srv/sites/<domain>/current
            └──────▲───────┘                       ┘   (no proxy, no Node — nginx serves directly)
                   │ reload (only when a custom domain/cert changes)
     ┌─────────────┴──────────────┐
     │ host "sites-agent" (systemd)│  small root-owned service, NOT in Docker:
     │  • issues/renews certs      │   - certbot for verified custom domains
     │  • writes per-domain nginx  │   - writes /etc/nginx/sites-sites/<domain>.conf
     │    include + nginx -t/reload│   - runs Git builds in throwaway containers
     │  • runs sandboxed builds    │   - picks jobs from a MongoDB `hostingjobs` queue
     └─────────────▲──────────────┘
                   │ job queue (MongoDB)            files
     ┌─────────────┴──────────────┐   bind mount ┌──────────────────────┐
     │ CRM container (Node/Express)│─────────────▶│ /srv/sites  (host)    │
     │  • Hosting API + UI         │  writes      │  <siteId>/releases/   │
     │  • upload → validate → unzip│  releases    │  <siteId>/current ──▶ │
     │  • release switch / rollback│              └──────────────────────┘
     └────────────────────────────┘
```

### Why this shape
- **nginx serves the sites directly** (fast, no Node in the request path). One wildcard server block uses `root /srv/sites/by-domain/$host/current;`, so **new subdomain sites need no nginx reload at all**. They work the moment the files land.
- **Atomic releases via symlink:** `releases/2026-11-17T10-00-01/` is fully written, then `current` is swapped with an atomic `rename`. Rollback is the same swap to an older folder.
- **The CRM container never gets root, the Docker socket or nginx control.** It only writes files into one bind-mounted folder and queues jobs. The host agent does the privileged work (certbot, nginx reload) from a strict allowlist: it only acts on domains that exist and are DNS-verified in the database.
- **SSL:**
  - Subdomains: one **wildcard certificate `*.sites.aedentek.in`** (needs a DNS-01 challenge, so your DNS provider must offer an API, e.g. Cloudflare). Issued once, renewed by cron.
  - Custom domains: **HTTP-01 per domain** via the existing `/var/www/letsencrypt` webroot, issued by the agent after the DNS check passes.
  - *Alternative:* replace nginx with **Caddy** ("on-demand TLS" issues certificates automatically on the first request, using an `ask` URL that checks the CRM). It's simpler for domains, but means migrating the live CRM's proxy too, so it's riskier. **Recommendation: stay on nginx + agent.**
- **Use a separate domain for client sites** (e.g. `aedentek-sites.in`, or at least `sites.aedentek.in`, never `crm.aedentek.in`). Client HTML is untrusted. Keeping it off the CRM's domain protects CRM cookies and sessions, and stops a phishing page on a client site from looking like your CRM.

---

## 5. Data model (new MongoDB collections)

| Collection | Key fields |
|---|---|
| `hostingsites` | `clientId`, `websiteId` (→ Client.websites[].id), `name`, `slug`, `status` (active / maintenance / suspended / deleted), `plan` {storageMb, bandwidthGb, releasesKept}, `activeReleaseId`, `settings` {spaFallback, custom404, forceHttps, wwwRedirect, basicAuth {enabled, user, passHash}, redirects[], headers[]}, `git` {provider, repo, branch, buildCmd, outputDir, credentialRef, webhookSecretHash}, `createdBy`, timestamps |
| `hostingdomains` | `siteId`, `domain` (unique), `type` (subdomain / custom), `primary`, `dnsStatus` (pending / verified / failed), `verifiedAt`, `sslStatus` (none / issuing / active / error), `sslExpiry`, `lastCheckAt`, `error` |
| `hostingreleases` | `siteId`, `source` (zip / folder / git / file-edit / rollback), `commit`, `status` (uploading / validating / building / ready / live / failed / archived), `sizeBytes`, `fileCount`, `log[]`, `previewHost`, `createdBy`, `promotedAt` |
| `hostingjobs` | `type` (issue_cert / renew_cert / write_vhost / remove_vhost / git_build), `payload`, `status` (queued / running / done / failed), `attempts`, `lockedBy`, `lockedAt`, `result` (the agent's work queue) |
| `hostingstats` (optional) | `siteId`, `date`, `requests`, `bytes`, `status4xx`, `status5xx`, `topPaths[]` (parsed from nginx logs) |
| `auditlogs` (collection already exists, empty) | reuse for hosting actions |

---

## 6. API surface (new routes under `/api/hosting`)

| Method & path | Role | Purpose |
|---|---|---|
| `GET /sites`, `GET /sites/:id` | All (Staff read-only) | List/detail with live domain, SSL, last deploy |
| `POST /sites` · `PUT /sites/:id` · `DELETE /sites/:id` | Admin (create/delete), Manager (edit settings) | Site lifecycle |
| `POST /sites/:id/releases` (multipart ZIP/folder, **streamed**) | Admin, Manager | Upload → scan → extract into a new release |
| `POST /sites/:id/releases/:rid/promote` | Admin, Manager | Make a release live (atomic) |
| `POST /sites/:id/rollback` | Admin, Manager | Promote previous release |
| `GET /sites/:id/releases` · `GET …/:rid/log` | All | History & logs |
| `GET/PUT/DELETE /sites/:id/files/*path` | Admin, Manager | File manager (every write creates a release) |
| `POST /sites/:id/domains` · `POST /domains/:id/verify` · `DELETE /domains/:id` | Admin, Manager | Custom domains + DNS check |
| `POST /sites/:id/git/deploy` · `POST /hooks/git/:siteId` (public, HMAC-signed) | Admin, Manager / webhook | Git deploys |
| `PUT /sites/:id/maintenance` · `PUT /sites/:id/protect` | Admin, Manager | Maintenance & password protection |
| `GET /sites/:id/stats?range=` | All | Analytics |

**New backend dependencies:** `busboy` or `multer` (streamed multipart upload, instead of the 40 MB base64 JSON path), `yauzl` (safe ZIP reading), and optionally `simple-git`. DNS checks use Node's built-in `dns/promises`. No change to the existing upload endpoint is required.

---

## 7. UI plan

- **New sidebar module "Hosting"** (beside Invoice/Accounts), with pages: *Sites* (cards with status, domain, SSL badge, last deploy), *Site detail* (tabs: Overview · Deployments · Domains & SSL · Files · Settings · Analytics), and *New site* wizard (pick client → choose source → choose domain → deploy).
- **Client 360 → Websites tab:** each row gets **"Host on Tessly" / "Manage hosting"**, and shows live status, SSL expiry from the real certificate, and a "Visit" link.
- **Dashboard widgets:** "Sites expiring in 30 days", "SSL renewals failing", "Deploys today".
- **Route permissions:** add `hosting` to `getRouteRequirements()` in `frontend/assets/index-DG0_cRQu.js`, plus a matching `hosting` block in `RBAC_PERMISSIONS` (backend).
- ⚠️ **Effort note:** the frontend has no source/JSX build. Pages are hand-maintained compiled bundles (`assets/*.js`, per the Dockerfile comment). A full new module written in that style is the single biggest cost and risk of this feature. Budget for it explicitly, or decide first whether to restore a proper source + build pipeline.

---

## 8. Security analysis (must be designed in, not added later)

| # | Risk | Mitigation |
|---|---|---|
| 8.1 | **Zip-slip / path traversal**: a ZIP entry `../../etc/cron.d/x` writes outside the site | Normalise every entry path; reject absolute paths, `..`, symlinks and device files; extract into a fresh temp dir then move |
| 8.2 | **Zip bombs / disk exhaustion** | Cap compressed size, uncompressed total (e.g. 500 MB), file count (e.g. 20k) and compression ratio; enforce per-site quota; refuse when VPS free disk < threshold. *(Your dev Mac disk was 99% full earlier; VPS disk must be monitored too)* |
| 8.3 | **Untrusted HTML/JS on your infrastructure** (phishing, malware hosting) | Separate registrable domain for sites (§4); no server-side execution (static only; nginx never runs PHP/CGI); block `.php`, `.htaccess`, executables at upload; abuse "Suspend site" switch |
| 8.4 | **Git build runs untrusted code** (`npm install` scripts) | Build in a throwaway container: no network to MongoDB/host, CPU/RAM/time limits, read-only base image, output copied out only from the declared folder. Never inside the CRM container |
| 8.5 | **CRM container gaining host control** | CRM never touches nginx/certbot/docker socket. A host agent with an allowlisted job queue; domains validated with a strict regex and DNS-verified before any cert or vhost job |
| 8.6 | **Domain takeover**: someone attaches a domain they don't own | DNS verification (A/CNAME to VPS, optional TXT token) before issuing SSL or serving; periodic re-check; release domain if DNS moves away |
| 8.7 | **Let's Encrypt rate limits** (50 certs/registered domain/week, 5 failed validations/hour) | Only issue after DNS passes; back-off retries; wildcard cert for all subdomains |
| 8.8 | **Webhook spoofing** | HMAC signature (GitHub `X-Hub-Signature-256`) with a per-site secret, stored hashed |
| 8.9 | **Stored Git tokens / client credentials** | Today the Credentials vault stores passwords **in plain text** (`credentialSubSchema.password`). Encrypt at rest (AES-GCM with a key from env) before using it for deploy tokens |

---

## 9. Pre-requisites on the current VPS (found during analysis)

1. **Deploy the security fixes from the previous task first.** Hosting must not ship on top of an API that accepted unauthenticated Admin requests and a `dev1234` backdoor.
2. **Set `JWT_SECRET`** on live and staging (currently unset, so the source-code fallback is used).
3. **Container ports are published on all interfaces** (`"5063:5000"`, `"5064:5000"`), so `http://<VPS-IP>:5063` reaches the CRM directly, bypassing nginx and HTTPS, unless a firewall blocks it. Bind to `127.0.0.1:5063:5000`.
4. **Domain naming is inconsistent:** compose comments say `crm.aedentek.com`, nginx serves `crm.aedentek.in`. Pick the hosting domain (`sites.aedentek.in` or a separate domain) and set up **wildcard DNS `*.sites… → VPS IP`**.
5. **DNS provider with an API** (e.g. Cloudflare) if you want the wildcard SSL certificate for free subdomains.
6. **Disk & bandwidth sizing:** decide storage per plan and add disk monitoring and alerts. Releases multiply storage (10 releases × site size).
7. **Backups:** sites must go into the VPS backup plan (`/srv/sites` + MongoDB `hosting*` collections).
8. **MongoDB password in `docker-compose.yml`** should move to a secret/env file and be rotated.

---

## 10. Delivery plan & rough effort (1 developer, estimates)

| Phase | Scope | Estimate |
|---|---|---|
| **0. Groundwork** | Deploy security fixes, JWT_SECRET, bind ports to localhost, DNS + wildcard cert, `/srv/sites` volume, nginx wildcard block | 2–3 days |
| **1. MVP** | Sites CRUD, ZIP/folder streamed upload, safe extraction, atomic releases, rollback, history, subdomains, SPA/404/maintenance, Client 360 link, RBAC | 2–2.5 weeks |
| **2. Custom domains** | Host agent, DNS verification wizard, per-domain certbot + auto-renew, `sslExpiry` sync, expiry alerts | 1–1.5 weeks |
| **3. Git deploys** | Repo connect, webhook, sandboxed build containers, build logs, preview URLs | 1.5–2 weeks |
| **4. Pro features** | File manager, password protect, redirects/headers editor, analytics from nginx logs, quotas, backups, renewal invoices | 2–3 weeks |
| **Testing** | Security tests (zip-slip, bombs, domain takeover, RBAC), E2E flows, load test of nginx serving | Included per phase, ~20% |

**Total:** about **7–10 weeks** for the full Hostinger-like feature set; **about 3 weeks for a usable MVP** (Phases 0–1).

---

## 11. Decisions needed from you before building

1. **Domain for hosted sites:** a subdomain of `aedentek.in` (`*.sites.aedentek.in`) or a **separate domain** (recommended for security)?
2. **Edge server:** keep **nginx + host agent** (recommended, matches today's setup) or migrate everything to **Caddy** for automatic SSL?
3. **DNS provider:** is `aedentek.in` on Cloudflare (or another provider with an API)? This is needed for the wildcard certificate.
4. **Is this internal-only** (your team deploys client sites) **or will clients log in and deploy themselves?** The second option needs a client portal, per-client quotas and stricter isolation.
5. **Git deploys with build step in MVP, or ZIP-only first?** Builds add the sandbox work (§8.4).
6. **Billing:** should hosting plans generate invoices automatically in the Finance module?
7. **Frontend approach:** keep writing modules in the hand-maintained bundle style, or first restore a proper source + Vite build for new modules?

---

## 12. Verdict

The feature fits Tessly well. Clients already have a Websites tab with hosting/SSL/domain expiry fields, a credentials vault, projects and invoicing, so hosting closes the loop from *sell → build → host → renew → invoice*. The VPS stack (nginx + certbot + Docker + MongoDB) can support it without new infrastructure, as long as the privileged parts (certificates, nginx, builds) run in a small host agent, not in the CRM container. **Fix the prerequisites in §9 first**, then build Phase 1 (≈3 weeks including groundwork) for a working "upload ZIP → live on HTTPS subdomain → rollback" experience.
