/**
 * The margin field's motion, as parameters.
 *
 * There used to be a stylesheet here and a hook beside it: every cell was an
 * SVG rectangle with its own CSS animation, and a sibling module declared the
 * keyframes they ran. That approach is gone — see `home-refs.pixel-canvas.tsx`
 * for why and for what replaced it — but the numbers it was tuned to are not,
 * so they live on here, imported by the renderer that now evaluates them.
 *
 * Keeping them in their own module is not ceremony. Several of these values are
 * only correct in relation to each other, and the relationships are the part
 * worth protecting:
 *
 * - **A crest is only felt if part of the field is moving and part is not.**
 *   A single cell's animation therefore has to be *short* relative to the time
 *   the wavefront takes to cross. An earlier version ran each cell for 827ms
 *   while the front crossed in 476ms — a moving band 1.74x the width of the
 *   field, so everything was in flight at once and the ripple read as one
 *   synchronised swell rather than as something travelling.
 * - **Delays stretch with the visible span, durations barely.** The sweep needs
 *   to take noticeably longer on a narrow margin; a single cell's swell only
 *   needs to be a little slower to stay legible.
 * - **The motion is a flourish, not information.** Nothing here is load-bearing,
 *   which is what makes it safe for reduced motion to drop it outright rather
 *   than substitute something for it.
 */

/**
 * Class on the hero section that hosts the field.
 *
 * Named for hosting rather than for hovering: hover triggers nothing here. The
 * section is the host because it is what a click is measured against and what
 * the canvases are found inside.
 */
export const FIELD_HOST_CLASS = 'tpz-field-host'

/**
 * How long after mount the intro wave starts.
 *
 * Short enough that the wave belongs to the page arriving, long enough that the
 * first painted frame is still. An earlier 420ms was written as a hydration
 * guard, which it never was — the effect it runs from is already
 * post-hydration — and it was long enough that the page looked settled and then
 * changed its mind.
 */
export const INTRO_DELAY_MS = 150

/**
 * Span the timings were tuned against, in pixels of *visible* field.
 *
 * The field is always drawn 720px wide, but only the margin beside the frame is
 * ever on screen: about 510px at 1920, and 214px at 1506. Timing that felt
 * right at the former is compressed into a fraction of the time at the latter,
 * because most of the schedule is spent on cells that are clipped away.
 */
export const REFERENCE_SPAN_PX = 510

/** Ceiling on that stretch, so a very narrow margin does not crawl. */
export const MAX_TIME_SCALE = 2.6

/**
 * How much to stretch the timings for the span actually on screen.
 *
 * Returns a multiplier for delays and a gentler one for durations, for the
 * reason in this file's header.
 *
 * Only the ripple uses it, and that is deliberate. The intro's schedule is
 * built per cell when the field is built, from a ramp measured in milliseconds
 * per *pixel* travelled, so it already crosses the same distance in the same
 * time whatever the module. Applying this on top would stretch it twice.
 */
export function timeScaleFor(visibleWidth: number) {
  if (visibleWidth <= 0) return { delay: 1, duration: 1 }
  const scale = Math.min(MAX_TIME_SCALE, Math.max(1, REFERENCE_SPAN_PX / visibleWidth))
  return { delay: scale, duration: 1 + (scale - 1) * 0.4 }
}

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
 * it. This is the number that decides whether a ripple is felt at all.
 */
export const RIPPLE_CELL_FACTOR = 0.5

/**
 * The region a ripple refuses to start in: the hero's content column.
 *
 * A ripple is decoration, and it belongs to the margins the field lives in.
 * Starting one under the headline, the search or the entity list answers a
 * click that had a purpose with a flourish across the page, which reads as
 * reacting to the wrong thing.
 *
 * This supersedes an earlier list of interactive selectors. The frame is a
 * simpler and stricter rule — every control in the hero is inside it, and so is
 * every piece of text a reader might click while reading — and it cannot drift
 * out of date as the hero's contents change.
 */
export const CONTENT_FRAME = '[data-frame="hero"]'

/** Peak scale at the very centre of a ripple. Falls off with amplitude. */
export const PEAK_SCALE = 1.75

/**
 * How much opacity a cell gains at full ripple amplitude.
 *
 * Headroom, not a jump to 1. Interpolating every cell toward full made them all
 * peak at the same value, so the camouflage's tonal structure vanished at the
 * crest and the field read as a flash. Adding a fixed amount keeps the tiers
 * distinguishable the whole way through.
 */
export const OPACITY_HEADROOM = 0.52

/** Smoothstep, so a ripple's outer edge fades rather than ending on a line. */
export const smoothstep = (t: number) => t * t * (3 - 2 * t)
