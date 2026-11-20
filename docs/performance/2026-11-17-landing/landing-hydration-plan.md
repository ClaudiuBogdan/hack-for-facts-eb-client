# Landing hydration, step 1: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** below 1800 px the landing's margin pixel field builds, sizes, measures and draws nothing.

**Architecture:** one module owns the field's breakpoint and answers "is the field shown?" from a media query.
The canvas builds its packed field only when that answer is yes, at mount or on the query's `change` event. The
motion hook asks the same module instead of reading boxes, and collects its targets again on a click if none were
built at load. The landing page keeps its CSS class; a test holds the class and the constant together.

**Tech Stack:** React 19.2, Tailwind v4, Vitest + Testing Library (jsdom), TypeScript.

**Spec:** [landing-hydration.md](landing-hydration.md), section "Step 1".

## Global Constraints

- Breakpoint `1800` px, query `(min-width: 1800px)`; the wrapper class stays `hidden min-[1800px]:block`.
- No visible difference on any width; at 1800 px and up the first frame, intro wave, ripple, reduced motion and
  density change behave as today. The intro stays a load-time event: widening a window later does not play it.
- No layout read (`getClientRects`, `getBoundingClientRect`, `clientWidth`) on mount; a click may read layout, as today.
- Repo conventions: named exports, `readonly` props, kebab-case files, prettier `--no-semi --single-quote --print-width 180`.
  Finish with `yarn run check`. No commit until the owner has seen the measurement and Astra's review.

## Review Focus

1. A window widened past 1800 px after a narrow load: the field must appear at rest and ripple on click (no intro).
2. A window narrowed below 1800 px after load: a click must schedule nothing (today's `onScreen` guard on click).
3. Unmount while the field is still unbuilt (narrow): no listener left on the media query list.
4. A density change while narrow: must not build or size the field.
5. Two mounts (StrictMode, revisit): the packed field is built once per side, as today (`packCache`).

---

### Task 1: the field's breakpoint lives in one place

**Files:**
- Create: `src/features/landing/lib/margin-field.ts`
- Create: `src/features/landing/lib/margin-field.test.ts`
- Modify: `src/features/landing/components/landing-page.test.tsx` (one test)

**Interfaces:**
- Produces: `MARGIN_FIELD_MIN_WIDTH_PX: 1800`, `MARGIN_FIELD_QUERY: '(min-width: 1800px)'`,
  `marginFieldQuery(): MediaQueryList` (the query list, for listeners), (`isMarginFieldShown()` was dropped in review: the canvas and the hook hold the list and read `matches`).
  The module's doc comment carries the reasoning now in `landing-page.tsx:197-206` about why 1800, and the
  comment in the page points to it.

- [ ] **Step 1: Write the failing tests**
  - `margin-field.test.ts`: `MARGIN_FIELD_QUERY` equals `` `(min-width: ${MARGIN_FIELD_MIN_WIDTH_PX}px)` ``;
    `marginFieldQuery().matches` returns the `matches` of a mocked `window.matchMedia` for that exact query (true and false).
  - `landing-page.test.tsx`, "shows the margin field only from the breakpoint the field module names": render the
    page, find the wrapper of `canvas[data-field-canvas]`'s parent chain with class `hidden`, expect its class list
    to contain `` `min-[${MARGIN_FIELD_MIN_WIDTH_PX}px]:block` ``.
- [ ] **Step 2: Run** `npx vitest run src/features/landing` — the new tests fail (module missing).
- [ ] **Step 3: Implement `margin-field.ts`.** Plain functions, no React. Move the "why 1800" comment here.
- [ ] **Step 4: Run** `npx vitest run src/features/landing` — all pass.

### Task 2: the canvas builds nothing where the field is hidden

**Files:**
- Modify: `src/features/landing/components/pixel-canvas.tsx` (`PixelFieldCanvas`, around lines 370-425)
- Create: `src/features/landing/components/pixel-canvas.test.tsx`

**Interfaces:**
- Consumes: `marginFieldQuery` from Task 1.
- Produces: `registry` (module-private `WeakMap<HTMLCanvasElement, PackedField>`) holds a canvas **only once its
  field is built**. Task 3 relies on "registered ⇔ built".

- [ ] **Step 1: Write the failing tests** (`pixel-canvas.test.tsx`; a controllable `matchMedia` mock whose list can
  fire `change`; spies on `HTMLCanvasElement.prototype.getContext` and `Element.prototype.getClientRects`, with
  `getContext` returning a stub 2D context of `vi.fn()` methods):
  - "builds and draws nothing while the field is hidden": query false → render `<PixelFieldCanvas edge="left" cell={12} />`
    → `getContext` not called, `getClientRects` not called, `canvas.width` is the default `300`.
  - "draws the resting field when shown at mount": query true → `getContext` called once, `canvas.width` equals
    `Math.round(columns * 12 * devicePixelRatio)` from `fieldGeometry(12)`, `getClientRects` not called.
  - "draws it when the window widens past the breakpoint": query false, render, then flip to true and fire `change`
    → `getContext` called once.
  - "a density change while hidden builds nothing": query false, set `devicePixelRatio = 2`, fire `resize` → `getContext` not called.
  - "unmount while hidden removes its listener": the mock list's `removeEventListener('change', …)` called with the
    same function `addEventListener` received.
- [ ] **Step 2: Run** `npx vitest run src/features/landing/components/pixel-canvas.test.tsx` — the hidden-case tests fail
  (today it calls `getClientRects`).
- [ ] **Step 3: Change the layout effect.** `paint` checks the held list's `matches` first; `getPacked` and
  `registry.set` move inside it, after that check. The `ResizeObserver` is replaced by a `change` listener on
  `marginFieldQuery()` that paints when the query matches and the canvas is not sized. Update the comment block
  (why a media query and not the box: no layout read during hydration; the 7 MB backing-store reason stays).
- [ ] **Step 4: Run** the file's tests and `npx vitest run src/features/landing` — all pass.

### Task 3: the motion hook asks the module, and finds a field built after load

**Files:**
- Modify: `src/features/landing/components/pixel-canvas.tsx` (`useCanvasFieldMotion`, around lines 440-555)
- Modify: `src/features/landing/components/pixel-canvas.test.tsx`

**Interfaces:**
- Consumes: Task 1's `marginFieldQuery`; Task 2's "registered ⇔ built".
- Produces: module-private `collectTargets(host: HTMLElement, cell: FieldCell): Target[]` (the current loop over
  `canvas[data-field-canvas]`, unchanged in what it accepts).

- [ ] **Step 1: Write the failing tests** (render a small host with two `PixelFieldCanvas` and the hook; stub
  `requestAnimationFrame` to run synchronously a bounded number of times):
  - "does not read layout on mount": query true → mount → `getClientRects` not called.
  - "plays the intro only when the field is shown at load": query true → one `requestAnimationFrame` scheduled;
    query false → none.
  - "ripples on a click after a narrow load is widened": query false → mount → flip to true + `change` → dispatch a
    left-button `pointerdown` on the host outside `CONTENT_FRAME` → `requestAnimationFrame` scheduled, and no intro was.
  - "a click while narrowed schedules nothing": query true → mount → let the intro finish → flip to false → a click
    schedules no frame.
- [ ] **Step 2: Run** the file's tests — the first and third fail.
- [ ] **Step 3: Change the hook.** Extract `collectTargets`. `onScreen` becomes the held list's `matches`. On mount,
  collect targets; when there are none, still attach the `pointerdown` listener and collect again inside it (when
  the field is shown and the list is empty). The intro is scheduled only from the mount-time collection, so it stays a
  load-time event. Keep the reduced-motion early return and the teardown exactly as today.
- [ ] **Step 4: Run** `npx vitest run src/features/landing` and `yarn run check` — all pass, no warnings.

### Task 4: measure, review, record

**Files:**
- Modify: `docs/performance/2026-11-17-landing/landing-hydration.md` (a "Step 1 results" section),
  `docs/performance/2026-11-17-landing/README.md` (item 5 points to the design).

- [ ] **Step 1: Browser pass** on the dev server: 390 px, 1440 px, 1920 px (the field draws, intro and ripple run),
  a window widened from 1440 to 1920 (field appears at rest, ripples on click), reduced motion at 1920 (resting field only).
- [ ] **Step 2: Measure** a production build with `build-local.sh` + `measure-local.sh` (Lighthouse mobile x5,
  desktop x3) and the 4x CPU profile; attribute with the build's maps. Compare with the baseline in the design
  (mobile 80, TBT 369 ms; field ≈230 ms at 4x). Delete the build afterwards.
- [ ] **Step 3: Astra review** (`codex exec -m gpt-6.2-astra`, `model_reasoning_effort=max`, read-only) of `git diff HEAD`
  with the design and this plan; fix what it confirms, re-review until no P0–P2.
- [ ] **Step 4: Report to the owner** with the numbers and the review; commit only on their go
  (`perf(landing): Build the margin field only where it is shown`).
