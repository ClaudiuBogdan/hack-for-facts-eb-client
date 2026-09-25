import type { UatMapGeometry } from '@/features/statistics/lib/uat-map-snapshot'
import { STEP_BG, STEP_FILL, STEP_STROKE } from '@/features/statistics/lib/county-map'

/**
 * How the figures become marks: five colour classes for a ratio (a rate, a
 * change in percent), a circle's area for a count (a total, a change that is
 * a difference).
 */

// ── colour: five classes ───────────────────────────────────────────────

/** A class's bounds; null is open. `zero` is the class of exact zeros. */
export interface ClassInterval {
  readonly from: number | null
  readonly to: number | null
  readonly zero?: boolean
}

/**
 * A balance or a change diverges from zero — warm below, the choropleth blue
 * above, a grey band around zero that is „close to zero", not „no change" —
 * so mostly negative data looks mostly negative. A level is five classes of
 * the blue holding the same number of UATs each; where zero is common (a
 * third of the UATs finished no dwelling) it is a class of its own, decided
 * by the count — a town that finished one dwelling rounds to 0,0 ‰ and is
 * not a zero.
 */
export interface MapScale {
  readonly kind: 'diverging' | 'quantile' | 'quantile-zero'
  readonly intervals: readonly ClassInterval[]
  readonly fill: readonly string[]
  readonly stroke: readonly string[]
  readonly swatch: readonly string[]
  /** The class of UAT `index`, or null where it has no figure. */
  readonly classAt: (index: number) => number | null
  /** Where a value sits on a legend of five equal-width classes, 0 to 1. */
  readonly positionOf: (value: number) => number
}

const DIVERGING_FILL = [
  'fill-orange-600 dark:fill-orange-400',
  'fill-orange-200 dark:fill-orange-900',
  'fill-stone-200 dark:fill-stone-700',
  'fill-choropleth-2',
  'fill-choropleth-4',
] as const
const DIVERGING_STROKE = [
  'stroke-orange-600 dark:stroke-orange-400',
  'stroke-orange-200 dark:stroke-orange-900',
  'stroke-stone-200 dark:stroke-stone-700',
  'stroke-choropleth-2',
  'stroke-choropleth-4',
] as const
const DIVERGING_BG = [
  'bg-orange-600 dark:bg-orange-400',
  'bg-orange-200 dark:bg-orange-900',
  'bg-stone-200 dark:bg-stone-700',
  'bg-choropleth-2',
  'bg-choropleth-4',
] as const

/** The nearest of 1, 2, 2.5, 5 × 10ⁿ — a bound a reader can hold. */
function nice(value: number): number {
  if (value <= 0) return 0
  const power = 10 ** Math.floor(Math.log10(value))
  return [1, 2, 2.5, 5, 10].reduce((best, step) => (Math.abs(step * power - value) < Math.abs(best - value) ? step * power : best), power)
}

const quantile = (sorted: readonly number[], q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0

export function mapScale(
  values: readonly (number | null)[],
  options: {
    readonly diverging: boolean
    /** The counts behind a level, where zero is decided by the count (dwellings). */
    readonly counts?: readonly (number | null)[]
    /** Left out of the classes (too few to compare): hatched, not coloured. */
    readonly excluded?: ReadonlySet<number>
  },
): MapScale {
  const excluded = options.excluded ?? new Set<number>()
  const valueAt = (index: number) => (excluded.has(index) ? null : (values[index] ?? null))
  const present = values.filter((value, index): value is number => value !== null && !excluded.has(index))
  const min = Math.min(...present)
  const max = Math.max(...present)
  const position = (edges: readonly number[], classOf: (value: number) => number) => (value: number) => {
    const step = classOf(value)
    const from = edges[step]!
    const to = edges[step + 1]!
    return (step + (to > from ? Math.min(1, Math.max(0, (value - from) / (to - from))) : 0.5)) / 5
  }

  if (options.diverging) {
    const magnitudes = present.map(Math.abs).sort((a, b) => a - b)
    const inner = nice(quantile(magnitudes, 0.2))
    const outer = Math.max(nice(quantile(magnitudes, 0.65)), inner * 2)
    const classOf = (value: number) => (value < -outer ? 0 : value < -inner ? 1 : value <= inner ? 2 : value <= outer ? 3 : 4)
    return {
      kind: 'diverging',
      intervals: [
        { from: null, to: -outer },
        { from: -outer, to: -inner },
        { from: -inner, to: inner },
        { from: inner, to: outer },
        { from: outer, to: null },
      ],
      fill: DIVERGING_FILL,
      stroke: DIVERGING_STROKE,
      swatch: DIVERGING_BG,
      classAt: (index) => (valueAt(index) === null ? null : classOf(valueAt(index)!)),
      positionOf: position([min, -outer, -inner, inner, outer, max], classOf),
    }
  }

  // A zero decided by the count where there is one (dwellings), by the figure otherwise.
  const count = options.counts ?? null
  const isZero = (index: number) => valueAt(index) === 0 && (count === null || count[index] === 0)
  const zeros = values.filter((_, index) => isZero(index)).length
  if (zeros > present.length * 0.1) {
    const positive = values.filter((value, index): value is number => valueAt(index) !== null && value !== null && !isZero(index)).sort((a, b) => a - b)
    const [b1, b2, b3] = [0.25, 0.5, 0.75].map((q) => quantile(positive, q)) as [number, number, number]
    const classOf = (value: number) => (value < b1 ? 1 : value < b2 ? 2 : value < b3 ? 3 : 4)
    return {
      kind: 'quantile-zero',
      intervals: [{ from: 0, to: 0, zero: true }, { from: null, to: b1 }, { from: b1, to: b2 }, { from: b2, to: b3 }, { from: b3, to: null }],
      fill: STEP_FILL,
      stroke: STEP_STROKE,
      swatch: STEP_BG,
      classAt: (index) => (valueAt(index) === null ? null : isZero(index) ? 0 : classOf(valueAt(index)!)),
      positionOf: (value) => (value <= 0 ? 0.1 : position([0, 0, b1, b2, b3, max], classOf)(value)),
    }
  }

  const sorted = [...present].sort((a, b) => a - b)
  const bounds = [0.2, 0.4, 0.6, 0.8].map((q) => quantile(sorted, q))
  const classOf = (value: number) => bounds.filter((bound) => value >= bound).length
  return {
    kind: 'quantile',
    intervals: [
      { from: null, to: bounds[0]! },
      { from: bounds[0]!, to: bounds[1]! },
      { from: bounds[1]!, to: bounds[2]! },
      { from: bounds[2]!, to: bounds[3]! },
      { from: bounds[3]!, to: null },
    ],
    fill: STEP_FILL,
    stroke: STEP_STROKE,
    swatch: STEP_BG,
    classAt: (index) => (valueAt(index) === null ? null : classOf(valueAt(index)!)),
    positionOf: position([min, ...bounds, max], classOf),
  }
}

/** A path with no figure: hatched, by its fill attribute. */
export const NO_FIGURE = null

/**
 * Each UAT's fill, with a matching stroke so no seam shows between
 * neighbours; null is no figure (hatched) — a gap, or a change too small to
 * compare; a UAT with no public water network is muted, a fact, not a gap.
 */
export function colourClasses(scale: MapScale, count: number, noNetwork: ReadonlySet<number>): readonly (string | null)[] {
  return Array.from({ length: count }, (_, index) => {
    const step = scale.classAt(index)
    if (step !== null) return `${scale.fill[step]} ${scale.stroke[step]}`
    return noNetwork.has(index) ? 'fill-muted stroke-muted' : NO_FIGURE
  })
}

/** Under circles the map is a ground, not a figure: one quiet fill, gaps still hatched. */
export function groundClasses(values: readonly (number | null)[], excluded: ReadonlySet<number>): readonly (string | null)[] {
  return values.map((value, index) => (value === null || excluded.has(index) ? NO_FIGURE : 'fill-muted stroke-muted'))
}

// ── circles: a count's area ────────────────────────────────────────────

export interface CircleScale {
  /** The largest |count|: its circle has `maxRadius`. */
  readonly maxAbs: number
  readonly maxRadius: number
  /** Area in proportion to the count: the radius grows with its square root. */
  readonly radius: (abs: number) => number
  /** Three round counts for the legend's nested circles, largest first. */
  readonly legend: readonly number[]
}

/** The largest of 1, 2, 5 × 10ⁿ not above `value`. */
function niceBelow(value: number): number {
  const power = 10 ** Math.floor(Math.log10(value))
  return [5, 2, 1].map((step) => step * power).find((candidate) => candidate <= value) ?? power
}

/**
 * No cap: the largest count — Bucharest's, mostly — sets the scale, as it is.
 * A count under 3 draws no circle, as a rate under 3 events shows none.
 */
export function circleScale(values: readonly (number | null)[], maxRadius: number): CircleScale {
  const maxAbs = Math.max(1, ...values.map((value) => Math.abs(value ?? 0)))
  const top = niceBelow(maxAbs)
  return {
    maxAbs,
    maxRadius,
    radius: (abs) => maxRadius * Math.sqrt(abs / maxAbs),
    legend: [top, niceBelow(top / 10), niceBelow(top / 100)],
  }
}

export const MIN_CIRCLE_COUNT = 3

export interface CircleItem {
  readonly index: number
  readonly x: number
  readonly y: number
  /** On screen, whatever the zoom: the legend's sizes hold everywhere. */
  readonly radiusPx: number
  readonly className: string
}

const CIRCLE_CLASS = {
  negative: 'fill-orange-500/65 stroke-orange-700 dark:fill-orange-400/60 dark:stroke-orange-300',
  positive: 'fill-choropleth-4/65 stroke-choropleth-5',
  level: 'fill-choropleth-4/60 stroke-choropleth-5',
} as const

/** One circle per UAT with a count, at its label point, largest first so the small ones stay on top. */
export function circleItems(
  geometry: UatMapGeometry,
  values: readonly (number | null)[],
  scale: CircleScale,
  options: { readonly signed: boolean; readonly excluded?: ReadonlySet<number> },
): readonly CircleItem[] {
  const items: CircleItem[] = []
  values.forEach((value, index) => {
    if (value === null || Math.abs(value) < MIN_CIRCLE_COUNT || options.excluded?.has(index)) return
    items.push({
      index,
      x: geometry.labels[index * 3]!,
      y: geometry.labels[index * 3 + 1]!,
      radiusPx: scale.radius(Math.abs(value)),
      className: !options.signed ? CIRCLE_CLASS.level : value < 0 ? CIRCLE_CLASS.negative : CIRCLE_CLASS.positive,
    })
  })
  return items.sort((a, b) => b.radiusPx - a.radiusPx)
}

export const CIRCLE_SWATCH = {
  negative: 'bg-orange-500/65 border-orange-700 dark:bg-orange-400/60 dark:border-orange-300',
  positive: 'bg-choropleth-4/65 border-choropleth-5',
  level: 'bg-choropleth-4/60 border-choropleth-5',
} as const

// ── opacity: a population ──────────────────────────────────────────────

/** Population steps and their opacity, on the opacity map: a small place's colour drawn faint, a city's in full. */
export const ALPHA_STEPS: readonly { readonly below: number | null; readonly opacity: number }[] = [
  { below: 2000, opacity: 0.3 },
  { below: 5000, opacity: 0.5 },
  { below: 20000, opacity: 0.75 },
  { below: null, opacity: 1 },
]

export function alphaOf(population: number | null): number {
  if (population === null) return 1
  return ALPHA_STEPS.find((step) => step.below === null || population < step.below)!.opacity
}
