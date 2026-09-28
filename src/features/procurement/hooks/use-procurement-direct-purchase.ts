import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchDirectPurchase, fetchDirectPurchaseContext } from '../api/procurement-direct-purchase-api'
import { contextInputOf, type DirectPurchase, type DpContext } from '../lib/direct-purchase-model'
import { procurementDirectPurchaseKeys } from '../lib/direct-purchase-keys'

/**
 * A direct purchase page's reads: the purchase, and its context once the
 * purchase names the two parties — each its own query, so a failed context
 * leaves the purchase standing. The route loader reads both on the server
 * and seeds them here.
 */

/** SEAP loads daily at most; an hour keeps a return visit from reading again. */
const STALE_TIME = 60 * 60 * 1000
/**
 * A partial read is read again by the next visit, but not by every return to
 * the tab: some failures (the detail's, until the server links it) last, and
 * each read would fail and log again.
 */
const PARTIAL_STALE_TIME = 60 * 1000

export { procurementDirectPurchaseKeys }

export function procurementDirectPurchaseQueryOptions(id: string, initialData?: DirectPurchase | null) {
  return queryOptions({
    queryKey: procurementDirectPurchaseKeys.purchase(id),
    queryFn: ({ signal }) => fetchDirectPurchase(id, signal),
    // A partial purchase (names or the detail unread) is soon stale: the next visit reads it again.
    staleTime: (query) => (query.state.data?.partial ? PARTIAL_STALE_TIME : STALE_TIME),
    ...(initialData !== undefined && (initialData === null || initialData.id === id) ? { initialData } : {}),
  })
}

export function procurementDirectPurchaseContextQueryOptions(purchase: DirectPurchase, initialData?: DpContext) {
  const input = contextInputOf(purchase)
  return queryOptions({
    queryKey: procurementDirectPurchaseKeys.context(purchase.id),
    queryFn: ({ signal }) => (input ? fetchDirectPurchaseContext(input, purchase, signal) : Promise.resolve(null)),
    staleTime: (query) => (query.state.data?.partial ? PARTIAL_STALE_TIME : STALE_TIME),
    enabled: input !== null,
    ...(initialData ? { initialData } : {}),
  })
}

export function useProcurementDirectPurchase(id: string, initialData?: DirectPurchase | null) {
  return useQuery(procurementDirectPurchaseQueryOptions(id, initialData))
}

/** Called once the purchase is read: the context needs its parties and dates, and waits (disabled) without them. */
export function useProcurementDirectPurchaseContext(purchase: DirectPurchase, initialData?: DpContext) {
  return useQuery(procurementDirectPurchaseContextQueryOptions(purchase, initialData))
}
