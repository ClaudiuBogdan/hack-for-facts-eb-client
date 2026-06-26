import { isMockDataEnabled } from '@/lib/scraper-references/mock-mode'

/**
 * Feature-local mock-mode wrapper for the statistics/INS surface.
 *
 * The statistics domain is `apiReady: true` (see `ins-indicators` in the
 * scraper catalog), so the live adapter is the default. Mock fixtures are
 * served only when the dataset is explicitly scoped via
 * `VITE_MOCK_DATASETS=ins-indicators` or globally via `VITE_USE_MOCK_DATA`.
 */
export function isStatisticsMockEnabled(): boolean {
  return isMockDataEnabled('ins-indicators')
}
