#!/usr/bin/env bash
# One measurement cycle on the local target for the fixes: start -> warm -> measure -> stop, all under the
# audit's lock, so one local target at a time runs on ports 3013-3016.
#   bash measure-local.sh <build-dir> <out-dir> <pages-file> [profiles] [runs]
#     pages-file  lines domain|path|people(0/1), as pages.txt ('#' starts a comment)
#     profiles    "mobile desktop" (default), or one of them
#     runs        cold loads per page and profile (default 3); the medians are in each summary.json
# Env: TLS_DIR (required): key.pem, cert.pem and spki.txt for 127.0.0.1.
#      SCREENSHOTS=1: full-page mobile and desktop screenshots of the pages without people, after the timed runs.
#      HOOK=<script>: run `bash <script> https://127.0.0.1:3013 <out-dir>` while the target is up, after the runs.
#      WARM_PAGES=0: warm the assets only, not the pages (server caches and memos start empty).
# Output in <out-dir>: <domain>/<slug>-<profile>/ (perf-run evidence), table.md, api-proxy.log, servers.log.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
BUILD="$(cd "${1:?build dir}" && pwd)"
OUT="$(realpath -m "${2:?out dir}")"
PAGES="$(realpath "${3:?pages file}")"
PROFILES="${4:-mobile desktop}"
RUNS="${5:-3}"
TLS_DIR="$(cd "${TLS_DIR:?set TLS_DIR}" && pwd)"
export PERF_SPKI="$(cat "$TLS_DIR/spki.txt")"
BASE=https://127.0.0.1:3013
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36'
mkdir -p "$OUT"

echo "$(date +%T) waiting for the lock ($BUILD -> $OUT)"
exec 9>/tmp/perf-audit-2026-10-27.lock
flock 9
# Close the gate to new builds, then wait for the running ones (build-local.sh holds the quiet lock shared).
exec 7>/tmp/perf-fixes-gate.lock
flock 7
exec 8>/tmp/perf-fixes-quiet.lock
flock 8
echo "$(date +%T) lock held"

for port in 3013 3014 3015 3016; do
  if ss -ltn "sport = :$port" | grep -q LISTEN; then
    echo "port $port is already in use; stop that server first"
    exit 1
  fi
done

pids=()
stop() {
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null; done
  wait 2>/dev/null
  echo "$(date +%T) servers stopped"
}
trap stop EXIT
TLS_KEY="$TLS_DIR/key.pem" TLS_CERT="$TLS_DIR/cert.pem" LOG_FILE="$OUT/api-proxy.log" node "$HERE/api-proxy.mjs" >> "$OUT/servers.log" 2>&1 &
pids+=($!)
node "$HERE/start-local.mjs" "$BUILD" >> "$OUT/servers.log" 2>&1 &
pids+=($!)
TLS_KEY="$TLS_DIR/key.pem" TLS_CERT="$TLS_DIR/cert.pem" node "$HERE/front-proxy.mjs" >> "$OUT/servers.log" 2>&1 &
pids+=($!)
up=0
for _ in $(seq 1 90); do
  if [ "$(curl -sk -o /dev/null -w '%{http_code}' -A "$UA" "$BASE/")" = 200 ]; then up=1; break; fi
  sleep 1
done
if [ "$up" != 1 ]; then
  echo "local target did not come up; see $OUT/servers.log"
  exit 1
fi

mapfile -t LINES < <(grep -v -e '^#' -e '^[[:space:]]*$' "$PAGES")
# Warm: every asset once (the front proxy compresses each one once), then each page once.
ls "$BUILD/.output/public/assets" | sed "s#^#$BASE/assets/#" | xargs -P 8 -n 1 curl -sk -H 'accept-encoding: zstd' -o /dev/null
if [ "${WARM_PAGES:-1}" = 1 ]; then
  for line in "${LINES[@]}"; do
    IFS='|' read -r _ path _ <<< "$line"
    curl -sk -A "$UA" -H 'accept-encoding: zstd' -o /dev/null "$BASE$path"
  done
fi
echo "$(date +%T) warmed"

failed=0
for line in "${LINES[@]}"; do
  IFS='|' read -r domain path people <<< "$line"
  slug="$(echo "$path" | sed -e 's#^/##' -e 's#/#-#g')"
  [ -z "$slug" ] && slug=home
  flags=()
  [ "$people" = 1 ] && flags+=(--people)
  for profile in $PROFILES; do
    dir="$OUT/$domain/$slug-$profile"
    mkdir -p "$dir"
    echo "$(date +%T) $path $profile"
    if ! node "$HERE/perf-run.mjs" --url "$BASE$path" --profile "$profile" --out "$dir" --runs "$RUNS" --no-trace --no-warm \
      --proxy-log "$OUT/api-proxy.log" "${flags[@]}" < /dev/null > "$dir.log" 2>&1; then
      echo "$(date +%T) FAILED $path $profile (see $dir.log)"
      failed=$((failed + 1))
    fi
  done
done

if [ "${SCREENSHOTS:-0}" = 1 ]; then
  node "$HERE/screenshot.mjs" "$BASE" "$OUT/screenshots" "$PAGES" < /dev/null || failed=$((failed + 1))
fi
if [ -n "${HOOK:-}" ]; then
  bash "$HOOK" "$BASE" "$OUT" < /dev/null || failed=$((failed + 1))
fi
node "$HERE/fixes-table.mjs" "$OUT" > "$OUT/table.md"
echo "$(date +%T) cycle finished ($failed failed); table: $OUT/table.md"
[ "$failed" = 0 ]
