import type { UatMapGeometry } from '../../lib/uat-map-snapshot'
import type { ViewBox } from './uat-map-view-box'

/** A UAT's name where it is drawn, zoomed in. */
export interface UatLabel {
  readonly index: number
  readonly x: number
  readonly y: number
  readonly text: string
}

/** The names' size on screen, whatever the zoom. */
export const LABEL_PX = 11
/** An average glyph's width in the map's font, as a share of its size: enough to keep two names apart. */
const GLYPH_WIDTH = 0.29
/** A name needs this much room around its point, on screen, to be drawn at all. */
const MIN_ROOM_PX = 9

/**
 * The names that fit: in view, with room around their point, largest room
 * first, none overlapping another.
 */
export function visibleLabels(
  geometry: UatMapGeometry,
  box: ViewBox,
  pxPerUnit: number,
  options: { readonly only?: (index: number) => boolean; readonly max?: number } = {},
): readonly UatLabel[] {
  const [bx, by, bw, bh] = box
  const candidates: { index: number; x: number; y: number; room: number }[] = []
  for (let i = 0; i < geometry.siruta.length; i += 1) {
    if (options.only && !options.only(i)) continue
    const x = geometry.labels[i * 3]!
    const y = geometry.labels[i * 3 + 1]!
    const room = geometry.labels[i * 3 + 2]! * pxPerUnit
    if (x < bx || x > bx + bw || y < by || y > by + bh || room < MIN_ROOM_PX) continue
    candidates.push({ index: i, x, y, room })
  }
  candidates.sort((a, b) => b.room - a.room)
  const placed: { x0: number; x1: number; y0: number; y1: number }[] = []
  const out: UatLabel[] = []
  for (const candidate of candidates) {
    const text = geometry.name[candidate.index]!
    const halfW = (text.length * LABEL_PX * GLYPH_WIDTH + 3) / pxPerUnit
    const halfH = 8 / pxPerUnit
    const rect = { x0: candidate.x - halfW, x1: candidate.x + halfW, y0: candidate.y - halfH, y1: candidate.y + halfH }
    if (placed.some((p) => p.x0 < rect.x1 && rect.x0 < p.x1 && p.y0 < rect.y1 && rect.y0 < p.y1)) continue
    placed.push(rect)
    out.push({ index: candidate.index, x: candidate.x, y: candidate.y, text })
    if (options.max && out.length >= options.max) break
  }
  return out
}
