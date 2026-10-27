#!/usr/bin/env bash
# Lead's what-if re-measurement on the local build (run after the batch; every timed run under the shared lock).
#   bash whatif.sh <build-dir>
# Variants (tools/front-proxy-variant.mjs, all in front of the same Nitro on :3015):
#   base   :3017  no rewrite (control: same proxy code as the variants)
#   pre    :3018  + modulepreload for every JS chunk the page loaded before hydration but did not preload
#                 (catalogs + their static deps + the route's lazy code), listed per path in whatif-extra-preloads.json.
#                 That list was taken from the batch's local mobile cold runs of the 9db3bce0 build (scripts that
#                 started before the hydration shell and were not parser-initiated); chunk names are build-specific.
#   strip  :3019  every head modulepreload removed except the entry (FCP bound without competing JS)
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
BUILD="${1:?build dir}"
LOCK=/tmp/perf-audit-2026-10-27.lock
export PERF_SPKI="${PERF_SPKI:?set PERF_SPKI}"
PROXY_LOG="${PROXY_LOG:?set PROXY_LOG}"
OUT="$ROOT/evidence/lead/whatif"
mkdir -p "$OUT"

warm() {
  local port=$1
  ls "$BUILD/.output/public/assets" | sed "s#^#https://127.0.0.1:$port/assets/#" |
    xargs -P 8 -n 1 curl -sk -H 'accept-encoding: zstd' -o /dev/null
  for p in / /entity-analytics /national-budget; do curl -sk -H 'accept-encoding: zstd' -o /dev/null "https://127.0.0.1:$port$p"; done
}

failed=0
run() {
  local variant=$1 port=$2 path=$3
  local slug
  slug="$(echo "$path" | sed -e 's#^/##' -e 's#/#-#g')"
  [ -z "$slug" ] && slug=home
  echo "$(date +%T) start $variant $path"
  flock "$LOCK" node "$HERE/perf-run.mjs" --url "https://127.0.0.1:$port$path" --profile mobile --runs 3 --no-trace \
    --out "$OUT/$variant-$slug-mobile" --proxy-log "$PROXY_LOG" > "$OUT/$variant-$slug-mobile.log" 2>&1 || {
    echo "$(date +%T) FAILED $variant $path"
    failed=$((failed + 1))
  }
}

export BUILD
flock "$LOCK" bash -c "$(declare -f warm); warm 3017; warm 3018; warm 3019" 2>/dev/null
for path in / /entity-analytics; do
  run base 3017 "$path"
  run pre 3018 "$path"
done
run strip 3019 /
run pre 3018 /national-budget
run base 3017 /national-budget
echo "$(date +%T) whatif finished ($failed failed runs)"
[ "$failed" = 0 ]
