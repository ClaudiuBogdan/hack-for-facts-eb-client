import { useEffect, useRef } from 'react'
import {
  INTRO_CLASS,
  INTRO_DELAY_MS,
  INTRO_TOTAL_MS,
  RIPPLE_TOTAL_MS,
  RIPPLING_CLASS,
} from './home-refs.field-animation'

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
 * Wavefront speed, in milliseconds per pixel.
 *
 * Tuned so the crest crosses the full width of the hero — roughly 1900px from
 * one field to the other — in about half a second. Slower and the far side
 * arrives long after the click has been forgotten; faster and both sides fire
 * together and stop reading as one connected surface.
 */
const MS_PER_PX = 0.62

/**
 * Exponent on the distance before it becomes a delay.
 *
 * Below 1, so the wavefront slows as it expands — which is what a real ripple
 * does, and what stops the crest reading as a perfectly uniform ring expanding
 * at machine speed. Paired with {@link MS_PER_PX} so the far edge still lands
 * around half a second.
 */
const DISTANCE_EXPONENT = 0.88

/** Per-cell timing jitter, so no two cells at the same radius fire together. */
const JITTER_MS = 70

/**
 * Distance at which a cell stops responding.
 *
 * Wide enough to take in both fields from a click anywhere in the hero, so the
 * far side always answers — faintly, which is the point.
 */
const FALLOFF_PX = 2000

/** Peak scale at the very centre of the ripple. Falls off with amplitude. */
const PEAK_SCALE = 1.5

/**
 * How much opacity a cell gains at full amplitude.
 *
 * Headroom, not a jump to 1. Interpolating every cell toward full made them all
 * peak at the same value, so the camouflage's tonal structure vanished at the
 * crest and the field read as a flash. Adding a fixed amount keeps the tiers
 * distinguishable the whole way through.
 */
const OPACITY_HEADROOM = 0.46

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

    const onPointerDown = (event: PointerEvent) => {
      // Primary button only; a right-click opening a context menu should not
      // set the field off.
      if (event.button !== 0) return

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
            const amplitude = smoothstep(Math.max(0, 1 - distance / FALLOFF_PX))

            const delay =
              Math.pow(distance, DISTANCE_EXPONENT) * MS_PER_PX + cell.jitter * JITTER_MS

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
          RIPPLE_TOTAL_MS,
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
