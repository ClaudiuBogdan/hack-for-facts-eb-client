import { z } from 'zod'
import { DEFAULT_SELECTED_YEAR, defaultYearRange } from '@/schemas/charts'
import {
  DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY,
  normalizeChallengeEntityMapPreviewKey,
  type ChallengeEntityMapPreviewKey,
} from '@/features/challenges/components/analysis/challenge-entity-public-maps'

export const CHALLENGE_ENTITY_ANALYSIS_VIEW_VALUES = [
  'main-info',
  'contracts',
  'commitments',
  'ins',
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

export const ChallengeEntityAnalysisReportTypeSchema = z.enum([
  'PRINCIPAL_AGGREGATED',
  'DETAILED',
])

export const ChallengeEntityAnalysisAccountCategorySchema = z.enum(['ch', 'vn'])

export const ChallengeEntityAnalysisPrimarySchema = z.enum(['fn', 'ec'])

export const ChallengeEntityAnalysisNormalizationSchema = z.enum([
  'total',
  'per_capita',
])

const CurrencySchema = z.enum(['RON', 'EUR', 'USD'])
const BooleanSearchParamSchema = z.union([
  z.boolean(),
  z.enum(['true', 'false']).transform((value) => value === 'true'),
])

export const ChallengeEntityAnalysisRouteSearchSchema = z.object({
  lang: z.enum(['ro', 'en']).optional(),
  year: z.coerce
    .number()
    .int()
    .min(defaultYearRange.start)
    .max(DEFAULT_SELECTED_YEAR)
    .optional(),
  report_type: ChallengeEntityAnalysisReportTypeSchema.optional(),
  normalization: ChallengeEntityAnalysisNormalizationSchema.optional(),
  treemap_account: ChallengeEntityAnalysisAccountCategorySchema.optional(),
  treemap_primary: ChallengeEntityAnalysisPrimarySchema.optional(),
  treemap_path: z.string().optional(),
  evolution_account: ChallengeEntityAnalysisAccountCategorySchema.optional(),
  evolution_primary: ChallengeEntityAnalysisPrimarySchema.optional(),
  public_map: z.string().optional(),
  view: z.string().optional(),
  commitments_grouping: z.string().optional(),
  commitments_detail_level: z.string().optional(),
  currency: CurrencySchema.optional(),
  inflation_adjusted: BooleanSearchParamSchema.optional(),
  insDataset: z.string().optional(),
  insSearch: z.string().optional(),
  insRoot: z.coerce.string().optional(),
  insTemporal: z.string().optional(),
  insExplorer: z.string().optional(),
  insSeries: z.string().optional(),
  insUnit: z.string().optional(),
})

export type ChallengeEntityAnalysisRouteSearch = z.infer<
  typeof ChallengeEntityAnalysisRouteSearchSchema
>

export type ChallengeEntityAnalysisUrlState = {
  readonly lang?: 'ro' | 'en'
  readonly year: number
  readonly report_type: 'PRINCIPAL_AGGREGATED' | 'DETAILED'
  readonly normalization: 'total' | 'per_capita'
  readonly view: ChallengeEntityAnalysisView
  readonly treemap_account: 'ch' | 'vn'
  readonly treemap_primary: 'fn' | 'ec'
  readonly treemap_path?: string
  readonly evolution_account: 'ch' | 'vn'
  readonly evolution_primary: 'fn' | 'ec'
  readonly public_map: ChallengeEntityMapPreviewKey
  readonly commitments_grouping?: ChallengeEntityAnalysisCommitmentsGrouping
  readonly commitments_detail_level?: ChallengeEntityAnalysisCommitmentsDetailLevel
}

const TREEMAP_PATH_CODE_PATTERN = /^\d+(?:\.\d+)*$/
const CHALLENGE_ENTITY_VIEW_SET = new Set(CHALLENGE_ENTITY_ANALYSIS_VIEW_VALUES)
const CHALLENGE_ENTITY_COMMITMENTS_GROUPING_SET = new Set(
  CHALLENGE_ENTITY_ANALYSIS_COMMITMENTS_GROUPING_VALUES,
)
const CHALLENGE_ENTITY_COMMITMENTS_DETAIL_LEVEL_SET = new Set(
  CHALLENGE_ENTITY_ANALYSIS_COMMITMENTS_DETAIL_LEVEL_VALUES,
)

function normalizePathCode(code: string): string {
  return code.trim()
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

export function normalizeChallengeEntityAnalysisSearch(
  search: ChallengeEntityAnalysisRouteSearch | undefined,
): ChallengeEntityAnalysisUrlState {
  const treemapAccountCategory = search?.treemap_account ?? 'ch'
  const evolutionAccountCategory = search?.evolution_account ?? 'ch'
  const mapPreviewKey = normalizeChallengeEntityMapPreviewKey(search?.public_map)

  return {
    lang: search?.lang,
    year: search?.year ?? DEFAULT_SELECTED_YEAR,
    report_type: search?.report_type ?? 'PRINCIPAL_AGGREGATED',
    normalization: search?.normalization ?? 'total',
    view: normalizeChallengeEntityAnalysisView(search?.view),
    treemap_account: treemapAccountCategory,
    treemap_primary:
      treemapAccountCategory === 'vn'
        ? 'fn'
        : (search?.treemap_primary ?? 'fn'),
    treemap_path: encodeChallengeTreemapPath(
      decodeChallengeTreemapPath(search?.treemap_path),
    ),
    evolution_account: evolutionAccountCategory,
    evolution_primary:
      evolutionAccountCategory === 'vn'
        ? 'fn'
        : (search?.evolution_primary ?? 'fn'),
    public_map: mapPreviewKey,
    commitments_grouping: normalizeCommitmentsGrouping(
      search?.commitments_grouping,
    ),
    commitments_detail_level: normalizeCommitmentsDetailLevel(
      search?.commitments_detail_level,
    ),
  }
}

export function buildChallengeEntityAnalysisCanonicalSearchPatch(
  search: ChallengeEntityAnalysisRouteSearch | undefined,
  normalizedSearch: ChallengeEntityAnalysisUrlState,
): Partial<ChallengeEntityAnalysisRouteSearch> {
  const patch: Partial<ChallengeEntityAnalysisRouteSearch> = {}

  if (search?.year !== normalizedSearch.year) {
    patch.year = normalizedSearch.year
  }

  if (search?.report_type !== normalizedSearch.report_type) {
    patch.report_type = normalizedSearch.report_type
  }

  if (search?.normalization !== normalizedSearch.normalization) {
    patch.normalization = normalizedSearch.normalization
  }

  if (search?.view !== normalizedSearch.view) {
    patch.view = normalizedSearch.view
  }

  if (search?.treemap_account !== normalizedSearch.treemap_account) {
    patch.treemap_account = normalizedSearch.treemap_account
  }

  if (search?.treemap_primary !== normalizedSearch.treemap_primary) {
    patch.treemap_primary = normalizedSearch.treemap_primary
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
