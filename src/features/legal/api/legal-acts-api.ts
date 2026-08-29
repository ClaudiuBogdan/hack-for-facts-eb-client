import type { LegalActsBrowseFilter, LegalActsPage } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchLegalActsPageLive } from './legal-acts-api.live'
import { fetchLegalActsPageMock } from './legal-acts-api.mock'

/** Mock/live dispatcher for the acts directory (`/legislation/acts`). */
export async function fetchLegalActsPage(
  filter: LegalActsBrowseFilter,
  options: { readonly first?: number; readonly after?: string; readonly signal?: AbortSignal } = {},
): Promise<LegalActsPage> {
  if (isLegalMockEnabled()) return fetchLegalActsPageMock(filter)
  return fetchLegalActsPageLive(filter, options)
}
