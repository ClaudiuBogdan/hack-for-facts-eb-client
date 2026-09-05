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
    fetchPage: async ({ offset, limit, signal }) => {
      const response = await graphqlQuery<unknown>(
        INS_SOURCE_OBSERVATIONS_QUERY,
        {
          datasetCode: params.datasetCode,
          filter: params.filter,
          offset,
          limit,
        },
        { auth: 'none', signal, operationName: 'InsSourceObservations' },
      )
      const parsed = insSourceObservationsResponseRawSchema.parse(response)
      return {
        descriptor: parsed.descriptor,
        nodes: parsed.insObservations.nodes,
        pageInfo: parsed.insObservations.pageInfo,
      }
    },
  })
}
