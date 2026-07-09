import { createLogger } from '@/lib/logger'
import { graphqlRequest } from '@/lib/api/graphql'
import type {
  InsContextConnection,
  InsContextFilterInput,
  InsDashboardData,
  InsDataset,
  InsDatasetConnection,
  InsDatasetDetails,
  InsDatasetDimensionsResult,
  InsDatasetFilterInput,
  InsDimensionValueConnection,
  InsObservation,
  InsObservationConnection,
  InsObservationFilterInput,
  InsUatDatasetGroup,
} from '@/schemas/ins'
import {
  buildInsObservationsBatchQuery,
  INS_CONTEXTS_QUERY,
  INS_DATASET_DETAILS_QUERY,
  INS_DATASET_DIMENSION_VALUES_QUERY,
  INS_DATASET_DIMENSIONS_QUERY,
  INS_DATASET_HISTORY_QUERY,
  INS_DATASETS_BY_CODES_QUERY,
  INS_DATASETS_QUERY,
  INS_OBSERVATIONS_QUERY,
  INS_UAT_DASHBOARD_QUERY,
} from './ins-queries'

const logger = createLogger('ins-api')

const INS_UAT_DASHBOARD_LIMIT = 2000
const INS_OBSERVATION_LIMIT = 200

export async function getInsUatDashboard(params: {
  sirutaCode: string
  period?: string
  contextCode?: string
}): Promise<InsDashboardData> {
  logger.info('Fetching INS UAT dashboard', params)

  const response = await graphqlRequest<{ insUatDashboard: InsUatDatasetGroup[] }>(
    INS_UAT_DASHBOARD_QUERY,
    {
      sirutaCode: params.sirutaCode,
      period: params.period,
      contextCode: params.contextCode,
    }
  )

  const groups = response.insUatDashboard ?? []
  const totalObservations = groups.reduce((total, group) => total + group.observations.length, 0)

  return {
    groups,
    partial: totalObservations >= INS_UAT_DASHBOARD_LIMIT,
  }
}

export async function getInsDatasetsByCodes(codes: string[]): Promise<InsDataset[]> {
  if (codes.length === 0) return []

  logger.info('Fetching INS datasets by codes', { count: codes.length })

  const response = await graphqlRequest<{ insDatasets: { nodes: InsDataset[] } }>(
    INS_DATASETS_BY_CODES_QUERY,
    {
      codes,
      limit: Math.min(codes.length, 200),
    }
  )

  return response.insDatasets.nodes ?? []
}

export async function getInsContexts(params: {
  filter?: InsContextFilterInput
  limit?: number
  offset?: number
}): Promise<InsContextConnection> {
  const response = await graphqlRequest<{ insContexts: InsContextConnection }>(INS_CONTEXTS_QUERY, {
    filter: params.filter,
    limit: params.limit ?? 200,
    offset: params.offset ?? 0,
  })

  return response.insContexts
}

export async function getInsDatasetsCatalog(params: {
  filter?: InsDatasetFilterInput
  limit?: number
  offset?: number
}): Promise<InsDatasetConnection> {
  const response = await graphqlRequest<{ insDatasets: InsDatasetConnection }>(INS_DATASETS_QUERY, {
    filter: params.filter,
    limit: params.limit ?? 500,
    offset: params.offset ?? 0,
  })

  return response.insDatasets
}

export async function searchInsDatasets(params: {
  filter?: InsDatasetFilterInput
  limit?: number
  offset?: number
}): Promise<InsDatasetConnection> {
  const response = await graphqlRequest<{ insDatasets: InsDatasetConnection }>(INS_DATASETS_QUERY, {
    filter: params.filter,
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
  })

  return response.insDatasets
}

export async function getInsDatasetDetails(code: string): Promise<InsDatasetDetails | null> {
  if (!code) return null

  const response = await graphqlRequest<{ insDataset: InsDatasetDetails | null }>(
    INS_DATASET_DETAILS_QUERY,
    { code }
  )

  return response.insDataset
}

export async function getInsDimensionValuesPage(params: {
  datasetCode: string
  dimensionIndex: number
  search?: string
  limit?: number
  offset?: number
}): Promise<InsDimensionValueConnection> {
  if (!params.datasetCode) {
    return {
      nodes: [],
      pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false },
    }
  }

  const response = await graphqlRequest<{
    insDatasetDimensionValues: InsDimensionValueConnection
  }>(INS_DATASET_DIMENSION_VALUES_QUERY, {
    datasetCode: params.datasetCode,
    dimensionIndex: params.dimensionIndex,
    search: params.search ?? '',
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
  })

  return response.insDatasetDimensionValues ?? {
    nodes: [],
    pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false },
  }
}

export async function getInsObservationsPage(params: {
  datasetCode: string
  filter?: InsObservationFilterInput
  limit?: number
  offset?: number
}): Promise<InsObservationConnection> {
  const response = await graphqlRequest<{ insObservations: InsObservationConnection }>(
    INS_OBSERVATIONS_QUERY,
    {
      datasetCode: params.datasetCode,
      filter: params.filter,
      limit: params.limit ?? 200,
      offset: params.offset ?? 0,
    }
  )

  return response.insObservations
}

export async function getAllInsObservations(params: {
  datasetCode: string
  filter?: InsObservationFilterInput
  pageSize?: number
  maxPages?: number
}): Promise<InsObservation[]> {
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 1000, 1000))
  const maxPages = Math.max(1, params.maxPages ?? 20)

  const allNodes: InsObservation[] = []
  let offset = 0
  let page = 0
  let hasNext = true

  while (hasNext && page < maxPages) {
    const response = await getInsObservationsPage({
      datasetCode: params.datasetCode,
      filter: params.filter,
      limit: pageSize,
      offset,
    })

    const nodes = response.nodes ?? []
    allNodes.push(...nodes)

    hasNext = !!response.pageInfo?.hasNextPage
    offset += nodes.length
    page += 1

    if (nodes.length === 0) {
      break
    }
  }

  return allNodes
}

export interface InsDatasetHistoryResult {
  observations: InsObservation[]
  totalCount: number
  partial: boolean
}

export interface InsObservationsSnapshotByDatasetResult {
  observationsByDataset: Map<string, InsObservation[]>
}

function getConnectionNodes(connection: InsObservationConnection | null | undefined): InsObservation[] {
  return connection?.nodes ?? []
}

function connectionHasNextPage(connection: InsObservationConnection | null | undefined): boolean {
  return connection?.pageInfo?.hasNextPage ?? false
}

export async function getInsDatasetDimensions(datasetCode: string): Promise<InsDatasetDimensionsResult | null> {
  if (datasetCode.trim().length === 0) return null

  const response = await graphqlRequest<{
    insDatasets: {
      nodes: Array<{
        code: string
        dimensions?: InsDatasetDimensionsResult['dimensions'] | null
      }>
    }
  }>(INS_DATASET_DIMENSIONS_QUERY, { datasetCode })

  const node = response.insDatasets?.nodes?.[0]
  if (!node) return null

  return {
    datasetCode: node.code,
    dimensions: node.dimensions ?? [],
  }
}

export async function getInsDatasetHistory(params: {
  datasetCode: string
  filter: InsObservationFilterInput
  pageSize?: number
  maxPages?: number
}): Promise<InsDatasetHistoryResult> {
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 500, 1000))
  const maxPages = Math.max(1, params.maxPages ?? 20)

  let offset = 0
  let page = 0
  let totalCount = 0
  let hasNextPage = true
  const observations: InsObservation[] = []

  while (hasNextPage && page < maxPages) {
    const response = await graphqlRequest<{ insObservations: InsObservationConnection }>(
      INS_DATASET_HISTORY_QUERY,
      {
        datasetCode: params.datasetCode,
        filter: params.filter,
        limit: pageSize,
        offset,
      }
    )

    const connection = response.insObservations
    const nodes = getConnectionNodes(connection)
    observations.push(...nodes)
    totalCount = connection.pageInfo?.totalCount ?? totalCount
    hasNextPage = connectionHasNextPage(connection)

    offset += nodes.length
    page += 1

    if (nodes.length === 0) {
      break
    }
  }

  return {
    observations,
    totalCount,
    partial: hasNextPage,
  }
}

async function getInsObservationsBatch(params: {
  datasetCodes: string[]
  filter: InsObservationFilterInput
  limit?: number
}): Promise<Map<string, InsObservationConnection>> {
  if (params.datasetCodes.length === 0) return new Map()

  const { query, aliasMap } = buildInsObservationsBatchQuery(params.datasetCodes)
  const response = await graphqlRequest<Record<string, InsObservationConnection>>(query, {
    filter: params.filter,
    limit: params.limit ?? INS_OBSERVATION_LIMIT,
  })

  const result = new Map<string, InsObservationConnection>()
  for (const [alias, connection] of Object.entries(response)) {
    const datasetCode = aliasMap[alias]
    if (datasetCode) {
      result.set(datasetCode, connection)
    }
  }

  return result
}

export async function getInsObservationsSnapshotByDatasets(params: {
  datasetCodes: string[]
  filter: InsObservationFilterInput
  limit?: number
}): Promise<InsObservationsSnapshotByDatasetResult> {
  const observationsByDatasetConnection = await getInsObservationsBatch({
    datasetCodes: params.datasetCodes,
    filter: params.filter,
    limit: params.limit,
  })

  const observationsByDataset = new Map<string, InsObservation[]>()
  for (const [datasetCode, connection] of observationsByDatasetConnection.entries()) {
    observationsByDataset.set(datasetCode, getConnectionNodes(connection))
  }

  for (const datasetCode of params.datasetCodes) {
    if (!observationsByDataset.has(datasetCode)) {
      observationsByDataset.set(datasetCode, [])
    }
  }

  return { observationsByDataset }
}

function getLatestPeriod(observations: InsObservation[]): string | null {
  let latestPeriod: string | null = null
  let latestKey: number | null = null

  for (const observation of observations) {
    const period = observation.time_period
    const key = period.year * 10000 + (period.quarter ?? 0) * 100 + (period.month ?? 0)
    if (latestKey === null || key > latestKey) {
      latestKey = key
      latestPeriod = period.iso_period
    }
  }

  return latestPeriod
}

export async function getInsCountyDashboard(params: {
  countyCode: string
  datasetCodes: string[]
}): Promise<InsDashboardData> {
  const datasetCodes = params.datasetCodes
  if (datasetCodes.length === 0) return { groups: [], partial: false }

  const normalizedCountyCode = params.countyCode.trim().toUpperCase()
  if (normalizedCountyCode.length === 0) {
    return { groups: [], partial: false }
  }

  const observationFilter: InsObservationFilterInput = {
    territoryCodes: [normalizedCountyCode],
    territoryLevels: ['NUTS3'],
  }

  logger.info('Fetching INS county dashboard', {
    countyCode: normalizedCountyCode,
    filterMode: 'territoryCode',
    datasetCount: datasetCodes.length,
  })

  const datasets = await getInsDatasetsByCodes(datasetCodes)
  const datasetMap = new Map(datasets.map((dataset) => [dataset.code, dataset]))

  const buildGroups = (observationsMap: Map<string, InsObservationConnection>) => {
    const groups: InsUatDatasetGroup[] = []
    let partial = false

    for (const code of datasetCodes) {
      const dataset = datasetMap.get(code)
      const connection = observationsMap.get(code)
      if (!dataset || !connection) continue
      if (!dataset.has_county_data) continue
      if (connectionHasNextPage(connection)) {
        partial = true
      }

      const observations = getConnectionNodes(connection)
      if (observations.length === 0) continue

      groups.push({
        dataset,
        observations,
        latestPeriod: getLatestPeriod(observations),
      })
    }

    return { groups, partial }
  }

  const observationsByDataset = await getInsObservationsBatch({
    datasetCodes,
    filter: observationFilter,
  })

  return buildGroups(observationsByDataset)
}
