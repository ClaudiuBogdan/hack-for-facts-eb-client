import { useQuery } from '@tanstack/react-query'
import { readProcurementCutoff } from '@/features/procurement/api/procurement-cutoff'
import { homeYear } from '@/features/procurement/lib/home-model'

/** SEAP loads daily at most; the read itself is kept as long, and shared with the procurement pages. */
const STALE_MS = 10 * 60 * 1000

/**
 * SEAP's newest complete month per population — the date the procurement
 * pages say their data runs to — so the company's own SEAP months can be read
 * against it. Read in the browser, as the SEAP names it sits beside are.
 *
 * A refresh that fails keeps the last month read, as a query does: the
 * cutoff only moves forward, so a kept one can understate SEAP's reach but
 * never overstate it. Only a page that never read one says nothing.
 */
export function useSeapCutoff() {
  const latest = homeYear()
  return useQuery({
    queryKey: ['private-companies', 'seap-cutoff', latest],
    queryFn: () => readProcurementCutoff(latest),
    staleTime: STALE_MS,
  })
}
