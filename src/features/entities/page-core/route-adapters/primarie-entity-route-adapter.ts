import type { ChallengeEntityInitialSettings } from '@/features/challenges/components/analysis/challenge-entity-analysis-queries'
import {
  buildChallengeEntityAnalysisCanonicalSearchPatch,
  normalizeChallengeEntityAnalysisSearch,
  type ChallengeEntityAnalysisRouteSearch,
  type ChallengeEntityAnalysisUrlState,
} from '@/features/challenges/schemas/challenge-entity-analysis-route-search-schema'
import {
  resolveEntityPagePublicSettings,
} from '../request/entity-page-public-settings'
import { resolveEntityPageQueryInputs } from '../request/entity-page-query-inputs'
import type {
  EntityPageExactQueryInputs,
  EntityPageExecutionContext,
} from '../types'

export type PrimarieEntityRouteAdapterInput = {
  readonly cui: string
  readonly search: ChallengeEntityAnalysisRouteSearch | undefined
}

export type PrimarieEntityRouteAdapterResult = {
  readonly normalizedSearch: ChallengeEntityAnalysisUrlState
  readonly canonicalSearchPatch: Partial<ChallengeEntityAnalysisRouteSearch>
  readonly shouldCanonicalizeSearch: boolean
  readonly initialSettings: ChallengeEntityInitialSettings
  readonly executionContext: EntityPageExecutionContext
  readonly exactQueryInputs: EntityPageExactQueryInputs
}

export function hasPrimarieEntityCanonicalSearchPatch(
  patch: Partial<ChallengeEntityAnalysisRouteSearch>,
): boolean {
  return Object.keys(patch).length > 0
}

export function applyPrimarieEntityCanonicalSearchPatch(
  previousSearch: Record<string, unknown>,
  patch: Partial<ChallengeEntityAnalysisRouteSearch>,
): Record<string, unknown> {
  const nextSearch = { ...previousSearch }

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete nextSearch[key]
      continue
    }

    nextSearch[key] = value
  }

  return nextSearch
}

export function filterPrimarieEntityRedirectSearchPatch(
  previousSearch: Record<string, unknown> | undefined,
  patch: Partial<ChallengeEntityAnalysisRouteSearch>,
): Partial<ChallengeEntityAnalysisRouteSearch> {
  const redirectPatch: Partial<ChallengeEntityAnalysisRouteSearch> = {}

  for (const [key, value] of Object.entries(patch)) {
    if (
      !previousSearch ||
      !Object.prototype.hasOwnProperty.call(previousSearch, key)
    ) {
      continue
    }

    ;(redirectPatch as Record<string, unknown>)[key] = value
  }

  return redirectPatch
}

export function resolvePrimarieEntityRouteAdapter(
  input: PrimarieEntityRouteAdapterInput,
): PrimarieEntityRouteAdapterResult {
  const normalizedSearch = normalizeChallengeEntityAnalysisSearch(input.search)
  const canonicalSearchPatch =
    buildChallengeEntityAnalysisCanonicalSearchPatch(
      input.search,
      normalizedSearch,
    )
  const publicSettings = resolveEntityPagePublicSettings({
    normalizationRaw: normalizedSearch.normalization,
    currencyParam: input.search?.currency,
    inflationAdjustedParam: input.search?.inflation_adjusted,
    showPeriodGrowthParam: input.search?.show_period_growth,
  })
  const initialSettings: ChallengeEntityInitialSettings = {
    currency: publicSettings.currency,
    inflationAdjusted: publicSettings.inflationAdjusted,
  }
  const executionContext: EntityPageExecutionContext = {
    routeId: 'primarie',
    cui: input.cui,
    lang: normalizedSearch.lang,
    period: normalizedSearch.period,
    year: normalizedSearch.year,
    month:
      normalizedSearch.period === 'MONTH' ? normalizedSearch.month : undefined,
    quarter:
      normalizedSearch.period === 'QUARTER'
        ? normalizedSearch.quarter
        : undefined,
    reportType: normalizedSearch.report_type,
    effectiveReportType: normalizedSearch.report_type,
    mainCreditorCui: normalizedSearch.main_creditor_cui,
    activeView: normalizedSearch.view,
    publicSettings,
  }

  return {
    normalizedSearch,
    canonicalSearchPatch,
    shouldCanonicalizeSearch: hasPrimarieEntityCanonicalSearchPatch(
      canonicalSearchPatch,
    ),
    initialSettings,
    executionContext,
    exactQueryInputs: resolveEntityPageQueryInputs({
      context: executionContext,
    }),
  }
}
