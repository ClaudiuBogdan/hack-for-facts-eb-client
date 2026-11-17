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
// Route search schemas: `statistics-search.ts`, lazy and apart so the route
// tree does not carry this module; re-exported here.
// ---------------------------------------------------------------------------

export {
  parseStatisticsComparisonsSearch,
  parseStatisticsDatasetDetailSearch,
  parseStatisticsDatasetExplorerSearch,
  parseStatisticsHubSearch,
  parseStatisticsTerritoryHubSearch,
  statisticsComparisonsSearchSchema,
  statisticsDatasetDetailSearchSchema,
  statisticsDatasetExplorerSearchSchema,
  statisticsHubSearchSchema,
  statisticsPeriodSearchSchema,
  statisticsTerritoryHubSearchSchema,
} from './statistics-search'
export type {
  StatisticsComparisonsSearch,
  StatisticsDatasetDetailSearch,
  StatisticsDatasetExplorerSearch,
  StatisticsHubIndicatorKey,
  StatisticsHubMapSeries,
  StatisticsHubSearch,
  StatisticsTerritoryHubSearch,
} from './statistics-search'

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
  readonly unitNameEn: string | null
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
  /** The unit's English name, for an English page to pick when it renders (`hubInLocale`). */
  readonly unitLabelEn?: string | null
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
  /** The unit's English name where the layer carries it, for an English page to pick when it renders. */
  readonly unitLabelEn?: string | null
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
