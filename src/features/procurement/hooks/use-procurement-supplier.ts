import { queryOptions, useQuery } from '@tanstack/react-query'
import { SUPPLIER_LARGEST_RECORDS, fetchProcurementSupplier, fetchProcurementSupplierDirect } from '../api/procurement-supplier-api'
import type { RecentRecord } from '../lib/home-model'
import { procurementSupplierKeys } from '../lib/supplier-keys'
import type { SupplierProfile } from '../lib/supplier-model'

/**
 * A firm's page's reads: the profile and the year's largest direct purchases,
 * each its own query so a failure stays in its band. The route loader reads
 * both on the server and seeds them here. Picking another year keeps the
 * profile shown until the new one arrives, instead of blanking the page.
 */

/** SEAP loads daily at most; an hour keeps a return visit from reading again. */
const STALE_TIME = 60 * 60 * 1000

export { procurementSupplierKeys }

export function procurementSupplierQueryOptions(cui: string, year: number, initialData?: SupplierProfile) {
  return queryOptions({
    queryKey: procurementSupplierKeys.profile(cui, year),
    queryFn: ({ signal }) => fetchProcurementSupplier(cui, year, signal),
    // A partial profile is stale at once: the next mount reads it again.
    staleTime: (query) => (query.state.data?.partial ? 0 : STALE_TIME),
    ...(initialData && initialData.cui === cui && initialData.year === year ? { initialData } : {}),
  })
}

/** The records carry no firm or year: the caller seeds only the loader's own, for the page's firm and year. */
export function procurementSupplierDirectQueryOptions(cui: string, year: number, initialData?: readonly RecentRecord[]) {
  return queryOptions({
    queryKey: procurementSupplierKeys.direct(cui, year, SUPPLIER_LARGEST_RECORDS),
    queryFn: ({ signal }) => fetchProcurementSupplierDirect(cui, year, SUPPLIER_LARGEST_RECORDS, signal),
    staleTime: STALE_TIME,
    ...(initialData ? { initialData } : {}),
  })
}

/** The previous year's read stays shown (`isPlaceholderData`) while another year loads — for the same firm only. */
export function useProcurementSupplier(cui: string, year: number, initialData?: SupplierProfile) {
  return useQuery({
    ...procurementSupplierQueryOptions(cui, year, initialData),
    placeholderData: (previous) => (previous?.cui === cui ? previous : undefined),
  })
}

/** No placeholder: another year's largest purchases would be the wrong list, so the band waits for its own. */
export function useProcurementSupplierDirect(cui: string, year: number, initialData?: readonly RecentRecord[]) {
  return useQuery(procurementSupplierDirectQueryOptions(cui, year, initialData))
}
