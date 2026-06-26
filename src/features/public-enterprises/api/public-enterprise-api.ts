import type {
  EnterpriseIndicators,
  IndicatorDictEntry,
  PublicEnterpriseLandingSummary,
  PublicEnterpriseProfile,
  PublicEnterpriseSearch,
  PublicEnterpriseSearchResult,
} from '@/schemas/public-enterprise'
import { isPublicEnterpriseMockEnabled } from '../lib/mock-mode'
import {
  fetchEnterpriseIndicatorsLive,
  fetchIndicatorDictionaryLive,
  fetchPublicEnterpriseLandingSummaryLive,
  fetchPublicEnterpriseProfileLive,
  fetchPublicEnterpriseSearchLive,
} from './public-enterprise-api.live'
import {
  fetchEnterpriseIndicatorsMock,
  fetchIndicatorDictionaryMock,
  fetchPublicEnterpriseLandingSummaryMock,
  fetchPublicEnterpriseProfileMock,
  fetchPublicEnterpriseSearchMock,
} from './public-enterprise-api.mock'

export async function fetchPublicEnterpriseLandingSummary(): Promise<PublicEnterpriseLandingSummary> {
  if (isPublicEnterpriseMockEnabled()) {
    return fetchPublicEnterpriseLandingSummaryMock()
  }
  return fetchPublicEnterpriseLandingSummaryLive()
}

export async function fetchPublicEnterpriseSearch(
  query: PublicEnterpriseSearch,
): Promise<PublicEnterpriseSearchResult> {
  if (isPublicEnterpriseMockEnabled()) {
    return fetchPublicEnterpriseSearchMock(query)
  }
  return fetchPublicEnterpriseSearchLive(query)
}

export async function fetchPublicEnterpriseProfile(
  cui: string,
): Promise<PublicEnterpriseProfile | null> {
  if (isPublicEnterpriseMockEnabled()) {
    return fetchPublicEnterpriseProfileMock(cui)
  }
  return fetchPublicEnterpriseProfileLive(cui)
}

export async function fetchIndicatorDictionary(): Promise<IndicatorDictEntry[]> {
  if (isPublicEnterpriseMockEnabled()) {
    return fetchIndicatorDictionaryMock()
  }
  return fetchIndicatorDictionaryLive()
}

export async function fetchEnterpriseIndicators(
  cui: string,
): Promise<EnterpriseIndicators | null> {
  if (isPublicEnterpriseMockEnabled()) {
    return fetchEnterpriseIndicatorsMock(cui)
  }
  return fetchEnterpriseIndicatorsLive(cui)
}
