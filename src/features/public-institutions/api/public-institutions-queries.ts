import { queryOptions, skipToken } from '@tanstack/react-query'
import { getChartAnalytics } from '@/lib/api/charts'
import { entityRankingFilter, fetchEntityAnalytics } from '@/lib/api/entity-analytics'
import { entityAnalyticsQueryOptions } from '@/lib/entity-analytics-query'
import { generateHash } from '@/lib/utils'
import type { AnalyticsFilterType, AnalyticsInput } from '@/schemas/charts'
import { coverageRead, figuresRead, largestRead, previousYearRead, rankingRead, type Selection } from '../lib/public-institutions-selection'

/**
 * The page's reads as query options, for the route's loader (the server
 * prefetches the ranking and the figures) and for the page (which reads the
 * same keys). The ranking goes through the old page's own options, so the two
 * pages share a cache. A read the selection does not need is skipped.
 */

const MINUTE = 60_000

function seriesOptions(key: string, inputs: readonly AnalyticsInput[] | null, staleTime: number) {
  return queryOptions({
    queryKey: ['public-institutions', key, inputs ? generateHash(JSON.stringify(inputs)) : 'none'],
    queryFn: inputs ? ({ signal }) => getChartAnalytics([...inputs], signal) : skipToken,
    staleTime,
  })
}

/** Institutions in a fixed order, a page of them: the ten largest, or the same rows a year earlier. */
function rowsOptions(key: string, read: ReturnType<typeof largestRead> | ReturnType<typeof previousYearRead>) {
  return queryOptions({
    queryKey: ['public-institutions', key, read ? generateHash(JSON.stringify(read)) : 'none'],
    queryFn: read
      ? ({ signal }) => fetchEntityAnalytics({ signal, filter: entityRankingFilter(read.filter), sort: { by: read.sortBy, order: read.sortOrder }, limit: read.pageSize, offset: 0 })
      : skipToken,
    staleTime: MINUTE,
  })
}

export function rankingQueryOptions(selection: Selection) {
  return entityAnalyticsQueryOptions(rankingRead(selection))
}

/** The selection's figures: one series over the year and the one before. */
export function figuresQueryOptions(selection: Selection) {
  return seriesOptions('figures', figuresRead(selection), 5 * MINUTE)
}

/** The ten largest, when the ranking's page is not already them. */
export function largestQueryOptions(selection: Selection) {
  return rowsOptions('largest', largestRead(selection))
}

/** The page's rows a year earlier, once the year is known to be whole. */
export function previousYearQueryOptions(selection: Selection, cuis: readonly string[], wholeYear: boolean) {
  return rowsOptions('previous-year', wholeYear ? previousYearRead(selection, cuis) : null)
}

/** December, or a year of months, of the whole budget: how far the reports reach. Skipped when `year` is null. */
export function coverageQueryOptions(year: number | null, months: 'december' | 'months', base: { readonly account_category: AnalyticsFilterType['account_category']; readonly report_type?: string }) {
  return seriesOptions(`coverage-${months}`, year == null ? null : coverageRead(year, months, base), 30 * MINUTE)
}
