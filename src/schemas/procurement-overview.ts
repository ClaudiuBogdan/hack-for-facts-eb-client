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

const optionalGeographyKey = z
  .preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1).max(64).optional(),
  )
  .catch(undefined)

/**
 * Explicit all-time marker. Absent dates without this flag resolve to the
 * previous calendar year (hub default). Custom `dateFrom`/`dateTo` win when set.
 */
const optionalPeriodMode = z
  .enum(['all'])
  .optional()
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
    period: optionalPeriodMode,
    buyerRegion: optionalGeographyKey,
    buyerCounty: optionalGeographyKey,
    supplierRegion: optionalGeographyKey,
    supplierCounty: optionalGeographyKey,
  })
  .passthrough()

export type ProcurementOverviewSearch = {
  readonly tab?: 'overview' | 'search'
  readonly dateFrom?: string
  readonly dateTo?: string
  /** When `all`, hub analytics are unscoped by time (explicit escape from default). */
  readonly period?: 'all'
  readonly buyerRegion?: string
  readonly buyerCounty?: string
  readonly supplierRegion?: string
  readonly supplierCounty?: string
  readonly [key: string]: unknown
}

export type ProcurementLandingFilters = {
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly period?: 'all'
  /** Requested breakdown basis; the server may gate value back to count. */
  readonly rankBy?: 'count' | 'value'
  readonly buyerRegion?: string
  readonly buyerCounty?: string
  readonly buyerSiruta?: string
  readonly supplierRegion?: string
  readonly supplierCounty?: string
  readonly supplierSiruta?: string
  /**
   * Row filters (never fix a breakdown dimension, so they are safe on every
   * landing facet): free-text title q + awarded-value bounds in RON.
   */
  readonly q?: string
  readonly valueMin?: number
  readonly valueMax?: number
  /**
   * Party / CPV scopes (C1 closed 2026-07-24): landing serves them by
   * SKIPPING the facet dimension each one fixes (a scope-fixed breakdown is
   * a single bucket the server rejects); stats/series always apply them.
   */
  readonly authorityCui?: string
  readonly supplierCui?: string
  readonly cpvDivision?: string
  readonly cpvGroup?: string
  readonly cpvClass?: string
  readonly cpvCategory?: string
  readonly cpvCode?: string
  /**
   * Analysis grain for territory/map-scoped aggregates. Overview landing omits
   * this and returns both contract + DA blocks for client selection.
   */
  readonly grain?: 'procedure' | 'contract' | 'direct_acquisition'
}

export type ResolvedProcurementOverviewPeriod = {
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly isDefault: boolean
  readonly isAllTime: boolean
}

/** Previous UTC calendar year as month-normalized ISO bounds. */
export function getPreviousCalendarYearBounds(
  now: Date = new Date(),
): { readonly dateFrom: string; readonly dateTo: string } {
  return getCalendarYearBounds(now.getUTCFullYear() - 1)
}

/** Full calendar year as month-normalized ISO bounds (`YYYY-01-01` … `YYYY-12-31`). */
export function getCalendarYearBounds(
  year: number,
): { readonly dateFrom: string; readonly dateTo: string } {
  return {
    dateFrom: `${year}-01-01`,
    dateTo: `${year}-12-31`,
  }
}

/**
 * Quick period presets: current UTC year and the two prior years
 * (e.g. 2026, 2025, 2024).
 */
export function getRecentCalendarYearQuickOptions(
  now: Date = new Date(),
): readonly [number, number, number] {
  const currentYear = now.getUTCFullYear()
  return [currentYear, currentYear - 1, currentYear - 2]
}

/** Oldest year offered in the period year dropdown. */
export const PROCUREMENT_PERIOD_OLDEST_YEAR = 2020

/**
 * Older calendar years for the dropdown — immediately after the three quick
 * presets, down to {@link PROCUREMENT_PERIOD_OLDEST_YEAR} (newest first).
 */
export function getOlderCalendarYearOptions(
  now: Date = new Date(),
  oldestYear: number = PROCUREMENT_PERIOD_OLDEST_YEAR,
): readonly number[] {
  const [, , oldestQuickYear] = getRecentCalendarYearQuickOptions(now)
  const years: number[] = []
  for (let year = oldestQuickYear - 1; year >= oldestYear; year -= 1) {
    years.push(year)
  }
  return years
}

/** True when the resolved period is exactly one full calendar year. */
export function matchesCalendarYearPeriod(
  period: Pick<
    ResolvedProcurementOverviewPeriod,
    'dateFrom' | 'dateTo' | 'isAllTime'
  >,
  year: number,
): boolean {
  if (period.isAllTime) return false
  const bounds = getCalendarYearBounds(year)
  return period.dateFrom === bounds.dateFrom && period.dateTo === bounds.dateTo
}

/**
 * Full calendar year selected by the resolved period, when it matches a
 * complete Jan–Dec range (including the soft previous-year default).
 */
export function selectedCalendarYearFromPeriod(
  period: Pick<
    ResolvedProcurementOverviewPeriod,
    'dateFrom' | 'dateTo' | 'isAllTime'
  >,
): number | undefined {
  if (period.isAllTime || !period.dateFrom) return undefined
  const year = Number(period.dateFrom.slice(0, 4))
  if (!Number.isInteger(year) || !matchesCalendarYearPeriod(period, year)) {
    return undefined
  }
  return year
}

/**
 * Resolve the hub period for display and analytics.
 *
 * - `period=all` → all time (no month bounds)
 * - explicit `dateFrom` / `dateTo` → those months
 * - otherwise → previous calendar year (product default)
 */
export function resolveProcurementOverviewPeriod(
  filters: Pick<ProcurementLandingFilters, 'dateFrom' | 'dateTo' | 'period'>,
  now: Date = new Date(),
): ResolvedProcurementOverviewPeriod {
  if (filters.period === 'all') {
    return { isDefault: false, isAllTime: true }
  }

  const dateFrom = normalizeProcurementMonthStart(filters.dateFrom)
  const dateTo = normalizeProcurementMonthEnd(filters.dateTo)
  if (dateFrom || dateTo) {
    return {
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      isDefault: false,
      isAllTime: false,
    }
  }

  const defaults = getPreviousCalendarYearBounds(now)
  return {
    dateFrom: defaults.dateFrom,
    dateTo: defaults.dateTo,
    isDefault: true,
    isAllTime: false,
  }
}

/** Filters sent to landing/analytics APIs after period resolution. */
export function toProcurementLandingQueryFilters(
  filters: ProcurementLandingFilters,
  now: Date = new Date(),
): ProcurementLandingFilters {
  const resolved = resolveProcurementOverviewPeriod(filters, now)
  return {
    rankBy: filters.rankBy,
    buyerRegion: filters.buyerRegion,
    buyerCounty: filters.buyerCounty,
    buyerSiruta: filters.buyerSiruta,
    supplierRegion: filters.supplierRegion,
    supplierCounty: filters.supplierCounty,
    supplierSiruta: filters.supplierSiruta,
    q: filters.q,
    valueMin: filters.valueMin,
    valueMax: filters.valueMax,
    authorityCui: filters.authorityCui,
    supplierCui: filters.supplierCui,
    cpvDivision: filters.cpvDivision,
    cpvGroup: filters.cpvGroup,
    cpvClass: filters.cpvClass,
    cpvCategory: filters.cpvCategory,
    cpvCode: filters.cpvCode,
    ...(resolved.dateFrom ? { dateFrom: resolved.dateFrom } : {}),
    ...(resolved.dateTo ? { dateTo: resolved.dateTo } : {}),
  }
}

export function parseProcurementOverviewSearch(
  input: unknown,
): ProcurementOverviewSearch {
  const parsed = procurementOverviewSearchSchema.parse(input ?? {})
  const {
    dateFrom,
    dateTo,
    period,
    buyerRegion,
    buyerCounty,
    supplierRegion,
    supplierCounty,
    ...rest
  } = parsed
  const normalizedFrom = normalizeProcurementMonthStart(dateFrom)
  const normalizedTo = normalizeProcurementMonthEnd(dateTo)

  return {
    ...rest,
    ...(normalizedFrom ? { dateFrom: normalizedFrom } : {}),
    ...(normalizedTo ? { dateTo: normalizedTo } : {}),
    ...(period === 'all' ? { period: 'all' as const } : {}),
    // County is the more specific deep-link when stale URLs contain both;
    // it scopes analytics natively (ClickHouse, dev 2026-07-22).
    ...(buyerCounty
      ? { buyerCounty }
      : buyerRegion
        ? { buyerRegion }
        : {}),
    ...(supplierCounty
      ? { supplierCounty }
      : supplierRegion
        ? { supplierRegion }
        : {}),
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
