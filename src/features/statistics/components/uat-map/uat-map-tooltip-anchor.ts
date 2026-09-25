import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { tooltipPosition, type FramePoint } from './uat-map-placement'

/**
 * The box and where it points: at the pointer (a mouse over the map), or at
 * a UAT (a row of the list hovered, a UAT held by a tap), which it follows as
 * the map zooms. Refs only: one object for the life of the map.
 */
export function useTooltipAnchor(frameRef: RefObject<HTMLElement | null>) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  /** Where the pointer is, while the box follows it; null while it points at a UAT. */
  const pointer = useRef<FramePoint | null>(null)

  return useMemo(() => {
    const frameSize = () => ({ width: frameRef.current?.clientWidth ?? 0, height: frameRef.current?.clientHeight ?? 0 })
    const placeAt = (anchor: FramePoint) => {
      const element = tooltipRef.current
      if (!element) return
      const { x, y } = tooltipPosition({ anchor, size: { width: element.offsetWidth, height: element.offsetHeight }, frame: frameSize() })
      element.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`
    }
    return {
      tooltipRef,
      frameSize,
      /** Follows the pointer: the box moves now, without a render. */
      followPointer: (clientX: number, clientY: number) => {
        const rect = frameRef.current?.getBoundingClientRect()
        if (!rect) return
        pointer.current = { x: clientX - rect.left, y: clientY - rect.top }
        placeAt(pointer.current)
      },
      /** Points at the UAT itself from now on. */
      followUat: () => {
        pointer.current = null
      },
      /** After every commit: at the pointer while following it, at `uat` otherwise — hidden while `uat` is out of view. */
      place: (uat: FramePoint | null) => {
        const anchor = pointer.current ?? uat
        if (tooltipRef.current) tooltipRef.current.style.visibility = anchor ? '' : 'hidden'
        if (anchor) placeAt(anchor)
      },
    }
  }, [frameRef])
}
