/**
 * The national series in the client's chart contract, and the periods they
 * run on. `toAnalyticsSeries` is the server handoff's adapter (4 October
 * 2026, §4–5): a point only for an AVAILABLE period, every other requested
 * period in `missingPeriods` (an array, `[]` when none: a missing bucket is a
 * gap, never zero), the exact decimal per point in `pointDetails`, the unit
 * exactly as returned. The raw periods (status, reason, covered interval) stay
 * in the domain answer, for tables and explanations.
 */
import type { AnalyticsSeries } from '@/schemas/charts'
import type { BudgetValueUnit, PeriodType } from '@/schemas/national-budget-api'
import { plotOf } from './exact'

/** The exact value behind a plotted point, and what it covers when that is not the label. */
export type ExactPoint = { readonly exact: string; readonly note?: string }

/** `AnalyticsSeries` with `pointDetails`, as client dev declares it (`src/schemas/charts.ts`, 2026-10-03). */
export type BudgetAnalyticsSeries = AnalyticsSeries & {
  readonly missingPeriods: string[]
  readonly pointDetails: Readonly<Record<string, ExactPoint>>
}

type SeriesAnswer = {
  readonly unit: BudgetValueUnit
  readonly series: { readonly data: readonly { readonly date: string; readonly value: string }[] }
  readonly periods: readonly { readonly date: string; readonly status: string }[]
}

export function toAnalyticsSeries(seriesId: string, answer: SeriesAnswer): BudgetAnalyticsSeries {
  const exactByDate = new Map(answer.series.data.map((point) => [point.date, point.value]))
  const data: { x: string; y: number }[] = []
  const missingPeriods: string[] = []
  const pointDetails: Record<string, ExactPoint> = {}
  for (const period of answer.periods) {
    const exact = period.status === 'AVAILABLE' ? exactByDate.get(period.date) : undefined
    const y = plotOf(exact)
    if (exact === undefined || y === null) {
      missingPeriods.push(period.date)
      continue
    }
    data.push({ x: period.date, y })
    pointDetails[period.date] = { exact }
  }
  return {
    seriesId,
    xAxis: { name: 'Period', type: 'STRING', unit: '' },
    yAxis: { name: 'Amount', type: 'FLOAT', unit: answer.unit },
    data,
    missingPeriods,
    pointDetails,
  }
}

// ──────────────────────────────────────────────────────────── periods ──

/** A period's label as the server writes it: `2025`, `2025-Q2`, `2025-07`. */
export type PeriodLabel = string

export function periodTypeOf(label: PeriodLabel): PeriodType {
  if (/^\d{4}$/u.test(label)) return 'YEAR'
  if (/^\d{4}-Q[1-4]$/u.test(label)) return 'QUARTER'
  return 'MONTH'
}

export function isPeriodLabel(value: unknown): value is PeriodLabel {
  return typeof value === 'string' && /^(\d{4}|\d{4}-Q[1-4]|\d{4}-(0[1-9]|1[0-2]))$/u.test(value)
}

export function yearOf(label: PeriodLabel): number {
  return Number(label.slice(0, 4))
}

/** The same period a number of years away: `2026-07` → `2025-07`. */
export function shiftYears(label: PeriodLabel, years: number): PeriodLabel {
  return `${yearOf(label) + years}${label.slice(4)}`
}

/** Every period of a type from `start` to `end`, both included, in order. */
export function periodsBetween(type: PeriodType, start: PeriodLabel, end: PeriodLabel): readonly PeriodLabel[] {
  const out: PeriodLabel[] = []
  if (type === 'YEAR') {
    for (let year = yearOf(start); year <= yearOf(end); year += 1) out.push(String(year))
    return out
  }
  const step = type === 'QUARTER' ? 4 : 12
  const index = (label: PeriodLabel) => yearOf(label) * step + (type === 'QUARTER' ? Number(label.slice(6)) : Number(label.slice(5, 7))) - 1
  for (let value = index(start); value <= index(end); value += 1) {
    const year = Math.floor(value / step)
    const part = (value % step) + 1
    out.push(type === 'QUARTER' ? `${year}-Q${part}` : `${year}-${String(part).padStart(2, '0')}`)
  }
  return out
}

/** The quarter a month falls in: `2026-07` → `2026-Q3`. */
export function quarterOf(month: PeriodLabel): PeriodLabel {
  return `${month.slice(0, 4)}-Q${Math.ceil(Number(month.slice(5, 7)) / 3)}`
}

/** The last whole quarter on or before a month: `2026-07` → `2026-Q2`; `2026-06` → `2026-Q2`. */
export function lastWholeQuarter(month: PeriodLabel): PeriodLabel {
  const year = yearOf(month)
  const monthNumber = Number(month.slice(5, 7))
  const quarter = Math.floor(monthNumber / 3)
  return quarter === 0 ? `${year - 1}-Q4` : `${year}-Q${quarter}`
}
