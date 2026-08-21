#!/usr/bin/env bash
# Manual local helper: enqueue via prod API, then drain BullMQ on this machine.
# Production schedule runs on Railway (see railway.toml / DEPLOY.md §5).
# Do not install a Mac crontab for this while Railway cron is active.
#
# Usage: ./scripts/run-trigger-and-drain.sh

set -euo pipefail

APP_DIR="/Users/andi/canvassing/goclaim-app"
# Pin Node 24 (no nvm/zshrc if invoked from a minimal environment).
NODE_BIN="/Users/andi/.nvm/versions/node/v24.15.0/bin"
export PATH="${NODE_BIN}:/usr/bin:/bin:/usr/sbin:/sbin"

LOG_DIR="${APP_DIR}/logs"
LOG_FILE="${LOG_DIR}/cron-trigger-drain.log"

mkdir -p "${LOG_DIR}"
cd "${APP_DIR}"

{
  echo "===== $(date -u '+%Y-%m-%dT%H:%M:%SZ') starting worker:trigger-drain ====="
  echo "node=$(command -v node) $(node -v)"
  echo "npm=$(command -v npm)"
} >>"${LOG_FILE}"

if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  echo "ERROR: node/npm not found on PATH=${PATH}" >>"${LOG_FILE}"
  exit 127
fi

# loadEnv inside the TS script reads .env.local; do not source secrets here.
set +e
npm run worker:trigger-drain >>"${LOG_FILE}" 2>&1
exit_code=$?
set -e

{
  echo "===== $(date -u '+%Y-%m-%dT%H:%M:%SZ') finished (exit ${exit_code}) ====="
  echo
} >>"${LOG_FILE}"

exit "${exit_code}"
