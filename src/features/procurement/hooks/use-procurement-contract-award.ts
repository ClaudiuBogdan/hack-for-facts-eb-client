import { queryOptions, useQuery } from '@tanstack/react-query'
import { shouldRetryQuery } from '@/lib/queryClient'
import {
  CaReadSpentError,
  CaRecordsOffError,
  CaSnapshotMismatchError,
  CaTotalsOffError,
  fetchBuyerContractAwards,
  fetchBuyerContractAwardTotals,
  fetchContractAward,
  isRepublished,
  type BuyerContractAwardsRequest,
  type BuyerContractAwardTotalsRequest,
  type ContractAwardRead,
} from '../api/procurement-contract-award-api'
import { DA_QUERY_CACHE } from '../lib/disclosure-cache'
import { procurementContractAwardKeys } from '../lib/contract-award-keys'

/**
 * Contract-award reads (PROC-KB0Z step 1). Every answer is no-store at the
 * API (a winner's code or name can be withdrawn without its date moving), so
 * a read is kept only while a page shows it: the direct purchases' cache
 * rule (`DA_QUERY_CACHE`), which drops it once no page shows it.
 */

export { procurementContractAwardKeys }

/**
 * The switch off is the API's current state: asking again changes nothing. A snapshot mismatch or a republish has been
 * read twice already by the adapter: the read fails, and the reader's retry asks again.
 */
const retry = (failureCount: number, error: unknown) =>
  !(error instanceof CaRecordsOffError || error instanceof CaTotalsOffError || error instanceof CaSnapshotMismatchError || error instanceof CaReadSpentError || isRepublished(error)) &&
  shouldRetryQuery(failureCount, error)

export function contractAwardQueryOptions(id: string, initialData?: ContractAwardRead) {
  return queryOptions({
    queryKey: procurementContractAwardKeys.award(id),
    queryFn: ({ signal }) => fetchContractAward(id, signal),
    retry,
    ...DA_QUERY_CACHE,
    ...(initialData ? { initialData } : {}),
  })
}

export function useContractAward(id: string, initialData?: ContractAwardRead) {
  return useQuery(contractAwardQueryOptions(id, initialData))
}

/**
 * A buyer's counts and a page of its records, read in the browser only: the
 * server render that carries the buyer's page stays free of winner codes, so
 * it can be kept as before. Null asks nothing (a period before 2021).
 *
 * No placeholder: another page or order waits for its own read. A winner's
 * code or name is shown only from the answer that carried it, never from
 * another query's cache (procurement-da-api, 25 November 2026).
 */
export function useBuyerContractAwards(request: BuyerContractAwardsRequest | null) {
  return useQuery({
    queryKey: request ? procurementContractAwardKeys.buyer(request.cui, request.from, request.to, request.sort, request.page) : [...procurementContractAwardKeys.all, 'buyer', 'none'],
    queryFn: ({ signal }) => fetchBuyerContractAwards(request!, signal),
    retry,
    ...DA_QUERY_CACHE,
    enabled: request !== null,
  })
}

/**
 * The buyer's contract-award money for the band's window, read in the browser
 * only, kept as the counts are (`DA_QUERY_CACHE`) and never from another
 * window's answer. Null asks nothing.
 */
export function useBuyerContractAwardTotals(request: BuyerContractAwardTotalsRequest | null) {
  return useQuery({
    queryKey: request ? procurementContractAwardKeys.buyerTotals(request.cui, request.from, request.to) : [...procurementContractAwardKeys.all, 'buyer-totals', 'none'],
    queryFn: ({ signal }) => fetchBuyerContractAwardTotals(request!, signal),
    retry,
    ...DA_QUERY_CACHE,
    enabled: request !== null,
  })
}
