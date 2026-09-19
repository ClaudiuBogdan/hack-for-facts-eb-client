import { t } from '@lingui/core/macro'
import type {
  StatisticsHubData,
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

export function formatHubNumber(
  value: number,
  options?: { readonly compact?: boolean; readonly digits?: number },
): string {
  return new Intl.NumberFormat(activeNumberLocale(), {
    maximumFractionDigits: options?.digits ?? (options?.compact ? 1 : 2),
    ...(options?.compact ? { notation: 'compact' as const } : {}),
  }).format(value)
}

function formatSigned(value: number, digits: number): string {
  return new Intl.NumberFormat(activeNumberLocale(), {
    maximumFractionDigits: digits,
    signDisplay: 'exceptZero',
  }).format(value)
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
      return unitLabel ?? ''
  }
}

/** Value and unit as two strings, so the unit can sit in the quiet tier. */
export function formatHubValue(
  value: number,
  unit: StatisticsHubUnit,
  unitLabel: string | null,
  options?: { readonly compact?: boolean },
): { readonly value: string; readonly unit: string } {
  if (unit === 'percent') return { value: `${formatHubNumber(value)}%`, unit: '' }
  // Compact only past a million („21,6 mil."); below that the full figure is
  // shorter to read than the „145,7 K" the Romanian locale would produce.
  const compact = Boolean(options?.compact) && unit !== 'years' && Math.abs(value) >= 1_000_000
  return { value: formatHubNumber(value, { compact }), unit: hubUnitWord(unit, unitLabel) }
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

export interface HubChange {
  readonly text: string
}

/**
 * Change from the first point at or after `since` to the last point. Counts
 * change in percent; rates and years change in their own unit, because a
 * percent of a percent misleads.
 */
export function describeHubChange(
  series: readonly StatisticsHubSeriesPoint[],
  unit: StatisticsHubUnit,
  since: string,
): HubChange | null {
  const from = series.find((point) => point.period >= since)
  const to = series[series.length - 1]
  if (!from || !to || from === to || from.value === 0) return null
  const delta = to.value - from.value
  if (unit === 'percent') return { text: t`${formatSigned(delta, 1)} pp din ${from.period}` }
  if (unit === 'years') return { text: t`${formatSigned(delta, 1)} ani din ${from.period}` }
  const pct = (delta / from.value) * 100
  return { text: t`${formatSigned(pct, 1)}% din ${from.period}` }
}

/** The detail-page search that lands on exactly this national cell. */
export function indicatorDetailSearch(indicator: StatisticsHubIndicator) {
  return {
    teritoriu: 'cod:RO',
    ...(indicator.pins.length > 0 ? { clasificari: indicator.pins } : {}),
    ...(indicator.unitCode ? { unitate: indicator.unitCode } : {}),
    ...(indicator.periodicity === 'ANNUAL' || indicator.periodicity === 'QUARTERLY' || indicator.periodicity === 'MONTHLY'
      ? { frecventa: indicator.periodicity }
      : {}),
  }
}

/** The earliest and latest periods the hub shows — the capture's first year to the live latest — derived, never invented. */
export function hubDataSpan(hub: StatisticsHubData): { readonly from: string | null; readonly to: string | null } {
  const periods = (hub.indicators ?? []).flatMap((indicator) => [
    ...(indicator.period ? [indicator.period] : []),
    ...indicator.series.map((point) => point.period),
  ])
  if (periods.length === 0) return { from: null, to: null }
  const sorted = [...periods].sort()
  return { from: sorted[0] ?? null, to: sorted[sorted.length - 1] ?? null }
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
