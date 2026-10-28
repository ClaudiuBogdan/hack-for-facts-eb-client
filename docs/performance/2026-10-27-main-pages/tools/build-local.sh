#!/usr/bin/env bash
# Production build of a checkout for the fix measurements, built as the Dockerfile builds it.
#   bash build-local.sh <checkout> <build-dir>
# Copies the checkout's working tree (uncommitted changes included) without the .dockerignore paths, links its
# node_modules, then runs the Dockerfile's build steps with source maps. The maps are moved to
# <build-dir>/sentry-artifacts for chunk attribution and deleted from .output, as in the image.
#
# Shared-host limits: at most 3 builds at once; no build starts while a measurement cycle (measure-local.sh)
# runs, and a cycle waits for running builds; a build starts only with 14 GiB of memory available (a build
# takes about 6 GiB, and the host keeps 8 GiB free); one build at a time per checkout.
set -euo pipefail
SRC="$(cd "${1:?checkout}" && pwd)"
DEST="$(realpath -m "${2:?build dir}")"
SHA="$(git -C "$SRC" rev-parse --short=12 HEAD)"
LOG="$DEST.build.log"

slot=''
while [ -z "$slot" ]; do
  for i in 1 2 3; do
    exec {fd}>"/tmp/perf-fixes-build-slot-$i.lock"
    if flock -n "$fd"; then slot=$i; break; fi
    exec {fd}>&-
  done
  [ -z "$slot" ] && sleep 15
done
# The gate lets a waiting measurement cycle go first; the shared lock keeps cycles out while this build runs.
exec {gate}>/tmp/perf-fixes-gate.lock
flock "$gate"
exec {quiet}>/tmp/perf-fixes-quiet.lock
flock -s "$quiet"
flock -u "$gate"
while [ "$(awk '/MemAvailable/ { print int($2 / 1048576) }' /proc/meminfo)" -lt 14 ]; do sleep 15; done
# Nitro writes its intermediate output into node_modules/.nitro, so two builds sharing one node_modules corrupt
# each other: one build at a time per checkout.
exec {own}>"$SRC/node_modules/.build-local.lock"
flock "$own"

echo "$(date +%T) build $SRC ($SHA) -> $DEST (slot $slot)"
rm -rf "$DEST"
mkdir -p "$DEST"
# .dockerignore patterns are relative to the context root; anchor them for rsync unless they start with **/.
grep -v -e '^#' -e '^[[:space:]]*$' "$SRC/.dockerignore" | sed -e '/^\*\*\//!s#^#/#' > "$DEST.exclude"
printf '%s\n' /.tmp '/docs/performance/*/evidence' >> "$DEST.exclude"
rsync -a --exclude-from="$DEST.exclude" "$SRC/" "$DEST/"
ln -s "$SRC/node_modules" "$DEST/node_modules"

cd "$DEST"
export NODE_ENV=production SENTRY_SOURCEMAPS=true VITE_APP_VERSION="$SHA"
{
  yarn build:app &&
    yarn build:validate &&
    node scripts/prepare-sentry-artifacts.mjs .output/public/assets "$DEST/sentry-artifacts/assets" &&
    find .output -name '*.map' -type f -delete &&
    yarn build:validate
} > "$LOG" 2>&1 || {
  echo "$(date +%T) build FAILED, see $LOG"
  exit 1
}
echo "$(date +%T) built $DEST ($(ls .output/public/assets | wc -l) assets)"
