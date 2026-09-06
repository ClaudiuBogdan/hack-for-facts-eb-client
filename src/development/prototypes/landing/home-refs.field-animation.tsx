/**
 * Hover animation for the margin field — per cell.
 *
 * Every rectangle animates individually. That is ~990 elements across both
 * sides, so the constraints below are not stylistic; they are what keeps it off
 * the main thread and off the user's way.
 *
 * 1. **`opacity` and `transform` only.** Both are animatable without layout or
 *    style recalculation. Animating `fill`, `x`/`y` or `width` would invalidate
 *    geometry per element per frame, which at this population is a guaranteed
 *    jank source.
 *
 * 2. **One shot per hover, and short.** This is the answer to "what if I never
 *    hover out": a transition would ramp up and stay up while the pointer
 *    rested, and an infinite loop would keep ~990 animations resident forever
 *    on a decoration nobody is looking at. Each cell plays once, settles back
 *    to its base opacity, and stops. Re-entering replays it. The whole burst is
 *    over inside a second, so the cost is transient by construction.
 *
 * 3. **No `will-change`.** On a container it is a win; on 990 elements it would
 *    ask the compositor for 990 layers and exhaust GPU memory — far worse than
 *    the repaint it avoids. The cells are small and confined to two narrow
 *    strips, so repainting them is cheap in absolute terms.
 *
 * 4. **The delay schedules are precomputed and inlined.** `--dw` (by column)
 *    and `--dr` (per cell) are written once during SSR, so a hover costs a
 *    style recalculation and nothing else. No JavaScript runs on hover at all.
 *
 * Plain CSS rather than `motion`, which is available here. Motion would need to
 * drive ~990 values from a rAF loop on the main thread; declarative keyframes
 * hand the whole schedule to the compositor once and let it run.
 *
 * Hover is taken on the hero section, not the field: the field is
 * `pointer-events-none` and can never be the element under the cursor.
 */

export type FieldAnimation = 'wave' | 'scatter' | 'swell'

/** Class applied to the hero section that owns the hover. */
export const FIELD_HOVER_ROOT = 'tpz-field-host'

const CSS = `
[data-field-cell] {
  opacity: var(--o);
  /* Scale has to happen about the cell's own centre, which for SVG means
     opting out of the user-space origin. Without this every cell would grow
     from the top-left corner of the viewBox and fly across the field. */
  transform-box: fill-box;
  transform-origin: center;
}

@keyframes tpz-cell {
  0%   { opacity: var(--o); transform: translate3d(0, 0, 0) scale(1); }
  38%  { opacity: 1; transform: translate3d(var(--tpz-drift), 0, 0) scale(var(--s)); }
  100% { opacity: var(--o); transform: translate3d(0, 0, 0) scale(1); }
}

/* Longhand, not the shorthand: the shorthand resets animation-delay, which is
   the one property each cell sets for itself. */
.${FIELD_HOVER_ROOT}:hover [data-field-cell] {
  animation-name: tpz-cell;
  animation-duration: 620ms;
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  animation-iteration-count: 1;
  animation-fill-mode: both;
}

/* A wave travelling inward — delay ramps with the column, the same direction
   the field disperses in. */
.${FIELD_HOVER_ROOT}:hover [data-field-anim='wave'] [data-field-cell] {
  animation-delay: var(--dw);
}

/* Every cell on its own clock. */
.${FIELD_HOVER_ROOT}:hover [data-field-anim='scatter'] [data-field-cell] {
  animation-delay: var(--dr);
}

/* All together, no delay — the cheapest of the three and the most abrupt. */
.${FIELD_HOVER_ROOT}:hover [data-field-anim='swell'] [data-field-cell] {
  animation-delay: 0ms;
}

/* Reduced motion keeps the brightening and drops the movement entirely, so the
   preference is honoured without the field going inert. */
@media (prefers-reduced-motion: reduce) {
  .${FIELD_HOVER_ROOT}:hover [data-field-cell] {
    animation: none;
    transform: none;
    opacity: calc(var(--o) + 0.25);
    transition: opacity 200ms linear;
  }
}
`

/**
 * Injected as a plain `<style>` rather than added to `src/index.css`, which a
 * prototype may not touch. Rendered on the server too, so the first paint
 * already has it.
 */
export function FieldAnimationStyles() {
  return <style>{CSS}</style>
}
