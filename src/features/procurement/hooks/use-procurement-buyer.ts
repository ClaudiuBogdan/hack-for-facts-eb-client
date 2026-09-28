import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchProcurementBuyer, fetchProcurementBuyerRecords } from '../api/procurement-buyer-api'
import { readNewestYear } from '../api/procurement-cutoff'
import type { BuyerProfile, BuyerRecords } from '../lib/buyer-model'
import { procurementBuyerKeys } from '../lib/buyer-keys'

/**
 * A buyer page's reads: the profile and the year's largest records, each its
 * own query so a failure stays in its band. The route loader reads both on
 * the server and seeds them here. Picking another year keeps the profile
 * shown until the new one arrives, instead of blanking the page.
 */

/** SEAP loads daily at most; an hour keeps a return visit from reading again. */
const STALE_TIME = 60 * 60 * 1000

/** How many records „Cele mai mari" lists per population. */
export const BUYER_LARGEST_RECORDS = 8

export { procurementBuyerKeys }

export function procurementBuyerQueryOptions(cui: string, year: number, initialData?: BuyerProfile) {
  return queryOptions({
    queryKey: procurementBuyerKeys.profile(cui, year),
    queryFn: ({ signal }) => fetchProcurementBuyer(cui, year, signal),
    // A partial profile (names or years unread) is stale at once: the next mount reads it again.
    staleTime: (query) => (query.state.data?.partial ? 0 : STALE_TIME),
    ...(initialData && initialData.identity.cui === cui && initialData.year === year ? { initialData } : {}),
  })
}

/** The records carry no buyer or year: the caller seeds only the loader's own, for the page's buyer and year. */
export function procurementBuyerRecordsQueryOptions(cui: string, year: number, initialData?: BuyerRecords) {
  return queryOptions({
    queryKey: procurementBuyerKeys.records(cui, year, BUYER_LARGEST_RECORDS),
    queryFn: ({ signal }) => fetchProcurementBuyerRecords(cui, year, BUYER_LARGEST_RECORDS, signal),
    staleTime: STALE_TIME,
    ...(initialData ? { initialData } : {}),
  })
}

/**
 * The year a page opens on without one asked, on a client-side navigation
 * (the server resolves it in the loader): read beside the page's frame, never
 * before it. A failed read is an error — the page then shows the last
 * complete year, as the server does — and a kept answer is not swapped for a
 * failed one.
 */
export function procurementNewestYearQueryOptions(latest: number) {
  return queryOptions({
    queryKey: procurementBuyerKeys.newestYear(latest),
    queryFn: async () => {
      const newest = await readNewestYear(latest)
      if (newest.failed) throw new Error('SEAP cutoff unread')
      return newest.year
    },
    // As long as the cutoff is kept.
    staleTime: 10 * 60 * 1000,
  })
}

/** The previous year's read stays shown (`isPlaceholderData`) while another year loads — for the same buyer only. */
export function useProcurementBuyer(cui: string, year: number, initialData?: BuyerProfile) {
  return useQuery({
    ...procurementBuyerQueryOptions(cui, year, initialData),
    placeholderData: (previous) => (previous?.identity.cui === cui ? previous : undefined),
  })
}

/** No placeholder: another year's largest records would be the wrong list, so the band waits for its own. */
export function useProcurementBuyerRecords(cui: string, year: number, initialData?: BuyerRecords) {
  return useQuery(procurementBuyerRecordsQueryOptions(cui, year, initialData))
}
