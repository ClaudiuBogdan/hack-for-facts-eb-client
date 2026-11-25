import type { LegalActsBrowseFilter, LegalActsPage } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchLegalActsPageLive } from './legal-acts-api.live'

/** Fixtures only in the development server and the tests: in production this is the constant `false`, so the mock is never emitted. */
const FIXTURE_BUILD = import.meta.env.DEV || import.meta.env.MODE === 'test'

/** Mock/live dispatcher for the acts directory (`/legislation/acts`). */
export async function fetchLegalActsPage(
  filter: LegalActsBrowseFilter,
  options: { readonly first?: number; readonly after?: string; readonly signal?: AbortSignal } = {},
): Promise<LegalActsPage> {
  if (FIXTURE_BUILD && isLegalMockEnabled()) return (await import('./legal-acts-api.mock')).fetchLegalActsPageMock(filter)
  return fetchLegalActsPageLive(filter, options)
}
