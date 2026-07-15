# GoClaim Deployment Checklist

> **Node 24 required.** Next.js 16 needs Node `>=20.9.0`, and Vercel deprecates Node 20 for deployments created on/after 2026-10-01. This is pinned to the Node 24 major via `engines` (`"node": "24.x"`) in `package.json` and `.nvmrc` (`24`) — a fixed major avoids Vercel auto-upgrading to a new major Node release. On Railway, set `NIXPACKS_NODE_VERSION=24` on the cron service.

## 1. Neon Postgres

1. Create a Neon project and copy `DATABASE_URL`
2. Run migrations **outside** the Vercel build: `npx prisma migrate deploy` (when the Neon compute is awake). Vercel’s `buildCommand` only runs `prisma generate && next build` — `migrate deploy` during build fails with `P1001` if Neon is suspended.

## 2. Upstash Redis

1. Create a Redis database on Upstash
2. Copy `UPSTASH_REDIS_URL` — the **Redis TCP** URL (`rediss://default:...@....upstash.io:6379`), not the REST URL

**Command usage:** Redis is used only by BullMQ (claim queue). The dashboard and auth APIs do not touch Redis. Production runs the worker **only during the daily cron batch** (enqueue → drain → exit), so idle polling is near zero between runs.

BullMQ job records in Redis are auto-purged (`removeOnComplete: 100`, `removeOnFail: 50`). Claim audit history lives in Postgres (`ClaimLog`). Run `npm run queue:purge` once after deploy to flush legacy Redis keys.

**Local dev:** Do not run `npm run worker` against prod Upstash unless testing the queue — it adds idle polling. For single claims, use `USER_ID=<cuid> npm run claim-test`. To process an enqueued batch locally: `npm run worker:drain`.

If you use the long-running local worker (`npm run worker`), tune idle polling:

| `WORKER_DRAIN_DELAY_SEC` | Idle polls/month | Est. Redis commands/month |
| --- | --- | --- |
| 120 | ~21,600 | ~15k–25k |
| 300 | ~8,640 | ~6k–10k |

Production cron-drain does not need drain-delay tuning.

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
- `ENCRYPTION_MASTER_KEY` (needed for GoClaim wallet create API)
- `PIMLICO_API_KEY` (**required** — Pimlico bundler + paymaster for `GoClaimAccountCreated` and `GoClaimAccountConnected` UserOps on `POST /api/goclaim/create` and `POST /api/goclaim/connect-log`; use the same key as Railway)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (**required for mobile web** — WalletConnect in Chrome/Safari; get a project ID from [WalletConnect Cloud](https://cloud.walletconnect.com))
- `APP_PRIVATE_KEY` (GoClaim EIP-712 signer; **required** — must match on-chain `goClaimSigner`. Used for `GoClaimAccountCreated` and `GoClaimAccountConnected` UserOps on create/connect.)

Deploy: connect repo, build uses `vercel.json`.

GoClaim proxy address is pinned in `lib/onchain/constants.ts` (`GOCLAIM_PROXY_ADDRESS`) — update that file after redeploying the proxy.

## 5. Railway (cron + drain worker)

Production uses **one Railway service**. It enqueues claims via Vercel, drains the BullMQ queue, then exits. There is no always-on worker.

Flow: Railway Cron → Vercel `/api/internal/trigger-claims` → Upstash Redis → `worker/runUntilDrained.ts` → Celo → exit.

Everything is defined in the repo-root [`railway.toml`](railway.toml) — Railway picks it up automatically; no separate config file path needed.

```toml
[build]
builder = "NIXPACKS"
buildCommand = "node_modules/.bin/prisma generate"

[deploy]
startCommand = 'curl -sf -X POST "$NEXT_PUBLIC_APP_URL/api/internal/trigger-claims" -H "Authorization: Bearer $CRON_SECRET" && node_modules/.bin/tsx worker/runUntilDrained.ts'
restartPolicyType = "NEVER"
cronSchedule = "0 12 * * *"
```

- `buildCommand` runs `prisma generate` only — **not** `next build` (that runs on Vercel).
- `restartPolicyType = "NEVER"` — cron runs once and exits; always-on restart policies prevent scheduling.
- `cronSchedule = "0 12 * * *"` — daily at 12:00 UTC.
- Start command enqueues via `curl`, then runs `worker/runUntilDrained.ts`. `-f` on curl exits non-zero on HTTP 4xx/5xx so a failed trigger skips the worker.

### Env vars (Railway service)

- `NEXT_PUBLIC_APP_URL` (e.g. `https://app.goclaim.xyz`)
- `CRON_SECRET` (must match Vercel)
- `UPSTASH_REDIS_URL`
- `DATABASE_URL`
- `ENCRYPTION_MASTER_KEY`
- `PIMLICO_API_KEY` (**required** — bundler + paymaster for claim UserOps and GoClaim event logging)
- `APP_PRIVATE_KEY` (GoClaim signer — **required**; used for `GoClaimUBIClaimed` + `GoClaimTokenTransferred` in each claim UserOp)
- `DRPC_API_KEY` (optional)
- `WORKER_CONCURRENCY` (optional, default `5`)
- `WORKER_LOCK_DURATION_MS` (optional, default `120000`)
- `WORKER_LOCK_RENEW_MS` (optional, default `60000`)
- `WORKER_MAX_RUN_MS` (optional, default `3600000` — 1 hour safety cap)
- `NIXPACKS_NODE_VERSION=24` (optional)

Runtime budget: with concurrency 5 and ~30–45s per claim, 100 users ≈ 10 min, 500 users ≈ 50 min. Increase `WORKER_MAX_RUN_MS` if batches grow.

Local queue testing uses `npm run worker` or `npm run worker:drain` — not Railway.

### Fresh Railway setup

If migrating from the old two-service layout (always-on worker + cron), delete both existing Railway services and create one new service:

1. Railway → **New service** → deploy from the GoClaim GitHub repo.
2. Do **not** set a custom Railway Config File path — the default `railway.toml` at repo root is correct.
3. Add all env vars listed above.
4. Confirm the service is scheduled as a **cron** (schedule comes from `railway.toml`).
5. Deploy.

### Deploy sequence

1. Push code and deploy the Railway service.
2. Run `npm run queue:purge` once (local with prod env) to flush stale Redis job keys — only when no jobs are in-flight.
3. Trigger a test run (Railway manual cron trigger, or curl + `npm run worker:drain` locally).
4. Confirm logs show jobs completed and the process exits 0.
5. Monitor Upstash Usage — expect near-zero commands between daily runs.

If `curl` is ever unavailable in the image, swap the trigger half of `startCommand` for this no-curl fallback (keep the `&& tsx worker/runUntilDrained.ts` suffix):

```toml
startCommand = 'node -e "fetch(process.env.NEXT_PUBLIC_APP_URL+\"/api/internal/trigger-claims\",{method:\"POST\",headers:{Authorization:\"Bearer \"+process.env.CRON_SECRET}}).then(async r=>{console.log(r.status, await r.text()); if(!r.ok) process.exit(1)}).catch(e=>{console.error(e); process.exit(1)})" && node_modules/.bin/tsx worker/runUntilDrained.ts'
```

### If the cron "didn't run", check

- **Service type is always-on instead of cron** — `restartPolicyType` must be `NEVER` and `cronSchedule` must be set in `railway.toml`.
- **Build failed running `next build`** — Railway tried the wrong build command. Confirm `buildCommand = "node_modules/.bin/prisma generate"` in `railway.toml` (not `npm run build`).
- **Build image failed on an old Node** — set `NIXPACKS_NODE_VERSION=24`.
- **`NEXT_PUBLIC_APP_URL` / `CRON_SECRET` missing or mismatched** with Vercel.
- **Missing worker env vars** (`UPSTASH_REDIS_URL`, `DATABASE_URL`, etc.) — drain step will fail after curl succeeds.

### Manual trigger + drain

Enqueue only (jobs sit until next cron or manual drain):

```bash
curl -sf -X POST "$NEXT_PUBLIC_APP_URL/api/internal/trigger-claims" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Process enqueued jobs locally:

```bash
npm run worker:drain
```

## 6. GoClaim on-chain logger contract

The GoClaim UUPS proxy emits signed lifecycle events: `GoClaimAccountCreated`, `GoClaimAccountConnected`, `GoClaimUBIClaimed`, `GoClaimTokenTransferred`. Matching Postgres audit tables (`GoClaimAccountCreatedLog`, `GoClaimAccountConnectedLog`, `GoClaimUbiClaimedLog`, `GoClaimTokenTransferredLog`) are written when each event is submitted.

**Vercel and Railway both need `PIMLICO_API_KEY` and `APP_PRIVATE_KEY`.** Create/connect logging runs on Vercel (UserOps via Pimlico). Claim-pair logging runs on Railway inside each claim UserOp. If either key is missing on Vercel, create/connect still succeed but GoClaim audit rows are skipped — check Vercel logs for `Missing PIMLICO_API_KEY` or `ensureGoClaimAccountCreatedLog failed` / `ensureGoClaimAccountConnectedLog failed`, then run `npm run backfill:goclaim-logs` after fixing env.

### Generate signer key

```bash
openssl rand -hex 32   # prepend 0x for APP_PRIVATE_KEY
```

Fund the signer address with CELO for deploy gas. The same key is used as contract owner and initial `goClaimSigner` when deploying via the proxy script.

### Compile and test locally

```bash
cd hardhat
npm install
npm test
```

### Deploy to Celo mainnet

Set in `goclaim-app/hardhat/.env`:

- `APP_PRIVATE_KEY` — deployer + initial GoClaim signer
- `INFURA_API_KEY` (optional; falls back to public RPC)
- `CELOSCAN_API_KEY` — for verification
- `IDENTITY_PROXY_ADDRESS` (optional; defaults to GoodDollar Identity `0xC361…F42`)

Full deploy (implementation + proxy):

```bash
cd hardhat
npm run deploy:proxy
```

Redeploy proxy only (reuse implementation from `lib/onchain/constants.ts`):

```bash
cd hardhat
PROXY_ONLY=1 npm run deploy:proxy
```

Verify implementation and proxy (reads addresses from `lib/onchain/constants.ts`):

```bash
cd hardhat
npm run verify:impl
npm run verify:proxy
```

After a new deploy, update `GOCLAIM_PROXY_ADDRESS` and `GOCLAIM_IMPLEMENTATION_ADDRESS` in `lib/onchain/constants.ts`, then redeploy Vercel/Railway so the app picks up the new addresses.

### Backfill event logs (existing users)

After deploying the event-log tables, run once with production env:

```bash
npm run backfill:goclaim-logs
```

Submits missing `GoClaimAccountCreated` / `GoClaimAccountConnected` UserOps and inserts Postgres rows. Claim-pair logs (`GoClaimUbiClaimed`, `GoClaimTokenTransferred`) are recorded automatically on future successful claims only.

### Upgrade

```bash
cd hardhat
npm run deploy:impl
NEW_GOCLAIM_IMPLEMENTATION=0x... npm run upgrade:proxy
```

After upgrade, update `GOCLAIM_IMPLEMENTATION_ADDRESS` in `lib/onchain/constants.ts`.

Owner calls `upgradeToAndBumpVersion` via the upgrade script. Rotate the backend signer anytime with `setGoClaimSigner(newAddress)` on the proxy (owner-only); update `APP_PRIVATE_KEY` to match.

## 7. Smoke test

1. Connect verified GoodDollar root wallet on `/`
2. Sign SIWE → GoClaim account created → onboarding modal shown
3. Link GoClaim account in GoodDollar
4. Dashboard shows status `active`; status API `goClaimEventLogs.accountCreated` and `accountConnected` are `true`
5. Manual trigger + drain:

```bash
curl -sf -X POST https://your-domain/api/internal/trigger-claims \
  -H "Authorization: Bearer $CRON_SECRET"
npm run worker:drain
```

6. Verify `ClaimLog` success + G$ in root wallet on Celoscan
7. Verify GoClaim events on Celoscan and Postgres (`GoClaimAccountCreatedLog`, `GoClaimAccountConnectedLog`, `GoClaimUbiClaimedLog`, `GoClaimTokenTransferredLog`)

## 9. Single-user claim test (Railway/local)

```bash
USER_ID=<cuid> npm run claim-test
```
