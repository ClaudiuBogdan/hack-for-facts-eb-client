import type { UatMapGeometry } from '@/features/statistics/lib/uat-map-snapshot'
import type { ViewBox } from '@/components/maps/svg-zoom/view-box'
import { NO_DATA_COLOR, type MeasureScale } from './budget-map.data'
import type { MapLabel } from './budget-map.labels'

/**
 * What a surface draws, whatever draws it: the fills (a path per colour, as
 * the INS map draws, so 3,181 UATs are about eight elements), the view, the
 * held UAT and the labels. The SVG and canvas surfaces take the same scene.
 */

export interface Layer {
  readonly key: string
  readonly d: string
  readonly color: string
}

export interface MapScene {
  readonly geometry: UatMapGeometry
  readonly layers: readonly Layer[]
  /** The box at rest. */
  readonly box: ViewBox
  /** Zoomed in: the borders between UATs show. */
  readonly zoomed: boolean
  readonly highlight: number | null
  readonly labels: readonly MapLabel[]
}

/** The UATs' paths grouped by colour: no-data first, then the classes in order. */
export function buildLayers(geometry: UatMapGeometry, values: readonly (number | null)[], scale: MeasureScale): readonly Layer[] {
  const buckets = new Map<number, string[]>()
  values.forEach((value, i) => {
    const key = scale.classOf(value) ?? -1
    const bucket = buckets.get(key)
    if (bucket) bucket.push(geometry.paths[i]!)
    else buckets.set(key, [geometry.paths[i]!])
  })
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([k, paths]) => ({ key: String(k), d: paths.join(''), color: k < 0 ? NO_DATA_COLOR : scale.classes[k]!.color }))
}

/** Stroke widths in CSS px, shared by both surfaces. */
export const STROKE = {
  /** At rest each class is stroked in its own colour, so no seam shows between neighbours. */
  seam: 0.6,
  /** Zoomed in, the borders between UATs, in the background colour. */
  uat: 0.75,
  county: (zoomed: boolean) => (zoomed ? 1.25 : 0.75),
  outline: 1,
  highlight: 2,
} as const
