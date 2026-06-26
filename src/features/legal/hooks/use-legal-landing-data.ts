import { useQuery } from '@tanstack/react-query'
import { fetchLegalLandingData } from '../api/legal-api'

export const LEGAL_LANDING_DATA_QUERY_KEY = ['legal', 'landing'] as const

export function useLegalLandingData() {
  return useQuery({
    queryKey: LEGAL_LANDING_DATA_QUERY_KEY,
    queryFn: () => fetchLegalLandingData(),
  })
}
