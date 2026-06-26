import { isMockDataEnabled } from '@/lib/scraper-references/mock-mode'

const ELECTIONS_DATASET_ID = 'elections'

/**
 * Elections is mock-first until the client has a live elections API adapter.
 * With no scoped dataset env it keeps the existing default-on behavior; when
 * VITE_MOCK_DATASETS is scoped, only the catalog id `elections` enables it.
 */
export function isElectionsMockEnabled(): boolean {
  const scoped = import.meta.env.VITE_MOCK_DATASETS

  if (typeof scoped === 'string' && scoped.trim().length > 0) {
    return isMockDataEnabled(ELECTIONS_DATASET_ID)
  }

  return true
}
