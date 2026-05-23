import { useQuery } from '@tanstack/react-query'
import { fetchPrivateCompanyProfile } from '../api/private-company-api'

export function privateCompanyProfileQueryKey(cui: string) {
  return ['private-company', cui] as const
}

export function usePrivateCompanyProfile(cui: string) {
  return useQuery({
    queryKey: privateCompanyProfileQueryKey(cui),
    queryFn: () => fetchPrivateCompanyProfile(cui),
    enabled: cui.length > 0,
  })
}
