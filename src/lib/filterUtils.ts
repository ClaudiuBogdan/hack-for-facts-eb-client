import {
  defaultCommitmentsPeriodStartYear,
  defaultExecutionPeriodStartYear,
  defaultYearRange,
  type AnalyticsFilterType,
  type CommitmentsFilterType,
  type CommitmentsReportType,
} from '@/schemas/charts'
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES, DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES } from './analytics-defaults'
import type { ReportPeriodInput, PeriodDate } from '@/schemas/reporting'
import type { CommitmentsFilterInput } from '@/schemas/commitments'
import { toReportGqlType } from '@/schemas/reporting'
import { normalizeNormalizationOptions } from '@/lib/normalization'

function buildReportPeriodFromYears(
  years: readonly number[] | number[] | undefined,
  defaultStartYear: number
): ReportPeriodInput {
  const start = Array.isArray(years) && years.length > 0 ? Math.min(...years) : defaultStartYear
  const end = Array.isArray(years) && years.length > 0 ? Math.max(...years) : defaultYearRange.end
  return {
    type: 'YEAR',
    selection: { interval: { start: `${start}` as PeriodDate, end: `${end}` as PeriodDate } },
  }
}

export function ensureReportPeriod(filter: AnalyticsFilterType, fallback?: { period?: ReportPeriodInput }): ReportPeriodInput {
  if (filter.report_period) return filter.report_period as ReportPeriodInput
  if (fallback?.period) return fallback.period
  return buildReportPeriodFromYears(undefined, defaultExecutionPeriodStartYear)
}

export function withDefaultExcludes(filter: AnalyticsFilterType): AnalyticsFilterType {
  const accountCategory = filter.account_category ?? 'ch'
  const exclude = { ...(filter.exclude ?? {}) }

  if (accountCategory === 'ch') {
    const economicPrefixes = new Set<string>([
      ...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES,
      ...(exclude.economic_prefixes ?? []),
    ])
    exclude.economic_prefixes = Array.from(economicPrefixes)
  } else if (accountCategory === 'vn') {
    const functionalPrefixes = new Set<string>([
      ...DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES,
      ...(exclude.functional_prefixes ?? []),
    ])
    exclude.functional_prefixes = Array.from(functionalPrefixes)
  }

  const hasExcludeValues = Object.values(exclude).some((value) => {
    if (Array.isArray(value)) return value.length > 0
    return value !== undefined
  })

  return {
    ...filter,
    account_category: accountCategory,
    exclude: hasExcludeValues ? exclude : undefined,
  }
}

export function normalizeAnalyticsFilter(filter: AnalyticsFilterType, fallback?: { period?: ReportPeriodInput }): AnalyticsFilterType {
  const accountCategory = filter.account_category ?? 'ch'
  const normalizedNormalization = normalizeNormalizationOptions({
    normalization: filter.normalization,
    currency: filter.currency,
    inflation_adjusted: filter.inflation_adjusted,
    show_period_growth: filter.show_period_growth,
  })
  const normalized: AnalyticsFilterType = {
    ...filter,
    account_category: accountCategory,
    report_period: ensureReportPeriod(filter, fallback),
    normalization: normalizedNormalization.normalization,
    currency: normalizedNormalization.currency,
    inflation_adjusted: normalizedNormalization.inflation_adjusted,
    show_period_growth: normalizedNormalization.show_period_growth,
  }
  return normalized
}

// Prepare a filter object for GraphQL server variables
export function prepareFilterForServer(filter: AnalyticsFilterType, fallback?: { period?: ReportPeriodInput }): AnalyticsFilterType {
  const normalized = normalizeAnalyticsFilter(filter, fallback)
  // Allowlist of fields accepted by AnalyticsFilterInput on the server
  const allowedKeys = new Set<keyof AnalyticsFilterType | string>([
    'account_category',
    'report_period',
    'report_type',
    'report_ids',
    'main_creditor_cui',
    'entity_cuis',
    'functional_codes',
    'functional_prefixes',
    'economic_codes',
    'economic_prefixes',
    'funding_source_ids',
    'budget_sector_ids',
    'expense_types',
    'program_codes',
    'county_codes',
    'regions',
    'uat_ids',
    'entity_types',
    'tags',
    'is_uat',
    'is_territorial_executive',
    'search',
    'min_population',
    'max_population',
    'normalization',
    'currency',
    'inflation_adjusted',
    'show_period_growth',
    'aggregate_min_amount',
    'aggregate_max_amount',
    'item_min_amount',
    'item_max_amount',
  ])

  const serverFilter: Partial<AnalyticsFilterType> = {}

  for (const [k, v] of Object.entries(normalized)) {
    if (allowedKeys.has(k)) (serverFilter as Record<string, unknown>)[k] = v
  }
  // Pass through nested exclude filters if present
  if (normalized.exclude) {
    serverFilter.exclude = normalized.exclude
  }
  if (serverFilter.report_type) {
    try {
      (serverFilter as Record<string, unknown>).report_type = toReportGqlType(String(serverFilter.report_type))
    } catch {
      // leave as-is if mapping fails
    }
  }
  return serverFilter as AnalyticsFilterType
}

function coerceCommitmentsReportType(reportType: unknown): CommitmentsReportType | undefined {
  const value = String(reportType ?? '').trim()
  if (!value) return undefined

  if (value === 'PRINCIPAL_AGGREGATED') return 'PRINCIPAL_AGGREGATED'
  if (value === 'SECONDARY_AGGREGATED') return 'SECONDARY_AGGREGATED'
  if (value === 'DETAILED') return 'DETAILED'

  if (value === 'COMMITMENT_PRINCIPAL_AGGREGATED') return 'PRINCIPAL_AGGREGATED'
  if (value === 'COMMITMENT_SECONDARY_AGGREGATED') return 'SECONDARY_AGGREGATED'
  if (value === 'COMMITMENT_DETAILED') return 'DETAILED'

  if (value === 'Executie bugetara agregata la nivel de ordonator principal') return 'PRINCIPAL_AGGREGATED'
  if (value === 'Executie bugetara agregata la nivel de ordonator secundar') return 'SECONDARY_AGGREGATED'
  if (value === 'Executie bugetara detaliata') return 'DETAILED'
  if (value === 'Angajamente bugetare agregat principal') return 'PRINCIPAL_AGGREGATED'
  if (value === 'Angajamente bugetare agregat secundar') return 'SECONDARY_AGGREGATED'
  if (value === 'Angajamente bugetare detaliat') return 'DETAILED'

  return undefined
}

export function normalizeCommitmentsFilter(
  filter: CommitmentsFilterType,
  fallback?: { period?: ReportPeriodInput }
): CommitmentsFilterType {
  const normalizedNormalization = normalizeNormalizationOptions({
    normalization: filter.normalization,
    currency: filter.currency,
    inflation_adjusted: filter.inflation_adjusted,
    show_period_growth: filter.show_period_growth,
  })

  const exclude = { ...(filter.exclude ?? {}) }
  if (!exclude.economic_prefixes?.length) {
    exclude.economic_prefixes = [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES]
  }

  return {
    ...filter,
    report_period: filter.report_period ?? fallback?.period ?? buildReportPeriodFromYears(undefined, defaultCommitmentsPeriodStartYear),
    report_type: coerceCommitmentsReportType(filter.report_type) ?? 'PRINCIPAL_AGGREGATED',
    normalization: normalizedNormalization.normalization,
    currency: normalizedNormalization.currency,
    inflation_adjusted: normalizedNormalization.inflation_adjusted,
    show_period_growth: normalizedNormalization.show_period_growth,
    exclude,
  }
}

export function prepareCommitmentsFilterForServer(
  filter: CommitmentsFilterType,
  fallback?: { period?: ReportPeriodInput }
): CommitmentsFilterInput {
  const normalized = normalizeCommitmentsFilter(filter, fallback)
  const allowedKeys = new Set<keyof CommitmentsFilterType | string>([
    'report_period',
    'report_type',
    'entity_cuis',
    'main_creditor_cui',
    'entity_types',
    'is_uat',
    'is_territorial_executive',
    'search',
    'functional_codes',
    'functional_prefixes',
    'economic_codes',
    'economic_prefixes',
    'funding_source_ids',
    'budget_sector_ids',
    'county_codes',
    'regions',
    'uat_ids',
    'min_population',
    'max_population',
    'aggregate_min_amount',
    'aggregate_max_amount',
    'item_min_amount',
    'item_max_amount',
    'normalization',
    'currency',
    'inflation_adjusted',
    'show_period_growth',
  ])

  const serverFilter: Partial<CommitmentsFilterInput> = {}

  for (const [k, v] of Object.entries(normalized)) {
    if (allowedKeys.has(k)) {
      ; (serverFilter as Record<string, unknown>)[k] = v
    }
  }
  if (normalized.exclude) {
    // Whitelist exclude sub-keys too: CommitmentsExcludeInput has no `tags`
    // field, but a series switched from an analytics type can still carry
    // exclude.tags in its stored filter — passing it through would fail
    // GraphQL validation on every commitments query for that series.
    const allowedExcludeKeys = new Set([
      'report_ids',
      'entity_cuis',
      'main_creditor_cui',
      'functional_codes',
      'functional_prefixes',
      'economic_codes',
      'economic_prefixes',
      'funding_source_ids',
      'budget_sector_ids',
      'county_codes',
      'regions',
      'uat_ids',
      'entity_types',
    ])
    const exclude: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(normalized.exclude)) {
      if (allowedExcludeKeys.has(k)) exclude[k] = v
    }
    serverFilter.exclude = exclude as CommitmentsFilterInput['exclude']
  }

  const normalizedReportPeriod = normalized.report_period as ReportPeriodInput | undefined
  serverFilter.report_period =
    normalizedReportPeriod ?? buildReportPeriodFromYears(undefined, defaultCommitmentsPeriodStartYear)
  serverFilter.report_type = coerceCommitmentsReportType(serverFilter.report_type) ?? 'PRINCIPAL_AGGREGATED'
  return serverFilter as CommitmentsFilterInput
}
