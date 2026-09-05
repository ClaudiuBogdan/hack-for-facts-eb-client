import { getInsDatasetDetails } from './ins-bootstrap-fetchers'
import { inspectSourceSeries } from '@/lib/ins/source-series'
import { InsSourcePageError } from '@/lib/ins/source-pages'
import {
  fetchInsSourceVector,
  fetchInsSourceInspection,
} from './ins-source-fetcher'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { insSourceDescriptorSchema } from '@/lib/ins/source-contract'
import { type GraphQLRequestOptions } from '@/lib/api/graphql'
import { SERIES_MAX_ROWS } from '../../lib/dataset-selection'
import type {
  InsDatasetFilterInput,
  InsEntitySelectorInput,
  InsObservationFilterInput,
  InsTerritoryFilterInput,
  NativeInsUatDatasetGroup,
} from '@/schemas/ins'
import type {
  StatisticsDatasetPage,
  StatisticsDatasetSeries,
  StatisticsDatasetTier0,
  StatisticsLatestValue,
  StatisticsLandingCatalog,
  StatisticsLandingData,
  StatisticsTerritorySearchResult,
  StatisticsTerritorySearchRow,
  StatisticsUatSnapshot,
} from '@/schemas/statistics'
import {
  INS_DATASETS_EXPLORER_QUERY,
  INS_TERRITORIES_QUERY,
  STATISTICS_RELATED_DATASETS_QUERY,
  STATISTICS_DATASET_TIER0_QUERY,
  STATISTICS_TERRITORY_HUB_CONTEXT_QUERY,
  STATISTICS_TERRITORY_HUB_QUERY,
  STATISTICS_LANDING_CATALOG_QUERY,
  STATISTICS_LANDING_DATA_QUERY,
  STATISTICS_UAT_SNAPSHOT_QUERY,
} from './ins-queries'
import {
  mapDatasetDetails,
  mapDatasetSummary,
  mapDecadeRows,
  mapExampleRows,
  mapLatestValue,
  mapRelatedDatasets,
  mapTerritorySearchRow,
} from './statistics-mappers'
import {
  insDatasetsExplorerResponseRawSchema,
  insTerritoriesResponseRawSchema,
  statisticsRelatedDatasetsRawSchema,
  statisticsDatasetTier0ResponseRawSchema,
  statisticsTerritoryHubContextResponseRawSchema,
  statisticsTerritoryHubResponseRawSchema,
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
  const response = await graphqlQuery<unknown>(
    INS_TERRITORIES_QUERY,
    {
      filter: params.filter,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    },
    { auth: 'none', signal: params.signal },
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
  const response = await graphqlQuery<unknown>(
    INS_DATASETS_EXPLORER_QUERY,
    {
      filter: params.filter,
      limit: params.limit,
      offset: params.offset,
    },
    { auth: 'none', signal: params.signal },
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
 * 401s an otherwise-public endpoint before any resolver runs). Shared with
 * the legacy `ins-fetchers.ts` lane so no INS read can regress to auth.
 */
export function insRequestOptions(signal?: AbortSignal): GraphQLRequestOptions {
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
  const response = await graphqlQuery<unknown>(
    STATISTICS_LANDING_DATA_QUERY,
    {
      nationalCodes: params.nationalCodes,
      decadeCode: params.decadeCode,
      decadeYears: params.decadeYears,
      exampleCode: params.exampleCode,
      exampleTerritories: params.exampleTerritories,
    },
    { auth: 'none', signal: params.signal },
  )

  const parsed = statisticsLandingDataResponseRawSchema.parse(response)

  return {
    nativeContract: 'native-v1',
    nationalValues: parsed.latest.map(mapLatestValue),
    decadeRows: mapDecadeRows(parsed.decade.nodes),
    exampleRows: mapExampleRows(parsed.example.nodes),
  }
}

/** Landing POST 2 — loaded/catalog counts + the eight theme counts. */
export async function fetchStatisticsLandingCatalog(
  params: {
    signal?: AbortSignal
  } = {},
): Promise<StatisticsLandingCatalog> {
  const response = await graphqlQuery<unknown>(
    STATISTICS_LANDING_CATALOG_QUERY,
    undefined,
    { auth: 'none', signal: params.signal },
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
  const response = await graphqlQuery<unknown>(
    STATISTICS_UAT_SNAPSHOT_QUERY,
    { siruta: params.siruta, codes: params.datasetCodes },
    { auth: 'none', signal: params.signal },
  )

  const parsed = statisticsUatSnapshotResponseRawSchema.parse(response)
  const territoryNode = parsed.territory.nodes[0]

  return {
    territory: territoryNode ? mapTerritorySearchRow(territoryNode) : null,
    values: parsed.latest.map(mapLatestValue),
  }
}

/** Detail POST A — dataset metadata + the resolved tier-0 latest value. */
export async function fetchStatisticsDatasetTier0(params: {
  code: string
  entity: InsEntitySelectorInput | null
  signal?: AbortSignal
}): Promise<StatisticsDatasetTier0> {
  if (params.entity === null)
    return {
      nativeContract: 'native-v1',
      dataset: await getInsDatasetDetails(params.code, params.signal),
      latest: null,
    }
  const response = await graphqlQuery<unknown>(
    STATISTICS_DATASET_TIER0_QUERY,
    { code: params.code, codes: [params.code], entity: params.entity },
    { auth: 'none', signal: params.signal },
  )

  const parsed = statisticsDatasetTier0ResponseRawSchema.parse(response)
  const latestNode = parsed.latest.find(
    (node) => node.dataset.code === params.code,
  )

  return {
    nativeContract: 'native-v1',
    dataset: parsed.dataset ? mapDatasetDetails(parsed.dataset) : null,
    latest: latestNode ? mapLatestValue(latestNode) : null,
  }
}

/** Detail POST B — the resolved series + the related-datasets probe. */
export async function fetchStatisticsDatasetSeries(params: {
  code: string
  filter: InsObservationFilterInput
  contextCode: string | null
  inspection?: boolean
  limit?: number
  signal?: AbortSignal
}): Promise<StatisticsDatasetSeries> {
  const [vector, relatedResponse] = await Promise.all([
    params.inspection
      ? fetchInsSourceInspection({
          datasetCode: params.code,
          filter: params.filter,
          signal: params.signal,
        })
      : fetchInsSourceVector({
          datasetCode: params.code,
          filter: params.filter,
          pageSize: params.limit ?? SERIES_MAX_ROWS,
          signal: params.signal,
        }),
    params.contextCode === null
      ? Promise.resolve(null)
      : graphqlQuery<unknown>(
          STATISTICS_RELATED_DATASETS_QUERY,
          { contextCode: params.contextCode },
          { auth: 'none', signal: params.signal },
        ),
  ])
  if (inspectSourceSeries(vector).status === 'INVALID')
    throw new InsSourcePageError('INVALID_PAGE')
  const related =
    relatedResponse === null
      ? null
      : statisticsRelatedDatasetsRawSchema.parse(relatedResponse).related
  return {
    nativeContract: 'native-v1',
    readMode: params.inspection ? 'inspection' : 'complete',
    inspectionTruncated: 'truncated' in vector && vector.truncated === true,
    sourceDescriptor: vector.descriptor,
    observations: vector.observations,
    totalCount: vector.observations.length,
    related: mapRelatedDatasets(related ?? null, params.code),
    relatedTotalCount: related?.pageInfo.totalCount ?? null,
  }
}

/** Hub POST 1 — dashboard groups + territory identity, one operation. */
export async function fetchStatisticsTerritoryHubData(params: {
  siruta: string
  signal?: AbortSignal
}): Promise<{
  readonly groups: readonly NativeInsUatDatasetGroup[]
  readonly identity: StatisticsTerritorySearchRow | null
}> {
  const response = await graphqlQuery<unknown>(
    STATISTICS_TERRITORY_HUB_QUERY,
    { sirutaCode: params.siruta },
    { auth: 'none', signal: params.signal },
  )

  const parsed = statisticsTerritoryHubResponseRawSchema.parse(response)
  const identityNode = parsed.identity.nodes[0]

  return {
    groups: parsed.dashboard.map((group) => ({
      dataset: mapDatasetDetails(group.dataset),
      descriptor: insSourceDescriptorSchema.parse(group.dataset),
      latestPeriod: group.latestPeriod,
      observations: group.observations,
      status: group.status,
      geographicWitnesses: group.geographicWitnesses,
      truncated: group.truncated,
    })),
    identity: identityNode ? mapTerritorySearchRow(identityNode) : null,
  }
}

/** Hub POST 2 — exact counts + county/national benchmarks, one operation. */
export async function fetchStatisticsTerritoryHubContext(params: {
  countyCode: string | null
  benchmarkCodes: readonly string[]
  signal?: AbortSignal
}): Promise<{
  readonly loadedCount: number
  readonly catalogCount: number
  readonly county: readonly StatisticsLatestValue[]
  readonly national: readonly StatisticsLatestValue[]
}> {
  const response = await graphqlQuery<unknown>(
    STATISTICS_TERRITORY_HUB_CONTEXT_QUERY,
    {
      countyCode: params.countyCode,
      benchmarkCodes: params.benchmarkCodes,
      withCounty: params.countyCode !== null,
    },
    { auth: 'none', signal: params.signal },
  )

  const parsed = statisticsTerritoryHubContextResponseRawSchema.parse(response)

  return {
    loadedCount: parsed.loaded.pageInfo.totalCount,
    catalogCount: parsed.catalog.pageInfo.totalCount,
    county: (parsed.county ?? []).map(mapLatestValue),
    national: parsed.national.map(mapLatestValue),
  }
}
