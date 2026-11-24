import { queryOptions, useQuery } from '@tanstack/react-query'
import { DA_QUERY_CACHE } from '../lib/disclosure-cache'
import { fetchProcurementBuyer, fetchProcurementBuyerDirectCategories, fetchProcurementBuyerRecords } from '../api/procurement-buyer-api'
import type { BuyerProfile, BuyerRecords } from '../lib/buyer-model'
import { procurementBuyerKeys } from '../lib/buyer-keys'
import type { CategoryFigure } from '../lib/home-categories'
import { answersChoice, type PeriodChoice, type ProfilePeriod } from '../lib/profile-period'

/**
 * A buyer page's reads: the profile, the period's largest records and its
 * direct purchases by category, each its own query so a failure stays in its band. The route loader reads both
 * on the server and seeds them here. Picking another period keeps the
 * profile shown until the new one arrives, instead of blanking the page.
 */

/** How many records „Cele mai mari" lists per population. */
export const BUYER_LARGEST_RECORDS = 8

export { procurementBuyerKeys }

export function procurementBuyerQueryOptions(cui: string, choice: PeriodChoice, initialData?: BuyerProfile) {
  return queryOptions({
    queryKey: procurementBuyerKeys.profile(cui, choice),
    queryFn: ({ signal }) => fetchProcurementBuyer(cui, choice, signal),
    // D6: the profile ranks direct purchases' suppliers; never kept past its read.
    ...DA_QUERY_CACHE,
    ...(initialData && initialData.identity.cui === cui && answersChoice(initialData.period, choice) ? { initialData } : {}),
  })
}

/** The records carry no buyer or period: the caller seeds only the loader's own, for the page's buyer and period. */
export function procurementBuyerRecordsQueryOptions(cui: string, choice: PeriodChoice, initialData?: BuyerRecords) {
  return queryOptions({
    queryKey: procurementBuyerKeys.records(cui, choice, BUYER_LARGEST_RECORDS),
    queryFn: ({ signal }) => fetchProcurementBuyerRecords(cui, choice, BUYER_LARGEST_RECORDS, signal),
    // D6: the largest records include direct purchases.
    ...DA_QUERY_CACHE,
    ...(initialData ? { initialData } : {}),
  })
}

/** The previous period's read stays shown (`isPlaceholderData`) while another loads — for the same buyer only. */
export function useProcurementBuyer(cui: string, choice: PeriodChoice, initialData?: BuyerProfile) {
  return useQuery({
    ...procurementBuyerQueryOptions(cui, choice, initialData),
    placeholderData: (previous) => (previous?.identity.cui === cui ? previous : undefined),
  })
}

/** No placeholder: another period's largest records would be the wrong list, so the band waits for its own. */
export function useProcurementBuyerRecords(cui: string, choice: PeriodChoice, initialData?: BuyerRecords) {
  return useQuery(procurementBuyerRecordsQueryOptions(cui, choice, initialData))
}

/**
 * The direct purchases by category for the profile shown, read in the browser
 * once the band needs them — never on the server: the API can take past the
 * render's deadline for them (owner, 23 November 2026). No placeholder:
 * another period's categories would be the wrong list.
 */
export function useProcurementBuyerDirectCategories(cui: string, period: ProfilePeriod, enabled: boolean) {
  return useQuery<readonly CategoryFigure[]>({
    queryKey: procurementBuyerKeys.directCategories(cui, period),
    queryFn: ({ signal }) => fetchProcurementBuyerDirectCategories(cui, period, signal),
    // D6: a direct-purchase read; never kept past its page.
    ...DA_QUERY_CACHE,
    enabled,
  })
}
