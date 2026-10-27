#!/usr/bin/env bash
# Timed runs for every main page, one after another under the shared lock.
#   bash run-batch.sh <pages.txt>   lines: domain|path|people(0/1)
# For each page: deployed desktop, local desktop, deployed mobile, local mobile (3 cold+warm pairs
# plus one traced cold load each), then evidence/<domain>/<slug>.DONE.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
LOCK=/tmp/perf-audit-2026-10-27.lock
PROXY_LOG="${PROXY_LOG:?set PROXY_LOG to the api-proxy log}"
PAGES="${1:?pages file}"
export PERF_SPKI="${PERF_SPKI:?set PERF_SPKI to the local certificate SPKI hash}"

failed=0
while IFS='|' read -r domain path people; do
  [ -z "$domain" ] && continue
  case "$domain" in \#*) continue ;; esac
  slug="$(echo "$path" | sed -e 's#^/##' -e 's#/#-#g')"
  [ -z "$slug" ] && slug=home
  flags=()
  page_ok=1
  [ "$people" = "1" ] && flags+=(--people)
  for profile in desktop mobile; do
    for target in deployed local; do
      if [ "$target" = deployed ]; then base=https://dev-chronos.transparenta.eu; extra=(); else base=https://127.0.0.1:3013; extra=(--proxy-log "$PROXY_LOG"); fi
      out="$ROOT/evidence/$domain/$target/$slug-$profile"
      mkdir -p "$out"
      echo "$(date +%T) start $domain $path $target $profile"
      if ! flock "$LOCK" node "$HERE/perf-run.mjs" --url "$base$path" --profile "$profile" --out "$out" "${flags[@]}" "${extra[@]}" > "$out.log" 2>&1; then
        echo "$(date +%T) FAILED $domain $path $target $profile (see $out.log)"
        page_ok=0
        failed=$((failed + 1))
      fi
      [ -f "$out/trace-cold.trace.json" ] && node "$HERE/trace-summary.mjs" "$out/trace-cold.trace.json" > "$out/trace-summary.txt" 2>&1
    done
  done
  # .DONE only when all four runs of the page succeeded.
  if [ "$page_ok" = 1 ]; then touch "$ROOT/evidence/$domain/$slug.DONE"; fi
  echo "$(date +%T) done $domain $path"
done < "$PAGES"
echo "$(date +%T) batch finished ($failed failed runs)"
[ "$failed" = 0 ]
