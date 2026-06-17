import { isMockDataEnabled } from '@/lib/scraper-references/mock-mode'

/**
 * Dataset id the parliament feature registers under. Mock mode for parliament
 * is toggled with `VITE_USE_MOCK_DATA=true` (global) or
 * `VITE_MOCK_DATASETS=political-parliament` (scoped). When off, the facade
 * serves live redesign-GraphQL data.
 */
export const PARLIAMENT_DATASET_ID = 'political-parliament'

export function isParliamentMockEnabled(): boolean {
  return isMockDataEnabled(PARLIAMENT_DATASET_ID)
}
