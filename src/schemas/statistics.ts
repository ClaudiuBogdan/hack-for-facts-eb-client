import { z } from 'zod'
import type { InsSourceDescriptor, InsSourceGeoPairs } from '@/lib/ins/source-contract'
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
  .preprocess((value) => {
    // The router's search parser JSON-parses bare digits, so the natural
    // ?period=2019 arrives as a NUMBER — coerce before validating.
    const candidate = typeof value === 'number' ? String(value) : value
    if (typeof candidate !== 'string') return 'latest'
    const normalized = candidate.trim()
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
 *
 * `q` is the debounced territory search term, shareable so a colleague can be
 * sent straight to "the Cluj-Napoca result".
 *
 * `loc` is the picked territory (SIRUTA) the „Locul tău" band renders for —
 * shareable, so a link can land directly on "your place" numbers.
 */
export const statisticsLandingSearchSchema = z
  .object({
    q: z.string().trim().min(1).optional().catch(undefined),
    // The router's search parser JSON-parses bare digits into a number —
    // coerce back before validating, or every ?loc= deep link drops.
    loc: z
      .preprocess(
        (value) => (typeof value === 'number' ? String(value) : value),
        z
          .string()
          .trim()
          .regex(/^\d{1,6}$/)
          .optional(),
      )
      .catch(undefined),
  })
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
export const statisticsDatasetExplorerSearchSchema = z
  .object({
    q: z.string().trim().min(1).optional().catch(undefined),
    context: z.string().trim().min(1).optional().catch(undefined),
    frecventa: z
      .array(z.enum(['ANNUAL', 'QUARTERLY', 'MONTHLY']))
      .nonempty()
      .optional()
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
 * A pinned classification, encoded as `"TYPE:VALUE"` — domain codes, which are
 * what `InsObservationFilterInput` speaks. Never `nom_item_id`s: those are
 * dimension-value surrogate keys and are meaningless in a shared URL.
 */
const classificationPinSchema = z.string().regex(/^[^:]+:[^:]+$/)

/**
 * A pinned territory, encoded as `"siruta:54975"` (LAU) or `"cod:CJ"` (NUTS3).
 * The two forms map to different `InsObservationFilterInput` fields.
 */
const territoryPinSchema = z.string().regex(/^(siruta|cod):[A-Za-z0-9]+$/)

/**
 * Search state for the dataset detail route (`/statistici/seturi/$cod`).
 *
 * Flat and bounded: at most 8 classification pins, one per classification type
 * (replacing a pin is a keyed upsert, not an append).
 */
export const statisticsDatasetDetailSearchSchema = z
  .object({
    teritoriu: territoryPinSchema.optional().catch(undefined),
    clasificari: z
      .array(classificationPinSchema)
      .max(8)
      .nonempty()
      .optional()
      .catch(undefined),
    unitate: z.string().trim().min(1).optional().catch(undefined),
    frecventa: z.enum(['ANNUAL', 'QUARTERLY', 'MONTHLY']).optional().catch(undefined),
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
 * `teritorii` holds 2–6 SIRUTA codes. Below two the page shows a guided empty
 * state rather than a chart of one line.
 */
const coerceNumberToString = (value: unknown) =>
  typeof value === 'number' ? String(value) : value

export const statisticsComparisonsSearchSchema = z
  .object({
    cod: z.string().trim().min(1).optional().catch(undefined),
    // The router JSON-parses bare digits, so `?teritorii=[54975]` delivers
    // NUMBERS and a lone token arrives as a bare string — both normalized.
    teritorii: z
      .preprocess(
        (value) => {
          const entries = Array.isArray(value)
            ? value
            : value === undefined
              ? undefined
              : [value]
          return entries?.map(coerceNumberToString)
        },
        z.array(z.string().trim().min(1)).min(1).max(6).optional(),
      )
      .catch(undefined),
    perioada: z
      .preprocess(coerceNumberToString, z.string().trim().min(1).optional())
      .catch(undefined),
    clasificari: z
      .array(classificationPinSchema)
      .max(8)
      .nonempty()
      .optional()
      .catch(undefined),
    unitate: z.string().trim().min(1).optional().catch(undefined),
  })
  .catch({})

export type StatisticsComparisonsSearch = z.infer<
  typeof statisticsComparisonsSearchSchema
>

/** Parse function for TanStack Router `validateSearch` on the landing route. */
export function parseStatisticsLandingSearch(
  search: Record<string, unknown>,
): StatisticsLandingSearch {
  return statisticsLandingSearchSchema.parse(search)
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
  readonly tileState: 'available' | 'catalog-only' | 'no-data' | 'ambiguous' | 'unavailable' | 'period-ambiguous'
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

/** One NUTS3 endpoint-year observation for the decade story. */
export interface StatisticsDecadeObservation {
  readonly countyCode: string
  readonly countyName: string | null
  readonly year: number
  readonly value: string | null
  readonly unitNameRo: string | null
}

/** One observation of the worked comparison example (mixed levels). */
export interface StatisticsExampleObservation {
  readonly level: InsTerritoryLevel | null
  readonly code: string
  readonly siruta: string | null
  readonly name: string | null
  readonly year: number
  readonly value: string | null
  readonly unitSymbol: string | null
}

/** Landing POST 1 payload: every observation-bearing block. */
export interface StatisticsLandingData {
  readonly nativeContract?: 'native-v1'
  readonly nationalValues: readonly StatisticsLatestValue[]
  readonly decadeRows: readonly StatisticsDecadeObservation[]
  readonly exampleRows: readonly StatisticsExampleObservation[]
}

/** Live per-theme dataset count (theme = INS level-0 context group). */
export interface StatisticsThemeCount {
  readonly code: string
  readonly count: number
}

/** Landing POST 2 payload: catalog honesty counts + theme counts. */
export interface StatisticsLandingCatalog {
  readonly loadedCount: number
  readonly catalogCount: number
  readonly themes: readonly StatisticsThemeCount[]
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
