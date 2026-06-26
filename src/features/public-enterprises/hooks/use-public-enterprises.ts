import { useQuery } from '@tanstack/react-query'
import type { PublicEnterpriseSearch } from '@/schemas/public-enterprise'
import {
  fetchEnterpriseIndicators,
  fetchIndicatorDictionary,
  fetchPublicEnterpriseLandingSummary,
  fetchPublicEnterpriseProfile,
  fetchPublicEnterpriseSearch,
} from '../api/public-enterprise-api'

export const publicEnterpriseQueryKeys = {
  all: ['public-enterprises'] as const,
  landing: () => [...publicEnterpriseQueryKeys.all, 'landing'] as const,
  search: (query: PublicEnterpriseSearch) =>
    [...publicEnterpriseQueryKeys.all, 'search', query] as const,
  profile: (cui: string) =>
    [...publicEnterpriseQueryKeys.all, 'profile', cui] as const,
  dictionary: () => [...publicEnterpriseQueryKeys.all, 'dictionary'] as const,
  indicators: (cui: string) =>
    [...publicEnterpriseQueryKeys.all, 'indicators', cui] as const,
}

export function usePublicEnterpriseLandingSummary() {
  return useQuery({
    queryKey: publicEnterpriseQueryKeys.landing(),
    queryFn: fetchPublicEnterpriseLandingSummary,
    staleTime: 1000 * 60 * 10,
  })
}

export function usePublicEnterpriseSearch(query: PublicEnterpriseSearch) {
  return useQuery({
    queryKey: publicEnterpriseQueryKeys.search(query),
    queryFn: () => fetchPublicEnterpriseSearch(query),
    staleTime: 1000 * 60 * 5,
  })
}

export function usePublicEnterpriseProfile(cui: string) {
  return useQuery({
    queryKey: publicEnterpriseQueryKeys.profile(cui),
    queryFn: () => fetchPublicEnterpriseProfile(cui),
    enabled: cui.length > 0,
    staleTime: 1000 * 60 * 10,
  })
}

export function usePublicEnterpriseIndicatorDictionary() {
  return useQuery({
    queryKey: publicEnterpriseQueryKeys.dictionary(),
    queryFn: fetchIndicatorDictionary,
    staleTime: 1000 * 60 * 60,
  })
}

export function usePublicEnterpriseIndicators(cui: string) {
  return useQuery({
    queryKey: publicEnterpriseQueryKeys.indicators(cui),
    queryFn: () => fetchEnterpriseIndicators(cui),
    enabled: cui.length > 0,
    staleTime: 1000 * 60 * 10,
  })
}
