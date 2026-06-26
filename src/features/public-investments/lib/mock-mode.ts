import { isMockDataEnabled } from '@/lib/scraper-references/mock-mode'

/**
 * Dataset ids that gate mock-first serving for the public-investments feature.
 * Mock fixtures are served only when `VITE_USE_MOCK_DATA=true` or
 * `VITE_MOCK_DATASETS` contains any of these ids. Otherwise the API returns a
 * typed `blocked` result (never throws, never silently serves mocks).
 */
const PUBLIC_INVESTMENTS_DATASET_IDS = [
  'public-investments',
  'investments-anghel-saligny',
  'investments-pndl',
] as const

export function isPublicInvestmentsMockEnabled(): boolean {
  return PUBLIC_INVESTMENTS_DATASET_IDS.some((id) => isMockDataEnabled(id))
}

export type PublicInvestmentsMockStatus =
  | 'mock-enabled'
  | 'mock-disabled'
  | 'live-not-connected'

export function getPublicInvestmentsMockStatus(): PublicInvestmentsMockStatus {
  if (isPublicInvestmentsMockEnabled()) {
    return 'mock-enabled'
  }
  return 'live-not-connected'
}
