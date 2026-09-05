import type { InsTimePeriod } from '@/schemas/ins'
import type { ReportPeriodType } from '@/schemas/reporting'

/** Only these three source cadences have chart/calendar period grammars. */
export function validPeriodDate(date: string, type: ReportPeriodType): boolean {
  if (type === 'YEAR') return /^\d{4}$/.test(date)
  if (type === 'QUARTER') return /^\d{4}-Q[1-4]$/.test(date)
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(date)
}

export function periodOrdinal(label: string, type: ReportPeriodType): number {
  const year = Number(label.slice(0, 4))
  if (type === 'YEAR') return year
  if (type === 'QUARTER') return year * 4 + Number(label.slice(6)) - 1
  return year * 12 + Number(label.slice(5)) - 1
}

/** Inverse of the validated annual/quarter/month ordinal, without timezone arithmetic. */
export function periodAtOrdinal(
  ordinal: number,
  type: ReportPeriodType,
): string {
  if (type === 'YEAR') return String(ordinal).padStart(4, '0')
  const size = type === 'QUARTER' ? 4 : 12
  const year = Math.floor(ordinal / size)
  const part = (ordinal % size) + 1
  return type === 'QUARTER'
    ? `${String(year).padStart(4, '0')}-Q${part}`
    : `${String(year).padStart(4, '0')}-${String(part).padStart(2, '0')}`
}

/** Supported calendar labels and redundant fields must describe the same period. */
export function validSourcePeriodFields(period: InsTimePeriod): boolean {
  const type =
    period.periodicity === 'ANNUAL'
      ? 'YEAR'
      : period.periodicity === 'QUARTERLY'
        ? 'QUARTER'
        : period.periodicity === 'MONTHLY'
          ? 'MONTH'
          : null
  if (type === null) return true // Other INS cadences have no chart grammar here.
  return (
    validPeriodDate(period.iso_period, type) &&
    period.year === Number(period.iso_period.slice(0, 4)) &&
    (period.quarter ?? null) ===
      (type === 'QUARTER' ? Number(period.iso_period.slice(6)) : null) &&
    (period.month ?? null) ===
      (type === 'MONTH' ? Number(period.iso_period.slice(5)) : null)
  )
}
