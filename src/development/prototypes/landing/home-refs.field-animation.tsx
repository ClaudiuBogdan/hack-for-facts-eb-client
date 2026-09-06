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

/*
 * Ripple timing.
 *
 * These live here rather than in the hook because the stylesheet and the hook
 * have to agree: the class is dropped after the *last* cell settles, and with
 * `animation-fill-mode: both` dropping it early snaps every unfinished cell
 * back. The total is therefore derived from the same constants that produce
 * the delays, not written by hand — the previous hand-written 1500ms was
 * within 18ms of cutting the farthest cells off.
 *
 * The important relationship is the last one. A crest is only felt if, at any
 * instant, part of the field is moving and part is not. That means one cell's
 * animation has to be *short* relative to the time the front takes to cross.
 * Before this, a cell ran for 827ms while the front crossed in 476ms — a band
 * 1.74x the width of the field, so everything was mid-animation together and
 * the ripple read as a single synchronised swell.
 */

/** Milliseconds per pixel, after the distance is raised to the exponent. */
export const RIPPLE_MS_PER_PX = 1.75

/**
 * Exponent on distance before it becomes a delay. Below 1, so the wavefront
 * slows as it expands the way a real one does.
 */
export const RIPPLE_DISTANCE_EXPONENT = 0.88

/** Timing jitter, so two cells at the same radius do not fire together. */
export const RIPPLE_JITTER_MS = 90

/** Distance at which a cell stops responding at all. */
export const RIPPLE_FALLOFF_PX = 2600

/**
 * Fraction of a cell's own duration used for the ripple.
 *
 * Chosen so the crest occupies roughly a third of the field rather than all of
 * it. This is the number that decides whether a ripple is felt.
 */
export const RIPPLE_CELL_FACTOR = 0.5

/** Longest per-cell duration emitted by the field builder. */
const LONGEST_CELL_MS = 1060

/** When the last cell can possibly still be moving, plus a margin. */
export const RIPPLE_TOTAL_MS = Math.round(
  Math.pow(RIPPLE_FALLOFF_PX, RIPPLE_DISTANCE_EXPONENT) * RIPPLE_MS_PER_PX +
    RIPPLE_JITTER_MS +
    LONGEST_CELL_MS * RIPPLE_CELL_FACTOR +
    200,
)

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

/*
 * Intro: rise, overshoot, settle back through a slight recoil.
 *
 * The recoil at 64% is what makes it read as something displaced rather than
 * something switched on. A monotonic rise and fall is a fade; a disturbance
 * that passes leaves the surface fractionally under its resting state before it
 * comes back. It is small on purpose — enough to feel, not enough to see as a
 * second flash.
 *
 * The peak is '--oi', the cell's resting value plus headroom, not 1. Taking
 * every cell to full flattened the camouflage at the crest.
 */
@keyframes tpz-intro {
  0%   { opacity: var(--o);  transform: translate3d(0, 0, 0) scale(1); }
  30%  { opacity: var(--oi); transform: translate3d(var(--tpz-drift), 0, 0) scale(var(--s)); }
  64%  { opacity: calc(var(--o) * 0.74); transform: translate3d(0, 0, 0) scale(calc(1 - (var(--s) - 1) * 0.13)); }
  100% { opacity: var(--o);  transform: translate3d(0, 0, 0) scale(1); }
}

/*
 * Ripple: rise sharply, then settle back through the same recoil the intro
 * uses. '--op' and '--sp' carry the cell's own peak, already scaled by how far
 * it sits from the click, so one keyframe produces a strong response at the
 * origin and a whisper at the edge.
 */
@keyframes tpz-ripple {
  0%   { opacity: var(--o);  transform: scale(1); }
  28%  { opacity: var(--op); transform: scale(var(--sp)); }
  62%  { opacity: calc(var(--o) * 0.76); transform: scale(calc(1 - (var(--sp) - 1) * 0.16)); }
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
  /* Each cell runs for its own length, so the field does not settle in
     lockstep. */
  animation-duration: var(--du);
  animation-timing-function: cubic-bezier(0.22, 0.9, 0.3, 1);
  animation-delay: var(--dw);
}

.${FIELD_HOVER_ROOT}.${RIPPLING_CLASS} [data-field-cell] {
  animation-name: tpz-ripple;
  /* Deliberately short relative to how long the front takes to cross, so only
     a band of the field is moving at any moment. */
  animation-duration: calc(var(--du) * ${RIPPLE_CELL_FACTOR});
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
