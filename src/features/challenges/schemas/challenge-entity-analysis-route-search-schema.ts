import { entityInsSourceSearchSchema } from '@/lib/ins/entity-source-search'
import { z } from 'zod'
import { DEFAULT_SELECTED_YEAR, defaultYearRange } from '@/schemas/charts'
import {
  DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY,
  normalizeChallengeEntityMapPreviewKey,
  type ChallengeEntityMapPreviewKey,
} from '@/features/challenges/components/analysis/challenge-entity-public-maps'
import {
  type BudgetItemAnalyticsTarget,
} from '@/features/challenges/components/analysis/budget-item-analytics-target'
import {
  normalizeBudgetItemAnalyticsSearchState,
  type BudgetItemAnalyticsSearchStateInput,
  type BudgetItemAnalyticsSearchState,
} from '@/features/challenges/components/analysis/budget-item-analytics-search-state'
import { CommitmentsMetricEnum } from '@/schemas/charts'
import { parseSearchParamJson } from '@/lib/router-search'
import type { ReportPeriodType, TMonth, TQuarter } from '@/schemas/reporting'

export const CHALLENGE_ENTITY_ANALYSIS_VIEW_VALUES = [
  'main-info',
  'contracts',
  'commitments',
  'ins',
  'profile',
] as const
export type ChallengeEntityAnalysisView =
  (typeof CHALLENGE_ENTITY_ANALYSIS_VIEW_VALUES)[number]

export const CHALLENGE_ENTITY_ANALYSIS_COMMITMENTS_GROUPING_VALUES = [
  'fn',
  'ec',
] as const
export type ChallengeEntityAnalysisCommitmentsGrouping =
  (typeof CHALLENGE_ENTITY_ANALYSIS_COMMITMENTS_GROUPING_VALUES)[number]

export const CHALLENGE_ENTITY_ANALYSIS_COMMITMENTS_DETAIL_LEVEL_VALUES = [
  'chapter',
  'detailed',
] as const
export type ChallengeEntityAnalysisCommitmentsDetailLevel =
  (typeof CHALLENGE_ENTITY_ANALYSIS_COMMITMENTS_DETAIL_LEVEL_VALUES)[number]

export const CHALLENGE_ENTITY_ANALYSIS_INS_SEARCH_KEYS = [
  'insDataset',
  'insSearch',
  'insRoot',
  'insTemporal',
  'insExplorer',
  'insSeries',
  'insUnit',
] as const

export const CHALLENGE_ENTITY_ANALYSIS_PERIOD_VALUES = [
  'YEAR',
  'QUARTER',
  'MONTH',
] as const
export type ChallengeEntityAnalysisPeriodType =
  (typeof CHALLENGE_ENTITY_ANALYSIS_PERIOD_VALUES)[number]

export const CHALLENGE_ENTITY_ANALYSIS_QUARTER_VALUES = [
  'Q1',
  'Q2',
  'Q3',
  'Q4',
] as const satisfies readonly TQuarter[]

export const CHALLENGE_ENTITY_ANALYSIS_MONTH_VALUES = [
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12',
] as const satisfies readonly TMonth[]

export const ChallengeEntityAnalysisReportTypeSchema = z.enum([
  'PRINCIPAL_AGGREGATED',
  'SECONDARY_AGGREGATED',
  'DETAILED',
])

export const ChallengeEntityAnalysisAccountCategorySchema = z.enum(['ch', 'vn'])

export const ChallengeEntityAnalysisPrimarySchema = z.enum(['fn', 'ec'])

export const CHALLENGE_ENTITY_ANALYSIS_TREEMAP_DEPTH_VALUES = [
  'chapter',
  'subchapter',
  'paragraph',
] as const
export type ChallengeEntityAnalysisTreemapDepth =
  (typeof CHALLENGE_ENTITY_ANALYSIS_TREEMAP_DEPTH_VALUES)[number]

export const ChallengeEntityAnalysisNormalizationSchema = z.enum([
  'total',
  'per_capita',
])

export const CHALLENGE_ENTITY_ANALYSIS_EXPENSE_TYPE_VALUES = [
  'functionare',
  'dezvoltare',
] as const
export type ChallengeEntityAnalysisExpenseType =
  (typeof CHALLENGE_ENTITY_ANALYSIS_EXPENSE_TYPE_VALUES)[number]

const ChallengeEntityAnalyticsPathEntrySchema = z.object({
  type: ChallengeEntityAnalysisPrimarySchema,
  code: z.string(),
})

const ChallengeEntityAnalyticsTargetSchema = z.object({
  subjectLabel: z.string().optional(),
  path: z.array(ChallengeEntityAnalyticsPathEntrySchema),
})

const ChallengeEntityAnalyticsViewSchema = z.object({
  tab: z.enum(['execution', 'commitments']).optional(),
  timeframe: z.enum(['selected', 'all']).optional(),
  commitmentsMetric: CommitmentsMetricEnum.optional(),
})

const ChallengeEntityAnalyticsSearchStateSchema = z.object({
  target: ChallengeEntityAnalyticsTargetSchema,
  view: ChallengeEntityAnalyticsViewSchema.optional(),
})

export type ChallengeEntityAnalyticsTarget = BudgetItemAnalyticsTarget
export type ChallengeEntityAnalyticsSearchState = BudgetItemAnalyticsSearchState

const CurrencySchema = z.enum(['RON', 'EUR', 'USD'])
const BooleanSearchParamSchema = z.union([
  z.boolean(),
  z.enum(['true', 'false']).transform((value) => value === 'true'),
])

export const ChallengeEntityAnalysisRouteSearchSchema = z.object({
  lang: z.enum(['ro', 'en']).optional(),
  period: z.string().optional(),
  year: z.coerce
    .number()
    .int()
    .min(defaultYearRange.start)
    .max(defaultYearRange.end)
    .optional(),
  month: z.string().optional(),
  quarter: z.string().optional(),
  report_type: ChallengeEntityAnalysisReportTypeSchema.optional(),
  main_creditor_cui: z.string().optional(),
  normalization: ChallengeEntityAnalysisNormalizationSchema.optional(),
  treemap_account: ChallengeEntityAnalysisAccountCategorySchema.optional(),
  expense_type: z.string().optional(),
  treemap_primary: z.string().optional(),
  treemap_depth: z.string().optional(),
  treemap_path: z.string().optional(),
  evolution_account: ChallengeEntityAnalysisAccountCategorySchema.optional(),
  evolution_primary: z.string().optional(),
  public_map: z.string().optional(),
  notificationModal: z.enum(['open']).optional(),
  analytics: z
    .preprocess(parseSearchParamJson, ChallengeEntityAnalyticsSearchStateSchema)
    .optional(),
  view: z.string().optional(),
  commitments_grouping: z.string().optional(),
  commitments_detail_level: z.string().optional(),
  currency: CurrencySchema.optional(),
  inflation_adjusted: BooleanSearchParamSchema.optional(),
  show_period_growth: BooleanSearchParamSchema.optional(),

  ...entityInsSourceSearchSchema.shape,
  insSearch: z.string().optional(),
  insRoot: z.coerce.string().optional(),
  insExplorer: z.string().optional(),
})

export type ChallengeEntityAnalysisRouteSearch = z.infer<
  typeof ChallengeEntityAnalysisRouteSearchSchema
>

export type ChallengeEntityAnalysisUrlState = {
  readonly lang?: 'ro' | 'en'
  readonly period: ChallengeEntityAnalysisPeriodType
  readonly year: number
  readonly month: TMonth
  readonly quarter: TQuarter
  readonly report_type:
    | 'PRINCIPAL_AGGREGATED'
    | 'SECONDARY_AGGREGATED'
    | 'DETAILED'
  readonly main_creditor_cui?: string
  readonly normalization: 'total' | 'per_capita'
  readonly analytics?: ChallengeEntityAnalyticsSearchState
  readonly view: ChallengeEntityAnalysisView
  readonly treemap_account: 'ch' | 'vn'
  readonly expense_type?: ChallengeEntityAnalysisExpenseType
  readonly treemap_primary: 'fn' | 'ec'
  readonly treemap_depth: ChallengeEntityAnalysisTreemapDepth
  readonly treemap_path?: string
  readonly evolution_account: 'ch' | 'vn'
  readonly evolution_primary: 'fn' | 'ec'
  readonly public_map: ChallengeEntityMapPreviewKey
  readonly commitments_grouping?: ChallengeEntityAnalysisCommitmentsGrouping
  readonly commitments_detail_level?: ChallengeEntityAnalysisCommitmentsDetailLevel
  readonly show_period_growth: boolean
}

const TREEMAP_PATH_CODE_PATTERN = /^\d+(?:\.\d+)*$/
const CHALLENGE_ENTITY_VIEW_SET = new Set(CHALLENGE_ENTITY_ANALYSIS_VIEW_VALUES)
const CHALLENGE_ENTITY_COMMITMENTS_GROUPING_SET = new Set(
  CHALLENGE_ENTITY_ANALYSIS_COMMITMENTS_GROUPING_VALUES,
)
const CHALLENGE_ENTITY_COMMITMENTS_DETAIL_LEVEL_SET = new Set(
  CHALLENGE_ENTITY_ANALYSIS_COMMITMENTS_DETAIL_LEVEL_VALUES,
)
const CHALLENGE_ENTITY_PERIOD_SET = new Set(
  CHALLENGE_ENTITY_ANALYSIS_PERIOD_VALUES,
)
const CHALLENGE_ENTITY_TREEMAP_DEPTH_SET = new Set(
  CHALLENGE_ENTITY_ANALYSIS_TREEMAP_DEPTH_VALUES,
)
const CHALLENGE_ENTITY_PRIMARY_SET = new Set(['fn', 'ec'] as const)
const CHALLENGE_ENTITY_EXPENSE_TYPE_SET = new Set(
  CHALLENGE_ENTITY_ANALYSIS_EXPENSE_TYPE_VALUES,
)
const CHALLENGE_ENTITY_MONTH_SET = new Set(CHALLENGE_ENTITY_ANALYSIS_MONTH_VALUES)
const CHALLENGE_ENTITY_QUARTER_SET = new Set(
  CHALLENGE_ENTITY_ANALYSIS_QUARTER_VALUES,
)

function normalizePathCode(code: string): string {
  return code.trim()
}

function serializeChallengeEntityAnalyticsSearchState(
  searchState: ChallengeEntityAnalyticsSearchState | undefined,
) {
  return searchState ? JSON.stringify(searchState) : undefined
}

function serializeRawChallengeEntityAnalyticsSearchState(searchState: unknown) {
  if (searchState === undefined) {
    return undefined
  }

  const parsedSearchState = parseSearchParamJson(searchState)
  if (
    !parsedSearchState ||
    typeof parsedSearchState !== 'object' ||
    Array.isArray(parsedSearchState)
  ) {
    return '__invalid__'
  }

  return JSON.stringify(parsedSearchState)
}

function isValidPathCode(code: string): boolean {
  return TREEMAP_PATH_CODE_PATTERN.test(code)
}

function normalizeChallengeEntityAnalysisView(
  view: string | undefined,
): ChallengeEntityAnalysisView {
  if (view && CHALLENGE_ENTITY_VIEW_SET.has(view as ChallengeEntityAnalysisView)) {
    return view as ChallengeEntityAnalysisView
  }

  return 'main-info'
}

function normalizePeriod(
  period: string | undefined,
): ReportPeriodType {
  if (period && CHALLENGE_ENTITY_PERIOD_SET.has(period as ReportPeriodType)) {
    return period as ReportPeriodType
  }

  return 'YEAR'
}

function normalizeMonth(
  month: string | undefined,
): TMonth {
  if (month && CHALLENGE_ENTITY_MONTH_SET.has(month as TMonth)) {
    return month as TMonth
  }

  return '01'
}

function normalizeQuarter(
  quarter: string | undefined,
): TQuarter {
  if (quarter && CHALLENGE_ENTITY_QUARTER_SET.has(quarter as TQuarter)) {
    return quarter as TQuarter
  }

  return 'Q1'
}

function normalizeMainCreditorCui(
  mainCreditorCui: string | undefined,
): string | undefined {
  const trimmedValue = mainCreditorCui?.trim()
  return trimmedValue ? trimmedValue : undefined
}

function normalizeCommitmentsGrouping(
  grouping: string | undefined,
): ChallengeEntityAnalysisCommitmentsGrouping | undefined {
  if (
    grouping &&
    CHALLENGE_ENTITY_COMMITMENTS_GROUPING_SET.has(
      grouping as ChallengeEntityAnalysisCommitmentsGrouping,
    )
  ) {
    return grouping as ChallengeEntityAnalysisCommitmentsGrouping
  }

  return undefined
}

function normalizeCommitmentsDetailLevel(
  detailLevel: string | undefined,
): ChallengeEntityAnalysisCommitmentsDetailLevel | undefined {
  if (
    detailLevel &&
    CHALLENGE_ENTITY_COMMITMENTS_DETAIL_LEVEL_SET.has(
      detailLevel as ChallengeEntityAnalysisCommitmentsDetailLevel,
    )
  ) {
    return detailLevel as ChallengeEntityAnalysisCommitmentsDetailLevel
  }

  return undefined
}

function normalizeTreemapDepth(
  depth: string | undefined,
): ChallengeEntityAnalysisTreemapDepth {
  if (
    depth &&
    CHALLENGE_ENTITY_TREEMAP_DEPTH_SET.has(
      depth as ChallengeEntityAnalysisTreemapDepth,
    )
  ) {
    return depth as ChallengeEntityAnalysisTreemapDepth
  }

  return 'chapter'
}

function normalizePrimary(primary: string | undefined): 'fn' | 'ec' {
  if (primary && CHALLENGE_ENTITY_PRIMARY_SET.has(primary as 'fn' | 'ec')) {
    return primary as 'fn' | 'ec'
  }

  return 'fn'
}

function normalizeExpenseType(
  expenseType: string | undefined,
): ChallengeEntityAnalysisExpenseType | undefined {
  if (
    expenseType &&
    CHALLENGE_ENTITY_EXPENSE_TYPE_SET.has(
      expenseType as ChallengeEntityAnalysisExpenseType,
    )
  ) {
    return expenseType as ChallengeEntityAnalysisExpenseType
  }

  return undefined
}

export function decodeChallengeTreemapPath(
  path: string | undefined,
): string[] {
  if (!path) {
    return []
  }

  const segments = path
    .split(',')
    .map(normalizePathCode)
    .filter(Boolean)

  if (segments.length === 0) {
    return []
  }

  if (segments.some((segment) => !isValidPathCode(segment))) {
    return []
  }

  return segments
}

export function encodeChallengeTreemapPath(
  path: readonly string[],
): string | undefined {
  const normalizedPath = path
    .map(normalizePathCode)
    .filter(Boolean)

  if (normalizedPath.length === 0) {
    return undefined
  }

  if (normalizedPath.some((segment) => !isValidPathCode(segment))) {
    return undefined
  }

  return normalizedPath.join(',')
}

export function decodeChallengeEntityAnalyticsSearchState(
  searchState: unknown,
): ChallengeEntityAnalyticsSearchState | undefined {
  const parsedSearchState = parseSearchParamJson(searchState)

  if (
    !parsedSearchState ||
    typeof parsedSearchState !== 'object' ||
    Array.isArray(parsedSearchState)
  ) {
    return undefined
  }

  return normalizeBudgetItemAnalyticsSearchState(
    parsedSearchState as Partial<ChallengeEntityAnalyticsSearchState>,
  )
}

export function encodeChallengeEntityAnalyticsSearchState(
  searchState: BudgetItemAnalyticsSearchStateInput,
): ChallengeEntityAnalyticsSearchState | undefined {
  return normalizeBudgetItemAnalyticsSearchState(searchState)
}

export function normalizeChallengeEntityAnalysisSearch(
  search: ChallengeEntityAnalysisRouteSearch | undefined,
): ChallengeEntityAnalysisUrlState {
  const period = normalizePeriod(search?.period)
  const treemapAccountCategory = search?.treemap_account ?? 'ch'
  const evolutionAccountCategory = search?.evolution_account ?? 'ch'
  const mapPreviewKey = normalizeChallengeEntityMapPreviewKey(search?.public_map)
  const normalizedMonth = normalizeMonth(search?.month)
  const normalizedQuarter = normalizeQuarter(search?.quarter)

  return {
    lang: search?.lang,
    period,
    year: search?.year ?? DEFAULT_SELECTED_YEAR,
    month: normalizedMonth,
    quarter: normalizedQuarter,
    report_type: search?.report_type ?? 'PRINCIPAL_AGGREGATED',
    main_creditor_cui: normalizeMainCreditorCui(search?.main_creditor_cui),
    normalization: search?.normalization ?? 'total',
    analytics: encodeChallengeEntityAnalyticsSearchState(search?.analytics),
    view: normalizeChallengeEntityAnalysisView(search?.view),
    treemap_account: treemapAccountCategory,
    expense_type: normalizeExpenseType(search?.expense_type),
    treemap_primary:
      treemapAccountCategory === 'vn'
        ? 'fn'
        : normalizePrimary(search?.treemap_primary),
    treemap_depth: normalizeTreemapDepth(search?.treemap_depth),
    treemap_path: encodeChallengeTreemapPath(
      decodeChallengeTreemapPath(search?.treemap_path),
    ),
    evolution_account: evolutionAccountCategory,
    evolution_primary:
      evolutionAccountCategory === 'vn'
        ? 'fn'
        : normalizePrimary(search?.evolution_primary),
    public_map: mapPreviewKey,
    commitments_grouping: normalizeCommitmentsGrouping(
      search?.commitments_grouping,
    ),
    commitments_detail_level: normalizeCommitmentsDetailLevel(
      search?.commitments_detail_level,
    ),
    show_period_growth: search?.show_period_growth ?? false,
  }
}

export function buildChallengeEntityAnalysisCanonicalSearchPatch(
  search: ChallengeEntityAnalysisRouteSearch | undefined,
  normalizedSearch: ChallengeEntityAnalysisUrlState,
): Partial<ChallengeEntityAnalysisRouteSearch> {
  const patch: Partial<ChallengeEntityAnalysisRouteSearch> = {}

  if (search?.period !== normalizedSearch.period) {
    patch.period = normalizedSearch.period
  }

  if (search?.year !== normalizedSearch.year) {
    patch.year = normalizedSearch.year
  }

  const canonicalMonth =
    normalizedSearch.period === 'MONTH' ? normalizedSearch.month : undefined
  const canonicalQuarter =
    normalizedSearch.period === 'QUARTER' ? normalizedSearch.quarter : undefined

  if ((search?.month ?? undefined) !== canonicalMonth) {
    patch.month = canonicalMonth
  }

  if ((search?.quarter ?? undefined) !== canonicalQuarter) {
    patch.quarter = canonicalQuarter
  }

  if (search?.report_type !== normalizedSearch.report_type) {
    patch.report_type = normalizedSearch.report_type
  }

  if (
    (search?.main_creditor_cui ?? undefined) !==
    normalizedSearch.main_creditor_cui
  ) {
    patch.main_creditor_cui = normalizedSearch.main_creditor_cui
  }

  if (search?.normalization !== normalizedSearch.normalization) {
    patch.normalization = normalizedSearch.normalization
  }

  if (
    serializeRawChallengeEntityAnalyticsSearchState(search?.analytics) !==
    serializeChallengeEntityAnalyticsSearchState(normalizedSearch.analytics)
  ) {
    patch.analytics = normalizedSearch.analytics
  }

  if (search?.view !== normalizedSearch.view) {
    patch.view = normalizedSearch.view
  }

  if (search?.treemap_account !== normalizedSearch.treemap_account) {
    patch.treemap_account = normalizedSearch.treemap_account
  }

  if ((search?.expense_type ?? undefined) !== normalizedSearch.expense_type) {
    patch.expense_type = normalizedSearch.expense_type
  }

  if (search?.treemap_primary !== normalizedSearch.treemap_primary) {
    patch.treemap_primary = normalizedSearch.treemap_primary
  }

  if ((search?.treemap_depth ?? undefined) !== normalizedSearch.treemap_depth) {
    patch.treemap_depth = normalizedSearch.treemap_depth
  }

  if ((search?.treemap_path ?? undefined) !== normalizedSearch.treemap_path) {
    patch.treemap_path = normalizedSearch.treemap_path
  }

  if (search?.evolution_account !== normalizedSearch.evolution_account) {
    patch.evolution_account = normalizedSearch.evolution_account
  }

  if (search?.evolution_primary !== normalizedSearch.evolution_primary) {
    patch.evolution_primary = normalizedSearch.evolution_primary
  }

  if (
    (search?.public_map ?? DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY) !==
    normalizedSearch.public_map
  ) {
    patch.public_map = normalizedSearch.public_map
  }

  if (
    (search?.commitments_grouping ?? undefined) !==
    normalizedSearch.commitments_grouping
  ) {
    patch.commitments_grouping = normalizedSearch.commitments_grouping
  }

  if (
    (search?.commitments_detail_level ?? undefined) !==
    normalizedSearch.commitments_detail_level
  ) {
    patch.commitments_detail_level = normalizedSearch.commitments_detail_level
  }

  return patch
}
