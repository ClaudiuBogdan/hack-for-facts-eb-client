import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import type { InsPeriodicity, NativeInsObservation } from '@/schemas/ins'
import type { StatisticsHubCountyLayer, StatisticsHubCountyValue, StatisticsHubUnit } from '@/schemas/statistics'
import type { ComparisonTerritoryToken } from './dataset-selection'
import type { ComparisonCell } from './native-comparison'
import { hubChange, hubUnitOf, isAdditiveUnit } from './hub-format'
import { publishedNumber } from './value-status'

/**
 * The comparison's reading, as pure functions over the fetched matrix: each
 * territory's numbers on the period axis, the window the page compares, the
 * change across it, and the stretch of a series the chart page can draw.
 */

/** The chart's scale: the published values, or their change since the window's start. */
export type ComparisonView = 'valori' | 'schimbare'

export type ComparisonLevel = ComparisonTerritoryToken['level']

/** A window on the period axis, as indices: `from` before `to`. */
export interface ComparisonWindow {
  readonly from: number
  readonly to: number
}

/** A row's published numbers, one per period of the axis; null where INS gives none. */
export function lineValues(
  cells: Readonly<Record<string, ComparisonCell>>,
  periods: readonly string[],
): readonly (number | null)[] {
  return periods.map((period) => {
    const cell = cells[period]
    return cell ? publishedNumber(cell.value, cell.valueStatus) : null
  })
}

/**
 * The window a comparison opens on: from the first to the last period every
 * line has a number for, so each row compares the same two years. Lines that
 * never share one fall back to the span any of them covers. Null with fewer
 * than two periods to span.
 */
export function defaultComparisonWindow(
  lines: readonly (readonly (number | null)[])[],
): ComparisonWindow | null {
  const count = Math.max(0, ...lines.map((line) => line.length))
  const shared: number[] = []
  const any: number[] = []
  for (let index = 0; index < count; index += 1) {
    const present = lines.filter((line) => line[index] !== null && line[index] !== undefined).length
    if (present > 0) any.push(index)
    if (lines.length > 0 && present === lines.length) shared.push(index)
  }
  const span = shared.length >= 2 ? shared : any
  const from = span[0]
  const to = span[span.length - 1]
  return from !== undefined && to !== undefined && from < to ? { from, to } : null
}

/**
 * The window the URL names, where both ends are periods of the axis in
 * order; an end it names alone is kept and paired with the default's other
 * end when that still comes first (or last). Anything else is the default.
 */
export function resolveComparisonWindow(
  periods: readonly string[],
  requested: { readonly from?: string; readonly to?: string },
  fallback: ComparisonWindow | null,
): ComparisonWindow | null {
  const from = requested.from === undefined ? -1 : periods.indexOf(requested.from)
  const to = requested.to === undefined ? -1 : periods.indexOf(requested.to)
  if (from >= 0 && to >= 0) return from < to ? { from, to } : fallback
  if (to > 0) return { from: fallback && fallback.from < to ? fallback.from : 0, to }
  if (from >= 0 && from < periods.length - 1) return { from, to: fallback && fallback.to > from ? fallback.to : periods.length - 1 }
  return fallback
}

/**
 * Change since the window's start, in the terms a reader compares it in:
 * percent for a count or an amount, percentage points for a rate, years for
 * a life expectancy. Null where the start or the value is missing, or a
 * count starts at zero.
 */
export function changeLine(
  values: readonly (number | null)[],
  base: number | null,
  unit: StatisticsHubUnit,
): readonly (number | null)[] {
  return values.map((value) => (value === null || base === null ? null : hubChange(base, value, unit)))
}

/**
 * The scale a comparison opens on. Places of different sizes counted in
 * people or things — a town, its county and the country — share no useful
 * axis in values; their change does. Everything else reads as values.
 */
export function defaultComparisonView(levels: readonly ComparisonLevel[], unit: StatisticsHubUnit): ComparisonView {
  return new Set(levels).size > 1 && isAdditiveUnit(unit) ? 'schimbare' : 'valori'
}

/** The URL's view where it is one, else the default. */
export function resolveComparisonView(raw: unknown, fallback: ComparisonView): ComparisonView {
  return raw === 'valori' || raw === 'schimbare' ? raw : fallback
}

/** One row of the ranking: where a territory starts and ends in the window, and the change. */
export interface ComparisonStanding {
  readonly code: string
  readonly from: number | null
  readonly to: number | null
  readonly change: number | null
}

/**
 * The rows highest first — by the value at the window's end, or by the change
 * when the chart shows change — a row without the figure last, in selection
 * order among themselves.
 */
export function rankStandings<T extends ComparisonStanding>(rows: readonly T[], view: ComparisonView): readonly T[] {
  const key = (row: T) => (view === 'schimbare' ? row.change : row.to)
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const left = key(a.row)
      const right = key(b.row)
      if (left === null || right === null) return left === right ? a.index - b.index : left === null ? 1 : -1
      return right - left || a.index - b.index
    })
    .map(({ row }) => row)
}

/**
 * The stretch of a line inside the window the chart page can draw: it
 * refuses a series with a gap rather than bridge it, so the longest unbroken
 * run of at least two numbers, the later of two as long. Null when there is
 * none.
 */
export function chartableRun(
  values: readonly (number | null)[],
  window: ComparisonWindow,
): { readonly from: number; readonly to: number } | null {
  let best: { from: number; to: number } | null = null
  let start: number | null = null
  for (let index = window.from; index <= window.to + 1; index += 1) {
    const present = index <= window.to && values[index] !== null && values[index] !== undefined
    if (present && start === null) start = index
    if (!present && start !== null) {
      const run = { from: start, to: index - 1 }
      if (run.to > run.from && (!best || run.to - run.from >= best.to - best.from)) best = run
      start = null
    }
  }
  return best
}

/**
 * The compared cell over the 42 counties and the country at one period, as
 * the county map reads it. A county counts only where exactly one row names
 * it exactly, unqualified, at that period and frequency: two rows for one
 * county are alternatives the map cannot choose between, and it leaves that
 * county hatched rather than pick one.
 */
export function comparisonCountyLayer(input: {
  readonly code: string
  readonly period: string
  readonly cadence: InsPeriodicity
  readonly observations: readonly NativeInsObservation[]
}): StatisticsHubCountyLayer {
  const names = new Map<string, string>(ROMANIA_COUNTIES.map((county) => [county.code, county.nameRo]))
  const counties = new Map<string, number | null>()
  const repeated = new Set<string>()
  const national: (number | null)[] = []
  let unit: NativeInsObservation['unit'] | null = null
  for (const row of input.observations) {
    if (row.time_period.periodicity !== input.cadence || row.time_period.iso_period !== input.period) continue
    const geography = row.dimensions.geography
    const place = geography?.resolvedTerritory
    if (!place || geography.resolution !== 'EXACT' || geography.flags.length > 0) continue
    unit ??= row.unit
    const value = publishedNumber(row.value, row.value_status)
    if (place.level === 'NATIONAL') national.push(value)
    else if (place.level === 'NUTS3' && names.has(place.code)) {
      if (counties.has(place.code)) repeated.add(place.code)
      counties.set(place.code, value)
    }
  }
  const values: StatisticsHubCountyValue[] = []
  for (const [code, value] of counties) {
    if (value !== null && !repeated.has(code)) values.push({ code, name: names.get(code) ?? code, value })
  }
  const present = new Set(values.map((county) => county.code))
  return {
    code: input.code,
    period: input.period,
    unit: unit ? hubUnitOf({ unitSymbol: unit.symbol ?? null, unitCode: unit.code, unitNameRo: unit.name_ro ?? null }) : 'other',
    unitLabel: unit ? (unit.name_ro ?? unit.symbol ?? null) : null,
    values,
    missingCounties: ROMANIA_COUNTIES.map((county) => county.code).filter((code) => !present.has(code)),
    national: national.length === 1 ? (national[0] ?? null) : null,
  }
}
