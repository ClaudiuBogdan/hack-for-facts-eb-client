/**
 * The arithmetic behind the hub's two-line chart, as pure functions: a value
 * axis with round ticks, the years worth a label, and the regions between
 * the two lines where one runs above the other.
 */

export interface NiceScale {
  readonly from: number
  readonly to: number
  readonly ticks: readonly number[]
}

/**
 * About `count` ticks at a step of 1, 2, 2.5 or 5 times a power of ten,
 * from a multiple of the step at or below `min` to one at or above `max`.
 */
export function niceScale(min: number, max: number, count = 5): NiceScale {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { from: 0, to: 1, ticks: [0, 1] }
  let low = Math.min(min, max)
  let high = Math.max(min, max)
  if (low === high) {
    const pad = Math.abs(low) / 10 || 1
    low -= pad
    high += pad
  }
  const raw = (high - low) / Math.max(count - 1, 1)
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((multiple) => multiple * magnitude).find((candidate) => candidate >= raw) ?? 10 * magnitude
  // Each tick from its index, rounded to the step's own decimals: added up
  // step by step they drift (0.30000000000000004, or -2.8e-17 for zero), and
  // a zero must not print as „-0".
  const decimals = Math.max(0, 1 - Math.floor(Math.log10(step)))
  const round = (value: number) => Number(value.toFixed(decimals)) || 0
  const from = round(Math.floor(low / step) * step)
  const to = round(Math.ceil(high / step) * step)
  const ticks = Array.from({ length: Math.round((to - from) / step) + 1 }, (_, index) => round(from + index * step))
  return { from, to, ticks }
}

/**
 * The periods that get a label on the time axis: the first, the last and
 * every decade between, less a decade too close to either end to fit.
 */
export function yearTickIndices(periods: readonly string[], minGap = 5): readonly number[] {
  const last = periods.length - 1
  if (last < 0) return []
  if (last === 0) return [0]
  const years = periods.map((period) => (/^\d{4}$/.test(period) ? Number(period) : null))
  const first = years[0]
  const final = years[last]
  const inner: number[] = []
  if (first !== null && first !== undefined && final !== null && final !== undefined) {
    years.forEach((year, index) => {
      if (year !== null && year % 10 === 0 && year - first >= minGap && final - year >= minGap) inner.push(index)
    })
  }
  return [0, ...inner, last]
}

export type Point = readonly [x: number, value: number]

export interface GapRegion {
  /** 1 where the first series runs above the second, -1 where below. */
  readonly sign: 1 | -1
  /** The outline, in period index and value: along the first series, back along the second. */
  readonly polygon: readonly Point[]
}

/**
 * The regions between two aligned series, split where they cross (at the
 * interpolated crossing, so the shading meets the lines exactly) and where
 * either has no value (a gap is not a region).
 */
export function gapRegions(a: readonly (number | null)[], b: readonly (number | null)[]): readonly GapRegion[] {
  const regions: GapRegion[] = []
  let current: { sign: 1 | -1; upper: Point[]; lower: Point[] } | null = null
  // A tie before the sign is known: where the next region starts.
  let tie: Point | null = null
  const close = () => {
    if (current && current.upper.length > 1) regions.push({ sign: current.sign, polygon: [...current.upper, ...current.lower.reverse()] })
    current = null
  }

  for (let index = 0; index < a.length; index += 1) {
    const first = a[index]
    const second = b[index]
    if (first === null || first === undefined || second === null || second === undefined) {
      close()
      tie = null
      continue
    }
    const difference = first - second
    const sign = difference > 0 ? 1 : difference < 0 ? -1 : 0
    if (sign === 0) {
      if (current) {
        current.upper.push([index, first])
        current.lower.push([index, second])
      } else {
        tie = [index, first]
      }
      continue
    }
    if (current && sign !== current.sign) {
      const previousFirst = a[index - 1] as number
      const previousDifference = previousFirst - (b[index - 1] as number)
      const t = previousDifference / (previousDifference - difference)
      const crossing: Point = [index - 1 + t, previousFirst + t * (first - previousFirst)]
      current.upper.push(crossing)
      current.lower.push(crossing)
      close()
      current = { sign, upper: [crossing], lower: [crossing] }
    }
    if (!current) {
      current = { sign, upper: tie ? [tie] : [], lower: tie ? [tie] : [] }
      tie = null
    }
    current.upper.push([index, first])
    current.lower.push([index, second])
  }
  close()
  return regions
}
