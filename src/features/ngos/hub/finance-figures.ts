import type { NgoHubDomainMetric } from '@/schemas/ngos'
import type { NgoFinanceDomain, NgoFinanceSize, NgoFinanceSizeKey, NgoFinanceSummary } from './finance-summary-types'

/**
 * The figures `/ong-uri` derives from the finance summary, as pure
 * functions: the domains ranked, the domains a sentence names, the revenue
 * classes and the year's change.
 */

/** The domain field a metric ranks by. */
export const DOMAIN_METRIC_FIELD: Readonly<Record<NgoHubDomainMetric, 'statements' | 'revenue'>> = {
  organizatii: 'statements',
  venituri: 'revenue',
}

/** The metric's total for the year, the base of every share. */
export function domainTotal(summary: NgoFinanceSummary, metric: NgoHubDomainMetric): number {
  return DOMAIN_METRIC_FIELD[metric] === 'revenue' ? summary.revenue : summary.statements
}

/**
 * The domains highest first by the metric, and apart the catch-all code
 * („other membership organisations"), which says an organisation files, not
 * what it does: it is shown last and never ranked.
 */
export function rankDomains(
  summary: NgoFinanceSummary,
  metric: NgoHubDomainMetric,
): { readonly ranked: readonly NgoFinanceDomain[]; readonly general: NgoFinanceDomain | null } {
  const field = DOMAIN_METRIC_FIELD[metric]
  return {
    ranked: summary.domains.filter((domain) => domain.key !== 'general').sort((a, b) => b[field] - a[field]),
    general: summary.domains.find((domain) => domain.key === 'general') ?? null,
  }
}

/**
 * The domains a sentence can name: the one with the most organisations and
 * the one with the most revenue, among the domains that say what an
 * organisation does (not the catch-all, not the unclassified rest).
 */
export function leadingDomains(summary: NgoFinanceSummary): { readonly most: NgoFinanceDomain | null; readonly richest: NgoFinanceDomain | null } {
  const named = summary.domains.filter((domain) => domain.key !== 'general' && domain.key !== 'other')
  const top = (field: 'statements' | 'revenue') => named.reduce<NgoFinanceDomain | null>((best, domain) => (!best || domain[field] > best[field] ? domain : best), null)
  return { most: top('statements'), richest: top('revenue') }
}

export function sizeClass(summary: NgoFinanceSummary, key: NgoFinanceSizeKey): NgoFinanceSize | null {
  return summary.sizes.find((size) => size.key === key) ?? null
}

/**
 * Revenue of the year before the summary's, when the two can be compared: a
 * first release lacks the late filers its revision adds, so it is compared
 * only with another first release, and a revision only with a revision.
 */
export function comparableRevenue(summary: NgoFinanceSummary): number | null {
  const latest = summary.years.find((point) => point.year === summary.year)
  const previous = summary.years.find((point) => point.year === summary.year - 1)
  return latest && previous && latest.firstRelease === previous.firstRelease ? previous.revenue : null
}

/** The years still at their first release, oldest first. */
export function firstReleaseYears(summary: NgoFinanceSummary): readonly number[] {
  return summary.years.filter((point) => point.firstRelease).map((point) => point.year)
}
