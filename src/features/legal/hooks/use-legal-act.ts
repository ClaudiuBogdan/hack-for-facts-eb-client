import { useQuery } from '@tanstack/react-query'
import type { LegalActDetail } from '@/schemas/legal'
import { fetchLegalActDetail } from '../api/legal-act-api'

export function legalActQueryKey(actId: string) {
  return ['legal', 'act', actId] as const
}

/**
 * @param initialData the loader's answer. `null` is a real answer — "this act
 *   does not exist" — and must be passed through as such: collapsing it to
 *   `undefined` would leave the query pending, so SSR would render a skeleton
 *   for a 404 and then refetch on the client to learn what it already knew.
 *   Pass `undefined` only when no loader ran.
 */
export function useLegalAct(
  actId: string,
  initialData?: LegalActDetail | null,
) {
  return useQuery({
    queryKey: legalActQueryKey(actId),
    queryFn: ({ signal }) => fetchLegalActDetail(actId, signal),
    staleTime: 5 * 60 * 1000,
    initialData,
  })
}
