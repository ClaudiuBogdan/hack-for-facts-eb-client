import { createLogger } from '@/lib/logger'
import { inspectSourceSeries } from '@/lib/ins/source-series'
import { insSourceDescriptorSchema } from '@/lib/ins/source-contract'
import {
  insSourcePageInfoSchema,
  InsSourcePageError,
} from '@/lib/ins/source-pages'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  collectInsSourcePages,
  type InsSourceVector,
} from '@/lib/ins/source-pages'
import type {
  InsObservationFilterInput,
  NativeInsObservation,
} from '@/schemas/ins'
import { INS_SOURCE_OBSERVATIONS_QUERY } from './ins-queries'
import { insSourceObservationsResponseRawSchema } from './statistics-raw-schemas'

/** Every page includes the descriptor under the server's operation-wide snapshot. */
export function fetchInsSourceVector(params: {
  datasetCode: string
  filter?: InsObservationFilterInput
  pageSize?: number
  maxPages?: number
  signal?: AbortSignal
}): Promise<InsSourceVector<NativeInsObservation>> {
  return collectInsSourcePages({
    datasetCode: params.datasetCode,
    pageSize: params.pageSize,
    maxPages: params.maxPages,
    signal: params.signal,
    fetchPage: ({ offset, limit, signal }) =>
      fetchInsSourcePage({ ...params, offset, limit, signal }),
  })
}

async function fetchInsSourcePage(params: {
  datasetCode: string
  filter?: InsObservationFilterInput
  offset: number
  limit: number
  signal?: AbortSignal
}) {
  params.signal?.throwIfAborted()
  const response = await graphqlQuery<unknown>(
    INS_SOURCE_OBSERVATIONS_QUERY,
    {
      datasetCode: params.datasetCode,
      filter: params.filter,
      offset: params.offset,
      limit: params.limit,
    },
    {
      auth: 'none',
      signal: params.signal,
      operationName: 'InsSourceObservations',
    },
  )
  params.signal?.throwIfAborted()
  const parsed = insSourceObservationsResponseRawSchema.parse(response)
  return {
    descriptor: parsed.descriptor,
    nodes: parsed.insObservations.nodes,
    pageInfo: parsed.insObservations.pageInfo,
  }
}

/** A visible preview of unresolved source choices, never input to a chart or ranking. */
export async function fetchInsSourceInspection(params: {
  datasetCode: string
  filter?: InsObservationFilterInput
  signal?: AbortSignal
}) {
  const limit = 50
  const response = await fetchInsSourcePage({ ...params, offset: 0, limit })
  const descriptor = insSourceDescriptorSchema.parse(response.descriptor)
  const paging = insSourcePageInfoSchema.parse(response.pageInfo)
  const count = paging.totalCount
  if (
    descriptor.code !== params.datasetCode ||
    response.nodes.length > limit ||
    paging.hasPreviousPage ||
    (paging.hasNextPage &&
      (response.nodes.length === 0 ||
        (count !== null && count <= response.nodes.length))) ||
    (!paging.hasNextPage &&
      count !== null &&
      count !== response.nodes.length) ||
    inspectSourceSeries({ descriptor, observations: response.nodes }).status ===
      'INVALID'
  )
    throw new InsSourcePageError('INVALID_PAGE')
  if (paging.hasNextPage)
    createLogger('ins-source-inspection').warn(
      'INS source inspection is limited; narrow the selection for a complete series',
      { datasetCode: params.datasetCode, rows: response.nodes.length, limit },
    )
  return {
    descriptor,
    observations: response.nodes,
    truncated: paging.hasNextPage,
  }
}
