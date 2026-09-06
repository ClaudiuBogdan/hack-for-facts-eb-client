/**
 * Motion for the margin field: an intro wave on load, a ripple on hover.
 *
 * Every rectangle animates individually — about 990 across both sides — so the
 * constraints below are structural, not stylistic.
 *
 * 1. **`opacity` and `transform` only.** Both animate without layout or style
 *    recalculation. Animating `fill`, `x`/`y` or `width` would invalidate
 *    geometry per element per frame, which at this population is a guaranteed
 *    jank source.
 *
 * 2. **Every animation is one-shot.** The intro plays once after mount. A hover
 *    ripple plays once per pointer arrival, rate-limited. Neither loops, so
 *    resting the pointer on the hero forever costs nothing after the first
 *    ripple settles — the answer to "what if I never hover out".
 *
 * 3. **No `will-change`.** On a container it is a win; on 990 elements it would
 *    ask the compositor for 990 layers and cost far more than the repaint it
 *    avoids. The cells are small and confined to two narrow strips.
 *
 * 4. **Delays are data, not work.** The intro's column ramp is written once
 *    during SSR as a custom property per cell. The ripple's per-cell delay is
 *    written once per ripple in a single batched frame. Nothing recomputes
 *    per frame.
 */

/** Class applied to the hero section that hosts both animations. */
export const FIELD_HOVER_ROOT = 'tpz-field-host'

/** Class the host carries while the intro wave is in flight. */
export const INTRO_CLASS = 'is-intro'

/**
 * How long after mount the intro starts.
 *
 * Long enough that it reads as a deliberate flourish rather than as the page
 * still loading, and long enough to land after hydration so the first frames
 * are not competing with React's work.
 */
export const INTRO_DELAY_MS = 420

/** Intro duration plus the longest column delay, so the class can be dropped. */
export const INTRO_TOTAL_MS = 2200

const CSS = `
[data-field-cell] {
  opacity: var(--o);
  /* Scale has to happen about the cell's own centre, which for SVG means
     opting out of the user-space origin. Without this every cell grows from
     the top-left of the viewBox and flies across the field. */
  transform-box: fill-box;
  transform-origin: center;
}

/* Shared shape. The eased overshoot is what stops it reading as a plain fade:
   the cell brightens and swells past its resting size, then settles back
   without a bounce. */
@keyframes tpz-cell {
  0%   { opacity: var(--o); transform: translate3d(0, 0, 0) scale(1); }
  34%  { opacity: 1; transform: translate3d(var(--tpz-drift), 0, 0) scale(var(--s)); }
  100% { opacity: var(--o); transform: translate3d(0, 0, 0) scale(1); }
}

/* Longhand throughout: the shorthand resets animation-delay, which is the one
   property each cell sets for itself. */
.${FIELD_HOVER_ROOT}.${INTRO_CLASS} [data-field-cell],
.${FIELD_HOVER_ROOT}.is-rippling [data-field-cell] {
  animation-name: tpz-cell;
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  animation-iteration-count: 1;
  animation-fill-mode: both;
}

/* Intro: a wave travelling inward, column by column — the direction the field
   itself disperses in. Slower and softer than the ripple, because it plays
   unprompted and should not demand attention. */
.${FIELD_HOVER_ROOT}.${INTRO_CLASS} [data-field-cell] {
  animation-duration: 900ms;
  animation-delay: var(--dw);
}

/* Ripple: same shape, quicker, delayed by distance from the pointer. */
.${FIELD_HOVER_ROOT}.is-rippling [data-field-cell] {
  animation-duration: 620ms;
  animation-delay: var(--dp, 0ms);
}

/* The intro is a flourish, not information. Reduced motion drops it entirely
   rather than substituting a jump, and the ripple never starts — the hook
   checks the same preference before it attaches a single listener. */
@media (prefers-reduced-motion: reduce) {
  .${FIELD_HOVER_ROOT}.${INTRO_CLASS} [data-field-cell],
  .${FIELD_HOVER_ROOT}.is-rippling [data-field-cell] {
    animation: none;
    transform: none;
    opacity: var(--o);
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
