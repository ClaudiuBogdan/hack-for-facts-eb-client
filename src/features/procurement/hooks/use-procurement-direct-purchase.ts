import { DA_QUERY_CACHE } from '../lib/disclosure-cache'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { DaReleaseOffError, fetchPurchaseForPage } from '../api/procurement-da-release-api'
import { shouldRetryQuery } from '@/lib/queryClient'
import { fetchDirectPurchaseContext } from '../api/procurement-direct-purchase-api'
import { contextInputOf, type DirectPurchase, type DpContext } from '../lib/direct-purchase-model'
import { procurementDirectPurchaseKeys } from '../lib/direct-purchase-keys'

/**
 * A direct purchase page's reads: the purchase, and its context once the
 * purchase names the two parties — each its own query, so a failed context
 * leaves the purchase standing. The route loader reads both on the server
 * and seeds them here.
 */


export { procurementDirectPurchaseKeys }

export function procurementDirectPurchaseQueryOptions(id: string, initialData?: DirectPurchase | null) {
  return queryOptions({
    queryKey: procurementDirectPurchaseKeys.purchase(id),
    // A release id reads direct acquisitions release 1; any other id the legacy surface.
    queryFn: ({ signal }) => fetchPurchaseForPage(id, signal),
    // The release off is the API's current state, not a failure: asking again changes nothing.
    retry: (failureCount, error) => !(error instanceof DaReleaseOffError) && shouldRetryQuery(failureCount, error),
    // D6: the purchase's API type carries no publication yet, so it is kept only while the page shows it.
    ...DA_QUERY_CACHE,
    ...(initialData !== undefined && (initialData === null || initialData.id === id) ? { initialData } : {}),
  })
}

export function procurementDirectPurchaseContextQueryOptions(purchase: DirectPurchase, initialData?: DpContext) {
  const input = contextInputOf(purchase)
  return queryOptions({
    queryKey: procurementDirectPurchaseKeys.context(purchase.id),
    queryFn: ({ signal }) => (input ? fetchDirectPurchaseContext(input, purchase, signal) : Promise.resolve(null)),
    // D6: every read here sends the purchase's supplier code (the analysis reads, and a release purchase's neighbours): kept only while shown.
    ...DA_QUERY_CACHE,
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
