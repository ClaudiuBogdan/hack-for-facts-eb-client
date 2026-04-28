import type { EntitySearchSchema } from '@/components/entities/validation'
import type { ChallengeEntityAnalysisView } from '@/features/challenges/schemas/challenge-entity-analysis-route-search-schema'
import {
  resolveNormalizationSettings,
  type ForcedOverrides,
  type NormalizationInput,
} from '@/lib/globalSettings/params'
import { DEFAULT_SELECTED_YEAR } from '@/schemas/charts'
import {
  type ExecutionGqlReportType,
  toExecutionReportType,
  type ReportPeriodType,
  type TMonth,
  type TQuarter,
} from '@/schemas/reporting'
import { resolveEntityPagePublicSettings } from '../request/entity-page-public-settings'
import { resolveEntityPageQueryInputs } from '../request/entity-page-query-inputs'
import type {
  EntityPageExactQueryInputs,
  EntityPageExecutionContext,
  EntityPageLocale,
  EntityPagePublicSettings,
} from '../types'

const DEFAULT_VIEW: ChallengeEntityAnalysisView = 'main-info'
const DEFAULT_PERIOD: ReportPeriodType = 'YEAR'
const DEFAULT_MONTH: TMonth = '01'
const DEFAULT_QUARTER: TQuarter = 'Q1'
const DEFAULT_NORMALIZATION: NormalizationInput = 'total'
type EntitiesEntityRouteReportType = ExecutionGqlReportType

const CHALLENGE_VIEW_BY_LEGACY_ENTITY_VIEW: Record<string, ChallengeEntityAnalysisView> = {
  'main-info': 'main-info',
  overview: 'main-info',
  map: 'main-info',
  'expense-trends': 'main-info',
  'income-trends': 'main-info',
  ranking: 'main-info',
  'related-charts': 'main-info',
  relationships: 'main-info',
  reports: 'main-info',
  employees: 'main-info',
  contracts: 'contracts',
  commitments: 'commitments',
  ins: 'ins',
  'ins-stats': 'ins',
  profile: 'profile',
}

export type EntitiesEntityRouteNormalizedSearch = Omit<
  EntitySearchSchema,
  | 'lang'
  | 'view'
  | 'period'
  | 'year'
  | 'month'
  | 'quarter'
  | 'report_type'
  | 'normalization'
> & {
  readonly lang?: EntityPageLocale
  readonly view: ChallengeEntityAnalysisView
  readonly period: ReportPeriodType
  readonly year: number
  readonly month?: TMonth
  readonly quarter?: TQuarter
  readonly report_type?: EntitiesEntityRouteReportType
  readonly normalization: NormalizationInput
}

export type EntitiesEntityRouteSsrSettings = {
  readonly currency: EntityPagePublicSettings['currency']
  readonly inflationAdjusted: boolean
}

export type EntitiesEntityRouteAdapterInput = {
  readonly cui: string
  readonly search: EntitySearchSchema | undefined
  readonly publicSettingsOverride?: EntityPagePublicSettings
}

export type EntitiesEntityRouteAdapterResult = {
  readonly normalizedSearch: EntitiesEntityRouteNormalizedSearch
  readonly urlPublicSettings: EntityPagePublicSettings
  readonly ssrSettings: EntitiesEntityRouteSsrSettings
  readonly forcedOverrides: ForcedOverrides
  readonly executionContext: EntityPageExecutionContext
  readonly exactQueryInputs: EntityPageExactQueryInputs
}

export function normalizeEntitiesEntityRouteView(
  view: string | undefined,
): ChallengeEntityAnalysisView {
  if (!view) {
    return DEFAULT_VIEW
  }

  return CHALLENGE_VIEW_BY_LEGACY_ENTITY_VIEW[view] ?? DEFAULT_VIEW
}

export function normalizeEntitiesEntityRouteSearch(
  search: EntitySearchSchema | undefined,
): EntitiesEntityRouteNormalizedSearch {
  const period = search?.period ?? DEFAULT_PERIOD

  return {
    ...search,
    lang: search?.lang,
    view: normalizeEntitiesEntityRouteView(search?.view),
    period,
    year: search?.year ?? DEFAULT_SELECTED_YEAR,
    month:
      period === 'MONTH'
        ? ((search?.month ?? DEFAULT_MONTH) as TMonth)
        : undefined,
    quarter:
      period === 'QUARTER'
        ? ((search?.quarter ?? DEFAULT_QUARTER) as TQuarter)
        : undefined,
    report_type: toExecutionReportType(search?.report_type),
    normalization: search?.normalization ?? DEFAULT_NORMALIZATION,
  }
}

export function resolveEntitiesEntityRouteAdapter(
  input: EntitiesEntityRouteAdapterInput,
): EntitiesEntityRouteAdapterResult {
  const normalizedSearch = normalizeEntitiesEntityRouteSearch(input.search)
  const { forcedOverrides } = resolveNormalizationSettings(
    normalizedSearch.normalization,
  )
  const urlPublicSettings = resolveEntityPagePublicSettings({
    normalizationRaw: normalizedSearch.normalization,
    currencyParam: input.search?.currency,
    inflationAdjustedParam: input.search?.inflation_adjusted,
    showPeriodGrowthParam: input.search?.show_period_growth,
  })
  const executionContext: EntityPageExecutionContext = {
    routeId: 'entities',
    cui: input.cui,
    lang: normalizedSearch.lang,
    period: normalizedSearch.period,
    year: normalizedSearch.year,
    month: normalizedSearch.month,
    quarter: normalizedSearch.quarter,
    reportType: normalizedSearch.report_type,
    effectiveReportType: normalizedSearch.report_type,
    mainCreditorCui: normalizedSearch.main_creditor_cui,
    activeView: normalizedSearch.view,
    publicSettings: input.publicSettingsOverride ?? urlPublicSettings,
  }

  return {
    normalizedSearch,
    urlPublicSettings,
    ssrSettings: {
      currency: urlPublicSettings.currency,
      inflationAdjusted: urlPublicSettings.inflationAdjusted,
    },
    forcedOverrides,
    executionContext,
    exactQueryInputs: resolveEntityPageQueryInputs({
      context: executionContext,
    }),
  }
}
