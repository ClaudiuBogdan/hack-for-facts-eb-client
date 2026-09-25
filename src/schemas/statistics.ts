import { z } from 'zod'
import type {
  InsChartPeriodicity,
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

/**
 * Search state for the statistics hub route (`/ins`).
 *
 * `indicator` is the county map's colouring — shareable, so a link can land
 * on "unemployment by county". `harta` and `judet` are the localities' map's
 * series and the county it shows, alike. The default view renders with no
 * params.
 */
const STATISTICS_HUB_INDICATORS = ['viata', 'salariu', 'pib', 'somaj', 'spor', 'varsta'] as const
export type StatisticsHubIndicatorKey = (typeof STATISTICS_HUB_INDICATORS)[number]

const STATISTICS_HUB_MAP_SERIES = ['populatie', 'spor-natural', 'sold-domiciliu', 'salariati', 'locuinte-noi', 'apa'] as const
export type StatisticsHubMapSeries = (typeof STATISTICS_HUB_MAP_SERIES)[number]

export const statisticsHubSearchSchema = z
  .object({
    indicator: z.enum(STATISTICS_HUB_INDICATORS).optional().catch(undefined),
    harta: z.enum(STATISTICS_HUB_MAP_SERIES).optional().catch(undefined),
    /** A county code (`CJ`, `B`); one the map does not know is ignored there. */
    judet: z.string().regex(/^[A-Z]{1,2}$/).optional().catch(undefined),
  })
  .catch({})

export type StatisticsHubSearch = z.infer<typeof statisticsHubSearchSchema>

/**
 * Search state for the territory hub route
 * (`/ins/teritorii/$siruta`).
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
 * Search state for the dataset explorer (`/ins/seturi`).
 *
 * Param names are Romanian to match the route segments. Every field is
 * `.optional().catch(undefined)` so a malformed value in a shared URL degrades
 * to "filter not applied" rather than throwing during route validation.
 *
 * - `q`: free-text dataset search (debounced, never a submit button).
 * - `context`: INS context (theme) code.
 * - `frecventa`: periodicity multi-select.
 * - `uat` / `judet`: coverage flags.
 * - `pagina`: 1-based page index.
 */
const explorerPeriodicitySchema = z.enum(['ANNUAL', 'QUARTERLY', 'MONTHLY'])

/** The router JSON-parses a bare number or boolean; a search term is text whatever it looks like. */
const asText = (value: unknown) => (typeof value === 'number' || typeof value === 'boolean' ? String(value) : value)

export const statisticsDatasetExplorerSearchSchema = z
  .object({
    // `?q=2024` arrives as a number: a year is a search term too.
    q: z.preprocess(asText, z.string().trim().min(1).optional()).catch(undefined),
    // Every theme code is a digit, so coerce it back or every theme link drops.
    context: z.preprocess(asText, z.string().trim().min(1).optional()).catch(undefined),
    // A single `?frecventa=ANNUAL` is one filter, not a malformed list; a
    // pasted link that repeats a cadence names it once; an empty list is none.
    frecventa: z
      .preprocess(
        (value) => {
          const list = typeof value === 'string' ? [value] : value
          return Array.isArray(list) ? Array.from(new Set(list)) : list
        },
        z.array(explorerPeriodicitySchema).min(1).optional(),
      )
      .catch(undefined),
    uat: z.boolean().optional().catch(undefined),
    judet: z.boolean().optional().catch(undefined),
    pagina: z.number().int().min(1).optional().catch(undefined),
  })
  .catch({})

export type StatisticsDatasetExplorerSearch = z.infer<
  typeof statisticsDatasetExplorerSearchSchema
>

/**
 * Search state for the dataset detail route (`/ins/seturi/$cod`).
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
  })
  .catch({})

export type StatisticsDatasetDetailSearch = z.infer<
  typeof statisticsDatasetDetailSearchSchema
>

/**
 * Search state for the local comparisons route (`/ins/comparatii`).
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
  /** The start of the compared window; `perioada` is its end. */
  din: z.unknown().optional(),
  clasificari: z.unknown().optional(),
  unitate: z.unknown().optional(),
  frecventa: z.unknown().optional(),
  /** `valori` or `schimbare`: the chart's scale. Absent, the page picks one from the rows. */
  vedere: z.unknown().optional(),
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
  /** The INS context the dataset hangs from — a leaf of the context tree. */
  readonly contextCode: string | null
  readonly contextNameRo: string | null
  readonly contextNameEn: string | null
  readonly contextPath: string | null
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
  /** True when the live record carried no name: the page says so rather than invent one. */
  readonly enrichedFallback: boolean
}

/** One published cell of a territory indicator: what a period filter re-anchors to. */
export interface StatisticsTileObservation {
  readonly time_period: InsTimePeriod
  readonly value: string | null
  readonly valueStatus: string | null
}

/** Single headline indicator tile on the territory dashboard. */
export interface StatisticsIndicatorTile {
  readonly datasetCode: string
  readonly datasetNameRo: string | null
  readonly datasetNameEn: string | null
  readonly periodicity: readonly string[]
  readonly dataStatus: StatisticsDatasetDataStatus
  /**
   * `period-missing`: the series has rows, none at the period the address
   * asks for; `unavailable`: that period lies before the loaded history.
   */
  readonly tileState:
    | 'available'
    | 'catalog-only'
    | 'no-data'
    | 'ambiguous'
    | 'unavailable'
    | 'period-ambiguous'
    | 'period-missing'
  /** The server capped this series' history (200 rows); older periods exist unseen. */
  readonly truncated: boolean
  /**
   * Every published cell, oldest first — what a period filter chooses from
   * and what the sparkline is drawn from, so the history travels once.
   */
  readonly observations: readonly StatisticsTileObservation[]
  /**
   * The cadence the line is drawn at: the headline value's own, when a
   * chart can draw it; null when it cannot (a semestrial series) or there
   * is no headline value.
   */
  readonly sparklineCadence: InsChartPeriodicity | null
  readonly value: string | null
  readonly valueStatus: string | null
  readonly unitSymbol: string | null
  readonly unitNameRo: string | null
  readonly unitNameEn: string | null
  readonly latestPeriod: string | null
  readonly latestYear: number | null
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
  /** The most recent period any of the tiles publishes. */
  readonly latestDataPeriod: string | null
  /** dataset code → county/national benchmark, for the headline datasets. */
  readonly benchmarks: Readonly<Record<string, StatisticsTileBenchmark>>
  /** The references' read failed; the page says so rather than show none silently. */
  readonly benchmarksUnavailable: boolean
}

/** How the server picked a "latest value" observation. */
export type StatisticsLatestMatchStrategy =
  | 'AMBIGUOUS_GEOGRAPHY'
  | 'PREFERRED_CLASSIFICATION'
  | 'TOTAL_FALLBACK'
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
// Statistics hub (`/ins`)
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
  /** False for a matrix with no geography axis: national by construction, so its link names no territory. */
  readonly hasGeography: boolean
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
  /**
   * The national cell the counties were matched against — same dataset, cell,
   * unit and year. Null when INS flags it or its period is not that year.
   */
  readonly national: number | null
}

export type StatisticsHubSection = 'indicators' | 'counties'

/** The hub payload. Sections fail independently; a failed one is null and named. */
export interface StatisticsHubData {
  readonly nativeContract: 'hub-v1'
  readonly indicators: readonly StatisticsHubIndicator[] | null
  readonly counties: readonly StatisticsHubCountyLayer[] | null
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
  readonly nameEn: string | null
  readonly dataStatus: StatisticsDatasetDataStatus
}

/** Detail POST B payload: one cell's source vector, or a bounded inspection page. */
export interface StatisticsDatasetSeries {
  readonly readMode?: 'inspection' | 'complete'
  readonly inspectionTruncated?: boolean
  readonly nativeContract?: 'native-v1'
  /** The publication the rows were read under. Optional only for the legacy consumers' sake. */
  readonly sourceDescriptor?: InsSourceDescriptor
  readonly observations: readonly InsObservation[]
  readonly totalCount: number
}

/** The matrices of one INS context, the dataset itself included. */
export interface StatisticsRelatedDatasets {
  readonly datasets: readonly StatisticsRelatedDataset[]
  /** Catalog size of the context, self included; null when the server sent no page. */
  readonly totalCount: number | null
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
