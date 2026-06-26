import { isMockDataEnabled } from '@/lib/scraper-references/mock-mode'

const PROCUREMENT_DATASET_IDS = ['public-contracts-seap'] as const

/**
 * The procurement facade defaults to mock for `public-contracts-seap` until
 * the live GraphQL module is wired (catalog `apiReady: false`). Mock mode is
 * active when:
 *   - global mock mode is on (`VITE_USE_MOCK_DATA=true`), OR
 *   - `public-contracts-seap` is listed in `VITE_MOCK_DATASETS`, OR
 *   - the live API is not wired yet (always true today).
 *
 * The visible UI always shows a `DataStatusBadge(status="mock")` while the
 * facade serves mocks.
 */
export function isProcurementMockEnabled(): boolean {
  if (PROCUREMENT_DATASET_IDS.some((id) => isMockDataEnabled(id))) {
    return true
  }
  // Mock-first: the live procurement adapter is not wired into this client
  // yet (catalog entry `apiReady: false`). Until that flips, the facade
  // always serves mocks regardless of env flags.
  return !procurementLiveApiReady()
}

function procurementLiveApiReady(): boolean {
  // The procurement GraphQL module exists server-side but is not wired into
  // this client yet. When that changes, gate this on a real flag/env var.
  return false
}
