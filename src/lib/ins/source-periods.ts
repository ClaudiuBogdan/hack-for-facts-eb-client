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
