import { z } from 'zod'

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function isCalendarDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    year >= 2000 &&
    year <= 2100 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

const optionalOverviewDate = z
  .preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().refine(isCalendarDate).optional(),
  )
  .catch(undefined)

export function normalizeProcurementMonthStart(
  value: string | undefined,
): string | undefined {
  if (!value || !isCalendarDate(value)) return undefined
  return `${value.slice(0, 7)}-01`
}

export function normalizeProcurementMonthEnd(
  value: string | undefined,
): string | undefined {
  if (!value || !isCalendarDate(value)) return undefined

  const [year, month] = value.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${value.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`
}

export const procurementOverviewSearchSchema = z
  .object({
    tab: z.enum(['overview', 'search']).optional().catch(undefined),
    dateFrom: optionalOverviewDate,
    dateTo: optionalOverviewDate,
  })
  .passthrough()

export type ProcurementOverviewSearch = {
  readonly tab?: 'overview' | 'search'
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly [key: string]: unknown
}

export type ProcurementLandingFilters = {
  readonly dateFrom?: string
  readonly dateTo?: string
}

export function parseProcurementOverviewSearch(
  input: unknown,
): ProcurementOverviewSearch {
  const parsed = procurementOverviewSearchSchema.parse(input ?? {})
  const { dateFrom, dateTo, ...rest } = parsed
  const normalizedFrom = normalizeProcurementMonthStart(dateFrom)
  const normalizedTo = normalizeProcurementMonthEnd(dateTo)

  return {
    ...rest,
    ...(normalizedFrom ? { dateFrom: normalizedFrom } : {}),
    ...(normalizedTo ? { dateTo: normalizedTo } : {}),
  }
}

/** Full URL dates become the calendar-month bounds accepted by analytics. */
export function buildProcurementOverviewMonthScope(
  filters: ProcurementLandingFilters,
): { readonly monthFrom?: string; readonly monthTo?: string } {
  const dateFrom = normalizeProcurementMonthStart(filters.dateFrom)
  const dateTo = normalizeProcurementMonthEnd(filters.dateTo)
  return {
    ...(dateFrom ? { monthFrom: dateFrom.slice(0, 7) } : {}),
    ...(dateTo ? { monthTo: dateTo.slice(0, 7) } : {}),
  }
}
