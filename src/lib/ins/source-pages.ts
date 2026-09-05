import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import {
  insSourceDescriptorSchema,
  insSourceObservationSchema,
  type InsSourceDescriptor,
} from './source-contract'

const logger = createLogger('ins-source-pages')

/** Native observation paging uses -1 when an exact count is not available. */
export const insSourcePageInfoSchema = z.object({
  totalCount: z
    .number()
    .int()
    .min(-1)
    .transform((count) => (count === -1 ? null : count)),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
})

export class InsSourcePageError extends Error {
  constructor(
    readonly code:
      | 'INVALID_PAGE'
      | 'PUBLICATION_CHANGED'
      | 'DUPLICATE_CELL'
      | 'INCOMPLETE_VECTOR',
  ) {
    super(`INS source vector unavailable: ${code}`)
    this.name = 'InsSourcePageError'
  }
}

export interface InsSourceVector<T> {
  readonly descriptor: InsSourceDescriptor
  readonly observations: readonly T[]
}

/** Return a complete, single-publication vector or throw; never expose a partial prefix. */
export async function collectInsSourcePages<T>(input: {
  readonly datasetCode: string
  readonly pageSize?: number
  readonly maxPages?: number
  readonly signal?: AbortSignal
  readonly fetchPage: (request: {
    offset: number
    limit: number
    signal?: AbortSignal
  }) => Promise<{
    descriptor: unknown
    nodes: readonly T[]
    pageInfo: unknown
  }>
}): Promise<InsSourceVector<T>> {
  const limit = input.pageSize ?? 1000
  const maxPages = input.maxPages ?? 20
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 1000 ||
    !Number.isSafeInteger(maxPages) ||
    maxPages < 1
  )
    throw new RangeError('Invalid INS page bounds')
  const observations: T[] = []
  const ids = new Set<string>()
  let descriptorKey: string | undefined
  let knownCount: number | null = null

  for (let page = 0; page < maxPages; page += 1) {
    input.signal?.throwIfAborted()
    const offset = observations.length
    const response = await input.fetchPage({
      offset,
      limit,
      signal: input.signal,
    })
    input.signal?.throwIfAborted()
    const source = insSourceDescriptorSchema.safeParse(response.descriptor)
    const paging = insSourcePageInfoSchema.safeParse(response.pageInfo)
    if (
      !source.success ||
      source.data.code !== input.datasetCode ||
      !paging.success ||
      !Array.isArray(response.nodes) ||
      response.nodes.length > limit ||
      paging.data.hasPreviousPage !== offset > 0
    )
      throw new InsSourcePageError('INVALID_PAGE')
    const next = source.data
    const key = JSON.stringify([
      next.code,
      next.metadata.revision_id,
      next.metadata.transform_contract_sha256,
      [...next.dimensions].sort((a, b) => a.index - b.index),
    ])
    if (descriptorKey !== undefined && key !== descriptorKey)
      throw new InsSourcePageError('PUBLICATION_CHANGED')
    descriptorKey = key
    const count = paging.data.totalCount
    if (knownCount !== null && count !== null && count !== knownCount)
      throw new InsSourcePageError('INVALID_PAGE')
    if (count !== null) knownCount = count

    for (const raw of response.nodes) {
      const row = insSourceObservationSchema.safeParse(raw)
      if (!row.success || row.data.dataset_code !== input.datasetCode)
        throw new InsSourcePageError('INVALID_PAGE')
      if (ids.has(row.data.id)) throw new InsSourcePageError('DUPLICATE_CELL')
      ids.add(row.data.id)
      observations.push(raw)
    }
    if (knownCount !== null && observations.length > knownCount)
      throw new InsSourcePageError('INVALID_PAGE')
    if (!paging.data.hasNextPage) {
      if (knownCount !== null && knownCount !== observations.length)
        throw new InsSourcePageError('INCOMPLETE_VECTOR')
      if (offset > 0 && response.nodes.length === 0)
        throw new InsSourcePageError('INCOMPLETE_VECTOR')
      return { descriptor: next, observations }
    }
    if (
      response.nodes.length === 0 ||
      (knownCount !== null && observations.length === knownCount)
    ) {
      throw new InsSourcePageError('INCOMPLETE_VECTOR')
    }
  }
  logger.warn('INS complete-vector page limit reached', {
    datasetCode: input.datasetCode,
    maxPages,
    limit,
    rows: observations.length,
  })
  throw new InsSourcePageError('INCOMPLETE_VECTOR')
}
