import { graphqlRequest, type GraphQLRequestOptions } from '@/lib/api/graphql'
import type { InsDatasetFilterInput, InsTerritoryFilterInput } from '@/schemas/ins'
import type {
  StatisticsDatasetPage,
  StatisticsLandingCatalog,
  StatisticsLandingData,
  StatisticsTerritorySearchResult,
  StatisticsUatSnapshot,
} from '@/schemas/statistics'
import {
  INS_DATASETS_EXPLORER_QUERY,
  INS_TERRITORIES_QUERY,
  STATISTICS_LANDING_CATALOG_QUERY,
  STATISTICS_LANDING_DATA_QUERY,
  STATISTICS_UAT_SNAPSHOT_QUERY,
} from './ins-queries'
import {
  mapDatasetSummary,
  mapDecadeRows,
  mapExampleRows,
  mapLatestValue,
  mapTerritorySearchRow,
} from './statistics-mappers'
import {
  insDatasetsExplorerResponseRawSchema,
  insTerritoriesResponseRawSchema,
  statisticsLandingCatalogResponseRawSchema,
  statisticsLandingDataResponseRawSchema,
  statisticsUatSnapshotResponseRawSchema,
} from './statistics-raw-schemas'

/**
 * Validated fetchers for the statistics product surfaces (territory search and
 * the dataset explorer). Unlike the legacy fetchers in `ins-fetchers.ts`, these
 * parse the wire payload before mapping it, so a server contract change fails
 * loudly at the query boundary instead of rendering as blank cells.
 */

export async function searchInsTerritories(params: {
  filter?: InsTerritoryFilterInput
  limit?: number
  offset?: number
  signal?: AbortSignal
}): Promise<StatisticsTerritorySearchResult> {
  const response = await graphqlRequest<unknown>(
    INS_TERRITORIES_QUERY,
    {
      filter: params.filter,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    },
    insRequestOptions(params.signal),
  )

  const { insTerritories } = insTerritoriesResponseRawSchema.parse(response)

  return {
    rows: insTerritories.nodes.map(mapTerritorySearchRow),
    totalCount: insTerritories.pageInfo.totalCount,
    hasNextPage: insTerritories.pageInfo.hasNextPage,
  }
}

export async function fetchInsDatasetPage(params: {
  filter: InsDatasetFilterInput
  limit: number
  offset: number
  signal?: AbortSignal
}): Promise<StatisticsDatasetPage> {
  const response = await graphqlRequest<unknown>(
    INS_DATASETS_EXPLORER_QUERY,
    {
      filter: params.filter,
      limit: params.limit,
      offset: params.offset,
    },
    insRequestOptions(params.signal),
  )

  const { insDatasets } = insDatasetsExplorerResponseRawSchema.parse(response)

  return {
    datasets: insDatasets.nodes.map(mapDatasetSummary),
    totalCount: insDatasets.pageInfo.totalCount,
    hasNextPage: insDatasets.pageInfo.hasNextPage,
  }
}

/**
 * All INS reads are public: send no Authorization header (a stale Clerk token
 * 401s an otherwise-public endpoint before any resolver runs).
 */
function insRequestOptions(signal?: AbortSignal): GraphQLRequestOptions {
  return { skipAuth: true, ...(signal ? { signal } : {}) }
}

/** Landing POST 1 — national tiles + decade rows + worked example. */
export async function fetchStatisticsLandingData(params: {
  nationalCodes: readonly string[]
  decadeCode: string
  decadeYears: readonly string[]
  exampleCode: string
  exampleTerritories: readonly string[]
  signal?: AbortSignal
}): Promise<StatisticsLandingData> {
  const response = await graphqlRequest<unknown>(
    STATISTICS_LANDING_DATA_QUERY,
    {
      nationalCodes: params.nationalCodes,
      decadeCode: params.decadeCode,
      decadeYears: params.decadeYears,
      exampleCode: params.exampleCode,
      exampleTerritories: params.exampleTerritories,
    },
    insRequestOptions(params.signal),
  )

  const parsed = statisticsLandingDataResponseRawSchema.parse(response)

  return {
    nationalValues: parsed.latest.map(mapLatestValue),
    decadeRows: mapDecadeRows(parsed.decade.nodes),
    exampleRows: mapExampleRows(parsed.example.nodes),
  }
}

/** Landing POST 2 — loaded/catalog counts + the eight theme counts. */
export async function fetchStatisticsLandingCatalog(params: {
  signal?: AbortSignal
} = {}): Promise<StatisticsLandingCatalog> {
  const response = await graphqlRequest<unknown>(
    STATISTICS_LANDING_CATALOG_QUERY,
    undefined,
    insRequestOptions(params.signal),
  )

  const parsed = statisticsLandingCatalogResponseRawSchema.parse(response)

  return {
    loadedCount: parsed.loaded.pageInfo.totalCount,
    catalogCount: parsed.catalog.pageInfo.totalCount,
    themes: (['1', '2', '3', '4', '5', '6', '7', '8'] as const).map((code) => ({
      code,
      count: parsed[`t${code}`].pageInfo.totalCount,
    })),
  }
}

/** „Locul tău" snapshot — latest values + identity for one SIRUTA, one POST. */
export async function fetchStatisticsUatSnapshot(params: {
  siruta: string
  datasetCodes: readonly string[]
  signal?: AbortSignal
}): Promise<StatisticsUatSnapshot> {
  const response = await graphqlRequest<unknown>(
    STATISTICS_UAT_SNAPSHOT_QUERY,
    { siruta: params.siruta, codes: params.datasetCodes },
    insRequestOptions(params.signal),
  )

  const parsed = statisticsUatSnapshotResponseRawSchema.parse(response)
  const territoryNode = parsed.territory.nodes[0]

  return {
    territory: territoryNode ? mapTerritorySearchRow(territoryNode) : null,
    values: parsed.latest.map(mapLatestValue),
  }
}
