import { isMockDataEnabled } from '@/lib/scraper-references/mock-mode'

export const LEGAL_DATASET_ID = 'legal-acts'

/**
 * The `/legislation` surfaces default to the LIVE lanes.
 *
 * Every live adapter is now real — act detail, render/outline, overview,
 * directory, resolver — so the domain follows the platform posture: live by
 * default, fixtures only when mock mode is asked for
 * (`VITE_USE_MOCK_DATA=true` or `VITE_MOCK_DATASETS=legal-acts`).
 * `VITE_LEGAL_USE_LIVE_API` is the legal-scoped override in BOTH directions:
 * `'true'` forces live even under a global mock flag (API smoke-testing
 * behind an otherwise mocked app), `'false'` forces mock — the vitest setup
 * pins the latter so unit tests stay on committed fixtures without touching
 * the shared `VITE_MOCK_DATASETS` (a non-empty scoped list would silently
 * flip OTHER domains' mock-first defaults to live).
 *
 * Every surface that renders under mock mode must say so — the act page
 * carries a `DataStatusBadge` and a provenance note, because its fixtures are
 * real acts copied from production and are indistinguishable from served data
 * otherwise.
 */
export function isLegalMockEnabled(): boolean {
  const override = import.meta.env.VITE_LEGAL_USE_LIVE_API
  if (override === 'true') return false
  if (override === 'false') return true

  return isMockDataEnabled(LEGAL_DATASET_ID)
}
