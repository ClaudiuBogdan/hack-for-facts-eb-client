import type { UatMapGeometry } from '@/features/statistics/lib/uat-map-snapshot'
import type { ViewBox } from '@/components/maps/svg-zoom/view-box'

/**
 * What the map names, by how close the reader is — the same on every map of
 * the picker:
 *
 * - `county`  the whole country: county names, one per county;
 * - `uat`     closer: the names of the UATs that have room;
 * - `value`   closer still: each UAT's name over its figure, with the unit.
 *
 * The level follows the country's width on screen, not the zoom factor, so a
 * phone and a desktop name the same things at the same size. Everything here
 * is pure: the renderers (SVG, canvas) draw what it returns.
 */

export type LabelLevel = 'county' | 'uat' | 'value'

/** Country width on screen, in CSS px, from which each level starts. */
export const UAT_FROM_PX = 1400
export const VALUE_FROM_PX = 3600

export function labelLevel(countryWidthPx: number): LabelLevel {
  if (countryWidthPx >= VALUE_FROM_PX) return 'value'
  if (countryWidthPx >= UAT_FROM_PX) return 'uat'
  return 'county'
}

/** The type of each line, which the renderers style. */
export type LabelRole = 'county' | 'name' | 'value'

export interface LabelType {
  /** CSS px. */
  readonly size: number
  readonly weight: number
  /** The theme token the text is filled with. */
  readonly color: 'foreground' | 'muted-foreground'
  /** Letter spacing, as a share of the size. */
  readonly tracking: number
  /** A glyph's average width as a share of the size: what keeps two labels apart. */
  readonly glyph: number
}

/** One definition for both surfaces: the SVG sets these as attributes, the canvas as its font. */
export const LABEL_TYPE: Readonly<Record<LabelRole, LabelType>> = {
  county: { size: 10, weight: 600, color: 'muted-foreground', tracking: 0.08, glyph: 0.8 },
  name: { size: 11, weight: 500, color: 'foreground', tracking: 0, glyph: 0.58 },
  value: { size: 10, weight: 400, color: 'foreground', tracking: 0, glyph: 0.6 },
}
/** Distance between the baselines of a two-line label, in CSS px. */
export const LINE_PX = 12

export interface LabelLine {
  readonly text: string
  readonly role: LabelRole
}

export interface MapLabel {
  readonly key: string
  /** On the map's grid. */
  readonly x: number
  readonly y: number
  readonly lines: readonly LabelLine[]
  /** The UAT it names, for emphasis when it is the one held; null for a county. */
  readonly uat: number | null
}

/** Vertical offset of line `i` of `count`, in CSS px from the label's point: the block is centred on it. */
export function lineOffset(i: number, count: number): number {
  return (i - (count - 1) / 2) * LINE_PX
}

export interface CountyAnchor {
  readonly code: string
  /** A point inside the county: its member UAT label point nearest the members' centre. */
  readonly x: number
  readonly y: number
  /** Roughly its area: placement goes largest first. */
  readonly weight: number
}

/**
 * One label point per county. The centre of the member UATs' label points,
 * weighted by their room (squared, an area), can fall outside a bent county;
 * the member label point nearest it cannot.
 */
export function countyAnchors(geometry: UatMapGeometry): readonly CountyAnchor[] {
  const sums = new Map<string, { x: number; y: number; w: number; members: number[] }>()
  geometry.county.forEach((code, i) => {
    const room = geometry.labels[i * 3 + 2]!
    const w = room * room
    const entry = sums.get(code) ?? { x: 0, y: 0, w: 0, members: [] }
    entry.x += geometry.labels[i * 3]! * w
    entry.y += geometry.labels[i * 3 + 1]! * w
    entry.w += w
    entry.members.push(i)
    sums.set(code, entry)
  })
  return [...sums.entries()].map(([code, { x, y, w, members }]) => {
    const cx = x / w
    const cy = y / w
    let best = members[0]!
    let bestDistance = Infinity
    for (const i of members) {
      const d = (geometry.labels[i * 3]! - cx) ** 2 + (geometry.labels[i * 3 + 1]! - cy) ** 2
      if (d < bestDistance) [best, bestDistance] = [i, d]
    }
    return { code, x: geometry.labels[best * 3]!, y: geometry.labels[best * 3 + 1]!, weight: w }
  })
}

/** A UAT needs this much room around its label point, on screen, to be named; twice as much for two lines. */
const MIN_ROOM_PX = 9
const MIN_ROOM_TWO_LINES_PX = 13
const MAX_LABELS = 250

const textWidth = (line: LabelLine) => line.text.length * LABEL_TYPE[line.role].size * LABEL_TYPE[line.role].glyph

export function placeLabels({
  geometry,
  counties,
  box,
  pxPerUnit,
  level,
  countyName,
  valueText,
}: {
  readonly geometry: UatMapGeometry
  readonly counties: readonly CountyAnchor[]
  readonly box: ViewBox
  /** CSS px per grid unit at `box`. */
  readonly pxPerUnit: number
  readonly level: LabelLevel
  /** A county's name, and its short form for when the name is wider than the county. */
  readonly countyName: (code: string) => { readonly name: string; readonly short: string }
  /** A UAT's figure with its unit, or null where it has none. */
  readonly valueText: (index: number) => string | null
}): readonly MapLabel[] {
  const [bx, by, bw, bh] = box
  const inView = (x: number, y: number) => x >= bx && x <= bx + bw && y >= by && y <= by + bh

  type Candidate = { readonly key: string; readonly x: number; readonly y: number; readonly priority: number; readonly uat: number | null; readonly lines: () => readonly LabelLine[] }
  const candidates: Candidate[] = []

  if (level === 'county') {
    for (const anchor of counties) {
      if (!inView(anchor.x, anchor.y)) continue
      candidates.push({
        key: `county-${anchor.code}`,
        x: anchor.x,
        y: anchor.y,
        priority: anchor.weight,
        uat: null,
        lines: () => {
          const { name, short } = countyName(anchor.code)
          const bounds = geometry.counties[anchor.code]
          const countyPx = bounds ? (bounds[2] - bounds[0]) * pxPerUnit : Infinity
          const full = { text: name.toLocaleUpperCase('ro-RO'), role: 'county' as const }
          return [textWidth(full) <= countyPx ? full : { text: short, role: 'county' as const }]
        },
      })
    }
  } else {
    for (let i = 0; i < geometry.siruta.length; i += 1) {
      const x = geometry.labels[i * 3]!
      const y = geometry.labels[i * 3 + 1]!
      const room = geometry.labels[i * 3 + 2]! * pxPerUnit
      if (room < MIN_ROOM_PX || !inView(x, y)) continue
      candidates.push({
        key: `uat-${i}`,
        x,
        y,
        priority: room,
        uat: i,
        lines: () => {
          const name = { text: geometry.name[i]!, role: 'name' as const }
          const value = level === 'value' && room >= MIN_ROOM_TWO_LINES_PX ? valueText(i) : null
          return value === null ? [name] : [name, { text: value, role: 'value' as const }]
        },
      })
    }
  }

  candidates.sort((a, b) => b.priority - a.priority)
  const placed: { x0: number; x1: number; y0: number; y1: number }[] = []
  const out: MapLabel[] = []
  for (const candidate of candidates) {
    const lines = candidate.lines()
    const sx = (candidate.x - bx) * pxPerUnit
    const sy = (candidate.y - by) * pxPerUnit
    const halfW = Math.max(...lines.map(textWidth)) / 2 + 3
    const halfH = (lines.length * LINE_PX) / 2 + 1
    const rect = { x0: sx - halfW, x1: sx + halfW, y0: sy - halfH, y1: sy + halfH }
    if (placed.some((p) => p.x0 < rect.x1 && rect.x0 < p.x1 && p.y0 < rect.y1 && rect.y0 < p.y1)) continue
    placed.push(rect)
    out.push({ key: candidate.key, x: candidate.x, y: candidate.y, lines, uat: candidate.uat })
    if (out.length >= MAX_LABELS) break
  }
  return out
}
