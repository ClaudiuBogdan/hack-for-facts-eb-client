import {
  enterpriseIndicatorsSchema,
  indicatorDictEntrySchema,
  publicEnterpriseLandingSummarySchema,
  publicEnterpriseProfileSchema,
  publicEnterpriseSearchResultSchema,
  type EnterpriseIndicators,
  type IndicatorDictEntry,
  type PublicEnterpriseLandingSummary,
  type PublicEnterpriseProfile,
  type PublicEnterpriseSearch,
  type PublicEnterpriseSearchResult,
} from '@/schemas/public-enterprise'
import {
  getMockEnterpriseIndicators,
  getMockIndicatorDictionary,
  getMockPublicEnterpriseLandingSummary,
  getMockPublicEnterpriseProfile,
  searchMockPublicEnterprises,
} from '../mocks/fixtures'

const MOCK_LATENCY_MS = 80

async function waitForMockLatency(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))
}

export async function fetchPublicEnterpriseLandingSummaryMock(): Promise<PublicEnterpriseLandingSummary> {
  await waitForMockLatency()
  return publicEnterpriseLandingSummarySchema.parse(
    getMockPublicEnterpriseLandingSummary(),
  )
}

export async function fetchPublicEnterpriseSearchMock(
  query: PublicEnterpriseSearch,
): Promise<PublicEnterpriseSearchResult> {
  await waitForMockLatency()
  return publicEnterpriseSearchResultSchema.parse(
    searchMockPublicEnterprises(query),
  )
}

export async function fetchPublicEnterpriseProfileMock(
  cui: string,
): Promise<PublicEnterpriseProfile | null> {
  await waitForMockLatency()
  const profile = getMockPublicEnterpriseProfile(cui)
  return profile ? publicEnterpriseProfileSchema.parse(profile) : null
}

export async function fetchIndicatorDictionaryMock(): Promise<
  IndicatorDictEntry[]
> {
  await waitForMockLatency()
  return getMockIndicatorDictionary().map((entry) =>
    indicatorDictEntrySchema.parse(entry),
  )
}

export async function fetchEnterpriseIndicatorsMock(
  cui: string,
): Promise<EnterpriseIndicators | null> {
  await waitForMockLatency()
  const indicators = getMockEnterpriseIndicators(cui)
  return indicators ? enterpriseIndicatorsSchema.parse(indicators) : null
}
