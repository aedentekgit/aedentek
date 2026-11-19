# Phase 0 Runbook — Secure the live CRM before adding Hosting

**Goal:** put the security fixes on `crm.aedentek.in` and `staging.crm.aedentek.in`, move secrets out of git, and close direct port access.
**Time:** about 30–45 minutes. **Downtime:** about 10–20 seconds while containers restart.
**Side effect:** everyone is signed out once (new login key). Tell your team beforehand.

Run everything on the VPS as root, inside `/var/www/aedentek-crm-docker`.

---

## Step 1 — Back up first (2 min)

```bash
cd /var/www/aedentek-crm-docker
mkdir -p /root/backups
git rev-parse HEAD > /root/backups/crm-commit-before-phase0.txt
mongodump --uri "mongodb://admin:<CURRENT_ADMIN_PASSWORD>@127.0.0.1:27017/?authSource=admin" --db aedentek_crm_live --archive=/root/backups/aedentek_crm_live-before-phase0.archive --gzip
```

If `mongodump` isn't on the host, run it inside the MongoDB container (`docker exec <mongo-container> mongodump ...`).

## Step 2 — Create the secret files (5 min)

```bash
cp deploy/env.live.example .env.live
cp deploy/env.staging.example .env.staging
chmod 600 .env.live .env.staging
openssl rand -hex 48     # paste into .env.live    as JWT_SECRET
openssl rand -hex 48     # paste a DIFFERENT one into .env.staging
nano .env.live
nano .env.staging
```

Fill in `MONGODB_URI` in each file. To start with, you can reuse the connection string currently in `docker-compose.yml` (same user and password), only moved into these files. Step 6 replaces it with safer per-database users.

The `.env.*` files are git-ignored and excluded from the Docker image, so they never reach GitHub.

## Step 3 — Deploy (5 min)

After the new code is on GitHub `main`:

```bash
bash deploy/aedentek-crm-deploy.sh
```

The script does this automatically:
1. **Preflight:** stops before touching anything if either env file is missing, still has placeholders, has a short secret, or both files share the same secret.
2. Pulls `main`, **keeps the current images as a rollback copy**, builds and restarts.
3. **Smoke tests** on staging and live. Each must show green:
   - health `200`
   - API without login `401`
   - mock `admin-token` `401`
   - `?role=Admin` `401`
   - `dev1234` login `401`
   - token signed with the old public secret `401`
4. If any **live** check fails, it **rolls back automatically** to the previous images.

Re-run only the checks at any time with `bash deploy/aedentek-crm-deploy.sh check`.

## Step 4 — Fix the account passwords on LIVE (10 min)

```bash
docker compose exec live node scripts/manage-user.mjs list
```

Any row with **weak-pw = YES** still uses a public demo password (`password123`, `marble88`). For each one:

- If a real person uses it, set a new password (input is hidden):
  ```bash
  docker compose exec -it live node scripts/manage-user.mjs set-password ines.okafor@aedentek.com
  ```
- If you'd rather generate one to share privately:
  ```bash
  docker compose exec live node scripts/manage-user.mjs generate-password rahul.sen@aedentek.com
  ```
- If it's a demo account nobody uses (e.g. `admin@tessly.local`, `manager@tessly.local`, `staff@tessly.local`, the `@caldermoss.co` accounts):
  ```bash
  docker compose exec live node scripts/manage-user.mjs deactivate admin@tessly.local
  ```

⚠️ **Keep at least one Admin account active** with a new strong password before deactivating the others.

Live no longer re-creates demo accounts on restart (`SEED_DEMO_USERS=false`). Staging still does, which is fine for testing; staging must not hold real client data.

## Step 5 — Confirm the ports are closed (2 min)

```bash
ss -tlnp | grep -E ':506[34]'     # must show 127.0.0.1:5063 and 127.0.0.1:5064, NOT 0.0.0.0
```

From your own computer (not the VPS), this must fail or time out:

```bash
curl -m 5 http://<VPS-IP>:5063/api/health
```

`https://crm.aedentek.in` must still work normally.

## Step 6 — Rotate the MongoDB password (15 min, do soon)

The current MongoDB admin password was committed in `docker-compose.yml`, so it's in the git history and must be considered public.

1. **First check whether other projects on this VPS use the same `admin` login.** The header says the Mongo container is shared. If they do, update them as part of this step, or they'll lose database access.
2. In `mongosh` as admin, create one user per CRM database:
   ```js
   use admin
   db.createUser({ user: "crm_live",    pwd: passwordPrompt(), roles: [{ role: "readWrite", db: "aedentek_crm_live" }] })
   db.createUser({ user: "crm_staging", pwd: passwordPrompt(), roles: [{ role: "readWrite", db: "aedentek_crm_staging" }] })
   ```
3. Put those into `MONGODB_URI` in `.env.live` / `.env.staging`, then restart with `docker compose up -d`.
4. Change the `admin` password: `db.changeUserPassword("admin", passwordPrompt())`.
5. Make sure MongoDB port 27017 isn't reachable from the internet: `ss -tlnp | grep 27017` should show `127.0.0.1` or the Docker bridge only.

## Step 7 — If something goes wrong

```bash
bash deploy/aedentek-crm-deploy.sh rollback
```

This restores the images from before the deploy. The env files and port binding stay as they are, which is fine with the old code too. The database backup from Step 1 is at `/root/backups/`.

---

## Done when

- [ ] Deploy script ends with **"Deploy OK"**, all checks green on live and staging
- [ ] `manage-user.mjs list` on live shows **no `weak-pw YES`** for active accounts
- [ ] Ports 5063/5064 are bound to `127.0.0.1` only
- [ ] Team can sign in at `https://crm.aedentek.in` with their new passwords
- [ ] MongoDB password rotated (Step 6)

Then Phase 0 for Hosting continues: buy the new sites domain on Hostinger and add the wildcard `*` A record. That part is planned in `feature-analysis-static-site-hosting.md`.
