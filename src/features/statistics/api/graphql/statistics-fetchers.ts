import { graphqlRequest } from '@/lib/api/graphql'
import type { InsDatasetFilterInput, InsTerritoryFilterInput } from '@/schemas/ins'
import type {
  StatisticsDatasetPage,
  StatisticsTerritorySearchResult,
} from '@/schemas/statistics'
import { INS_DATASETS_EXPLORER_QUERY, INS_TERRITORIES_QUERY } from './ins-queries'
import { mapDatasetSummary, mapTerritorySearchRow } from './statistics-mappers'
import {
  insDatasetsExplorerResponseRawSchema,
  insTerritoriesResponseRawSchema,
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
}): Promise<StatisticsTerritorySearchResult> {
  const response = await graphqlRequest<unknown>(INS_TERRITORIES_QUERY, {
    filter: params.filter,
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
  })

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
}): Promise<StatisticsDatasetPage> {
  const response = await graphqlRequest<unknown>(INS_DATASETS_EXPLORER_QUERY, {
    filter: params.filter,
    limit: params.limit,
    offset: params.offset,
  })

  const { insDatasets } = insDatasetsExplorerResponseRawSchema.parse(response)

  return {
    datasets: insDatasets.nodes.map(mapDatasetSummary),
    totalCount: insDatasets.pageInfo.totalCount,
    hasNextPage: insDatasets.pageInfo.hasNextPage,
  }
}
