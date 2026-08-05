import { useQuery } from '@tanstack/react-query'
import {
  fetchNgoDomainCoverage,
  fetchNgoProfile,
  fetchNgoServiceDiscovery,
  fetchPublicFunding,
} from '../api/ngo-api'

export function ngoDomainCoverageQueryKey() {
  return ['ngo', 'domain-coverage'] as const
}

export function useNgoDomainCoverage() {
  return useQuery({
    queryKey: ngoDomainCoverageQueryKey(),
    queryFn: () => fetchNgoDomainCoverage(),
    staleTime: 5 * 60 * 1000,
  })
}

export function ngoProfileQueryKey(cui: string) {
  return ['ngo', 'profile', cui] as const
}

export function useNgoProfile(cui: string) {
  return useQuery({
    queryKey: ngoProfileQueryKey(cui),
    queryFn: () => fetchNgoProfile(cui),
    enabled: cui.length > 0,
  })
}

export function ngoServiceDiscoveryQueryKey() {
  return ['ngo', 'service-discovery'] as const
}

export function useNgoServiceDiscovery() {
  return useQuery({
    queryKey: ngoServiceDiscoveryQueryKey(),
    queryFn: () => fetchNgoServiceDiscovery(),
    staleTime: 5 * 60 * 1000,
  })
}

export function publicFundingQueryKey(cui: string) {
  return ['ngo', 'public-funding', cui] as const
}

export function useNgoPublicFunding(cui: string) {
  return useQuery({
    queryKey: publicFundingQueryKey(cui),
    queryFn: () => fetchPublicFunding(cui),
    enabled: cui.length > 0,
  })
}
