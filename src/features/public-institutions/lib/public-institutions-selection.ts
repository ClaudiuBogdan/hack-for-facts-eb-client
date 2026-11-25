import type { AnalyticsFilterType, AnalyticsInput, Currency } from '@/schemas/charts'
import type { AggregatedLineItem } from '@/schemas/entity-analytics'

/**
 * `/public-institutions`: what one address asks, as the reads that answer it.
 * The route's loader (on the server) and the page (in the browser) both build
 * their reads here, from the same address and the same preferences, so the
 * server's answers are the ones the page asks for and nothing is read twice.
 * No Lingui, no classification data: the loader imports this on every visit.
 */

export const PRINCIPAL_REPORT = 'Executie bugetara agregata la nivel de ordonator principal'
export const SECONDARY_REPORT = 'Executie bugetara agregata la nivel de ordonator secundar'
export const DETAILED_REPORT = 'Executie bugetara detaliata'

export type Preferences = { readonly currency: Currency; readonly inflationAdjusted: boolean }

/** The ranking's address keys, as `useEntityAnalyticsFilter` parses them. */
export type RankingAddress = {
  readonly filter: AnalyticsFilterType
  readonly sortBy?: string
  readonly sortOrder: 'asc' | 'desc'
  readonly page: number
  readonly pageSize: number
}

/** How the amounts are measured: the two the head offers, or one only an older link asks for (% of GDP). */
export type Measure = 'total' | 'per_capita' | 'other'

export type Selection = {
  /** The address's filter with the reader's preferences and the euro aliases resolved. */
  readonly filter: AnalyticsFilterType
  /** The filter as the ranking reads it: per inhabitant keeps to the territorial executives unless the address says otherwise. */
  readonly rankingFilter: AnalyticsFilterType
  readonly measure: Measure
  readonly sortBy: string
  readonly sortOrder: 'asc' | 'desc'
  readonly page: number
  readonly pageSize: number
  /** The one year the period names, or null for anything else (months, a span of years). */
  readonly year: number | null
}

/** A single year the period names, or null when it is anything else. */
export function singleYear(period: AnalyticsFilterType['report_period']): number | null {
  if (!period || period.type !== 'YEAR') return null
  const { interval, dates } = period.selection
  const value = interval && interval.start === interval.end ? interval.start : dates && dates.length === 1 ? dates[0] : null
  const year = Number(value)
  return value != null && Number.isInteger(year) ? year : null
}

export function yearPeriod(from: number, to: number): AnalyticsFilterType['report_period'] {
  return { type: 'YEAR', selection: { interval: { start: String(from), end: String(to) } } } as AnalyticsFilterType['report_period']
}

/**
 * The selection an address asks for. `resolve` is the old page's own
 * resolution (`resolveEntityAnalyticsFilter`): the euro aliases, the reader's
 * currency and inflation setting where the address names none.
 */
export function selectionOf(
  address: RankingAddress,
  preferences: Preferences,
  resolve: (filter: AnalyticsFilterType, preferences: Preferences) => AnalyticsFilterType,
  rankingFilter: (filter: AnalyticsFilterType) => AnalyticsFilterType,
): Selection {
  const resolved = resolve(address.filter, preferences)
  const filter: AnalyticsFilterType = {
    ...resolved,
    // One kind of report: with none named the API adds every kind, counting the same money twice (a ministry and its subordinates).
    report_type: resolved.report_type ?? PRINCIPAL_REPORT,
    // The page shows amounts, never a period-over-period growth an older link may ask for.
    show_period_growth: undefined,
  }
  const measure: Measure = filter.normalization === 'per_capita' ? 'per_capita' : filter.normalization === 'total' || filter.normalization == null ? 'total' : 'other'
  // The API reads a column name in any case; the page compares them in lower case.
  const sortBy = address.sortBy?.toLowerCase()
  // A % of GDP list cannot be ordered per inhabitant or by population (the API refuses it).
  const sortable = measure !== 'other' || (sortBy !== 'per_capita_amount' && sortBy !== 'population')
  const ranked = rankingFilter(filter)
  return {
    filter,
    // Per inhabitant the API ranks the territorial executives only, whatever the address says; the page's other reads follow it.
    rankingFilter: measure === 'per_capita' ? { ...ranked, is_territorial_executive: true } : ranked,
    measure,
    // The list is ordered by what it measures unless the address says otherwise.
    sortBy: (sortable ? sortBy : undefined) ?? (measure === 'per_capita' ? 'per_capita_amount' : 'total_amount'),
    sortOrder: address.sortOrder,
    page: address.page,
    pageSize: address.pageSize,
    year: singleYear(filter.report_period),
  }
}

/** The ranking's own read. */
export function rankingRead(selection: Selection) {
  const { filter, sortBy, sortOrder, page, pageSize } = selection
  return { filter, sortBy, sortOrder, page, pageSize }
}

/** An amount threshold chooses institutions by their own sum; a sum over all of them, or over chapters, would apply it to something else. */
export function hasAmountThreshold(filter: AnalyticsFilterType): boolean {
  return filter.aggregate_min_amount != null || filter.aggregate_max_amount != null
}

/**
 * The selection's figures: one series over the year and the one before, in
 * the measure shown (and, per inhabitant, the total too). None for a period
 * that is not one year, for a measure the head does not offer, or under an
 * amount threshold (the series would apply it to the selection's whole sum).
 */
export function figuresRead(selection: Selection): readonly AnalyticsInput[] | null {
  const { year, measure, rankingFilter } = selection
  if (year == null || measure === 'other' || hasAmountThreshold(rankingFilter)) return null
  const report_period = yearPeriod(year - 1, year)
  const total: AnalyticsInput = { seriesId: 'total', filter: { ...rankingFilter, normalization: 'total', report_period } }
  if (measure === 'total') return [total]
  return [total, { seriesId: 'per-capita', filter: { ...rankingFilter, normalization: 'per_capita', report_period } }]
}

/**
 * The ten largest by total amount, for the figures' share. When the ranking's
 * own page already is those ten (total, largest first, page one), there is
 * nothing more to read.
 */
export function largestRead(selection: Selection) {
  if (selection.year == null || selection.measure !== 'total' || hasAmountThreshold(selection.filter)) return null
  if (selection.sortBy === 'total_amount' && selection.sortOrder === 'desc' && selection.page === 1 && selection.pageSize >= 10) return null
  return { filter: { ...selection.filter, normalization: 'total' as const }, sortBy: 'total_amount', sortOrder: 'desc' as const, page: 1, pageSize: 10 }
}

/** The same institutions a year earlier: the page's rows, the thresholds dropped (they choose rows; a row is compared, not chosen). */
export function previousYearRead(selection: Selection, cuis: readonly string[]) {
  if (selection.year == null || cuis.length === 0) return null
  return {
    filter: {
      ...selection.filter,
      entity_cuis: [...cuis],
      aggregate_min_amount: undefined,
      aggregate_max_amount: undefined,
      min_population: undefined,
      max_population: undefined,
      report_period: yearPeriod(selection.year - 1, selection.year - 1),
    },
    sortBy: 'total_amount',
    sortOrder: 'desc' as const,
    page: 1,
    pageSize: cuis.length,
  }
}

/**
 * What the breakdown reads: the ranking's own institutions (the per-capita
 * scope included), without an amount threshold, which the API would apply to
 * each chapter rather than to each institution.
 */
export function breakdownFilter(selection: Selection): AnalyticsFilterType {
  return { ...selection.rankingFilter, aggregate_min_amount: undefined, aggregate_max_amount: undefined }
}

/** A relative change, or null when there is nothing to compare with. */
export function changeOf(now: number | null | undefined, before: number | null | undefined): number | null {
  if (now == null || before == null || before === 0) return null
  return (now - before) / Math.abs(before)
}

// ──────────────────────────────────────────────────────── transfers ──

export type TransferChoice = 'all' | 'no-transfers' | 'transfers-only'

/**
 * Money one public budget passes to another, by the entity page's rules
 * (`FinancialDataCard`): expenses by economic title 51.01 and 51.02. The
 * income rules (functional 36.02.05, 37.02.03, 37.02.04, 47.02.04) are not
 * in the principal-level reports, so income offers no choice.
 */
export function isExpenseTransfer(node: Pick<AggregatedLineItem, 'ec_c'>): boolean {
  const code = node.ec_c ?? ''
  return code.startsWith('51.01') || code.startsWith('51.02')
}

export function withTransfers<T extends Pick<AggregatedLineItem, 'ec_c'>>(nodes: readonly T[], choice: TransferChoice, income: boolean): readonly T[] {
  if (income || choice === 'all') return nodes
  return nodes.filter((node) => isExpenseTransfer(node) === (choice === 'transfers-only'))
}

// ───────────────────────────────────────────────────── how far the data reaches ──

/**
 * How to learn whether a year's reports are whole. A year whose December
 * report has had three months to arrive is whole without asking. The year
 * just ended, in its first three months, reads its December report and,
 * when that is missing, its months. The year in progress reads its months:
 * the last one with an amount says how far the data reaches.
 */
export function coveragePlan(year: number, now: Date): 'whole' | 'december' | 'months' {
  const current = now.getUTCFullYear()
  if (year >= current) return 'months'
  if (year === current - 1 && now.getUTCMonth() < 3) return 'december'
  return 'whole'
}

/** One month of the whole budget, for the coverage reads: December, or the whole year when December is not there. */
export function coverageRead(year: number, months: 'december' | 'months', base: { readonly account_category: AnalyticsFilterType['account_category']; readonly report_type?: string }): readonly AnalyticsInput[] {
  const interval = months === 'december' ? { start: `${year}-12`, end: `${year}-12` } : { start: `${year}-01`, end: `${year}-12` }
  return [
    {
      seriesId: `coverage-${months}`,
      filter: {
        account_category: base.account_category,
        report_type: (base.report_type ?? PRINCIPAL_REPORT) as AnalyticsFilterType['report_type'],
        normalization: 'total',
        currency: 'RON',
        inflation_adjusted: false,
        report_period: { type: 'MONTH', selection: { interval } } as AnalyticsFilterType['report_period'],
      },
    },
  ]
}

/** The last month a series has an amount for, as „YYYY-MM”, or null. */
export function lastMonthOf(points: readonly { readonly x: string | number; readonly y: number }[]): string | null {
  return points.reduce<string | null>((latest, point) => (point.y !== 0 && (!latest || String(point.x) > latest) ? String(point.x) : latest), null)
}
