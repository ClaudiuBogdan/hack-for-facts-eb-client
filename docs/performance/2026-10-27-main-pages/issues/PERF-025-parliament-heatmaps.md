# PERF-025: `/parlament`'s two activity heatmaps cost ≈1.2 s of mobile main thread after the data arrives

## Summary

Each heatmap has ~365 cells, and the work per cell adds up:

- returned activity days build labels with a new `Intl.DateTimeFormat` each; the vote heatmap also formats
  empty and uncaptured dates during render (`parliament-hub-bill-activity.tsx:58-88`,
  `parliament-hub-activity-heatmap.tsx:195-246`);
- populated cells with `day.search` render a TanStack `<Link>` with `search`, inside a Radix `Tooltip`, so each
  link runs the app's JSON search serializer;
- the other cells render a `div`, with a tooltip when they carry data;
- the vote heatmap renders twice.

On mobile, that is three long tasks of 605, 269 and 355 ms (local trace) after the data lands. The page's TBT is
2.1–2.3 s, against 1.5–1.6 s on `/`.

## Where

- **Domain:** parliament. **URL:** `/parlament`. The vote heatmap is reused on the voturi tab.
- **Date format:** `lib/activity-heatmap-format.ts:7-14` creates a new `Intl.DateTimeFormat` per call. It is
  called from:
  - `parliament-hub-vote-activity.tsx:261` and `:349-356`;
  - `parliament-hub-bill-activity.tsx:61`.
- **Cells:** `parliament-hub-activity-heatmap.tsx:189-283`.
- **Search serializer:** `src/router.tsx:30-33`.

## Evidence

**Long tasks after the data lands:**

| profile | trace | tasks |
|---|---|---|
| mobile | local | 605 / 269 / 355 ms |
| mobile | deployed | 499 / 237 / 320 ms |
| desktop | | 109 / 66 / 32 ms |

**Self time, source-mapped** (local mobile trace, 22–27 s; `evidence/parliament/local/parlament-mobile/trace-cold.trace.json`):

| self time | where |
|---:|---|
| 225 ms | the date formatter |
| 178 ms | the search serializer in `src/router.tsx` |
| 86 ms | the heatmap component |
| ≈120 ms | Radix tooltip, slot, context and presence |
| ≈85 ms | TanStack router |
| 334 ms | react-dom |

The 605 ms task also delays the bills chain ([PERF-014](PERF-014-parliament-browser-only.md)). Source: parlament-2 in
`domains/parliament.md`.

## Root cause

Per-cell work that should be shared:

- one formatter per call, instead of one per module;
- a full router `Link` per cell, instead of one computed href;
- a full Radix tooltip per cell, instead of one delegated tooltip.

## Proposed fix

1. One module-level `Intl.DateTimeFormat`: a two-line change.
2. Render the squares as plain elements with one delegated tooltip.
3. Build the hrefs from one `router.buildLocation` plus a date suffix, or render a `<Link>` only for the
   hovered or focused square.
4. Optionally render the grids after idle; they are below the fold.

## Expected impact

- **Main thread:** ≈−0.7 to −0.9 s on mobile (≈−150 ms on desktop); TBT −0.6 s or more.
- **Bills chain:** starts ≈0.5 s earlier.

## How to verify

In a mobile cold run of `/parlament`, `longTaskList` after the hub data has no task over 200 ms, and TBT is
≤ 1.6 s.

## Owner

client

## Severity

**P2**: measurable, local to the page.
