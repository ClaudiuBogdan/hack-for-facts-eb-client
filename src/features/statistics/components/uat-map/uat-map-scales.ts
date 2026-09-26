/**
 * How a total becomes a colour: one hue drawn from pale to full as the value
 * grows — the opacity is the value's class, so the legend's swatches are the
 * map's colours exactly. A balance takes two hues, orange below zero and blue
 * above, with a pale grey band around zero.
 *
 * The classes lean to the top: most UATs are small, so equal classes would
 * paint two fifths of the country dark; here the palest class holds the
 * smallest 30% and full colour only the largest 3%.
 */

/** A class's bounds; null is open. `zero` is the class of exact zeros. */
export interface ClassInterval {
  readonly from: number | null
  readonly to: number | null
  readonly zero?: boolean
}

export interface MapClass {
  readonly interval: ClassInterval
  /** The path's fill and matching stroke (no seam between neighbours). */
  readonly fill: string
  /** The legend's swatch: the same colour as a background. */
  readonly swatch: string
  /** Drawn at this opacity on the map and in the legend alike. */
  readonly opacity: number
}

export interface MapScale {
  readonly kind: 'level' | 'level-zero' | 'diverging'
  readonly classes: readonly MapClass[]
  /** The class of UAT `index`, or null where it has no figure. */
  readonly classAt: (index: number) => number | null
  /** Where a value sits on a legend of equal-width classes, 0 to 1. */
  readonly positionOf: (value: number) => number
}

/** The hues the maps draw in: blue for a level and above a reference, orange below it, grey around it. */
export const HUE = {
  blue: { fill: 'fill-choropleth-5 stroke-choropleth-5', swatch: 'bg-choropleth-5' },
  orange: {
    fill: 'fill-orange-600 stroke-orange-600 dark:fill-orange-400 dark:stroke-orange-400',
    swatch: 'bg-orange-600 dark:bg-orange-400',
  },
  grey: {
    fill: 'fill-stone-500 stroke-stone-500 dark:fill-stone-400 dark:stroke-stone-400',
    swatch: 'bg-stone-500 dark:bg-stone-400',
  },
} as const

/** Where a level's classes are cut, as shares of its UATs: 30% · 30% · 25% · 12% · 3%. */
const LEVEL_CUTS = [0.3, 0.6, 0.85, 0.97] as const
const LEVEL_OPACITY = [0.12, 0.26, 0.44, 0.64, 0.88] as const
/** With a separate zero class, the rest after it: 40% · 35% · 20% · 5% of positive values. */
const ABOVE_ZERO_CUTS = [0.4, 0.75, 0.95] as const
const ABOVE_ZERO_OPACITY = [0.2, 0.4, 0.64, 0.88] as const
/** A balance's grey band holds the 30% closest to zero; full colour, as for a level, only the 5% farthest from it. */
const DIVERGING_CUTS = [0.3, 0.95] as const
const DIVERGING_OPACITY = { band: 0.14, near: 0.34, far: 0.88 } as const
const ZERO_OPACITY = 0.14

/** Two significant figures: a bound a reader can hold that still keeps the classes apart — 3.524 → 3.500. */
export function roundBound(value: number): number {
  if (value === 0) return 0
  const unit = 10 ** (Math.floor(Math.log10(Math.abs(value))) - 1)
  return Math.round(value / unit) * unit
}

const quantile = (sorted: readonly number[], q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0

/** Rounded cut values, strictly increasing: a rounding that meets the one before drops out. */
function boundsAt(sorted: readonly number[], cuts: readonly number[]): readonly number[] {
  const bounds: number[] = []
  for (const cut of cuts) {
    const bound = roundBound(quantile(sorted, cut))
    if (bounds.length === 0 || bound > bounds[bounds.length - 1]!) bounds.push(bound)
  }
  return bounds
}

/** The classes between `bounds`, open at both ends. */
function intervalsOf(bounds: readonly number[]): readonly ClassInterval[] {
  return [...bounds, null].map((to, i) => ({ from: i === 0 ? null : bounds[i - 1]!, to }))
}

/** The last class whose lower bound a value reaches. */
const stepIn = (bounds: readonly number[], value: number) => bounds.filter((bound) => value >= bound).length

export function mapScale(
  values: readonly (number | null)[],
  options: { readonly diverging: boolean; readonly separateZero?: boolean },
): MapScale {
  const present = values.filter((value): value is number => value !== null)
  const positionIn = (edges: readonly number[], classOf: (value: number) => number, count: number) => (value: number) => {
    const step = classOf(value)
    const from = edges[step]!
    const to = edges[step + 1]!
    return (step + (to > from ? Math.min(1, Math.max(0, (value - from) / (to - from))) : 0.5)) / count
  }
  const min = Math.min(...present)
  const max = Math.max(...present)

  if (options.diverging) {
    const magnitudes = present.map(Math.abs).sort((a, b) => a - b)
    const [inner = 0, outer = 0] = DIVERGING_CUTS.map((cut) => roundBound(quantile(magnitudes, cut)))
    const far = Math.max(outer, inner * 2)
    const classOf = (value: number) => (value < -far ? 0 : value < -inner ? 1 : value <= inner ? 2 : value <= far ? 3 : 4)
    return {
      kind: 'diverging',
      classes: [
        { interval: { from: null, to: -far }, ...HUE.orange, opacity: DIVERGING_OPACITY.far },
        { interval: { from: -far, to: -inner }, ...HUE.orange, opacity: DIVERGING_OPACITY.near },
        { interval: { from: -inner, to: inner }, ...HUE.grey, opacity: DIVERGING_OPACITY.band },
        { interval: { from: inner, to: far }, ...HUE.blue, opacity: DIVERGING_OPACITY.near },
        { interval: { from: far, to: null }, ...HUE.blue, opacity: DIVERGING_OPACITY.far },
      ],
      classAt: (index) => (values[index] == null ? null : classOf(values[index]!)),
      positionOf: positionIn([min, -far, -inner, inner, far, max], classOf, 5),
    }
  }

  const sorted = [...present].sort((a, b) => a - b)
  const zeros = sorted.filter((value) => value === 0).length
  if (zeros > 0 && (options.separateZero || zeros > sorted.length * 0.1)) {
    const bounds = boundsAt(
      sorted.filter((value) => value > 0),
      ABOVE_ZERO_CUTS,
    )
    const opacities = ABOVE_ZERO_OPACITY.slice(ABOVE_ZERO_OPACITY.length - bounds.length - 1)
    const classOf = (value: number) => (value <= 0 ? 0 : 1 + stepIn(bounds, value))
    const count = bounds.length + 2
    return {
      kind: 'level-zero',
      classes: [
        { interval: { from: 0, to: 0, zero: true }, ...HUE.grey, opacity: ZERO_OPACITY },
        ...intervalsOf(bounds).map((interval, i) => ({ interval, ...HUE.blue, opacity: opacities[i]! })),
      ],
      classAt: (index) => (values[index] == null ? null : classOf(values[index]!)),
      positionOf: (value) => (value <= 0 ? 0.5 / count : positionIn([0, 0, ...bounds, max], classOf, count)(value)),
    }
  }

  const bounds = boundsAt(sorted, LEVEL_CUTS)
  // Fewer classes where roundings met: the darkest stay the darkest.
  const opacities = LEVEL_OPACITY.slice(LEVEL_OPACITY.length - bounds.length - 1)
  return {
    kind: 'level',
    classes: intervalsOf(bounds).map((interval, i) => ({ interval, ...HUE.blue, opacity: opacities[i]! })),
    classAt: (index) => (values[index] == null ? null : stepIn(bounds, values[index]!)),
    positionOf: positionIn([min, ...bounds, max], (value) => stepIn(bounds, value), bounds.length + 1),
  }
}

/**
 * One path the map fills: a class's UATs drawn as a single shape. A new
 * series then restyles a handful of elements, not 3,181 — each restyle runs
 * the page's whole stylesheet, ~15 µs a path.
 */
export interface MapLayer {
  readonly key: string
  /** The fill and matching stroke; null is hatched (no figure). */
  readonly fill: string | null
  readonly opacity: number
  /** The class's paths, joined. */
  readonly d: string
}

/**
 * The map's fills: the scale's classes, then all UATs with no figure, hatched.
 * A class with no UAT draws nothing.
 */
export function classLayers(scale: MapScale, paths: readonly string[]): readonly MapLayer[] {
  const members: string[][] = scale.classes.map(() => [])
  const hatched: string[] = []
  paths.forEach((d, index) => {
    const step = scale.classAt(index)
    if (step !== null) members[step]!.push(d)
    else hatched.push(d)
  })
  const layers: MapLayer[] = [
    ...scale.classes.map((drawn, step) => ({ key: `class-${step}`, fill: drawn.fill, opacity: drawn.opacity, d: members[step]!.join('') })),
    { key: 'no-data', fill: null, opacity: 1, d: hatched.join('') },
  ]
  return layers.filter((layer) => layer.d !== '')
}
