import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, RefObject } from 'react'
import { boxKeeping, clampBox, ease, gridPointAt, interpolateBox, zoomAbout, type MapPoint, type ScreenRect, type ViewBox } from './view-box'

/**
 * Pan and zoom for a map drawn in one surface (an `<svg>` with a `viewBox`, or
 * a canvas) inside an untransformed frame. Off unless `enabled`.
 *
 * **Drawing.** During a gesture the surface at rest is moved as a picture — a
 * GPU transform on a layer of its own — and the consumer draws the new `box`
 * once, at rest. Redrawing thousands of shapes per frame is what made zoom
 * stutter on phones (~2 s of raster per pinch on a throttled one).
 *
 * **Touch** comes from Touch Events: a pinch needs both fingers in one event,
 * and only a cancelled `touchmove` keeps the page from scrolling or zooming
 * under it. On the whole map one finger scrolls the page (`touch-action:
 * pan-y`) and two zoom the map; zoomed in, one finger pans. A gesture is
 * computed from where it started — the grid point between the fingers stays
 * between them — so no drift builds up. Only the fingers on the map count
 * (`targetTouches`): a thumb resting elsewhere on the screen is not a pinch.
 *
 * **Mouse**: Ctrl/⌘ + wheel (a trackpad pinch arrives as one) zooms about the
 * pointer; a plain wheel scrolls the page and raises `wheelHint`; a drag pans
 * once zoomed. Safari's trackpad pinch arrives as gesture events, handled the
 * same way. No double tap or double click: on the maps this serves, a click or
 * a second tap opens the place under it.
 *
 * Every position is measured on the frame, never on the surface, which is
 * transformed while it moves. One owner moves the map at a time (`takeOver`):
 * a drag, a pinch, a wheel's run or an animation, each stopping the one before
 * and settling when it ends, by any route (fingers lifted in any order, a
 * release off the map). A press that has not moved owns nothing, so a tap or a
 * click never freezes an animation halfway.
 */

const MIN_WIDTH_SHARE = 1 / 24
const DRAG_THRESHOLD = 8
const ANIMATION_MS = 320
const WHEEL_SETTLE_MS = 160
const WHEEL_HINT_MS = 1400

type Motion = 'idle' | 'animating' | 'gesturing'

type TouchGesture =
  | { readonly mode: 'idle' }
  /** One finger on the whole map: the page's scroll, or a tap. */
  | { readonly mode: 'tap'; readonly start: MapPoint; moved: number }
  | { readonly mode: 'pan'; readonly start: MapPoint; readonly startBox: ViewBox; readonly rect: ScreenRect; moved: number }
  | { readonly mode: 'pinch'; readonly anchor: MapPoint; readonly distance: number; readonly startBox: ViewBox; readonly rect: ScreenRect }

const midpoint = (a: Touch, b: Touch): MapPoint => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 })
const spread = (a: Touch, b: Touch) => Math.max(1, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY))

const SURFACE_STYLE: CSSProperties = { willChange: 'transform', transformOrigin: '0 0' }

export interface SvgMapZoom {
  /** The box at rest: what the surface draws. */
  readonly box: ViewBox
  /** Moving by an animation (the buttons, a county) or by a gesture. */
  readonly animating: boolean
  readonly gesturing: boolean
  /** A plain wheel turned over the map: say that Ctrl/⌘ zooms. */
  readonly wheelHint: boolean
  readonly isFull: (box: ViewBox) => boolean
  /** Whether the map is on, or heading to, the whole map. */
  readonly isHeadingFull: () => boolean
  readonly canZoomIn: boolean
  readonly canZoomOut: boolean
  readonly zoomTo: (box: ViewBox) => void
  /** `factor` times closer (under 1: farther), about the centre of where the map is heading. */
  readonly zoomBy: (factor: number) => void
  /** A screen point on the map's grid, as the map is shown this frame. */
  readonly toGrid: (clientX: number, clientY: number) => MapPoint
  /** True once after a drag, a pinch or a double tap: the click that ends it opens nothing. */
  readonly consumeDrag: () => boolean
  /** For the surface: the mouse. Touch is heard on the frame. */
  readonly pointer: {
    readonly onPointerDown: (event: PointerEvent) => void
    /** True when the move was the map's (a drag), not a hover. */
    readonly onPointerMove: (event: PointerEvent) => boolean
    readonly onPointerEnd: (event: PointerEvent) => void
  }
  /** Spread on the frame. */
  readonly frameProps: { readonly style?: CSSProperties }
  /** Set on the surface: it is moved as a picture. */
  readonly surfaceStyle?: CSSProperties
}

export function useSvgMapZoom({
  frameRef,
  surfaceRef,
  full,
  initial = full,
  enabled = true,
  onWholeCountry,
  onGesture,
}: {
  /** The untransformed box the surface fills: listened on and measured. */
  readonly frameRef: RefObject<HTMLElement | null>
  /** The drawing, moved as a picture during a gesture. */
  readonly surfaceRef: RefObject<Element | null>
  readonly full: ViewBox
  /** Where the map opens. */
  readonly initial?: ViewBox
  readonly enabled?: boolean
  /** The map came to rest on the whole map, by any route. */
  readonly onWholeCountry?: () => void
  /** A gesture started moving the map: what was under the pointer no longer is. */
  readonly onGesture?: () => void
}): SvgMapZoom {
  const minWidth = full[2] * MIN_WIDTH_SHARE
  const isFull = (box: ViewBox) => box[2] >= full[2] * 0.98
  const opening = clampBox(initial, full, minWidth)

  const [box, setBox] = useState<ViewBox>(opening)
  const [motion, setMotion] = useState<Motion>('idle')
  const [wheelHint, setWheelHint] = useState(false)
  /** On screen this frame. */
  const live = useRef<ViewBox>(opening)
  /** Where the map is heading: an animation's end, else `live`. */
  const target = useRef<ViewBox>(opening)
  /** What the surface last drew: the picture a gesture moves. */
  const drawn = useRef<ViewBox>(opening)
  const unsettled = useRef(false)
  const dragged = useRef(false)
  const frame = useRef<number | null>(null)
  const animation = useRef<number | null>(null)
  const touch = useRef<TouchGesture>({ mode: 'idle' })
  const mouse = useRef<{ start: MapPoint; last: MapPoint; moved: number } | null>(null)
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── drawing: the picture moves; the box is drawn at rest ──────────────
  const move = () => {
    const surface = surfaceRef.current as HTMLElement | SVGElement | null
    const width = frameRef.current?.clientWidth
    if (!surface || !width) return
    const rest = drawn.current
    const now = live.current
    const k = width / now[2]
    surface.style.transform = `translate3d(${(rest[0] - now[0]) * k}px, ${(rest[1] - now[1]) * k}px, 0) scale(${rest[2] / now[2]})`
  }
  const schedule = () => {
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      move()
    })
  }
  // At rest the surface draws the new box and the picture is let go, in the same commit.
  useLayoutEffect(() => {
    if (motion !== 'idle') return
    drawn.current = box
    const surface = surfaceRef.current as HTMLElement | SVGElement | null
    if (surface) surface.style.transform = ''
  }, [box, motion, surfaceRef])

  /** The current motion, for handlers between renders. */
  const motionNow = useRef<Motion>('idle')
  const setMotionNow = (next: Motion) => {
    motionNow.current = next
    setMotion(next)
  }
  const clearWheelTimer = () => {
    if (wheelTimer.current) clearTimeout(wheelTimer.current)
    wheelTimer.current = null
  }
  const stopAnimation = () => {
    if (animation.current === null) return
    cancelAnimationFrame(animation.current)
    animation.current = null
  }
  /**
   * A new owner of the map's movement. One at a time: whoever owned it — an
   * animation, a wheel's run waiting to settle — stops, and the new owner
   * settles when it ends. Called on every frame of a gesture, so an owner that
   * lost the map to another gets it back.
   */
  const takeOver = (cause: Exclude<Motion, 'idle'>) => {
    clearWheelTimer()
    stopAnimation()
    if (cause === 'gesturing' && motionNow.current !== 'gesturing') onGesture?.()
    unsettled.current = true
    if (motionNow.current !== cause) setMotionNow(cause)
  }
  const settle = () => {
    unsettled.current = false
    clearWheelTimer()
    stopAnimation()
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    target.current = live.current
    setBox(live.current)
    setMotionNow('idle')
    if (isFull(live.current)) onWholeCountry?.()
  }
  /** A press let go: settle unless an animation or a wheel's timer is still carrying the map. */
  const settleIfLeft = () => {
    if (unsettled.current && animation.current === null && wheelTimer.current === null) settle()
  }

  const frameRect = (): ScreenRect => frameRef.current?.getBoundingClientRect() ?? { left: 0, top: 0, width: 1, height: 1 }
  const toGrid = (clientX: number, clientY: number) => gridPointAt(live.current, frameRect(), { x: clientX, y: clientY })

  const zoomTo = (to: ViewBox) => {
    const from = live.current
    const next = clampBox(to, full, minWidth)
    takeOver('animating')
    target.current = next
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      live.current = next
      settle()
      return
    }
    const started = performance.now()
    const step = (now: number) => {
      // A frame's timestamp can precede the call that asked for it.
      const k = Math.min(1, Math.max(0, (now - started) / ANIMATION_MS))
      live.current = interpolateBox(from, next, ease(k))
      move()
      if (k < 1) animation.current = requestAnimationFrame(step)
      else {
        animation.current = null
        settle()
      }
    }
    animation.current = requestAnimationFrame(step)
  }
  /** Where the map is heading: an animation's end while one runs, else where it is. */
  const heading = () => (animation.current !== null ? target.current : live.current)
  const zoomBy = (factor: number) => {
    const from = heading()
    zoomTo(zoomAbout(from, { x: from[0] + from[2] / 2, y: from[1] + from[3] / 2 }, factor, full, minWidth))
  }

  // ── touch: only the fingers on the map (`targetTouches`) ──────────────
  const beginPinch = (a: Touch, b: Touch) => {
    const rect = frameRect()
    takeOver('gesturing')
    touch.current = { mode: 'pinch', anchor: gridPointAt(live.current, rect, midpoint(a, b)), distance: spread(a, b), startBox: live.current, rect }
    dragged.current = true
  }
  /** One finger: on the whole map a tap or the page's scroll; zoomed in, a pan once it moves. */
  const beginOneFinger = (finger: Touch, moved = 0) => {
    const start = { x: finger.clientX, y: finger.clientY }
    touch.current = isFull(heading()) ? { mode: 'tap', start, moved } : { mode: 'pan', start, startBox: live.current, rect: frameRect(), moved }
  }

  const onTouchStart = useEffectEvent((event: TouchEvent) => {
    const fingers = event.targetTouches
    if (fingers.length >= 2) {
      // The page must not scroll or zoom under a pinch.
      if (event.cancelable) event.preventDefault()
      beginPinch(fingers[0]!, fingers[1]!)
      return
    }
    // A press alone leaves an animation running: a tap must not freeze it halfway.
    dragged.current = false
    if (fingers[0]) beginOneFinger(fingers[0])
  })

  const onTouchMove = useEffectEvent((event: TouchEvent) => {
    const gesture = touch.current
    const fingers = event.targetTouches
    if (gesture.mode === 'pinch' && fingers.length >= 2) {
      if (event.cancelable) event.preventDefault()
      takeOver('gesturing')
      const [a, b] = [fingers[0]!, fingers[1]!]
      live.current = boxKeeping(gesture.anchor, midpoint(a, b), (gesture.startBox[2] * gesture.distance) / spread(a, b), gesture.rect, full, minWidth)
      schedule()
      return
    }
    const finger = fingers[0]
    if (!finger) return
    if (gesture.mode === 'pan') {
      if (event.cancelable) event.preventDefault()
      const moved = Math.hypot(finger.clientX - gesture.start.x, finger.clientY - gesture.start.y)
      if (!dragged.current) {
        if (Math.max(gesture.moved, moved) < DRAG_THRESHOLD) return
        // Now a pan: it owns the map from where it is this frame.
        dragged.current = true
        touch.current = { ...gesture, start: { x: finger.clientX, y: finger.clientY }, startBox: live.current, moved: DRAG_THRESHOLD }
        takeOver('gesturing')
        return
      }
      takeOver('gesturing')
      const unit = gesture.startBox[2] / gesture.rect.width
      const dx = finger.clientX - gesture.start.x
      const dy = finger.clientY - gesture.start.y
      live.current = clampBox([gesture.startBox[0] - dx * unit, gesture.startBox[1] - dy * unit, gesture.startBox[2], gesture.startBox[3]], full, minWidth)
      schedule()
    } else if (gesture.mode === 'tap') {
      // The page is scrolling: not a tap.
      gesture.moved = Math.max(gesture.moved, Math.hypot(finger.clientX - gesture.start.x, finger.clientY - gesture.start.y))
    }
  })

  const onTouchEnd = useEffectEvent((event: TouchEvent) => {
    const gesture = touch.current
    const fingers = event.targetTouches
    if (fingers.length >= 2) {
      beginPinch(fingers[0]!, fingers[1]!)
      return
    }
    if (fingers.length === 1) {
      // From a pinch to a pan with the finger left, from where the map is now.
      if (gesture.mode === 'pinch') {
        beginOneFinger(fingers[0]!, DRAG_THRESHOLD)
        if (touch.current.mode === 'pan') dragged.current = true
      }
      return
    }
    touch.current = { mode: 'idle' }
    // Whatever moved the map — this gesture, or one it interrupted — ends here; a running animation ends itself.
    settleIfLeft()
  })

  // ── Safari's trackpad pinch: gesture events, not Ctrl + wheel ─────────
  type SafariGesture = Event & { readonly scale: number; readonly clientX: number; readonly clientY: number }
  const safari = useRef<{ anchor: MapPoint; startBox: ViewBox; rect: ScreenRect } | null>(null)
  const onGestureStart = useEffectEvent((event: SafariGesture) => {
    event.preventDefault()
    // On iOS the same pinch arrives as touches, which own it.
    if (touch.current.mode !== 'idle') return
    const rect = frameRect()
    takeOver('gesturing')
    safari.current = { anchor: gridPointAt(live.current, rect, { x: event.clientX, y: event.clientY }), startBox: live.current, rect }
  })
  const onGestureChange = useEffectEvent((event: SafariGesture) => {
    event.preventDefault()
    const gesture = safari.current
    if (!gesture || !(event.scale > 0)) return
    takeOver('gesturing')
    live.current = boxKeeping(gesture.anchor, { x: event.clientX, y: event.clientY }, gesture.startBox[2] / event.scale, gesture.rect, full, minWidth)
    schedule()
  })
  const onGestureEnd = useEffectEvent((event: SafariGesture) => {
    event.preventDefault()
    if (!safari.current) return
    safari.current = null
    settleIfLeft()
  })

  // ── wheel: the grid point under the pointer stays under it ─────────────
  const onWheel = useEffectEvent((event: WheelEvent) => {
    if (!event.ctrlKey && !event.metaKey) {
      setWheelHint(true)
      if (hintTimer.current) clearTimeout(hintTimer.current)
      hintTimer.current = setTimeout(() => setWheelHint(false), WHEEL_HINT_MS)
      return
    }
    event.preventDefault()
    // A Safari pinch already moves the map; its synthetic wheel would move it twice.
    if (safari.current) return
    setWheelHint(false)
    takeOver('gesturing')
    const rect = frameRect()
    const at = { x: event.clientX, y: event.clientY }
    // Pixels, lines (Firefox's wheel) and pages are different steps. A trackpad
    // pinch arrives as Ctrl + small fractional deltas; Cmd/Ctrl + a wheel or a
    // two-finger scroll as larger ones. ~1.4× a wheel notch; never 2× an event.
    const pixels = event.deltaMode === 1 ? event.deltaY * 20 : event.deltaMode === 2 ? event.deltaY * rect.height : event.deltaY
    const pinch = event.ctrlKey && !event.metaKey && event.deltaMode === 0 && Math.abs(event.deltaY) < 50
    const factor = 2 ** Math.max(-1, Math.min(1, pixels * (pinch ? 0.02 : 0.005)))
    live.current = boxKeeping(gridPointAt(live.current, rect, at), at, live.current[2] * factor, rect, full, minWidth)
    schedule()
    // A run of wheel events is one zoom: it settles this long after the last.
    wheelTimer.current = setTimeout(settle, WHEEL_SETTLE_MS)
  })

  useEffect(() => {
    const element = frameRef.current
    if (!enabled || !element) return
    const options = { passive: false }
    const listeners: readonly (readonly [string, (event: never) => void])[] = [
      ['touchstart', (event: TouchEvent) => onTouchStart(event)],
      ['touchmove', (event: TouchEvent) => onTouchMove(event)],
      ['touchend', (event: TouchEvent) => onTouchEnd(event)],
      ['touchcancel', (event: TouchEvent) => onTouchEnd(event)],
      ['wheel', (event: WheelEvent) => onWheel(event)],
      ['gesturestart', (event: SafariGesture) => onGestureStart(event)],
      ['gesturechange', (event: SafariGesture) => onGestureChange(event)],
      ['gestureend', (event: SafariGesture) => onGestureEnd(event)],
    ]
    for (const [type, listener] of listeners) element.addEventListener(type, listener as EventListener, options)
    return () => {
      for (const [type, listener] of listeners) element.removeEventListener(type, listener as EventListener)
    }
  }, [enabled, frameRef])

  useEffect(
    () => () => {
      for (const handle of [animation.current, frame.current]) if (handle !== null) cancelAnimationFrame(handle)
      for (const timer of [hintTimer.current, wheelTimer.current]) if (timer) clearTimeout(timer)
    },
    [],
  )

  // ── mouse (touch is handled above) ─────────────────────────────────────
  const pointer = {
    onPointerDown: (event: PointerEvent) => {
      if (!enabled || event.pointerType !== 'mouse' || event.button !== 0) return
      // A press alone leaves an animation running: a click must not freeze it halfway.
      dragged.current = false
      const at = { x: event.clientX, y: event.clientY }
      mouse.current = { start: at, last: at, moved: 0 }
    },
    onPointerMove: (event: PointerEvent): boolean => {
      const press = mouse.current
      if (!enabled || event.pointerType !== 'mouse' || !press || event.buttons === 0) return false
      const at = { x: event.clientX, y: event.clientY }
      press.moved = Math.max(press.moved, Math.hypot(at.x - press.start.x, at.y - press.start.y))
      if (!dragged.current && (press.moved < DRAG_THRESHOLD || isFull(heading()))) {
        press.last = at
        return false
      }
      if (!dragged.current) {
        // Now a drag: captured, so its release is heard even off the map.
        ;(event.currentTarget as Element).setPointerCapture?.(event.pointerId)
        dragged.current = true
      }
      takeOver('gesturing')
      const unit = live.current[2] / frameRect().width
      live.current = clampBox([live.current[0] - (at.x - press.last.x) * unit, live.current[1] - (at.y - press.last.y) * unit, live.current[2], live.current[3]], full, minWidth)
      press.last = at
      schedule()
      return true
    },
    onPointerEnd: (event: PointerEvent) => {
      if (!enabled || event.pointerType !== 'mouse') return
      mouse.current = null
      settleIfLeft()
    },
  }

  return {
    box,
    animating: motion === 'animating',
    gesturing: motion === 'gesturing',
    wheelHint,
    isFull,
    isHeadingFull: () => isFull(heading()),
    canZoomIn: motion !== 'idle' || box[2] > minWidth * 1.01,
    canZoomOut: motion !== 'idle' || !isFull(box),
    zoomTo,
    zoomBy,
    toGrid,
    consumeDrag: () => {
      const was = dragged.current
      dragged.current = false
      return was
    },
    pointer,
    frameProps: enabled ? { style: { touchAction: isFull(box) && motion === 'idle' ? 'pan-y' : 'none' } } : {},
    surfaceStyle: enabled ? SURFACE_STYLE : undefined,
  }
}
