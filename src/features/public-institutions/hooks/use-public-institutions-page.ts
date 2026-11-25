import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLingui } from '@lingui/react'
import { usePeriodLabel } from '@/hooks/use-period-label'
import { useEntityAnalyticsFilter } from '@/hooks/useEntityAnalyticsFilter'
import { entityRankingFilter } from '@/lib/api/entity-analytics'
import { resolveEntityAnalyticsFilter } from '@/lib/entity-analytics-query'
import { useUserCurrency } from '@/lib/hooks/useUserCurrency'
import { useUserInflationAdjusted } from '@/lib/hooks/useUserInflationAdjusted'
import { getNormalizationUnit } from '@/lib/utils'
import type { ReportPeriodInput } from '@/schemas/reporting'
import { coverageQueryOptions, rankingQueryOptions } from '../api/public-institutions-queries'
import { coveragePlan, DETAILED_REPORT, lastMonthOf, SECONDARY_REPORT, selectionOf, type Preferences } from '../lib/public-institutions-selection'
import { chipsOf, sentenceOf, subjectOf, topicOf, whoOf } from '../lib/public-institutions-text'

/**
 * The page's state: the address (read and written through the old page's
 * hook, so the filters panel works unchanged), the reader's preferences as
 * the server read them, the selection and its ranking. The server's loader
 * builds the same selection (`selectionOf`), so its rows are the page's.
 */
export function usePublicInstitutionsPage(initialPreferences: Preferences) {
  const state = useEntityAnalyticsFilter()
  const { i18n } = useLingui()
  const [currency] = useUserCurrency(initialPreferences.currency)
  const [inflationAdjusted] = useUserInflationAdjusted(initialPreferences.inflationAdjusted)
  const selection = selectionOf(
    { filter: state.filter, sortBy: state.sortBy, sortOrder: state.sortOrder, page: state.page, pageSize: state.pageSize },
    { currency, inflationAdjusted },
    resolveEntityAnalyticsFilter,
    entityRankingFilter,
  )
  const ranking = useQuery(rankingQueryOptions(selection))
  const periodLabel = usePeriodLabel(state.filter.report_period as ReportPeriodInput | undefined)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const perCapita = selection.measure === 'per_capita'
  const income = state.filter.account_category === 'vn'
  const topic = topicOf(state.filter)
  const subject = subjectOf({ income, perCapita, who: whoOf(state.filter, perCapita) })
  const coverage = useYearCoverage(selection.year, selection.filter, ranking.data != null)
  const reportType = selection.filter.report_type
  return {
    ...state,
    locale: i18n.locale,
    selection,
    currency: selection.filter.currency ?? currency,
    /** „% din PIB” and the like: an amount that is not money. */
    unit: getNormalizationUnit({ normalization: selection.filter.normalization ?? 'total', currency: selection.filter.currency ?? currency }),
    perCapita,
    income,
    /** Which reports the amounts come from: the head's two choices, or the secondary officers' an older link may ask for. */
    reports: reportType === DETAILED_REPORT ? ('detailed' as const) : reportType === SECONDARY_REPORT ? ('secondary' as const) : ('principal' as const),
    ranking,
    periodLabel,
    topic,
    subject,
    sentence: sentenceOf({ subject, topic, periodLabel }),
    chips: chipsOf(state.filter, topic, perCapita),
    coverage,
    filtersOpen,
    setFiltersOpen,
  }
}

export type PublicInstitutionsState = ReturnType<typeof usePublicInstitutionsPage>

export type Coverage =
  | { readonly year: number; readonly status: 'complete' }
  | { readonly year: number; readonly status: 'partial'; readonly lastMonth: string | null }
  | { readonly year: number; readonly status: 'pending' | 'unknown' }

/**
 * Whether the selected year's reports are whole, and if not how far they
 * reach: derived from the reports, read only when the calendar leaves it in
 * doubt, after the ranking (the reads are slow: about 2 s a month, 6 s a
 * year). Only the year just ended, in its first three months, is ever
 * pending: the page compares nothing until its December report is found.
 */
function useYearCoverage(year: number | null, filter: { readonly account_category: 'ch' | 'vn'; readonly report_type?: string }, rankingReady: boolean): Coverage | null {
  const plan = year == null ? null : coveragePlan(year, new Date())
  const base = { account_category: filter.account_category, report_type: filter.report_type }
  const december = useQuery({ ...coverageQueryOptions(plan === 'december' ? year : null, 'december', base), enabled: rankingReady })
  const decemberHere = december.data ? lastMonthOf(december.data[0]?.data ?? []) != null : null
  const months = useQuery({ ...coverageQueryOptions(plan === 'months' || (plan === 'december' && decemberHere === false) ? year : null, 'months', base), enabled: rankingReady })
  if (year == null || plan == null) return null
  if (plan === 'whole' || decemberHere === true) return { year, status: 'complete' }
  // A year not yet over is never whole: the months only say how far it reaches.
  if (plan === 'months') return { year, status: 'partial', lastMonth: months.data ? lastMonthOf(months.data[0]?.data ?? []) : null }
  if (months.data) {
    const last = lastMonthOf(months.data[0]?.data ?? [])
    return last === `${year}-12` ? { year, status: 'complete' } : { year, status: 'partial', lastMonth: last }
  }
  if (december.isError || months.isError) return { year, status: 'unknown' }
  return { year, status: 'pending' }
}
