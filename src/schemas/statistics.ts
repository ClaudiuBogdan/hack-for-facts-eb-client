import { z } from 'zod'
import type {
  InsSourceDescriptor,
  InsSourceGeoPairs,
} from '@/lib/ins/source-contract'
import type { NativeInsObservation } from './ins'
import type {
  InsDataset,
  InsDatasetDetails,
  InsObservation,
  InsPeriodicity,
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
  .preprocess(
    (value) => {
      // The router's search parser JSON-parses bare digits, so the natural
      // ?period=2019 arrives as a NUMBER — coerce before validating.
      const candidate = typeof value === 'number' ? String(value) : value
      if (typeof candidate !== 'string') return 'latest'
      const normalized = candidate.trim()
      return normalized.length > 0 ? normalized : 'latest'
    },
    z.union([
      z.literal('latest'),
      z.string().regex(/^\d{4}$/),
      z.string().regex(/^\d{4}-Q[1-4]$/),
      z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    ]),
  )
  .catch('latest')

export type StatisticsPeriodSearch = z.infer<
  typeof statisticsPeriodSearchSchema
>

/**
 * Search state for the statistics hub route (`/statistici`).
 *
 * `indicator` is the county map's colouring — shareable, so a link can land
 * on "unemployment by county". The default view renders with no params.
 */
export const STATISTICS_HUB_INDICATORS = ['viata', 'somaj', 'salariati'] as const
export type StatisticsHubIndicatorKey = (typeof STATISTICS_HUB_INDICATORS)[number]

export const statisticsHubSearchSchema = z
  .object({
    indicator: z.enum(STATISTICS_HUB_INDICATORS).optional().catch(undefined),
  })
  .catch({})

export type StatisticsHubSearch = z.infer<typeof statisticsHubSearchSchema>

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

/**
 * Search state for the dataset explorer (`/statistici/seturi`).
 *
 * Param names are Romanian to match the route segments. Every field is
 * `.optional().catch(undefined)` so a malformed value in a shared URL degrades
 * to "filter not applied" rather than throwing during route validation.
 *
 * - `q`: free-text dataset search (debounced, never a submit button).
 * - `context`: INS context (theme) code.
 * - `frecventa`: periodicity multi-select.
 * - `stare`: the honesty control — datasets with loaded facts vs. catalog-only.
 * - `uat` / `judet`: coverage flags.
 * - `pagina`: 1-based page index.
 */
const explorerPeriodicitySchema = z.enum(['ANNUAL', 'QUARTERLY', 'MONTHLY'])

export const statisticsDatasetExplorerSearchSchema = z
  .object({
    q: z.string().trim().min(1).optional().catch(undefined),
    // The router JSON-parses a bare digit (`?context=1`) into a number; every
    // theme code is a digit, so coerce it back or every theme link drops.
    context: z
      .preprocess(
        (value) => (typeof value === 'number' ? String(value) : value),
        z.string().trim().min(1).optional(),
      )
      .catch(undefined),
    // A single `?frecventa=ANNUAL` is one filter, not a malformed list.
    frecventa: z
      .preprocess(
        (value) => (typeof value === 'string' ? [value] : value),
        z.array(explorerPeriodicitySchema).nonempty().optional(),
      )
      .catch(undefined),
    stare: z.enum(['available', 'catalog-only']).optional().catch(undefined),
    uat: z.boolean().optional().catch(undefined),
    judet: z.boolean().optional().catch(undefined),
    pagina: z.number().int().min(1).optional().catch(undefined),
  })
  .catch({})

export type StatisticsDatasetExplorerSearch = z.infer<
  typeof statisticsDatasetExplorerSearchSchema
>

/**
 * Search state for the dataset detail route (`/statistici/seturi/$cod`).
 *
 * Preserve identity input for descriptor-aware validation in source-selection.
 * Invalid explicit selections must remain visible and editable.
 */
export const statisticsDatasetDetailSearchSchema = z
  .object({
    // Identity selections stay intact for explicit validation and recovery.
    teritoriu: z.unknown().optional(),
    clasificari: z.unknown().optional(),
    unitate: z.unknown().optional(),
    frecventa: z
      .enum(['ANNUAL', 'QUARTERLY', 'MONTHLY'])
      .optional()
      .catch(undefined),
    din: z.number().int().min(1900).max(2100).optional().catch(undefined),
    pana: z.number().int().min(1900).max(2100).optional().catch(undefined),
    pagina: z.number().int().min(1).optional().catch(undefined),
  })
  .catch({})

export type StatisticsDatasetDetailSearch = z.infer<
  typeof statisticsDatasetDetailSearchSchema
>

/**
 * Search state for the local comparisons route (`/statistici/comparatii`).
 *
 * Raw URL intent is validated after routing. Territory tokens distinguish county
 * codes from SIRUTA; an explicitly selected single territory remains an
 * intermediate comparison rather than being replaced with example data.
 */
export const statisticsComparisonsSearchSchema = z.object({
  // Explicit invalid intent must survive routing to the validation UI.
  cod: z.unknown().optional(),
  teritorii: z.unknown().optional(),
  perioada: z.unknown().optional(),
  clasificari: z.unknown().optional(),
  unitate: z.unknown().optional(),
  frecventa: z.unknown().optional(),
})

export type StatisticsComparisonsSearch = z.infer<
  typeof statisticsComparisonsSearchSchema
>

/** Parse function for TanStack Router `validateSearch` on the landing route. */
export function parseStatisticsHubSearch(
  search: Record<string, unknown>,
): StatisticsHubSearch {
  return statisticsHubSearchSchema.parse(search)
}

/** Parse function for TanStack Router `validateSearch` on the dataset explorer. */
export function parseStatisticsDatasetExplorerSearch(
  search: Record<string, unknown>,
): StatisticsDatasetExplorerSearch {
  return statisticsDatasetExplorerSearchSchema.parse(search)
}

/** Parse function for TanStack Router `validateSearch` on the dataset detail. */
export function parseStatisticsDatasetDetailSearch(
  search: Record<string, unknown>,
): StatisticsDatasetDetailSearch {
  return statisticsDatasetDetailSearchSchema.parse(search)
}

/** Parse function for TanStack Router `validateSearch` on the comparisons page. */
export function parseStatisticsComparisonsSearch(
  search: Record<string, unknown>,
): StatisticsComparisonsSearch {
  return statisticsComparisonsSearchSchema.parse(search)
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
  /** The INS context the dataset hangs from — a leaf of the context tree. */
  readonly contextCode: string | null
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

/** One row of the landing territory search. */
export interface StatisticsTerritorySearchRow {
  readonly code: string
  readonly siruta: string | null
  readonly name: string | null
  readonly level: InsTerritoryLevel | null
  readonly countyCode: string | null
  readonly countyName: string | null
}

/** A page of territory search results. */
export interface StatisticsTerritorySearchResult {
  readonly rows: readonly StatisticsTerritorySearchRow[]
  readonly totalCount: number
  readonly hasNextPage: boolean
}

/** A page of dataset catalog rows for the explorer. */
export interface StatisticsDatasetPage {
  readonly datasets: readonly StatisticsDatasetSummary[]
  readonly totalCount: number
  readonly hasNextPage: boolean
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
  readonly tileState:
    | 'available'
    | 'catalog-only'
    | 'no-data'
    | 'ambiguous'
    | 'unavailable'
    | 'period-ambiguous'
  /** Explicit server history bound; absent only in mock fixtures. */
  readonly truncated?: boolean
  readonly geographicWitnesses?: readonly InsSourceGeoPairs[]
  readonly sourceObservations?: readonly NativeInsObservation[]
  readonly sparklineUnavailable?: boolean
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

/** County + national reference values for one hub tile's dataset. */
export interface StatisticsTileBenchmark {
  readonly county: StatisticsLatestValue | null
  readonly national: StatisticsLatestValue | null
}

/** Aggregated territory hub result returned by the statistics API. */
export interface StatisticsTerritoryHubResult {
  readonly identity: StatisticsTerritoryIdentity
  readonly tiles: readonly StatisticsIndicatorTile[]
  readonly availableDatasetCodes: readonly string[]
  /** Null when the counts/benchmarks POST failed — the ribbon hides. */
  readonly coverage: StatisticsCoverageSummary | null
  readonly relatedLinks: readonly StatisticsRelatedLink[]
  readonly latestDataPeriod: string | null
  readonly partial: boolean
  /** dataset code → county/national benchmark, for the headline datasets. */
  readonly benchmarks: Readonly<Record<string, StatisticsTileBenchmark>>
}

/** How the server picked a "latest value" observation. */
export type StatisticsLatestMatchStrategy =
  | 'AMBIGUOUS_GEOGRAPHY'
  | 'PREFERRED_CLASSIFICATION'
  | 'TOTAL_FALLBACK'
  | 'REPRESENTATIVE_FALLBACK'
  | 'NO_DATA'

/**
 * Latest resolved value of one dataset for one territory (national tile or
 * „Locul tău" tile). `value` stays a decimal string; formatting is a render
 * concern.
 */
export interface StatisticsResolvedClassification {
  readonly typeCode: string
  readonly code: string
  readonly nameRo: string | null
}

export interface StatisticsLatestValue {
  /** Original certified outcome retained by the live adapter; mock data has no publication. */
  readonly source?: {
    readonly descriptor: InsSourceDescriptor | null
    readonly observation: NativeInsObservation | null
    readonly geographicWitnesses: readonly InsSourceGeoPairs[]
  }
  readonly datasetCode: string
  readonly datasetNameRo: string | null
  readonly datasetNameEn: string | null
  readonly periodicity: readonly string[]
  readonly matchStrategy: StatisticsLatestMatchStrategy
  readonly hasData: boolean
  readonly value: string | null
  readonly valueStatus: string | null
  readonly unitCode: string | null
  readonly unitSymbol: string | null
  readonly unitNameRo: string | null
  readonly period: string | null
  /** The resolved observation's own cadence FIELD — never string grammar. */
  readonly resolvedPeriodicity: InsPeriodicity | null
  /** The exact cell the server resolved — the tier-0 classification defaults. */
  readonly resolvedClassifications: readonly StatisticsResolvedClassification[]
}

/** Live per-theme dataset count (theme = INS level-0 context group). */
export interface StatisticsThemeCount {
  readonly code: string
  readonly count: number
}

/** Landing POST 2 payload: catalog honesty counts + theme counts. */
export interface StatisticsLandingCatalog {
  readonly nativeContract?: 'native-v2'
  readonly loadedCount: number
  readonly catalogCount: number
  readonly themes: readonly StatisticsThemeCount[]
}

/**
 * One node of the INS Tempo context tree, exactly as INS publishes it.
 *
 * Three levels, no deeper: `0` is a domain (A…H), `1` a group (A.1, A.2…) and
 * `2` a subdomain — the level every dataset hangs from. `parentCode` is the
 * only edge the tree trusts: the deployed API serves `path` as a display
 * string of ancestor names (probed 2026-09-17), so it cannot be walked.
 */
export interface StatisticsContextNode {
  readonly code: string
  readonly nameRo: string | null
  readonly nameEn: string | null
  readonly level: number
  readonly parentCode: string | null
}

// ---------------------------------------------------------------------------
// Statistics hub (`/statistici`)
// ---------------------------------------------------------------------------

/** How a hub value is read: which word follows it and how it is compacted. */
export type StatisticsHubUnit = 'persons' | 'count' | 'percent' | 'years' | 'other'

export interface StatisticsHubSeriesPoint {
  readonly period: string
  readonly value: number
}

export interface StatisticsHubCountyValue {
  /** The county code (`CJ`, `B`) — also the GeoJSON mnemonic. */
  readonly code: string
  readonly name: string
  readonly value: number
}

/** One national indicator: the latest total cell and, when read, its annual history. */
export interface StatisticsHubIndicator {
  readonly code: string
  readonly nameRo: string | null
  /** Null when the server resolved no cell (`NO_DATA`) or the cell is null-valued. */
  readonly value: number | null
  /** The source decimal string, verbatim. */
  readonly rawValue: string | null
  readonly valueStatus: string | null
  readonly unit: StatisticsHubUnit
  readonly unitLabel: string | null
  readonly unitCode: string | null
  readonly period: string | null
  readonly periodicity: InsPeriodicity | null
  /** `Dn:member` pins of the resolved cell — what the detail page needs to land on it. */
  readonly pins: readonly string[]
  /** Annual total-cell history, oldest first: the client's capture plus the live latest point when newer. */
  readonly series: readonly StatisticsHubSeriesPoint[]
}

/** One dataset over the 42 counties, at the national indicator's latest year. */
export interface StatisticsHubCountyLayer {
  readonly code: string
  readonly period: string | null
  readonly unit: StatisticsHubUnit
  readonly unitLabel: string | null
  readonly values: readonly StatisticsHubCountyValue[]
  /** Counties the read did not return a total cell for — hatched on the map, never zero. */
  readonly missingCounties: readonly string[]
}

export type StatisticsHubSection = 'indicators' | 'counties' | 'catalog' | 'territories'

/** The hub payload. Sections fail independently; a failed one is null and named. */
export interface StatisticsHubData {
  readonly nativeContract: 'hub-v1'
  readonly indicators: readonly StatisticsHubIndicator[] | null
  readonly counties: readonly StatisticsHubCountyLayer[] | null
  readonly catalog: StatisticsLandingCatalog | null
  readonly territoryCount: number | null
  readonly failures: readonly StatisticsHubSection[]
}

/** Detail POST A payload: the dataset + the resolved tier-0 value. */
export interface StatisticsDatasetTier0 {
  readonly nativeContract?: 'native-v1'
  readonly dataset: InsDatasetDetails | null
  readonly latest: StatisticsLatestValue | null
}

export interface StatisticsRelatedDataset {
  readonly code: string
  readonly nameRo: string | null
  readonly dataStatus: StatisticsDatasetDataStatus
}

/** Detail POST B payload: the resolved series + the related-datasets probe. */
export interface StatisticsDatasetSeries {
  readonly readMode?: 'inspection' | 'complete'
  readonly inspectionTruncated?: boolean
  readonly nativeContract?: 'native-v1'
  /** Present on complete native vectors; absent only in mock data. */
  readonly sourceDescriptor?: InsSourceDescriptor
  readonly observations: readonly InsObservation[]
  readonly totalCount: number
  readonly related: readonly StatisticsRelatedDataset[]
  /** Catalog size of the dataset's context, self included; null when unprobed. */
  readonly relatedTotalCount: number | null
}

/** „Locul tău" snapshot: the picked territory's identity + latest values. */
export interface StatisticsUatSnapshot {
  readonly nativeContract?: 'native-v2'
  readonly territory: StatisticsTerritorySearchRow | null
  readonly values: readonly StatisticsLatestValue[]
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
