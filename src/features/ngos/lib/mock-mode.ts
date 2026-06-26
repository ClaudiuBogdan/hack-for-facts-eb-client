import { isMockDataEnabled } from '@/lib/scraper-references/mock-mode'

const NGO_DATASET_IDS = [
  'ngo-core',
  'ngos',
  'ngos-social-services',
  'ngos-mj-registry',
  'ngos-public-utility',
] as const

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

  const scoped = import.meta.env.VITE_MOCK_DATASETS
  if (import.meta.env.VITE_USE_MOCK_DATA === 'true' || typeof scoped === 'string') {
    return NGO_DATASET_IDS.some((id) => isMockDataEnabled(id))
  }

  return true
}
