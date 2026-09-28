import { queryOptions, useQuery } from '@tanstack/react-query'
import { SUPPLIER_LARGEST_RECORDS, fetchProcurementSupplier, fetchProcurementSupplierDirect } from '../api/procurement-supplier-api'
import type { RecentRecord } from '../lib/home-model'
import { answersChoice, type PeriodChoice } from '../lib/profile-period'
import { procurementSupplierKeys } from '../lib/supplier-keys'
import type { SupplierProfile } from '../lib/supplier-model'

/**
 * A firm's page's reads: the profile and the period's largest direct purchases,
 * each its own query so a failure stays in its band. The route loader reads
 * both on the server and seeds them here. Picking another period keeps the
 * profile shown until the new one arrives, instead of blanking the page.
 */

/** SEAP loads daily at most; an hour keeps a return visit from reading again. */
const STALE_TIME = 60 * 60 * 1000

export { procurementSupplierKeys }

export function procurementSupplierQueryOptions(cui: string, choice: PeriodChoice, initialData?: SupplierProfile) {
  return queryOptions({
    queryKey: procurementSupplierKeys.profile(cui, choice),
    queryFn: ({ signal }) => fetchProcurementSupplier(cui, choice, signal),
    // A partial profile is stale at once: the next mount reads it again.
    staleTime: (query) => (query.state.data?.partial ? 0 : STALE_TIME),
    ...(initialData && initialData.cui === cui && answersChoice(initialData.period, choice) ? { initialData } : {}),
  })
}

/** The records carry no firm or period: the caller seeds only the loader's own, for the page's firm and period. */
export function procurementSupplierDirectQueryOptions(cui: string, choice: PeriodChoice, initialData?: readonly RecentRecord[]) {
  return queryOptions({
    queryKey: procurementSupplierKeys.direct(cui, choice, SUPPLIER_LARGEST_RECORDS),
    queryFn: ({ signal }) => fetchProcurementSupplierDirect(cui, choice, SUPPLIER_LARGEST_RECORDS, signal),
    staleTime: STALE_TIME,
    ...(initialData ? { initialData } : {}),
  })
}

/** The previous period's read stays shown (`isPlaceholderData`) while another loads — for the same firm only. */
export function useProcurementSupplier(cui: string, choice: PeriodChoice, initialData?: SupplierProfile) {
  return useQuery({
    ...procurementSupplierQueryOptions(cui, choice, initialData),
    placeholderData: (previous) => (previous?.cui === cui ? previous : undefined),
  })
}

/** No placeholder: another period's largest purchases would be the wrong list, so the band waits for its own. */
export function useProcurementSupplierDirect(cui: string, choice: PeriodChoice, initialData?: readonly RecentRecord[]) {
  return useQuery(procurementSupplierDirectQueryOptions(cui, choice, initialData))
}
