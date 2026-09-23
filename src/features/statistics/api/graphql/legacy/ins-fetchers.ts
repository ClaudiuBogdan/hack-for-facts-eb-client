/**
 * The legacy INS lane: unvalidated reads (`graphqlQuery<{…}>` casts, no Zod)
 * kept for the entity page's INS view (`src/lib/hooks/use-ins-dashboard.ts`)
 * and the chart series editor. The INS pages read through the validated
 * fetchers in the parent folder; new code must not import from here.
 */
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import type {
  InsContextConnection,
  InsContextFilterInput,
  InsDatasetConnection,
  InsDatasetDimensionsResult,
  InsDatasetFilterInput,
  InsObservation,
  InsObservationConnection,
  InsObservationFilterInput,
} from '@/schemas/ins'
import {
  buildInsObservationsBatchQuery,
  INS_CONTEXTS_QUERY,
  INS_DATASET_DIMENSIONS_QUERY,
  INS_DATASET_HISTORY_QUERY,
  INS_DATASETS_QUERY,
} from '../ins-queries'

const INS_OBSERVATION_LIMIT = 200

export async function getInsContexts(params: {
  filter?: InsContextFilterInput
  limit?: number
  offset?: number
  signal?: AbortSignal
}): Promise<InsContextConnection> {
  const response = await graphqlQuery<{ insContexts: InsContextConnection }>(INS_CONTEXTS_QUERY, {
    filter: params.filter,
    limit: params.limit ?? 200,
    offset: params.offset ?? 0,
  },
    { auth: 'none', signal: params.signal })

  return response.insContexts
}

export async function getInsDatasetsCatalog(params: {
  filter?: InsDatasetFilterInput
  limit?: number
  offset?: number
  signal?: AbortSignal
}): Promise<InsDatasetConnection> {
  const response = await graphqlQuery<{ insDatasets: InsDatasetConnection }>(INS_DATASETS_QUERY, {
    filter: params.filter,
    limit: params.limit ?? 500,
    offset: params.offset ?? 0,
  },
    { auth: 'none', signal: params.signal })

  return response.insDatasets
}

export async function searchInsDatasets(params: {
  filter?: InsDatasetFilterInput
  limit?: number
  offset?: number
  signal?: AbortSignal
}): Promise<InsDatasetConnection> {
  const response = await graphqlQuery<{ insDatasets: InsDatasetConnection }>(INS_DATASETS_QUERY, {
    filter: params.filter,
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
  },
    { auth: 'none', signal: params.signal })

  return response.insDatasets
}

export { getInsDatasetDetails, getInsDimensionValuesPage } from '../ins-bootstrap-fetchers'

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

export async function getInsDatasetDimensions(
  datasetCode: string,
  signal?: AbortSignal,
): Promise<InsDatasetDimensionsResult | null> {
  if (datasetCode.trim().length === 0) return null

  const response = await graphqlQuery<{
    insDatasets: {
      nodes: Array<{
        code: string
        dimensions?: InsDatasetDimensionsResult['dimensions'] | null
      }>
    }
  }>(INS_DATASET_DIMENSIONS_QUERY, { datasetCode }, { auth: 'none', signal })

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
  signal?: AbortSignal
}): Promise<InsDatasetHistoryResult> {
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 500, 1000))
  const maxPages = Math.max(1, params.maxPages ?? 20)

  let offset = 0
  let page = 0
  let totalCount = 0
  let hasNextPage = true
  const observations: InsObservation[] = []

  while (hasNextPage && page < maxPages) {
    const response = await graphqlQuery<{ insObservations: InsObservationConnection }>(
      INS_DATASET_HISTORY_QUERY,
      {
        datasetCode: params.datasetCode,
        filter: params.filter,
        limit: pageSize,
        offset,
      },
    { auth: 'none', signal: params.signal }
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
  signal?: AbortSignal
}): Promise<Map<string, InsObservationConnection>> {
  if (params.datasetCodes.length === 0) return new Map()

  const { query, aliasMap, variables } = buildInsObservationsBatchQuery(params.datasetCodes)
  const response = await graphqlQuery<Record<string, InsObservationConnection>>(
    query,
    {
      ...variables,
      filter: params.filter,
      limit: params.limit ?? INS_OBSERVATION_LIMIT,
    },
    { auth: 'none', signal: params.signal },
  )

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
  signal?: AbortSignal
}): Promise<InsObservationsSnapshotByDatasetResult> {
  const observationsByDatasetConnection = await getInsObservationsBatch({
    datasetCodes: params.datasetCodes,
    filter: params.filter,
    limit: params.limit,
    signal: params.signal,
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
