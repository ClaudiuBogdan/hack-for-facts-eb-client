import { graphqlQuery, GraphQLRequestError } from '@/lib/graphql/graphql-client'
import {
  contractAwardResponseSchema,
  contractAwardsResponseSchema,
  PROCUREMENT_CONTRACT_AWARD_QUERY,
  PROCUREMENT_CONTRACT_AWARDS_QUERY,
} from './graphql/procurement-contract-award-queries'
import {
  CA_PAGE_SIZE,
  isContractAwardId,
  mapBuyerContractAwards,
  mapContractAward,
  type BuyerContractAwards,
  type CaSort,
  type ContractAward,
} from '../lib/contract-award-model'

/**
 * Contract awards from procurement v3 (PROC-KB0Z step 1), read from the
 * browser and, for one award's page, the server render. Every answer is
 * no-store at the API: nothing here is kept beyond the read that carried it.
 */

/** The API serves no contract awards now (its switch off): the current state, not a failure, and not „none". */
export class CaRecordsOffError extends Error {
  constructor() {
    super('The API does not serve contract awards now.')
    this.name = 'CaRecordsOffError'
  }
}

/** The two halves of one read stood on different snapshots twice running: the read failed, and is read again. */
export class CaSnapshotMismatchError extends Error {
  constructor() {
    super('The contract-award counts and list were read from different snapshots.')
    this.name = 'CaSnapshotMismatchError'
  }
}

const codesOf = (error: unknown): readonly unknown[] => (error instanceof GraphQLRequestError ? error.graphQLErrors.map((entry) => entry.extensions?.code) : [])

const hasCode = (error: unknown, code: string): boolean => codesOf(error).includes(code)

/**
 * The data was republished while the API read it (server `ca-records-repo.ts`: SERVICE_UNAVAILABLE, „repeat the
 * request"): not the switch, and read once more at once.
 */
function isRepublished(error: unknown): boolean {
  return error instanceof GraphQLRequestError && error.graphQLErrors.some((entry) => entry.extensions?.code === 'SERVICE_UNAVAILABLE' && /republished|repeat the request/iu.test(entry.message))
}

/** Any other SERVICE_UNAVAILABLE for a contract-award field: the API serves none now (its switch off, no grant, no data yet). */
function offOr(error: unknown, signal: AbortSignal | undefined): unknown {
  return !signal?.aborted && hasCode(error, 'SERVICE_UNAVAILABLE') && !isRepublished(error) ? new CaRecordsOffError() : error
}

/** One read, made once more when the data was republished under it; a second republish fails it as a read. */
async function readOnceMore<T>(read: () => Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  try {
    return await read()
  } catch (error) {
    if (signal?.aborted || !isRepublished(error)) throw error
    return read()
  }
}

export interface BuyerContractAwardsRequest {
  readonly cui: string
  readonly from: string
  readonly to: string
  readonly sort: CaSort
  readonly page: number
}

/**
 * A buyer's counts and one page of its records. The two fields read their own
 * snapshots: when their `dataAsOf` differ the pair is read once more, and a
 * second mismatch fails the read rather than show counts and rows of two
 * builds side by side.
 */
export async function fetchBuyerContractAwards(request: BuyerContractAwardsRequest, signal?: AbortSignal): Promise<BuyerContractAwards> {
  const variables = { buyerFiscalCode: request.cui, from: request.from, to: request.to, sort: request.sort, page: request.page, pageSize: CA_PAGE_SIZE }
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let raw
    try {
      raw = contractAwardsResponseSchema.parse(
        await readOnceMore(() => graphqlQuery<unknown>(PROCUREMENT_CONTRACT_AWARDS_QUERY, variables, { operationName: 'ProcurementContractAwards', signal }), signal),
      )
    } catch (error) {
      throw offOr(error, signal)
    }
    if (raw.summary.dataAsOf === raw.records.dataAsOf) return mapBuyerContractAwards(raw)
  }
  throw new CaSnapshotMismatchError()
}

/**
 * One award's read, said as one of three: found (and whether the id asked
 * for was an earlier build's, so the page moves to the current one), missing
 * (no such award, or an id that is none), or outside the published window
 * (an award from before 2021, which exists and is not published yet).
 */
export type ContractAwardRead =
  | { readonly kind: 'found'; readonly award: ContractAward; readonly reanchored: boolean }
  | { readonly kind: 'missing' }
  | { readonly kind: 'outside' }

function isOutsideWindow(error: unknown): boolean {
  return error instanceof GraphQLRequestError && error.graphQLErrors.some((entry) => entry.extensions?.code === 'NOT_FOUND' && entry.extensions?.reason === 'OUTSIDE_PUBLISHED_WINDOW')
}

export async function fetchContractAward(id: string, signal?: AbortSignal): Promise<ContractAwardRead> {
  // Not an award's id: nothing is asked, as the API would refuse it.
  if (!isContractAwardId(id)) return { kind: 'missing' }
  let raw
  try {
    raw = contractAwardResponseSchema.parse(
      await readOnceMore(() => graphqlQuery<unknown>(PROCUREMENT_CONTRACT_AWARD_QUERY, { recordId: id }, { operationName: 'ProcurementContractAward', signal }), signal),
    )
  } catch (error) {
    if (!signal?.aborted && isOutsideWindow(error)) return { kind: 'outside' }
    if (!signal?.aborted && (hasCode(error, 'NOT_FOUND') || hasCode(error, 'INVALID_INPUT'))) return { kind: 'missing' }
    throw offOr(error, signal)
  }
  return { kind: 'found', award: mapContractAward(raw.award), reanchored: raw.award.reanchored || raw.award.record.recordId !== id }
}
