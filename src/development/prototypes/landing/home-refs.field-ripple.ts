import { useEffect, useRef } from 'react'

/**
 * A ripple through the margin field, originating at the pointer.
 *
 * The naive version of this recomputes every cell's distance on every
 * `pointermove`. At ~990 cells and a 120Hz trackpad that is roughly 120k
 * distance calculations and style writes per second on the main thread, which
 * is precisely the jank this is supposed to avoid. Four things keep it cheap:
 *
 * 1. **Cell centres are read once and cached.** They come from the `x`/`y`
 *    attributes, not from `getBoundingClientRect`, so there is no per-cell
 *    layout read and no forced reflow. One `getBoundingClientRect` per layer
 *    per ripple — four in total — locates the pointer.
 *
 * 2. **A ripple is rate-limited and displacement-gated.** Moving the pointer
 *    does not fire one; moving it {@link MIN_TRAVEL}px *after* the previous
 *    ripple has finished does. So the cost is bounded to one pass per
 *    {@link PERIOD}ms no matter how fast the pointer moves, and resting the
 *    pointer produces exactly one ripple rather than a standing wave. That is
 *    the answer to "what if I never hover out".
 *
 * 3. **Writes are batched into one animation frame** and set a single custom
 *    property per cell. Everything after that is declarative: the browser runs
 *    ~990 one-shot keyframe animations with staggered delays and no further
 *    JavaScript executes for the rest of the ripple.
 *
 * 4. **Nothing runs at all** when the pointer is not over the hero, when the
 *    variant does not want a ripple, or when the reader prefers reduced motion.
 */

/** Class the host carries while a ripple is in flight. */
export const RIPPLING_CLASS = 'is-rippling'

/** Milliseconds of delay per pixel of distance — the speed of the wavefront. */
const MS_PER_PX = 0.55

/** Minimum gap between ripples. Matches the animation's own length plus the
 *  longest delay a cell is likely to carry, so ripples never overlap. */
const PERIOD = 900

/** How far the pointer must travel before a resting hover earns a new ripple. */
const MIN_TRAVEL = 90

type CachedCell = {
  readonly el: SVGRectElement
  readonly cx: number
  readonly cy: number
}

/**
 * Returns a ref for the hero section. Attach it and the section becomes the
 * ripple's host: it owns the hover, and the fields inside it are what ripple.
 */
export function useFieldRipple({ enabled }: { enabled: boolean }) {
  const hostRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!enabled || !host) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Cached once. The SVG is drawn at its natural scale, so one user unit is
    // one pixel and the attributes can be used directly.
    const layers = Array.from(host.querySelectorAll<SVGSVGElement>('[data-field-layer]')).map(
      (svg) => ({
        svg,
        cells: Array.from(svg.querySelectorAll<SVGRectElement>('[data-field-cell]')).map(
          (el): CachedCell => {
            const size = Number(el.getAttribute('width'))
            return {
              el,
              cx: Number(el.getAttribute('x')) + size / 2,
              cy: Number(el.getAttribute('y')) + size / 2,
            }
          },
        ),
      }),
    )
    if (layers.length === 0) return

    let lastFiredAt = 0
    let originX = Number.NaN
    let originY = Number.NaN
    let frame = 0

    const fire = (clientX: number, clientY: number) => {
      const now = performance.now()
      const travelled = Number.isNaN(originX)
        ? Number.POSITIVE_INFINITY
        : Math.hypot(clientX - originX, clientY - originY)
      if (now - lastFiredAt < PERIOD || travelled < MIN_TRAVEL) return

      lastFiredAt = now
      originX = clientX
      originY = clientY

      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        for (const { svg, cells } of layers) {
          const rect = svg.getBoundingClientRect()
          const px = clientX - rect.left
          const py = clientY - rect.top
          for (const cell of cells) {
            const distance = Math.hypot(cell.cx - px, cell.cy - py)
            cell.el.style.setProperty('--dp', `${Math.round(distance * MS_PER_PX)}ms`)
          }
        }
        // Removing and re-adding in the same frame would not restart the
        // animations — the class list is only compared once per style pass. The
        // layout read between them forces the removal to take effect first.
        host.classList.remove(RIPPLING_CLASS)
        void host.offsetWidth
        host.classList.add(RIPPLING_CLASS)
      })
    }

    const onEnter = (event: PointerEvent) => {
      lastFiredAt = 0
      originX = Number.NaN
      fire(event.clientX, event.clientY)
    }
    const onMove = (event: PointerEvent) => fire(event.clientX, event.clientY)
    const onLeave = () => {
      cancelAnimationFrame(frame)
      host.classList.remove(RIPPLING_CLASS)
      originX = Number.NaN
      lastFiredAt = 0
    }

    host.addEventListener('pointerenter', onEnter)
    host.addEventListener('pointermove', onMove, { passive: true })
    host.addEventListener('pointerleave', onLeave)

    return () => {
      cancelAnimationFrame(frame)
      host.removeEventListener('pointerenter', onEnter)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      host.classList.remove(RIPPLING_CLASS)
    }
  }, [enabled])

  return hostRef
}
