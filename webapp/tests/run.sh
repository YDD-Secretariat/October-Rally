#!/usr/bin/env bash
# Runs the automated test suite against an isolated server + throwaway SQLite DB.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${TEST_PORT:-3101}"
TMP="$(mktemp -d)"
export RALLY_DATA_DIR="$TMP/data"
# Isolated build dir so this never clobbers a running `npm run dev` server.
export NEXT_DIST_DIR=".next-test"

# The TS plugin in `next dev` rewrites tsconfig.json's include with the active
# distDir; back it up and restore it so a test run leaves the repo untouched.
cp tsconfig.json "$TMP/tsconfig.bak"

echo "▶ Starting isolated test server on port $PORT (data: $RALLY_DATA_DIR)"
npx next dev -p "$PORT" >"$TMP/server.log" 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null
  wait "$SERVER_PID" 2>/dev/null
  cp "$TMP/tsconfig.bak" tsconfig.json 2>/dev/null
  rm -rf "$TMP" .next-test 2>/dev/null
}
trap cleanup EXIT

# Wait for the server (and its route compilation) to be ready.
READY=0
for _ in $(seq 1 120); do
  if curl -sf "http://localhost:$PORT/api/summary" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 0.5
done

if [ "$READY" -ne 1 ]; then
  echo "✗ Server did not become ready. Last log lines:"
  tail -30 "$TMP/server.log"
  exit 1
fi

echo "▶ Seeding roster"
npx tsx src/db/seed.ts >/dev/null 2>&1 || true

echo "▶ Running tests"
BASE="http://localhost:$PORT" node --import tsx --test tests/*.test.ts
CODE=$?

if [ "$CODE" -ne 0 ]; then
  echo "— server.log tail (for debugging) —"
  tail -20 "$TMP/server.log"
fi

exit "$CODE"
