import { useQuery } from '@tanstack/react-query'
import { fetchLegalAct } from '../api/legal-api'

export function legalActQueryKey(actId: string) {
  return ['legal', 'act', actId] as const
}

export function useLegalAct(actId: string) {
  return useQuery({
    queryKey: legalActQueryKey(actId),
    queryFn: () => fetchLegalAct(actId),
    enabled: actId.length > 0,
  })
}
