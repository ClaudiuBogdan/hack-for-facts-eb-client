import type { LegalSearchResultData } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchLegalSearchLive, type LegalSearchFilter } from './legal-search-api.live'
import { fetchLegalSearchMock } from './legal-search-api.mock'

export type { LegalSearchFilter } from './legal-search-api.live'

/**
 * Mock/live dispatcher for the Caută tab (`legalSearch`, acts channel only —
 * see the live adapter for why sections are deliberately not requested).
 * `historical` maps to the server's `includeHistorical`: false (the default)
 * excludes abrogated / out-of-force acts even from an exact-citation lookup.
 */
export async function fetchLegalSearch(
  q: string,
  options: {
    readonly historical?: boolean
    /** Narrows the search: the live engine's filter; the mock applies it to its fixture (see the mock). */
    readonly filter?: LegalSearchFilter
    readonly signal?: AbortSignal
  } = {},
): Promise<LegalSearchResultData> {
  if (isLegalMockEnabled())
    return fetchLegalSearchMock(q, { historical: options.historical ?? false, ...(options.filter && { filter: options.filter }) })
  return fetchLegalSearchLive(q, options)
}
