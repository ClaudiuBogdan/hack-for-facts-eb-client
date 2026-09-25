import type { UatMapGeometry } from '../../lib/uat-map-snapshot'
import type { ViewBox } from './uat-map-view-box'

/** A point in pixels, relative to the map's frame. */
export interface FramePoint {
  readonly x: number
  readonly y: number
}

interface Size {
  readonly width: number
  readonly height: number
}

const GAP = 14
const EDGE = 4

/**
 * Where the tooltip's top-left corner goes: beside the anchor — to the
 * right, or to the left where the right has no room — held inside the frame.
 * Where neither side has room (a phone's map is barely wider than the box),
 * below it, centred and free to overhang the frame over the legend, which is
 * only read: never above, over the controls a finger needs next, and never
 * over what it describes.
 */
export function tooltipPosition({ anchor, size, frame }: { readonly anchor: FramePoint; readonly size: Size; readonly frame: Size }): FramePoint {
  const clamp = (value: number, max: number) => Math.min(Math.max(value, EDGE), Math.max(EDGE, max))
  const right = anchor.x + GAP
  const left = anchor.x - GAP - size.width
  if (right + size.width <= frame.width - EDGE || left >= EDGE) {
    const below = anchor.y + GAP
    return {
      x: right + size.width <= frame.width - EDGE ? right : left,
      y: clamp(below + size.height <= frame.height - EDGE ? below : anchor.y - GAP - size.height, frame.height - size.height - EDGE),
    }
  }
  return { x: clamp(anchor.x - size.width / 2, frame.width - size.width - EDGE), y: anchor.y + GAP }
}

/**
 * Where a UAT's label point is on screen, for a box that is not following
 * the pointer — or null where the map, zoomed or moved, no longer shows it:
 * a box pointing at nothing would sit over the list or the controls.
 */
export function uatAnchor(geometry: UatMapGeometry, index: number, box: ViewBox, frame: Size): FramePoint | null {
  const [x, y, w, h] = box
  const at = {
    x: ((geometry.labels[index * 3]! - x) / w) * frame.width,
    y: ((geometry.labels[index * 3 + 1]! - y) / h) * frame.height,
  }
  return at.x >= 0 && at.x <= frame.width && at.y >= 0 && at.y <= frame.height ? at : null
}
