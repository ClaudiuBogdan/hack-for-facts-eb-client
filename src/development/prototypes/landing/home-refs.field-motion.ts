import { useEffect, useRef } from 'react'
import {
  INTRO_CLASS,
  INTRO_DELAY_MS,
  INTRO_TOTAL_MS,
  MAX_TIME_SCALE,
  REFERENCE_SPAN_PX,
  RIPPLE_DISTANCE_EXPONENT,
  RIPPLE_FALLOFF_PX,
  RIPPLE_JITTER_MS,
  RIPPLE_MS_PER_PX,
  RIPPLE_TOTAL_MS,
  RIPPLING_CLASS,
} from './home-refs.field-animation'

/**
 * How much to stretch the timings for the span actually on screen.
 *
 * The field is drawn 720px wide but clipped to the margin beside the frame, so
 * at 1920 about 510px of it is visible and at 1506 only 214px. Without this the
 * schedule is spent mostly on clipped cells and what remains on screen is over
 * before it registers — and at the narrow end the particle tail is clipped away
 * entirely, so the visible field is nothing but the square band.
 *
 * Durations are stretched more gently than delays: the sweep needs to take
 * noticeably longer, but a single cell's swell only needs to be a little
 * slower to stay legible.
 */
function timeScaleFor(visibleWidth: number) {
  if (visibleWidth <= 0) return { delay: 1, duration: 1 }
  const scale = Math.min(MAX_TIME_SCALE, Math.max(1, REFERENCE_SPAN_PX / visibleWidth))
  return { delay: scale, duration: 1 + (scale - 1) * 0.4 }
}

/**
 * A ripple through the margin field, originating at the click.
 *
 * Click rather than hover is what makes the per-cell approach affordable. A
 * hover-driven stream would run this pass continuously — ~990 distance
 * calculations and style writes, repeatedly — and would have had to push the
 * maths into CSS to survive. A click happens rarely enough that one clean pass
 * is the right trade: it buys true Euclidean distance and, more importantly,
 * a per-cell *amplitude*, which is what separates a ripple from a flash.
 *
 * What still matters:
 *
 * - **Cell centres are cached once** from their attributes, so there is no
 *   per-cell layout read and no forced reflow. One `getBoundingClientRect` per
 *   layer per ripple locates the click.
 * - **Writes are batched into one animation frame**, three custom properties
 *   per cell. Nothing further executes for the rest of the ripple.
 * - **Nothing is left running.** The class is dropped once the last cell has
 *   settled, so an idle page holds no animations.
 * - **Nothing attaches at all** when the reader prefers reduced motion.
 */

/**
 * Anything a click could mean something to.
 *
 * A ripple is decoration, and decoration should not answer a click that had a
 * purpose. Focusing the search, following a shortcut or opening an entity are
 * real intents; sending a flourish across both margins in reply reads as the
 * page reacting to the wrong thing. Matched with `closest`, so a click on an
 * icon or a label inside a control still counts as a click on the control.
 */
const INTERACTIVE =
  'a, button, input, textarea, select, label, [role="button"], [role="combobox"], [role="link"], [contenteditable]'

/** Peak scale at the very centre of the ripple. Falls off with amplitude. */
const PEAK_SCALE = 1.75

/**
 * How much opacity a cell gains at full amplitude.
 *
 * Headroom, not a jump to 1. Interpolating every cell toward full made them all
 * peak at the same value, so the camouflage's tonal structure vanished at the
 * crest and the field read as a flash. Adding a fixed amount keeps the tiers
 * distinguishable the whole way through.
 */
const OPACITY_HEADROOM = 0.52

type CachedCell = {
  readonly el: SVGRectElement
  readonly cx: number
  readonly cy: number
  /** Resting opacity, read once so the peak can be built on top of it. */
  readonly base: number
  /** Deterministic 0-1, used to scatter the arrival time within a radius. */
  readonly jitter: number
}

/** Smoothstep, so the ripple's outer edge fades rather than ending on a line. */
const smoothstep = (t: number) => t * t * (3 - 2 * t)

/**
 * Returns a ref for the hero section. Attach it and the section becomes the
 * host: clicks in it start a ripple, and the fields inside it are what ripples.
 */
export function useFieldMotion({ ripple }: { ripple: boolean }) {
  const hostRef = useRef<HTMLElement | null>(null)

  // The intro wave. Deliberately separate from the ripple effect: it must run
  // even when the ripple is switched off, and must not be torn down and
  // replayed if the ripple's dependencies change.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const start = window.setTimeout(() => host.classList.add(INTRO_CLASS), INTRO_DELAY_MS)
    // Dropped once the wave has finished, so it cannot compete with a later
    // ripple for animation-name and delay.
    const end = window.setTimeout(
      () => host.classList.remove(INTRO_CLASS),
      INTRO_DELAY_MS + INTRO_TOTAL_MS,
    )

    return () => {
      window.clearTimeout(start)
      window.clearTimeout(end)
      host.classList.remove(INTRO_CLASS)
    }
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!ripple || !host) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Cached once. The SVG is drawn at its natural scale, so one user unit is
    // one pixel and the attributes can be used directly.
    const layers = Array.from(host.querySelectorAll<SVGSVGElement>('[data-field-layer]')).map(
      (svg) => ({
        svg,
        cells: Array.from(svg.querySelectorAll<SVGRectElement>('[data-field-cell]')).map(
          (el): CachedCell => {
            const size = Number(el.getAttribute('width'))
            const cx = Number(el.getAttribute('x')) + size / 2
            const cy = Number(el.getAttribute('y')) + size / 2
            // Cheap positional hash, so the jitter costs nothing at SSR and
            // stays stable for the life of the element.
            const noise = Math.sin(cx * 12.9898 + cy * 78.233) * 43758.5453
            return {
              el,
              cx,
              cy,
              base: Number(el.style.getPropertyValue('--o')) || 0,
              jitter: noise - Math.floor(noise),
            }
          },
        ),
      }),
    )
    if (layers.length === 0) return

    let frame = 0
    let clear = 0
    const scale = timeScaleFor(layers[0].svg.parentElement?.clientWidth ?? 0)

    const onPointerDown = (event: PointerEvent) => {
      // Primary button only; a right-click opening a context menu should not
      // set the field off.
      if (event.button !== 0) return

      const target = event.target
      if (target instanceof Element && target.closest(INTERACTIVE)) return

      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        for (const { svg, cells } of layers) {
          const rect = svg.getBoundingClientRect()
          const px = event.clientX - rect.left
          const py = event.clientY - rect.top

          for (const cell of cells) {
            const distance = Math.hypot(cell.cx - px, cell.cy - py)
            // Amplitude is the whole trick. Without it every cell peaks at the
            // same value and the field reads as a flash that happens to arrive
            // late at the edges; with it, the response genuinely weakens with
            // distance and the crest reads as one travelling disturbance.
            const amplitude = smoothstep(Math.max(0, 1 - distance / RIPPLE_FALLOFF_PX))

            const delay =
              (Math.pow(distance, RIPPLE_DISTANCE_EXPONENT) * RIPPLE_MS_PER_PX +
                cell.jitter * RIPPLE_JITTER_MS) *
              scale.delay

            cell.el.style.setProperty('--dp', `${Math.round(delay)}ms`)
            cell.el.style.setProperty(
              '--op',
              Math.min(1, cell.base + OPACITY_HEADROOM * amplitude).toFixed(3),
            )
            cell.el.style.setProperty(
              '--sp',
              (1 + (PEAK_SCALE - 1) * amplitude).toFixed(3),
            )
          }
        }

        // Removing and re-adding in the same frame would not restart the
        // animations — the class list is compared once per style pass. The
        // layout read between them forces the removal to take effect first.
        host.classList.remove(RIPPLING_CLASS)
        void host.offsetWidth
        host.classList.add(RIPPLING_CLASS)

        // Dropped once the farthest cell has settled, so an idle page carries
        // no animations at all.
        window.clearTimeout(clear)
        clear = window.setTimeout(
          () => host.classList.remove(RIPPLING_CLASS),
          RIPPLE_TOTAL_MS * scale.delay,
        )
      })
    }

    host.addEventListener('pointerdown', onPointerDown)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(clear)
      host.removeEventListener('pointerdown', onPointerDown)
      host.classList.remove(RIPPLING_CLASS)
    }
  }, [ripple])

  return hostRef
}
