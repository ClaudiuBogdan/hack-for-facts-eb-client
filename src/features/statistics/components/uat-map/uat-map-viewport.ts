import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent, RefObject } from 'react'
import { clampBox, ease, interpolateBox, zoomAbout, type ViewBox } from './uat-map-view-box'

/** The closest the map goes: a sixteenth of the country's width. */
const MIN_WIDTH_SHARE = 1 / 16
/** Movement, in pixels, past which a press is a drag and no longer a tap. */
const DRAG_THRESHOLD = 6
/** A zoom by the buttons or to a county, start to end. */
const ANIMATION_MS = 360
/** A run of wheel events is one zoom: it settles this long after the last. */
const WHEEL_SETTLE_MS = 200

type Point = { readonly x: number; readonly y: number }

/**
 * The map's view box: zoomed by the buttons, by Ctrl/⌘ + wheel (a
 * trackpad's pinch arrives as one) and by two fingers; moved by a drag once
 * zoomed in. Every change is written to the `<svg>` directly, once per
 * frame; React hears the box only at rest (`box`), which is what it draws
 * names, strokes and the click's meaning from.
 *
 * Three boxes, so nothing snaps back: the one on screen (`live`), the one
 * the map is heading to (`target` — where the next +/− starts from), the one
 * at rest (`box`). A gesture takes the map from wherever it is.
 *
 * The page's own scroll is left alone: a plain wheel scrolls it (and
 * `wheelHint` says how to zoom); on the whole country one finger scrolls it
 * and two pinch the page, as the browser does — the map's own pinch starts
 * once it is zoomed in, by a button, a county or the wheel.
 */
export function useMapViewport({
  svgRef,
  full,
  initial = full,
  onWholeCountry,
  onGesture,
}: {
  readonly svgRef: RefObject<SVGSVGElement | null>
  readonly full: ViewBox
  /** Where the map opens: a county named in the address, or the whole country. */
  readonly initial?: ViewBox
  /** Called when the map comes to rest on the whole country, by any route. */
  readonly onWholeCountry: () => void
  /** Called as a drag, a pinch or the wheel moves the map: what was under the pointer no longer is. */
  readonly onGesture: () => void
}) {
  const minWidth = full[2] * MIN_WIDTH_SHARE
  const isFull = (box: ViewBox) => box[2] >= full[2] * 0.98
  const opening = clampBox(initial, full, minWidth)

  const [box, setBox] = useState<ViewBox>(opening)
  const [animating, setAnimating] = useState(false)
  const [gesturing, setGesturing] = useState(false)
  const [wheelHint, setWheelHint] = useState(false)
  const live = useRef<ViewBox>(opening)
  const target = useRef<ViewBox>(opening)
  const animation = useRef<number | null>(null)
  const frame = useRef<number | null>(null)
  const pointers = useRef(new Map<number, Point>())
  const press = useRef<{ moved: number } | null>(null)
  const dragged = useRef(false)
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const settle = (settled: ViewBox) => {
    if (animation.current !== null) cancelAnimationFrame(animation.current)
    if (wheelTimer.current) clearTimeout(wheelTimer.current)
    live.current = settled
    target.current = settled
    animation.current = null
    setBox(settled)
    setAnimating(false)
    if (isFull(settled)) onWholeCountry()
  }

  const stopAnimation = () => {
    if (animation.current === null) return
    cancelAnimationFrame(animation.current)
    animation.current = null
    target.current = live.current
    setAnimating(false)
  }

  /** Animates from where the map is on screen to `next`, kept within the map's limits; a second call mid-flight takes over from there. */
  const zoomTo = (to: ViewBox) => {
    const svg = svgRef.current
    if (!svg) return
    const next = clampBox(to, full, minWidth)
    if (animation.current !== null) cancelAnimationFrame(animation.current)
    // A wheel's run ends here: its settle must not land in the middle of this one.
    if (wheelTimer.current) clearTimeout(wheelTimer.current)
    target.current = next
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      svg.setAttribute('viewBox', next.join(' '))
      settle(next)
      return
    }
    setAnimating(true)
    const from = live.current
    const started = performance.now()
    const step = (now: number) => {
      // A frame's timestamp can precede the call that asked for it.
      const p = Math.min(1, Math.max(0, (now - started) / ANIMATION_MS))
      live.current = interpolateBox(from, next, ease(p))
      svg.setAttribute('viewBox', live.current.join(' '))
      if (p < 1) animation.current = requestAnimationFrame(step)
      else settle(next)
    }
    animation.current = requestAnimationFrame(step)
  }

  /** `factor` times closer (or farther), about the centre of where the map is heading. */
  const zoomBy = (factor: number) => {
    const [x, y, w, h] = target.current
    zoomTo(zoomAbout(target.current, { x: x + w / 2, y: y + h / 2 }, factor, full, minWidth))
  }

  // ── direct manipulation ──────────────────────────────────────────────

  const paint = () => {
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      svgRef.current?.setAttribute('viewBox', live.current.join(' '))
    })
  }
  const toGrid = (clientX: number, clientY: number): Point => {
    const rect = svgRef.current!.getBoundingClientRect()
    const [x, y, w, h] = live.current
    return { x: x + ((clientX - rect.left) / rect.width) * w, y: y + ((clientY - rect.top) / rect.height) * h }
  }
  const zoomAt = (at: Point, factor: number) => {
    live.current = zoomAbout(live.current, at, factor, full, minWidth)
    paint()
  }
  const panBy = (dx: number, dy: number) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const [x, y, w, h] = live.current
    live.current = clampBox([x - (dx / rect.width) * w, y - (dy / rect.height) * h, w, h], full, minWidth)
    paint()
  }

  // Ctrl/⌘ + wheel zooms; a plain wheel scrolls the page, with a hint. Always the latest state.
  const onWheel = useEffectEvent((event: WheelEvent) => {
    if (!event.ctrlKey && !event.metaKey) {
      setWheelHint(true)
      if (hintTimer.current) clearTimeout(hintTimer.current)
      hintTimer.current = setTimeout(() => setWheelHint(false), 1400)
      return
    }
    event.preventDefault()
    setWheelHint(false)
    stopAnimation()
    onGesture()
    zoomAt(toGrid(event.clientX, event.clientY), Math.exp(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.0022)))
    if (wheelTimer.current) clearTimeout(wheelTimer.current)
    wheelTimer.current = setTimeout(() => settle(live.current), WHEEL_SETTLE_MS)
  })

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const listener = (event: WheelEvent) => onWheel(event)
    svg.addEventListener('wheel', listener, { passive: false })
    return () => svg.removeEventListener('wheel', listener)
  }, [svgRef])

  useEffect(
    () => () => {
      for (const handle of [animation.current, frame.current]) if (handle !== null) cancelAnimationFrame(handle)
      for (const timer of [hintTimer.current, wheelTimer.current]) if (timer) clearTimeout(timer)
    },
    [],
  )

  /**
   * A press: tracked only on a zoomed map, the only one a finger or a drag
   * moves — and captured at once, so its release is heard even off the map.
   * The UAT a tap lands on is read from its coordinates, not its target.
   */
  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    dragged.current = false
    if (isFull(live.current)) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    press.current ??= { moved: 0 }
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
    const was = current.moved
    current.moved += Math.abs(dx) + Math.abs(dy)
    if (current.moved < DRAG_THRESHOLD) return false
    if (was < DRAG_THRESHOLD) {
      // Now a drag: whatever was moving the map stops, and what was under the pointer is let go.
      stopAnimation()
      if (wheelTimer.current) clearTimeout(wheelTimer.current)
      setGesturing(true)
      onGesture()
    }
    const other = [...pointers.current].find(([id]) => id !== event.pointerId)?.[1]
    if (other) {
      const before = Math.hypot(previous.x - other.x, previous.y - other.y)
      const after = Math.hypot(next.x - other.x, next.y - other.y)
      if (before > 0) zoomAt(toGrid((next.x + other.x) / 2, (next.y + other.y) / 2), after / before)
      panBy(dx / 2, dy / 2)
    } else {
      panBy(dx, dy)
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
    settle(live.current)
  }

  return {
    /** The box at rest. */
    box,
    animating,
    gesturing,
    wheelHint,
    isFull,
    /** Whether the map is on, or heading to, the whole country — what a click on it is for. */
    isHeadingFull: () => isFull(target.current),
    canZoomIn: animating || box[2] > minWidth * 1.01,
    canZoomOut: animating || !isFull(box),
    zoomTo,
    zoomBy,
    /** A point on screen, on the map's grid as the map is drawn this frame. */
    toGrid,
    /** True once after a drag: the click that ends it opens nothing. */
    consumeDrag: () => {
      const was = dragged.current
      dragged.current = false
      return was
    },
    pointer: { onPointerDown, onPointerMove, onPointerEnd },
  }
}

/**
 * Width of an element on screen, measured before the first paint and on
 * every resize: sizes that must hold in pixels (hatching, names)
 * are right from the first frame.
 */
export function useRenderedWidth(ref: RefObject<Element | null>): number | null {
  const [width, setWidth] = useState<number | null>(null)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    setWidth(node.getBoundingClientRect().width)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])
  return width
}
