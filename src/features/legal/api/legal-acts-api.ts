import type { LegalActsPage } from '@/schemas/legal'
import type { LegalSearchFilter } from './legal-search-api.live'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchLegalActsPageLive } from './legal-acts-api.live'

/** Fixtures only in the development server and the tests: in production this is the constant `false`, so the mock is never emitted. */
const FIXTURE_BUILD = import.meta.env.DEV || import.meta.env.MODE === 'test'

/** Mock/live dispatcher for the act list the search shows with filters and no term (`/legislation/search`). */
export async function fetchLegalActsPage(
  filter: LegalSearchFilter,
  options: { readonly first?: number; readonly after?: string; readonly signal?: AbortSignal } = {},
): Promise<LegalActsPage> {
  if (FIXTURE_BUILD && isLegalMockEnabled()) return (await import('./legal-acts-api.mock')).fetchLegalActsPageMock(filter)
  return fetchLegalActsPageLive(filter, options)
}
