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

> **Important: the cron needs its own config file.** Both services deploy from the same repo,
> and the repo-root `railway.toml` defines `startCommand = "node_modules/.bin/tsx worker/index.ts"`.
> Railway gives config-file values precedence over dashboard settings, so a cron service left on
> the default `railway.toml` will run the **worker** (and crash with `Missing UPSTASH_REDIS_URL`)
> regardless of any Custom Start Command set in the UI. The cron service must point at
> `railway.cron.toml` instead.

`railway.cron.toml` (committed at the repo root) defines everything the cron needs in code:

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = 'curl -sf -X POST "$NEXT_PUBLIC_APP_URL/api/internal/trigger-claims" -H "Authorization: Bearer $CRON_SECRET"'
restartPolicyType = "NEVER"
cronSchedule = "0 12 * * *"
```

- `restartPolicyType = "NEVER"` — a cron must run once and exit. `ON_FAILURE`/always-on makes
  Railway treat it as a long-running service and it never gets scheduled.
- `cronSchedule = "0 12 * * *"` — daily at 12:00 UTC.
- The start command uses `curl` (present in Nixpacks images). `-s` silences progress; `-f` exits
  non-zero on an HTTP 4xx/5xx so a failed trigger shows as a failed cron run. Railway runs the
  command in a shell, so no `sh -c` wrapper is needed.

### Create the cron service

1. Railway -> New service -> deploy from the **same GitHub repo** (do not reuse the worker service).
2. Cron service -> Settings -> Config-as-code: set the **Railway Config File** path to
   `railway.cron.toml`. This is what makes the cron run the trigger instead of the worker.
3. Env vars on the cron service:
   - `NEXT_PUBLIC_APP_URL` (e.g. `https://app.goclaim.xyz`)
   - `CRON_SECRET` (must match the value set on Vercel)
   - `NIXPACKS_NODE_VERSION=24` (optional)
   - Do **not** set `UPSTASH_REDIS_URL` here — the cron only fires an HTTP request and never
     touches Redis.
4. Redeploy the cron service so the config file takes effect.

If `curl` is ever unavailable in the image, swap the `startCommand` for this no-curl fallback
(uses Node's global `fetch`):

```toml
startCommand = "node -e \"fetch(process.env.NEXT_PUBLIC_APP_URL+'/api/internal/trigger-claims',{method:'POST',headers:{Authorization:'Bearer '+process.env.CRON_SECRET}}).then(async r=>{console.log(r.status, await r.text()); process.exit(r.ok?0:1)}).catch(e=>{console.error(e); process.exit(1)})\""
```

### If the cron "didn't run", check

- **Cron service still using `railway.toml`** — it will run the worker and crash with
  `Missing UPSTASH_REDIS_URL`. Point its config file path at `railway.cron.toml`.
- **Build image failed on an old Node** — Next 16 needs Node 20.9+; this repo pins Node 24 (see top of this file).
- **Restart Policy not `Never`** — Railway won't schedule a service it considers always-on (set via `railway.cron.toml`).
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
