import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, RefObject } from 'react'

/**
 * Moving a minimised window around the space it was minimised into.
 *
 * Hand-rolled over `motion`, which is already a dependency and whose `drag` and
 * `dragConstraints` are this feature exactly. The reason is weight, measured
 * rather than assumed: importing the `motion` component proxy costs 41 KB
 * gzipped, and neither of the landing's two feature cards pulls it today, so
 * all of it would be new. `LazyMotion` does not help — it moves 37.9 KB of that
 * behind a dynamic import that resolves the instant the icon mounts, which is
 * the interaction being built. This module is about a kilobyte, and the page it
 * is on is the one whose entire job is arriving quickly.
 *
 * The pointer handling follows `home-refs.footer-scene.tsx`, which does the same
 * capture dance a few hundred lines away.
 */

/** Under this, the pointer was pressing rather than dragging. */
const DRAG_THRESHOLD_PX = 4

/** One arrow key: a quarter of the icon, so a nudge reads as a nudge. */
const NUDGE_PX = 16

type Offset = { readonly x: number; readonly y: number }

const ORIGIN: Offset = { x: 0, y: 0 }

const ARROWS: Readonly<Record<string, Offset | undefined>> = {
  ArrowLeft: { x: -NUDGE_PX, y: 0 },
  ArrowRight: { x: NUDGE_PX, y: 0 },
  ArrowUp: { x: 0, y: -NUDGE_PX },
  ArrowDown: { x: 0, y: NUDGE_PX },
}

/**
 * The nearest offset that keeps the handle inside the bounds.
 *
 * The handle rests at the bottom right corner of the bounds, so every legal
 * offset is negative: zero is home and the far corner is the box minus the
 * handle. That is the whole of the arithmetic, and it is why this reads the
 * layout box — `offsetWidth` and `clientWidth` — rather than a client rect. A
 * rect carries the transform, and this handle has two: the offset being
 * computed here, and the scale its entrance animates through.
 */
function clampToBounds({
  offset,
  handle,
  bounds,
}: {
  readonly offset: Offset
  readonly handle: HTMLElement
  readonly bounds: HTMLElement
}): Offset {
  const spanX = Math.max(0, bounds.clientWidth - handle.offsetWidth)
  const spanY = Math.max(0, bounds.clientHeight - handle.offsetHeight)
  return {
    x: Math.min(0, Math.max(-spanX, offset.x)),
    y: Math.min(0, Math.max(-spanY, offset.y)),
  }
}

export function useDockDrag<THandle extends HTMLElement, TBounds extends HTMLElement>({
  handleRef,
  boundsRef,
}: {
  readonly handleRef: RefObject<THandle | null>
  readonly boundsRef: RefObject<TBounds | null>
}) {
  const [offset, setOffset] = useState<Offset>(ORIGIN)
  const [isDragging, setIsDragging] = useState(false)
  const pointerRef = useRef<number | undefined>(undefined)
  /*
   * Whether the gesture that is ending moved far enough to have been a drag.
   *
   * A press and a drag both end in a click, and only one of them means the
   * button. Cleared on every 'pointerdown' and every 'keydown', so it can only
   * ever describe the gesture in progress: cleared on 'pointerdown' alone, a
   * keyboard Enter after a drag would be swallowed by the drag before it.
   */
  const draggedRef = useRef(false)
  const grabRef = useRef({ pointerX: 0, pointerY: 0, x: 0, y: 0 })

  /*
   * A narrower window has a shorter hero, and an offset measured against the
   * old one can leave the icon outside the column or under the fold.
   */
  useEffect(() => {
    const bounds = boundsRef.current
    if (bounds === null) return
    const observer = new ResizeObserver(() => {
      const handle = handleRef.current
      if (handle === null) return
      setOffset((current) => {
        const next = clampToBounds({ offset: current, handle, bounds })
        return next.x === current.x && next.y === current.y ? current : next
      })
    })
    observer.observe(bounds)
    return () => observer.disconnect()
  }, [boundsRef, handleRef])

  const move = (next: Offset) => {
    const handle = handleRef.current
    const bounds = boundsRef.current
    if (handle === null || bounds === null) return
    setOffset(clampToBounds({ offset: next, handle, bounds }))
  }

  const onPointerDown = (event: PointerEvent<THandle>) => {
    // Left button only: a right click is the context menu, and a middle click
    // on a control that is not a link is nothing at all.
    if (event.button !== 0) return
    draggedRef.current = false
    pointerRef.current = event.pointerId
    grabRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: offset.x,
      y: offset.y,
    }
    // Captured, so the drag survives the pointer leaving the icon — which it
    // does immediately, since the icon is 56px and the box is the hero.
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
  }

  const onPointerMove = (event: PointerEvent<THandle>) => {
    if (pointerRef.current !== event.pointerId) return
    const dx = event.clientX - grabRef.current.pointerX
    const dy = event.clientY - grabRef.current.pointerY
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) draggedRef.current = true
    move({ x: grabRef.current.x + dx, y: grabRef.current.y + dy })
  }

  /*
   * Also the handler for 'pointercancel' and for losing capture, which are the
   * two ways a drag ends without a 'pointerup' — and both leave the icon where
   * it had got to, because a gesture the system interrupted is not a gesture
   * the reader took back.
   */
  const onPointerUp = (event: PointerEvent<THandle>) => {
    if (pointerRef.current !== event.pointerId) return
    pointerRef.current = undefined
    setIsDragging(false)
  }

  const onKeyDown = (event: KeyboardEvent<THandle>) => {
    draggedRef.current = false
    const step = ARROWS[event.key]
    if (step === undefined) return
    // Otherwise the arrow scrolls the page as well as moving the icon.
    event.preventDefault()
    move({ x: offset.x + step.x, y: offset.y + step.y })
  }

  return {
    offset,
    isDragging,
    /** True when the click that is arriving is the end of a drag. */
    wasDragged: () => draggedRef.current,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onLostPointerCapture: onPointerUp,
      onKeyDown,
    },
  }
}
