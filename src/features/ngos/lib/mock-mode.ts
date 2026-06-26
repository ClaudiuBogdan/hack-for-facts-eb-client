import { isMockDataEnabled } from '@/lib/scraper-references/mock-mode'

const NGO_DATASET_ID = 'ngo-core'

/**
 * NGOs render from typed mocks by default for the first commit. Live data is
 * gated behind `VITE_NGO_USE_LIVE_API === 'true'`.
 *
 * The data is mock-first by design: the `ngo.*` serving tables are loaded but
 * there is no client-facing backend module yet, so live adapters are stubs that
 * fail loudly. See `docs/design/ngos/design.md` §6 "Mock-first".
 */
export function isNgoMockEnabled(): boolean {
  if (import.meta.env.VITE_NGO_USE_LIVE_API === 'true') {
    return false
  }

  if (isMockDataEnabled(NGO_DATASET_ID)) {
    return true
  }

  // NGO has no connected live client API yet, so it remains mock-first unless
  // explicitly forced to the live stub via VITE_NGO_USE_LIVE_API.
  return true
}
