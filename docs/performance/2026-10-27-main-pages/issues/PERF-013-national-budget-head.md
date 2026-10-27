# PERF-013: `/national-budget` hides its static `h1` behind one page-wide Suspense, so every load shifts the footer (CLS 0.29–0.44) and LCP waits for data

## Summary

The whole national-budget page sits inside one Suspense boundary. Its fallback is a 10-row skeleton shorter
than the viewport, so the footer is visible at first paint. The boundary suspends on the catalog and then on
the full-year series (0.72–0.84 s at the API). Only after that does the head stream in, although its crumb, `h1`
and intro are static text. Every load therefore has one large layout shift when the content pushes the footer
out:

- 0.436 on desktop, in 12 of 12 loads;
- 0.29 on mobile, in 11 of 11 completed loads.

LCP, which is the `h1`, waits for the data.

## Where

- **Domain:** national budget. **URL:** `/national-budget`.
- `src/features/national-budget/home/components/national-budget-home-page.tsx:100-111`: the outer Suspense with
  `HubPending rows={10}`.
- `:58,63-64`: `Page` suspends on the catalog, then on `useUnfinishedYears`.
- `hooks/use-home-data.ts:144-161`: the full-year totals series.
- `components/home-head.tsx:178-200`: the static head.

## Evidence

| target · profile · view | FCP | LCP | CLS |
|---|---:|---:|---:|
| deployed · desktop · cold | 408 | 1,048 | **0.436** |
| local · desktop · cold | 244 | 1,016 | **0.436** |
| deployed · mobile · cold | 7,280 | 7,804 | one 0.29 shift at 7.75 s ¹ |
| deployed · mobile · repeat | 864 | 1,928 | **0.29** |

FCP and LCP in ms.

¹ The harness's CLS median on mobile cold is 0.001 because Chrome flags this shift `hadRecentInput` on those
loads. The shift itself is in every run (`layoutShifts`). Deployed mobile run1-warm also reports `cls` 0 although
its `layoutShifts` holds the 0.29 shift, so the summaries' CLS column under-reports on mobile in general.

- **First paint shows** the header, the skeleton and the footer. The footer text is the first LCP candidate
  (`evidence/national-budget/deployed/national-budget-desktop/run2-cold.json` `lcpCandidates`).
- **Source:** national-budget-1 in `domains/national-budget.md`.

## Root cause

- The boundary is page-wide, and the head is inside it.
- The fallback is shorter than the page, so the footer is in the first viewport.
- `useUnfinishedYears` makes the whole page wait for the slowest SSR read
  ([PERF-022](PERF-022-slow-resolvers.md)), although the bare page opens on `defaultYear(catalog)`.

## Proposed fix

1. Render the head's static part outside the data boundary. Only the year menu, the sources line and the
   balance aside need the catalog; give them their own `BandRead`.
2. Give the remaining fallback the page's height, for example `min-h-[100svh]` or the figures band plus band
   skeletons.
3. Read `useUnfinishedYears` in the year menus, or only when `an` is in the address. The bands can then stream
   after the catalog alone.

## Expected impact

- **CLS:** 0.29 / 0.436 → ≈0 on every profile.
- **LCP = FCP:** −0.64 s desktop, −0.5 s mobile cold, **−1.06 s mobile repeat**.
- **Bands:** up to −0.7 s for the figures and bands, which no longer wait for the series.
- **Clerk window:** shortens the window in which Clerk's arrival can discard the streamed content
  ([PERF-012](PERF-012-clerk-eager.md)).

## How to verify

1. The SSR shell (the first flushed chunk) contains the `h1`.
2. `layoutShifts` is empty on desktop cold and repeat views.
3. `lcp ≈ fcp`.

## Owner

client

## Severity

**P1**: CLS is "poor" on every load, and mobile repeat-view LCP rises by more than 1 s.
