import { isMockDataEnabled } from '@/lib/scraper-references/mock-mode'

export const PROCUREMENT_DATASET_ID = 'public-contracts-seap'

/**
 * Flip to `true` when the server ships the contract in
 * docs/design/procurement/graphql-api-spec.md (and set the catalog entry's
 * `apiReady: true`). Until then the facade is mock-first in every build — the
 * fully-implemented live adapter is reachable only through unit tests and the
 * `VITE_PROCUREMENT_FORCE_LIVE` escape hatch below.
 */
const PROCUREMENT_LIVE_API_READY = false

/**
 * Mock mode is active when:
 *   - global mock mode is on (`VITE_USE_MOCK_DATA=true`), OR
 *   - `public-contracts-seap` is listed in `VITE_MOCK_DATASETS`, OR
 *   - the live API is not ready yet (see above), unless
 *     `VITE_PROCUREMENT_FORCE_LIVE=true` (dev/integration escape hatch for
 *     testing against a server branch).
 *
 * The visible UI always shows a `DataStatusBadge(status="mock")` while the
 * facade serves mocks. Once live, a failing request surfaces as an error —
 * there is no silent mock fallback (that would misrepresent mock as live).
 */
export function isProcurementMockEnabled(): boolean {
  if (isMockDataEnabled(PROCUREMENT_DATASET_ID)) {
    return true
  }
  if (import.meta.env.VITE_PROCUREMENT_FORCE_LIVE === 'true') {
    return false
  }
  return !PROCUREMENT_LIVE_API_READY
}
