import { useEffect, useRef, useState } from 'react'
import type { PointerEvent, RefObject } from 'react'
import { animateViewBox, clampBox, recordFrames, type ViewBox } from './uat-map.model'

/** The closest the map goes: a sixteenth of the country's width. */
const MIN_WIDTH_SHARE = 1 / 16
/** Movement, in pixels, past which a press is a drag and no longer a tap. */
const DRAG_THRESHOLD = 6

type Point = { readonly x: number; readonly y: number }
type FrameRun = { frames: number[]; last: number }

/**
 * The map's view box: zoomed by the buttons, by Ctrl/⌘ + wheel (a
 * trackpad's pinch arrives as one) and by two fingers; moved by a drag once
 * zoomed in. Every change is applied to the `<svg>` directly, once per frame;
 * React hears the box only at rest (`box`), which is what it draws names,
 * strokes and the click's meaning from.
 *
 * Three boxes, so that nothing snaps back: the one on screen (`live`), the
 * one the map is heading to (`target` — where the next +/− starts from), and
 * the one at rest (`box`). A gesture takes the map from wherever it is.
 *
 * The page's own scroll is left alone: a plain wheel scrolls it (and
 * `wheelHint` says how to zoom), one finger scrolls it while the whole
 * country is shown.
 */
export function useMapViewport({
  svgRef,
  full,
  enabled,
  onWholeCountry,
}: {
  readonly svgRef: RefObject<SVGSVGElement | null>
  readonly full: ViewBox
  readonly enabled: boolean
  /** Called when the map comes to rest on the whole country, by any route. */
  readonly onWholeCountry: () => void
}) {
  const minWidth = full[2] * MIN_WIDTH_SHARE
  const isFull = (box: ViewBox) => box[2] >= full[2] * 0.98

  const [box, setBox] = useState<ViewBox>(full)
  const [animating, setAnimating] = useState(false)
  const [gesturing, setGesturing] = useState(false)
  const [wheelHint, setWheelHint] = useState(false)
  const live = useRef<ViewBox>(full)
  const target = useRef<ViewBox>(full)
  const cancel = useRef<(() => void) | null>(null)
  const frame = useRef<number | null>(null)
  const pointers = useRef(new Map<number, Point>())
  const press = useRef<{ moved: number; captured: boolean; run: FrameRun } | null>(null)
  const dragged = useRef(false)
  const wheel = useRef<{ run: FrameRun; timer: ReturnType<typeof setTimeout> } | null>(null)
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The wheel listener is attached once; it reads the latest callback through this.
  const wholeCountry = useRef(onWholeCountry)
  useEffect(() => {
    wholeCountry.current = onWholeCountry
  })

  const settle = (settled: ViewBox) => {
    live.current = settled
    target.current = settled
    cancel.current = null
    setBox(settled)
    setAnimating(false)
    if (isFull(settled)) wholeCountry.current()
  }

  const zoomTo = (next: ViewBox) => {
    const svg = svgRef.current
    if (!svg) return
    cancel.current?.()
    target.current = next
    setAnimating(true)
    cancel.current = animateViewBox(svg, live.current, next, {
      onFrame: (current) => {
        live.current = current
      },
      onDone: settle,
    })
  }

  /** `factor` times closer (or farther), about the centre of where the map is heading. */
  const zoomBy = (factor: number) => {
    const [x, y, w, h] = target.current
    const cx = x + w / 2
    const cy = y + h / 2
    zoomTo(clampBox([cx - w / factor / 2, cy - h / factor / 2, w / factor, h / factor], full, minWidth))
  }

  // ── direct manipulation ──────────────────────────────────────────────

  const paint = (run: FrameRun | undefined) => {
    if (frame.current !== null) return
    frame.current = requestAnimationFrame((now) => {
      frame.current = null
      svgRef.current?.setAttribute('viewBox', live.current.join(' '))
      if (run) {
        run.frames.push(now - run.last)
        run.last = now
      }
    })
  }
  const interrupt = () => {
    if (!cancel.current) return
    cancel.current()
    cancel.current = null
    target.current = live.current
    setAnimating(false)
  }
  const toGrid = (clientX: number, clientY: number): Point => {
    const rect = svgRef.current!.getBoundingClientRect()
    const [x, y, w, h] = live.current
    return { x: x + ((clientX - rect.left) / rect.width) * w, y: y + ((clientY - rect.top) / rect.height) * h }
  }
  const zoomAt = (at: Point, factor: number, run: FrameRun) => {
    const [x, y, w, h] = live.current
    live.current = clampBox([at.x - (at.x - x) / factor, at.y - (at.y - y) / factor, w / factor, h / factor], full, minWidth)
    paint(run)
  }
  const panBy = (dx: number, dy: number, run: FrameRun) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const [x, y, w, h] = live.current
    live.current = clampBox([x - (dx / rect.width) * w, y - (dy / rect.height) * h, w, h], full, minWidth)
    paint(run)
  }

  useEffect(() => {
    const svg = svgRef.current
    if (!enabled || !svg) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        setWheelHint(true)
        if (hintTimer.current) clearTimeout(hintTimer.current)
        hintTimer.current = setTimeout(() => setWheelHint(false), 1400)
        return
      }
      event.preventDefault()
      setWheelHint(false)
      interrupt()
      // One run of wheel events is one zoom: it settles 200 ms after the last.
      const run = wheel.current?.run ?? { frames: [], last: performance.now() }
      if (wheel.current) clearTimeout(wheel.current.timer)
      zoomAt(toGrid(event.clientX, event.clientY), Math.exp(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.0022)), run)
      wheel.current = {
        run,
        timer: setTimeout(() => {
          recordFrames('zoom cu rotița', run.frames.slice(1))
          wheel.current = null
          settle(live.current)
        }, 200),
      }
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
    // Everything the listener calls reads refs; it is attached once per map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, svgRef])

  useEffect(
    () => () => {
      cancel.current?.()
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      if (hintTimer.current) clearTimeout(hintTimer.current)
      if (wheel.current) clearTimeout(wheel.current.timer)
    },
    [],
  )

  /** A press: tracked only on a zoomed map, the only one a finger or a drag moves. */
  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    dragged.current = false
    if (!enabled || isFull(live.current)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    press.current ??= { moved: 0, captured: false, run: { frames: [], last: performance.now() } }
  }

  /** Moves the map under a drag or a pinch; true when it did, and the move is not a hover. */
  const onPointerMove = (event: PointerEvent<SVGSVGElement>): boolean => {
    const previous = pointers.current.get(event.pointerId)
    const current = press.current
    if (!previous || !current) return false
    const next = { x: event.clientX, y: event.clientY }
    pointers.current.set(event.pointerId, next)
    const dx = next.x - previous.x
    const dy = next.y - previous.y
    current.moved += Math.abs(dx) + Math.abs(dy)
    if (current.moved < DRAG_THRESHOLD) return false
    if (!current.captured) {
      // Captured only once it is a drag: a tap must still land on its UAT.
      event.currentTarget.setPointerCapture(event.pointerId)
      current.captured = true
      interrupt()
      setGesturing(true)
    }
    const other = [...pointers.current].find(([id]) => id !== event.pointerId)?.[1]
    if (other) {
      const before = Math.hypot(previous.x - other.x, previous.y - other.y)
      const after = Math.hypot(next.x - other.x, next.y - other.y)
      if (before > 0) zoomAt(toGrid((next.x + other.x) / 2, (next.y + other.y) / 2), after / before, current.run)
      panBy(dx / 2, dy / 2, current.run)
    } else {
      panBy(dx, dy, current.run)
    }
    return true
  }

  const onPointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.delete(event.pointerId) || pointers.current.size > 0) return
    const ended = press.current
    press.current = null
    if (!ended || ended.moved < DRAG_THRESHOLD) return
    dragged.current = true
    setGesturing(false)
    recordFrames('gest (tragere / ciupire)', ended.run.frames.slice(1))
    settle(live.current)
  }

  /** True once after a drag: the click that ends it opens nothing. */
  const consumeDrag = () => {
    const was = dragged.current
    dragged.current = false
    return was
  }

  return {
    box,
    /** Where the map is heading; equal to `box` at rest. */
    target,
    animating,
    gesturing,
    wheelHint,
    minWidth,
    isFull,
    zoomTo,
    zoomBy,
    consumeDrag,
    pointer: { onPointerDown, onPointerMove, onPointerEnd },
  }
}
