import { z } from 'zod'
import type {
  InsDataset,
  InsObservation,
  InsTerritoryLevel,
  InsTimePeriod,
  InsUnit,
} from './ins'

/**
 * Statistics domain route search + feature boundary contracts.
 *
 * The statistics feature wraps the INS Tempo serving contract (see
 * `src/schemas/ins.ts`) into a small product-facing surface: a landing page,
 * a territory hub, and a catalog/coverage ribbon. Everything here is shaped
 * by the live INS GraphQL types so that the mock/live adapter swap is a
 * one-call change in `src/features/statistics/api`.
 *
 * Freshness/provenance is derived from data-period metadata (latest period,
 * data-through period) — never from invented "last sync" fields.
 */

// ---------------------------------------------------------------------------
// Route search schemas
// ---------------------------------------------------------------------------

/**
 * Free-form period anchor filter (e.g. "2024", "2024-Q1", "2024-03").
 * Invalid/non-string values degrade to no filter.
 */
export const statisticsPeriodSearchSchema = z
  .preprocess((value) => {
    if (typeof value !== 'string') return 'latest'
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : 'latest'
  }, z.union([
    z.literal('latest'),
    z.string().regex(/^\d{4}$/),
    z.string().regex(/^\d{4}-Q[1-4]$/),
    z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  ]))
  .catch('latest')

export type StatisticsPeriodSearch = z.infer<
  typeof statisticsPeriodSearchSchema
>

/**
 * Search state for the statistics landing route (`/statistici`).
 * The first shipped landing surface has no shareable filters yet; keep the
 * route parser permissive but do not expose inert query params.
 */
export const statisticsLandingSearchSchema = z
  .object({})
  .catch({})

export type StatisticsLandingSearch = z.infer<
  typeof statisticsLandingSearchSchema
>

/**
 * Search state for the territory hub route
 * (`/statistici/teritorii/$siruta`).
 *
 * - `period`: latest | YYYY | YYYY-Qn | YYYY-MM.
 *
 * All fields use `.catch` so malformed enum/string values from the URL
 * degrade to safe defaults instead of throwing during route validation.
 */
export const statisticsTerritoryHubSearchSchema = z
  .object({
    period: statisticsPeriodSearchSchema.optional().catch(undefined),
  })
  .catch({})

export type StatisticsTerritoryHubSearch = z.infer<
  typeof statisticsTerritoryHubSearchSchema
>

/** Parse function for TanStack Router `validateSearch` on the landing route. */
export function parseStatisticsLandingSearch(
  search: Record<string, unknown>,
): StatisticsLandingSearch {
  return statisticsLandingSearchSchema.parse(search)
}

/** Parse function for TanStack Router `validateSearch` on the territory hub. */
export function parseStatisticsTerritoryHubSearch(
  search: Record<string, unknown>,
): StatisticsTerritoryHubSearch {
  const parsed = statisticsTerritoryHubSearchSchema.parse(search)
  if (parsed.period === 'latest') {
    return {}
  }
  return parsed
}

// ---------------------------------------------------------------------------
// Feature boundary types
// ---------------------------------------------------------------------------

/** Whether a dataset has loaded facts or is catalog-only metadata. */
export type StatisticsDatasetDataStatus = 'available' | 'catalog-only'

/** Compact dataset summary used by landing cards and catalog rows. */
export interface StatisticsDatasetSummary {
  readonly code: string
  readonly nameRo: string | null
  readonly nameEn: string | null
  readonly periodicity: readonly string[]
  readonly yearRange: readonly number[] | null
  readonly hasUatData: boolean
  readonly hasCountyData: boolean
  readonly hasSiruta: boolean
  readonly dataStatus: StatisticsDatasetDataStatus
  readonly latestPeriod: string | null
  readonly contextNameRo: string | null
  readonly contextPath: string | null
}

/**
 * Coverage summary for the 27-available-vs-1,898-catalog ribbon.
 *
 * Counts are derived from the live catalog `pageInfo.totalCount` + per-dataset
 * data status when live, or from the centralized docs fallback constants when
 * mocking (see `src/features/statistics/lib/coverage.ts`).
 */
export interface StatisticsCoverageSummary {
  readonly availableDatasetCount: number
  readonly totalDatasetCount: number
  readonly catalogOnlyDatasetCount: number
  readonly partial: boolean
}

/** Territory identity resolved for a SIRUTA code. */
export interface StatisticsTerritoryIdentity {
  readonly siruta: string
  readonly name: string | null
  readonly level: InsTerritoryLevel | null
  readonly countyName: string | null
  readonly countyCode: string | null
  /** True when name/level had to be inferred from a fallback map, not the live API. */
  readonly enrichedFallback: boolean
}

/** Single headline indicator tile on the territory dashboard. */
export interface StatisticsIndicatorTile {
  readonly datasetCode: string
  readonly datasetNameRo: string | null
  readonly datasetNameEn: string | null
  readonly periodicity: readonly string[]
  readonly dataStatus: StatisticsDatasetDataStatus
  readonly tileState: 'available' | 'catalog-only' | 'no-data'
  readonly value: string | null
  readonly valueStatus: string | null
  readonly unitSymbol: string | null
  readonly unitNameRo: string | null
  readonly latestPeriod: string | null
  readonly latestYear: number | null
  /**
   * Sparse sparkline points ordered chronologically. Gaps are represented by
   * `null` values (never interpolated) so charts can render honest breaks.
   */
  readonly sparkline: readonly (readonly [InsTimePeriod, string | null])[]
}

/** A cross-domain related link to an existing platform route. */
export interface StatisticsRelatedLink {
  readonly label: string
  readonly to: string
  readonly params: Readonly<Record<string, string>>
  readonly joinBasis: 'siruta' | 'cui' | 'county'
  readonly joinValue: string
  readonly enabled: boolean
  readonly disabledReason: string | null
}

/** Aggregated territory hub result returned by the statistics API. */
export interface StatisticsTerritoryHubResult {
  readonly identity: StatisticsTerritoryIdentity
  readonly tiles: readonly StatisticsIndicatorTile[]
  readonly availableDatasetCodes: readonly string[]
  readonly coverage: StatisticsCoverageSummary
  readonly relatedLinks: readonly StatisticsRelatedLink[]
  readonly latestDataPeriod: string | null
  readonly partial: boolean
}

/** Statistics landing payload: themed dataset cards + coverage ribbon. */
export interface StatisticsLanding {
  readonly topDatasets: readonly StatisticsDatasetSummary[]
  readonly coverage: StatisticsCoverageSummary
  readonly latestDataPeriod: string | null
}

// ---------------------------------------------------------------------------
// Dataset request (catalog-only "request this dataset" action)
// ---------------------------------------------------------------------------

export const datasetRequestPayloadSchema = z.object({
  datasetCode: z.string().trim().min(1),
  siruta: z.string().trim().optional(),
  contactEmail: z.string().trim().email().optional(),
  note: z.string().trim().max(1000).optional(),
})

export type DatasetRequestPayload = z.infer<typeof datasetRequestPayloadSchema>

export interface DatasetRequestResult {
  readonly accepted: boolean
  readonly datasetCode: string
  readonly message: string
}

// ---------------------------------------------------------------------------
// Observation/period helpers re-exported for convenience
// ---------------------------------------------------------------------------

export type {
  InsDataset,
  InsObservation,
  InsTerritoryLevel,
  InsTimePeriod,
  InsUnit,
}
