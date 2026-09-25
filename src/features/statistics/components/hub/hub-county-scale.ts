import { HUE, type ClassInterval, type MapScale } from '../uat-map/uat-map-scales'

/**
 * The county map's colours, drawn as the UAT map draws them — one hue whose
 * opacity is the class, the legend's swatches the map's colours exactly — and
 * against the national figure: orange below it, blue above, grey around it;
 * `reversed` where more is the concern (unemployment, age): orange above.
 * The classes are distances from the national figure, their bounds figures in
 * their own right (77,0 … 77,9 ani, not ±0,4). A layer with no national figure
 * to part at is drawn in five classes of about eight counties each.
 *
 * Bounds are rounded to a step a reader can hold, one order below the spread
 * of the middle counties: București's GDP must not coarsen everyone else's.
 */

/** The grey band holds the quarter of counties closest to the national figure; full colour, the quarter farthest from it. */
const BAND = 0.25
const FAR = 0.75
const OPACITY = { band: 0.16, near: 0.42, far: 0.9 } as const
const QUINTILES = [0.2, 0.4, 0.6, 0.8] as const
const LEVEL_OPACITY = [0.14, 0.3, 0.48, 0.7, 0.92] as const

const quantile = (sorted: readonly number[], q: number) => sorted[Math.min(sorted.length - 1, Math.round(q * (sorted.length - 1)))] ?? 0

/**
 * A round step one order below the spread of the middle values — 76,27 → 76,3;
 * 4.237 lei → 4.240 — never finer than the figures themselves (`digits`
 * decimals): a layer read to one decimal gets no bound of two.
 */
function stepFor(sorted: readonly number[], digits: number): number {
  const finest = 10 ** -digits
  const spread = quantile(sorted, 0.8) - quantile(sorted, 0.2)
  return spread > 0 ? Math.max(finest, 10 ** (Math.floor(Math.log10(spread)) - 1)) : finest
}

/** The decimals a step keeps: 0,1 → 1; 100 → 0. */
const decimalsOf = (step: number) => Math.max(0, -Math.floor(Math.log10(step)))
const roundTo = (value: number, step: number) => Number((Math.round(value / step) * step).toFixed(decimalsOf(step)))

/** Where a value sits on a legend of equal-width classes, 0 to 1. */
function positionIn(edges: readonly number[], step: number, value: number, count: number): number {
  const from = edges[step]!
  const to = edges[step + 1]!
  return (step + (to > from ? Math.min(1, Math.max(0, (value - from) / (to - from))) : 0.5)) / count
}

/** The scale over the counties' values, in the layer's order, and the decimals its bounds are rounded to. */
export function countyScale(
  values: readonly number[],
  national: number | null,
  options: { readonly reversed?: boolean; /** The figures' own decimals. */ readonly digits?: number } = {},
): { readonly scale: MapScale; readonly decimals: number } {
  const digits = options.digits ?? 2
  return national === null ? inQuintiles(values, digits) : againstNational(values, national, options.reversed === true, digits)
}

function againstNational(values: readonly number[], national: number, reversed: boolean, digits: number) {
  const [below, above] = reversed ? [HUE.blue, HUE.orange] : [HUE.orange, HUE.blue]
  const distances = values.map((value) => Math.abs(value - national)).sort((a, b) => a - b)
  const step = stepFor(distances, digits)
  const inner = Math.max(step, roundTo(quantile(distances, BAND), step))
  const far = Math.max(inner + step, roundTo(quantile(distances, FAR), step))
  const [lowFar, low, high, highFar] = [national - far, national - inner, national + inner, national + far].map((bound) => roundTo(bound, step)) as [
    number,
    number,
    number,
    number,
  ]
  const classOf = (value: number) => (value < lowFar ? 0 : value < low ? 1 : value <= high ? 2 : value <= highFar ? 3 : 4)
  const edges = [Math.min(...values, lowFar), lowFar, low, high, highFar, Math.max(...values, highFar)]
  const scale: MapScale = {
    kind: 'diverging',
    classes: [
      { interval: { from: null, to: lowFar }, ...below, opacity: OPACITY.far },
      { interval: { from: lowFar, to: low }, ...below, opacity: OPACITY.near },
      { interval: { from: low, to: high }, ...HUE.grey, opacity: OPACITY.band },
      { interval: { from: high, to: highFar }, ...above, opacity: OPACITY.near },
      { interval: { from: highFar, to: null }, ...above, opacity: OPACITY.far },
    ],
    classAt: (index) => (values[index] === undefined ? null : classOf(values[index]!)),
    positionOf: (value) => positionIn(edges, classOf(value), value, 5),
  }
  return { scale, decimals: decimalsOf(step) }
}

function inQuintiles(values: readonly number[], digits: number) {
  const sorted = [...values].sort((a, b) => a - b)
  const step = stepFor(sorted, digits)
  const bounds: number[] = []
  for (const q of QUINTILES) {
    const bound = roundTo(quantile(sorted, q), step)
    if (bounds.length === 0 || bound > bounds[bounds.length - 1]!) bounds.push(bound)
  }
  const intervals: ClassInterval[] = [...bounds, null].map((to, i) => ({ from: i === 0 ? null : bounds[i - 1]!, to }))
  const opacities = LEVEL_OPACITY.slice(LEVEL_OPACITY.length - intervals.length)
  const classOf = (value: number) => bounds.filter((bound) => value >= bound).length
  const edges = [sorted[0] ?? 0, ...bounds, sorted[sorted.length - 1] ?? 0]
  const scale: MapScale = {
    kind: 'level',
    classes: intervals.map((interval, i) => ({ interval, ...HUE.blue, opacity: opacities[i]! })),
    classAt: (index) => (values[index] === undefined ? null : classOf(values[index]!)),
    positionOf: (value) => positionIn(edges, classOf(value), value, intervals.length),
  }
  return { scale, decimals: decimalsOf(step) }
}
