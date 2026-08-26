import type { LegalSearchResultData } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchLegalSearchLive } from './legal-search-api.live'
import { fetchLegalSearchMock } from './legal-search-api.mock'

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
    readonly signal?: AbortSignal
  } = {},
): Promise<LegalSearchResultData> {
  if (isLegalMockEnabled())
    return fetchLegalSearchMock(q, { historical: options.historical ?? false })
  return fetchLegalSearchLive(q, options)
}
