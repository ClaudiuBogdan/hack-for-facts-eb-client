import { t } from '@lingui/core/macro'
import type {
  StatisticsHubIndicator,
  StatisticsHubSeriesPoint,
  StatisticsHubUnit,
} from '@/schemas/statistics'
import { activeNumberLocale } from './format'

/**
 * Hub number formatting: locale-aware, tabular, the unit as a Romanian word
 * in the quiet tier. A percent folds its sign into the value; „other" units
 * carry the API's own unit name, never a guess.
 */

/** `digits` fixes the decimals, so a column of figures lines up („1,0%" under „1,5%"). */
export function formatHubNumber(
  value: number,
  options?: { readonly compact?: boolean; readonly digits?: number },
): string {
  return new Intl.NumberFormat(activeNumberLocale(), {
    maximumFractionDigits: options?.digits ?? (options?.compact ? 1 : 2),
    ...(options?.digits !== undefined ? { minimumFractionDigits: options.digits } : {}),
    ...(options?.compact ? { notation: 'compact' as const } : {}),
  }).format(value)
}

function formatSigned(value: number, digits: number, fixed = false): string {
  return new Intl.NumberFormat(activeNumberLocale(), {
    maximumFractionDigits: digits,
    ...(fixed ? { minimumFractionDigits: digits } : {}),
    signDisplay: 'exceptZero',
  }).format(value)
}

/** The decimals the figures of one set carry, at most two: a set published to one decimal shows every figure with one. */
export function sharedDecimals(values: readonly number[]): number {
  let decimals = 0
  for (const value of values) {
    while (decimals < 2 && Math.abs(Math.round(value * 10 ** decimals) - value * 10 ** decimals) > 1e-6) decimals += 1
  }
  return decimals
}

export function hubUnitWord(unit: StatisticsHubUnit, unitLabel: string | null): string {
  switch (unit) {
    case 'persons':
      return t`persoane`
    case 'years':
      return t`ani`
    case 'percent':
      return '%'
    case 'count':
      return ''
    case 'other':
      // INS spells its currency „Lei RON"; the reader says „lei".
      return unitLabel && /^lei\b/i.test(unitLabel.trim()) ? t`lei` : (unitLabel ?? '')
  }
}

/** Value and unit as two strings, so the unit can sit in the quiet tier. */
export function formatHubValue(
  value: number,
  unit: StatisticsHubUnit,
  unitLabel: string | null,
  options?: { readonly compact?: boolean; readonly digits?: number },
): { readonly value: string; readonly unit: string } {
  const digits = options?.digits
  if (unit === 'percent') return { value: `${formatHubNumber(value, { digits })}%`, unit: '' }
  // Compact only past a million („21,6 mil."); below that the full figure is
  // shorter to read than the „145,7 K" the Romanian locale would produce.
  const compact = Boolean(options?.compact) && unit !== 'years' && Math.abs(value) >= 1_000_000
  return { value: formatHubNumber(value, compact ? { compact } : { digits }), unit: hubUnitWord(unit, unitLabel) }
}

export function formatIndicatorValue(
  indicator: Pick<StatisticsHubIndicator, 'value' | 'unit' | 'unitLabel'>,
  options?: { readonly compact?: boolean },
): { readonly value: string; readonly unit: string } | null {
  if (indicator.value === null) return null
  return formatHubValue(indicator.value, indicator.unit, indicator.unitLabel, options)
}

/** `2026-05` → „mai 2026"; `2026-Q2` → „T2 2026"; a bare year stays a year. */
export function formatHubPeriod(period: string): string {
  const month = /^(\d{4})-(\d{2})$/.exec(period)
  if (month) {
    return new Intl.DateTimeFormat(activeNumberLocale(), { month: 'long', year: 'numeric' }).format(
      new Date(Number(month[1]), Number(month[2]) - 1, 1),
    )
  }
  const quarter = /^(\d{4})-Q([1-4])$/.exec(period)
  if (quarter) return t`T${quarter[2]} ${quarter[1]}`
  return period
}

/**
 * The same period as an axis tick. „mai 2026" is fine beside a figure and far
 * too wide under a monthly series with 200 points, so months abbreviate
 * („mai 2026" → „mai 2026", „iulie" → „iul."). Quarters and years are already
 * short enough to share the long form.
 */
export function formatChartPeriod(period: string): string {
  const month = /^(\d{4})-(\d{2})$/.exec(period)
  if (month) {
    return new Intl.DateTimeFormat(activeNumberLocale(), { month: 'short', year: 'numeric' }).format(
      new Date(Number(month[1]), Number(month[2]) - 1, 1),
    )
  }
  return formatHubPeriod(period)
}

/**
 * The change from one value to another, as the table of „then and now"
 * shows it. Counts change in percent; rates and years change in their own
 * unit, because a percent of a percent misleads. Null when a count starts
 * at zero, where a percent has no meaning.
 */
export function describeHubDelta(from: number, to: number, unit: StatisticsHubUnit): string | null {
  const delta = to - from
  if (unit === 'percent') return t`${formatSigned(delta, 1, true)} pp`
  if (unit === 'years') return t`${formatSigned(delta, 1, true)} ani`
  if (from === 0) return null
  return `${formatSigned((delta / Math.abs(from)) * 100, 1, true)}%`
}

/** A signed whole figure („+4.560", „-93.966"), for a difference between two counts. */
export function formatHubSigned(value: number): string {
  return formatSigned(value, 0)
}

/**
 * Whether the national cell of a unit is the sum of the counties': a count of
 * people or things is; a rate, an average or a life expectancy is not.
 */
export function isAdditiveUnit(unit: StatisticsHubUnit): boolean {
  return unit === 'persons' || unit === 'count'
}

/**
 * A county against the national cell of the same dataset and year. A rate or
 * an average differs from the country's in its own unit (percentage points for
 * a percent); a count is a share of the country's total.
 */
export function describeAgainstNational(
  value: number,
  national: number,
  unit: StatisticsHubUnit,
  unitLabel: string | null,
  digits: number,
): string | null {
  if (isAdditiveUnit(unit)) {
    return national > 0 ? t`${formatHubNumber((value / national) * 100, { digits: 1 })}% din totalul țării` : null
  }
  const delta = formatSigned(value - national, digits, true)
  if (unit === 'percent') return t`${delta} pp față de România`
  const word = hubUnitWord(unit, unitLabel)
  return word ? t`${delta} ${word} față de România` : t`${delta} față de România`
}

/**
 * The detail-page search that lands on exactly this national cell. A matrix
 * without a geography axis is national already; a territory in its link would
 * only be a filter the page has no axis to show.
 */
export function indicatorDetailSearch(indicator: StatisticsHubIndicator) {
  return {
    ...(indicator.hasGeography ? { teritoriu: 'cod:RO' } : {}),
    ...(indicator.pins.length > 0 ? { clasificari: indicator.pins } : {}),
    ...(indicator.unitCode ? { unitate: indicator.unitCode } : {}),
    ...(indicator.periodicity === 'ANNUAL' || indicator.periodicity === 'QUARTERLY' || indicator.periodicity === 'MONTHLY'
      ? { frecventa: indicator.periodicity }
      : {}),
  }
}

/** Decimal places the source published a value with („110.85" → 2), so a figure derived from it keeps that precision. */
export function sourceDecimals(raw: string | null): number {
  const match = raw ? /\.(\d+)$/.exec(raw) : null
  return match ? match[1].length : 0
}

/**
 * The annual inflation rate from a consumer price index against the same
 * month a year earlier (=100): the index less 100, which is how INS states
 * the rate. Rounded to the index's own precision, so 110.85 reads 10,85 and
 * not 10,849999….
 */
export function annualInflationRate(index: number, decimals: number): number {
  const scale = 10 ** decimals
  return Math.round((index - 100) * scale) / scale
}

/** `2026-05` → `2025-05`; null for anything that is not a month. */
export function sameMonthLastYear(period: string): string | null {
  const month = /^(\d{4})-(\d{2})$/.exec(period)
  return month ? `${Number(month[1]) - 1}-${month[2]}` : null
}

/**
 * The first year of the unbroken run of years, ending at the latest year both
 * series have, in which deaths outnumbered births. Null when that latest year
 * does not have more deaths than births. A year either series lacks — or
 * both do — ends the run: a gap is not evidence either way.
 */
export function deathsExceedBirthsSince(
  births: readonly StatisticsHubSeriesPoint[],
  deaths: readonly StatisticsHubSeriesPoint[],
): string | null {
  const aligned = alignSeriesByPeriod(births, deaths)
  let last = aligned.periods.length - 1
  while (last >= 0 && (aligned.a[last] === null || aligned.b[last] === null)) last -= 1
  let first: number | null = null
  for (let index = last; index >= 0; index -= 1) {
    const born = aligned.a[index]
    const died = aligned.b[index]
    if (born === null || died === null || died <= born) break
    // The union of both series' periods skips a year neither has.
    if (first !== null && Number(aligned.periods[index]) !== Number(aligned.periods[first]) - 1) break
    first = index
  }
  return first === null ? null : (aligned.periods[first] ?? null)
}

/**
 * Two series on one period axis. Each point is placed at its period's
 * position in the union of both series' periods, so a year one series has
 * and the other lacks is a gap, not a shift.
 */
export function alignSeriesByPeriod(
  a: readonly StatisticsHubSeriesPoint[],
  b: readonly StatisticsHubSeriesPoint[],
): {
  readonly periods: readonly string[]
  readonly a: readonly (number | null)[]
  readonly b: readonly (number | null)[]
} {
  const periods = [...new Set([...a, ...b].map((point) => point.period))].sort()
  const index = new Map(periods.map((period, position) => [period, position]))
  const place = (series: readonly StatisticsHubSeriesPoint[]) => {
    const values: (number | null)[] = periods.map(() => null)
    for (const point of series) {
      const position = index.get(point.period)
      if (position !== undefined) values[position] = point.value
    }
    return values
  }
  return { periods, a: place(a), b: place(b) }
}

/** The API's unit symbol as the reader reads it: known English codes become Romanian words, anything else stays verbatim. */
export function describeUnitSymbol(symbol: string): string {
  switch (symbol.trim().toLowerCase()) {
    case 'persons':
      return t`persoane`
    case 'percent':
      return t`procente`
    case 'count':
      return t`număr`
    default:
      return symbol
  }
}
