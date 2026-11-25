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
 *
 * A production build has no fixtures (the API facades load them only in the development server and the tests,
 * FIXTURE-001), so there it is never mock mode, whatever the flags say: a mock flag set by mistake would otherwise
 * put the mock badges and the fixtures' provenance notes over live data. Keep the facades' own guards too: this
 * function is not a constant the build can fold, so it cannot keep the fixtures out of the bundle.
 */
export function isLegalMockEnabled(): boolean {
  if (!(import.meta.env.DEV || import.meta.env.MODE === 'test')) return false
  const override = import.meta.env.VITE_LEGAL_USE_LIVE_API
  if (override === 'true') return false
  if (override === 'false') return true

  return isMockDataEnabled(LEGAL_DATASET_ID)
}
