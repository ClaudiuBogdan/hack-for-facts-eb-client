import { assertLiveApiAvailable } from '@/lib/scraper-references/mock-mode'
import type {
  EnterpriseIndicators,
  IndicatorDictEntry,
  PublicEnterpriseLandingSummary,
  PublicEnterpriseProfile,
  PublicEnterpriseSearch,
  PublicEnterpriseSearchResult,
} from '@/schemas/public-enterprise'

const PUBLIC_ENTERPRISE_CORE_DATASET_ID = 'soe-amepip'

function assertPublicEnterpriseLiveApiAvailable(): void {
  assertLiveApiAvailable(
    PUBLIC_ENTERPRISE_CORE_DATASET_ID,
    'Public enterprise live API is not connected yet. Enable mock mode with VITE_USE_MOCK_DATA=true or VITE_MOCK_DATASETS=soe-amepip.',
  )
}

export async function fetchPublicEnterpriseLandingSummaryLive(): Promise<PublicEnterpriseLandingSummary> {
  assertPublicEnterpriseLiveApiAvailable()
  throw new Error('Unreachable: public enterprise live API is not connected.')
}

export async function fetchPublicEnterpriseSearchLive(
  _query: PublicEnterpriseSearch,
): Promise<PublicEnterpriseSearchResult> {
  assertPublicEnterpriseLiveApiAvailable()
  throw new Error('Unreachable: public enterprise live API is not connected.')
}

export async function fetchPublicEnterpriseProfileLive(
  _cui: string,
): Promise<PublicEnterpriseProfile | null> {
  assertPublicEnterpriseLiveApiAvailable()
  throw new Error('Unreachable: public enterprise live API is not connected.')
}

export async function fetchIndicatorDictionaryLive(): Promise<
  IndicatorDictEntry[]
> {
  assertPublicEnterpriseLiveApiAvailable()
  throw new Error('Unreachable: public enterprise live API is not connected.')
}

export async function fetchEnterpriseIndicatorsLive(
  _cui: string,
): Promise<EnterpriseIndicators | null> {
  assertPublicEnterpriseLiveApiAvailable()
  throw new Error('Unreachable: public enterprise live API is not connected.')
}
