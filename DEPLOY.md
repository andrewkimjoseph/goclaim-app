# GoClaim Deployment Checklist

> **Node 24 required.** Next.js 16 needs Node `>=20.9.0`, and Vercel deprecates Node 20 for deployments created on/after 2026-10-01. This is pinned to the Node 24 major via `engines` (`"node": "24.x"`) in `package.json` and `.nvmrc` (`24`) — a fixed major avoids Vercel auto-upgrading to a new major Node release. On Railway, also set `NIXPACKS_NODE_VERSION=24` on each service so the build image uses the same version.

## 1. Neon Postgres

1. Create a Neon project and copy `DATABASE_URL`
2. Run migrations: `npx prisma migrate deploy`

## 2. Upstash Redis

1. Create a Redis database on Upstash
2. Copy `UPSTASH_REDIS_URL` — the **Redis TCP** URL (`rediss://default:...@....upstash.io:6379`), not the REST URL

**Command usage:** Redis is used only by BullMQ (claim queue). The dashboard and auth APIs do not touch Redis. An always-on worker polls Redis even when the queue is empty — tune `WORKER_DRAIN_DELAY_SEC` on Railway to limit idle commands.

**Local dev:** Do not run `npm run worker` unless you are testing the queue — it shares Upstash and doubles idle polling. For single claims, use `USER_ID=<cuid> npm run claim-test` instead. If you need a local worker, set `WORKER_DRAIN_DELAY_SEC=60` in `.env.local`.

## 3. Generate secrets

```bash
openssl rand -hex 32   # ENCRYPTION_MASTER_KEY
openssl rand -base64 32  # JWT_SECRET (32+ chars)
openssl rand -hex 32   # CRON_SECRET
```

## 4. Vercel (Next.js)

Env vars:

- `DATABASE_URL`
- `JWT_SECRET`
- `NEXT_PUBLIC_APP_URL` (e.g. https://goclaim.xyz)
- `CRON_SECRET`
- `ENCRYPTION_MASTER_KEY` (needed for agent create API)
- `PIMLICO_API_KEY` (optional on Vercel if status reads only)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (optional)

Deploy: connect repo, build uses `vercel.json`.

## 5. Railway (Worker)

Env vars:

- `DATABASE_URL`
- `UPSTASH_REDIS_URL`
- `ENCRYPTION_MASTER_KEY`
- `PIMLICO_API_KEY`
- `DRPC_API_KEY` (optional)
- `WORKER_CONCURRENCY` (optional, default `5`)
- `WORKER_DRAIN_DELAY_SEC` (optional, default `30` — seconds between idle queue polls)

Start command: `npm run worker` (via `railway.toml`).

Recommended Railway values for low Upstash command volume:

```
WORKER_CONCURRENCY=5
WORKER_DRAIN_DELAY_SEC=30
```

Redeploy the worker after changing these. Monitor Upstash → Usage over 24–48h.

## 6. Railway Cron

The cron is a **separate Railway service** from the worker. It fires one HTTP POST to the
Vercel `trigger-claims` endpoint, which enqueues claim jobs the always-on worker then
processes. Flow: Railway Cron -> Vercel `/api/internal/trigger-claims` -> Upstash Redis ->
Railway Worker -> Celo.

### Create the cron service

1. Railway -> New service -> deploy from the **same GitHub repo** (do not reuse the worker service).
2. Service Settings:
   - **Cron Schedule:** `0 12 * * *` (UTC)
   - **Restart Policy:** `Never` — a cron service must run once and exit. `On Failure`/always-on
     makes Railway treat it as a long-running service and it will never be scheduled.
   - **Build Command (optional):** `echo skip` — the cron only sends an HTTP request, so it does
     not need `next build` or `prisma generate`.
   - **Start Command:** Nixpacks images include `curl`. `-s` silences progress; `-f` makes curl
     exit non-zero on an HTTP 4xx/5xx so a failed trigger shows as a failed cron run:

```bash
sh -c 'curl -sf -X POST "$NEXT_PUBLIC_APP_URL/api/internal/trigger-claims" -H "Authorization: Bearer $CRON_SECRET"'
```

   - **No-curl fallback** (uses Node's global `fetch`):

```bash
node -e "fetch(process.env.NEXT_PUBLIC_APP_URL+'/api/internal/trigger-claims',{method:'POST',headers:{Authorization:'Bearer '+process.env.CRON_SECRET}}).then(async r=>{console.log(r.status, await r.text()); process.exit(r.ok?0:1)}).catch(e=>{console.error(e); process.exit(1)})"
```

3. Env vars on the cron service:
   - `NEXT_PUBLIC_APP_URL` (e.g. `https://app.goclaim.xyz`)
   - `CRON_SECRET` (must match the value set on Vercel)
   - `NIXPACKS_NODE_VERSION=24`

### If the cron "didn't run", check

- **Build image failed on an old Node** — Next 16 needs Node 20.9+; this repo pins Node 24 (see top of this file).
- **No cron service existed** — `railway.toml` only defines the worker; the cron is a second service.
- **Restart Policy not `Never`** — Railway won't schedule a service it considers always-on.
- **`NEXT_PUBLIC_APP_URL` / `CRON_SECRET` missing or mismatched** with Vercel.

### Equivalent manual command

```bash
curl -s -X POST "$NEXT_PUBLIC_APP_URL/api/internal/trigger-claims" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## 7. Smoke test

1. Connect verified GoodDollar root wallet on `/`
2. Sign SIWE → agent created → onboarding modal shown
3. Link smart account in GoodDollar
4. Dashboard shows status `active`
5. Manual trigger:

```bash
curl -X POST https://your-domain/api/internal/trigger-claims \
  -H "Authorization: Bearer $CRON_SECRET"
```

6. Verify `ClaimLog` success + G$ in root wallet on Celoscan

## 8. Single-user claim test (Railway/local)

```bash
USER_ID=<cuid> npm run claim-test
```
