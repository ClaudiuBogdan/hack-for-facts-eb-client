#!/usr/bin/env python3
"""Per-page timings of the shared load phases, from the batch's run<N>-cold.json files.

    python3 tools/shared-metrics.py [deployed|local] [mobile|desktop] [--json]

Phases (medians over the cold runs, excluding capped runs without a recorded hydration shell; ms from
navigation start; KB = KiB, as the harness reports bytes / 1024):
  css      end of the render-blocking stylesheet           fcp     first contentful paint
  pre      end of the head's modulepreload wave (parser-initiated same-origin /assets/ JS) and its transfer KB
  cat      start/end of the Lingui catalog files (messages-, admin-, pnrr- with an 8-character hash)
  route    the page's lazy route chunk (first script-initiated same-origin `*.lazy-<hash>.js` request) -> end of the
           same-origin /assets/ JS requested from then until the hydration shell; files and KB (third-party
           scripts such as clerk-js and earlier static-entry dependencies excluded)
  hyd      hydration shell / end (React DevTools hook)
  preKB    transfer of everything requested before the hydration shell
  clerk    clerk-js request start, FAPI /v1/client end
  api1     first browser API call start, number of calls, preflights
"""
import glob
import json
import os
import re
from urllib.parse import urlparse
import statistics
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAZY = re.compile(r"/assets/[^/]*\.lazy-[A-Za-z0-9_-]{8}\.js$")
CATALOG = re.compile(r"/assets/(messages|admin|pnrr)-[A-Za-z0-9_-]{8}\.js$")


def pages():
    with open(os.path.join(ROOT, "tools", "pages.txt")) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            domain, path, _ = line.split("|")
            slug = path.strip("/").replace("/", "-") or "home"
            yield domain, path, slug


def own_asset(req, origin):
    return urlparse(req["url"]).netloc == origin and "/assets/" in req["url"]


def phases(run):
    m = run["metrics"]
    reqs = run["requests"]
    js = [r for r in reqs if r["cat"] == "js"]
    origin = urlparse(run["url"]).netloc
    hs = m.get("hydrationShell")
    out = {"fcp": m.get("fcp"), "lcp": m.get("lcp"), "hydShell": hs, "hydEnd": m.get("hydrationEnd")}
    css = [r for r in reqs if r["cat"] == "css" and r["url"] in run.get("renderBlocking", [])]
    out["css"] = max((r["end"] for r in css if r["end"] is not None), default=None)
    pre = [r for r in js if r["initiator"] == "parser" and own_asset(r, origin)]
    out["preEnd"] = max((r["end"] for r in pre if r["end"] is not None), default=None)
    out["preKB"] = sum(r["encoded"] or 0 for r in pre) / 1024
    out["preN"] = len(pre)
    cats = [r for r in js if CATALOG.search(r["url"]) and r["initiator"] != "parser"]
    out["catStart"] = min((r["start"] for r in cats), default=None)
    out["catEnd"] = max((r["end"] for r in cats if r["end"] is not None), default=None)
    out["catKB"] = sum(r["encoded"] or 0 for r in cats) / 1024
    if out["catEnd"] is not None and hs is not None:
        lazy = [r for r in js if r["initiator"] != "parser" and own_asset(r, origin) and LAZY.search(r["url"])]
        route_start = min((r["start"] for r in lazy), default=None)
        wave = [r for r in js if r["initiator"] != "parser" and own_asset(r, origin) and route_start is not None and route_start <= r["start"] < hs]
        out["routeStart"] = route_start
        out["routeEnd"] = max((r["end"] for r in wave if r["end"] is not None and r["end"] <= hs), default=None)
        out["routeN"] = len(wave)
        out["routeKB"] = sum(r["encoded"] or 0 for r in wave) / 1024
        between = [t for t in run.get("longTaskList", []) if out["catEnd"] - 50 <= t["t"] <= (out["routeStart"] or hs)]
        out["evalTask"] = max((t["d"] for t in between), default=None)
    if hs is not None:
        out["preHydKB"] = sum(r["encoded"] or 0 for r in reqs if r["start"] < hs) / 1024
    clerk = [r for r in js if "clerk" in r["url"] and "clerk.accounts.dev" in r["url"] or re.search(r"/clerk-js@|clerk\.browser\.js", r["url"])]
    out["clerkStart"] = min((r["start"] for r in clerk), default=None)
    fapi = [r for r in reqs if "/v1/client" in r["url"]]
    out["clerkReady"] = max((r["end"] for r in fapi if r["end"] is not None), default=None)
    api = run.get("apiCalls", [])
    out["api1"] = min((c["start"] for c in api), default=None)
    out["apiN"] = len(api)
    out["preflights"] = sum(1 for r in reqs if r["cat"] == "preflight")
    return out


def median(values):
    values = [v for v in values if v is not None]
    return statistics.median(values) if values else None


def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "deployed"
    profile = sys.argv[2] if len(sys.argv) > 2 else "mobile"
    rows = []
    for domain, path, slug in pages():
        runs = []
        for f in sorted(glob.glob(os.path.join(ROOT, "evidence", domain, target, f"{slug}-{profile}", "run*-cold.json"))):
            run = json.load(open(f))
            if run.get("hitCap") and run["metrics"].get("hydrationShell") is None:
                continue
            runs.append(phases(run))
        if not runs:
            rows.append({"path": path, "n": 0})
            continue
        keys = runs[0].keys()
        row = {k: median([r.get(k) for r in runs]) for k in keys}
        row.update(path=path, n=len(runs))
        rows.append(row)
    if "--json" in sys.argv:
        print(json.dumps(rows, indent=1))
        return
    s = lambda v: "–" if v is None else f"{v / 1000:.1f}"
    k = lambda v: "–" if v is None else f"{v:.0f}"
    print(f"{target} · {profile} · cold (median of runs; s from navigation start)\n")
    print("| page | n | CSS end | FCP | preload wave end (KB) | catalogs start→end | eval task ms | route code start→end (files, KB) | hydrated shell / end | before-hydration KB | Clerk js → ready | 1st API (calls, preflights) |")
    print("|---|---:|---:|---:|---|---|---:|---|---|---:|---|---|")
    for r in rows:
        if r["n"] == 0:
            print(f"| `{r['path']}` | 0 | (no runs yet) |||||||||| ")
            continue
        print(
            f"| `{r['path']}` | {r['n']} | {s(r['css'])} | {s(r['fcp'])} | {s(r['preEnd'])} ({k(r['preKB'])}) | {s(r['catStart'])}→{s(r['catEnd'])} | {k(r.get('evalTask'))} | "
            f"{s(r.get('routeStart'))}→{s(r.get('routeEnd'))} ({k(r.get('routeN'))}, {k(r.get('routeKB'))}) | {s(r['hydShell'])} / {s(r['hydEnd'])} | {k(r.get('preHydKB'))} | "
            f"{s(r['clerkStart'])} → {s(r['clerkReady'])} | {s(r['api1'])} ({k(r['apiN'])}, {k(r['preflights'])}) |"
        )


main()
