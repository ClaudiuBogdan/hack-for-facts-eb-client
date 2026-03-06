import { z } from 'zod'
import { DEFAULT_SELECTED_YEAR, defaultYearRange } from '@/schemas/charts'

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
})

export type ChallengeEntityAnalysisRouteSearch = z.infer<
  typeof ChallengeEntityAnalysisRouteSearchSchema
>

export type ChallengeEntityAnalysisUrlState = {
  readonly lang?: 'ro' | 'en'
  readonly year: number
  readonly report_type: 'PRINCIPAL_AGGREGATED' | 'DETAILED'
  readonly normalization: 'total' | 'per_capita'
  readonly treemap_account: 'ch' | 'vn'
  readonly treemap_primary: 'fn' | 'ec'
  readonly treemap_path?: string
  readonly evolution_account: 'ch' | 'vn'
  readonly evolution_primary: 'fn' | 'ec'
}

const TREEMAP_PATH_CODE_PATTERN = /^\d+(?:\.\d+)*$/

function normalizePathCode(code: string): string {
  return code.trim()
}

function isValidPathCode(code: string): boolean {
  return TREEMAP_PATH_CODE_PATTERN.test(code)
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

  return {
    lang: search?.lang,
    year: search?.year ?? DEFAULT_SELECTED_YEAR,
    report_type: search?.report_type ?? 'PRINCIPAL_AGGREGATED',
    normalization: search?.normalization ?? 'total',
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

  return patch
}
