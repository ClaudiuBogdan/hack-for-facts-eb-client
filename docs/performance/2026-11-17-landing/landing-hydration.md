# Landing hydration: design

Item 5 of the [landing note](README.md). Owner's choice (2026-11-20): skip the work that shows nothing, then
split hydration so the browser can run between the bands. Measured after each step; Astra review before each commit.

## Why

On the batch-2 pin (fcab624cf) the landing scores 80 on mobile (TBT 369 ms, LCP 3.24 s). On a phone at 4x CPU
the main thread is busy from about 1.3 to 2.5 s after navigation, and that stretch is the landing's own start:

| Work | ≈ms at 4x |
|---|---|
| React render and hydration of the whole page in one pass (class merging ≈70, first number formatter ≈40) | 350–450 |
| Margin pixel field: builds both fields, then measures the canvas and finds it hidden | ≈230 |
| Mobile dock's first scroll read (forces a full layout) | ≈90 |
| Scroll and section lights, landing search set-up | ≈60 |

## Goals, non-goals, anti-goals

- **Goal:** less main-thread work, and shorter tasks, between the first paint and the page becoming usable on a phone.
- **Non-goal:** changing what any band looks like or when its animation starts; the stylesheet, the translation
  catalog and the main chunk (separate items).
- **Anti-goals:** a visible difference on any screen width; hiding server-rendered text; a band whose links or
  search do not work, or react late, once it is on screen; anything another page shares.

## Approaches considered

1. **Skip hidden work, then split hydration (chosen).** Two steps, each measured on its own.
2. Skip hidden work only. Smallest; leaves the single long hydration pass.
3. Hydrate the lower bands only as they approach the screen. Largest start-up saving, but entrance animations and
   count-ups start later and a tap waits for its band. A change of feel, so not taken.

## Step 1: the margin field does nothing where it is not shown

The field's wrapper is `hidden min-[1800px]:block`. Today each canvas builds its packed field (`pack`, about 3,900
cells a side) in a layout effect and then calls `getClientRects()` to learn it has no box; the motion hook then reads
the same boxes again.

- The decision is a media query, `(min-width: 1800px)`, matched in script; no box is read to make it. The number
  lives in one exported constant beside the class, and a test keeps the class and the constant equal.
- Below the breakpoint the canvas builds nothing, sizes nothing and draws nothing. The packed field is built the
  first time the query matches, whether at mount or when a window is widened past 1800 px; the query's `change`
  event takes over from the `ResizeObserver` that watched for a box.
- The motion hook takes its targets from the canvases that have been built; a window widened after load gets
  the ripple on click as today, and the intro wave stays a load-time event, as today.
- Behaviour at 1800 px and up is unchanged: same first frame, intro wave, ripple, reduced motion and density change.

## Step 2: the bands below the hero hydrate in their own boundaries

Each band after the hero (national facts, statement, index, provenance, people, promos, map) is wrapped in a
`<Suspense>` boundary with no fallback that can ever show: nothing in them suspends, so the server HTML is the
same apart from React's boundary markers. On the client React hydrates the root and the hero first, then each
boundary as its own unit, giving the browser a turn in between. The total work is about the same, but no single
task holds all of it.

- The page-wide effects (reveal, picture reveal, scroll light, section light) keep working from the root. They read
  and annotate the server's DOM, which is already present before a band hydrates, and hydration does not rewrite
  those attributes. Tests and a browser pass confirm the order does not matter.
- A tap inside a band that has not hydrated yet is replayed by React once that band hydrates (React's own
  behaviour for dehydrated boundaries).
- If the measurement shows React does not yield between the boundaries, step 2 is reverted and reported, not forced.

## Measuring

Same as the landing note: a production build behind the h2 + zstd proxy, Lighthouse 12.8.2 mobile x5 and
desktop x3, plus CDP CPU profiles at 4x, attributed to source through the build's maps. Baseline: fcab624cf,
mobile 80 (76–82), TBT 369 ms.

## Step 1 results (2026-11-20)

Built as planned ([plan](landing-hydration-plan.md)). `lib/margin-field.ts` owns the breakpoint and its query
list; `PixelFieldCanvas` builds, registers, sizes and draws only while the query matches (at mount or on its
`change` event); `useCanvasFieldMotion` reads the same list, plays the intro only for fields built at load, collects
a field built later on the first click, and settles on the resting field if the window narrows mid-animation.

- **Profile, 4x CPU, phone.** The field's work is gone from the landing's start: no `pixel-canvas` or `pixel-art`
  frames remain (before: ≈230 ms, of which ≈70 ms building the field and the rest a forced layout). The forced
  layout itself did not go away: it moved to the next code that reads layout after hydration, the router's scroll
  restoration (`router.tsx`, `scrollRestoration`), ≈130 ms. The browser has to lay the page out once after
  hydration whoever asks first, which is also why the reverted attempt in the [landing note](README.md) did not
  move TBT. Main-thread busy time over the load: 2,235 ms against 2,278 ms (mean of two profiles each), within noise.
- **Lighthouse, mobile x5.** 78 (75–82), TBT 438 ms, against 80 (76–82), TBT 369 ms: no change beyond the run-to-run
  spread. Desktop 100 both.
- **Browser pass.** 390 and 1440 px: nothing built. 1920 px: resting field, intro wave after load, settles to rest.
  1440 widened to 1920: field at rest, ripple on click, no intro. Reduced motion at 1920: resting field only.
- **Review.** Astra (max) found no P0/P1; its P2s (an intro started in a window narrowed between effects, frames
  drawn into hidden canvases mid-animation, tests that missed eager packing, a blank first frame and ripple-as-intro)
  are fixed, each with a test that failed first; the test gaps were checked by injecting each regression.

**What this means for step 2.** The ≈130 ms layout after hydration is the page's size (≈1,500 elements against a
541 KB stylesheet), not any one reader, so splitting hydration cannot remove it; step 2 can only cut React's own
render (≈350–450 ms) into shorter tasks.

## Left to the builder

Boundary placement within the bands, the test shapes, and the browser pass (phone 390 px, 1440 px, 1920 px;
reduced motion; widening a window past 1800 px).
