/**
 * Motion for the margin field: an intro wave on load, a ripple on click.
 *
 * ~990 rectangles animate individually, so the constraints below are
 * structural rather than stylistic.
 *
 * 1. **`opacity` and `transform` only.** Both animate without layout or style
 *    recalculation. Animating `fill` or geometry would invalidate every element
 *    on every frame at this population.
 *
 * 2. **Both animations are one-shot.** The intro plays once after mount; a
 *    ripple plays once per click. Nothing loops, so a page left open costs
 *    nothing and there is no idle animation to pause.
 *
 * 3. **No `will-change`.** On a container it is a win; across 990 elements it
 *    would ask the compositor for 990 layers and cost far more than the repaint
 *    it avoids. The cells are small and confined to two narrow strips.
 *
 * 4. **A click is a rare event**, which is what makes the per-cell approach
 *    affordable. The hook computes each cell's delay *and its amplitude* in one
 *    pass and writes three custom properties; everything after that is
 *    declarative. Under a hover-driven stream that pass would have run
 *    continuously and would have had to be pushed into CSS instead.
 *
 * The two sides are one surface. Both layers measure from the same click in
 * their own coordinate space, so a click on the left reaches the left field at
 * once and the right field a few hundred milliseconds later. Nothing special
 * connects them — using true distance rather than a per-side origin is the
 * connection.
 */

/** Class applied to the hero section that hosts both animations. */
export const FIELD_HOVER_ROOT = 'tpz-field-host'

/** Class the host carries while the intro wave is in flight. */
export const INTRO_CLASS = 'is-intro'

/** Class the host carries while a ripple is in flight. */
export const RIPPLING_CLASS = 'is-rippling'

/** How long after mount the intro starts. Late enough to land after hydration. */
export const INTRO_DELAY_MS = 420

/** Intro duration plus its longest column delay, so the class can be dropped. */
export const INTRO_TOTAL_MS = 2200

/** How long a single cell's ripple lasts. */
export const RIPPLE_CELL_MS = 620

/** Cell duration plus the longest delay, after which the class is dropped. */
export const RIPPLE_TOTAL_MS = 1500

/*
 * Note for anyone editing the stylesheet below: it is a template literal, so a
 * backtick anywhere inside it — including in a CSS comment — ends the string
 * and produces a syntax error several lines later. Use single quotes.
 */
const CSS = `
[data-field-cell] {
  opacity: var(--o);
  /* Scale has to happen about the cell's own centre, which for SVG means
     opting out of the user-space origin. Without this every cell grows from
     the top-left of the viewBox and flies across the field. */
  transform-box: fill-box;
  transform-origin: center;
}

/* Intro: brighten to full and swell, with a lean inward. */
@keyframes tpz-intro {
  0%   { opacity: var(--o); transform: translate3d(0, 0, 0) scale(1); }
  34%  { opacity: 1; transform: translate3d(var(--tpz-drift), 0, 0) scale(var(--s)); }
  100% { opacity: var(--o); transform: translate3d(0, 0, 0) scale(1); }
}

/*
 * Ripple: the crest peaks a third of the way in and eases back over the
 * remaining two thirds, so the rise is quick and the fall is long — the shape
 * a disturbance in a surface actually has. '--op' and '--sp' carry the cell's
 * own peak, already scaled by how far it sits from the click, so one keyframe
 * produces a strong response at the origin and a whisper at the edge.
 */
@keyframes tpz-ripple {
  0%   { opacity: var(--o);  transform: scale(1); }
  32%  { opacity: var(--op); transform: scale(var(--sp)); }
  100% { opacity: var(--o);  transform: scale(1); }
}

/* Longhand throughout: the shorthand resets animation-delay, which is the one
   property that differs per cell. */
.${FIELD_HOVER_ROOT}.${INTRO_CLASS} [data-field-cell],
.${FIELD_HOVER_ROOT}.${RIPPLING_CLASS} [data-field-cell] {
  animation-iteration-count: 1;
  animation-fill-mode: both;
}

.${FIELD_HOVER_ROOT}.${INTRO_CLASS} [data-field-cell] {
  animation-name: tpz-intro;
  animation-duration: 900ms;
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  animation-delay: var(--dw);
}

.${FIELD_HOVER_ROOT}.${RIPPLING_CLASS} [data-field-cell] {
  animation-name: tpz-ripple;
  animation-duration: ${RIPPLE_CELL_MS}ms;
  /* Sharp rise, long settle — an ease-out rather than the symmetric curve the
     intro uses, so the crest arrives and then relaxes. */
  animation-timing-function: cubic-bezier(0.16, 0.84, 0.24, 1);
  animation-delay: var(--dp, 0ms);
}

/* The motion is a flourish, not information. Reduced motion drops it rather
   than substituting a jump, and the ripple never starts — the hook checks the
   same preference before it attaches a listener. */
@media (prefers-reduced-motion: reduce) {
  .${FIELD_HOVER_ROOT}.${INTRO_CLASS} [data-field-cell],
  .${FIELD_HOVER_ROOT}.${RIPPLING_CLASS} [data-field-cell] {
    animation: none;
    transform: none;
    opacity: var(--o);
  }
}
`

/**
 * Injected as a plain style element rather than added to `src/index.css`, which
 * a prototype may not touch. Rendered on the server too, so the first paint
 * already has it.
 */
export function FieldAnimationStyles() {
  return <style>{CSS}</style>
}
