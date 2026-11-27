import type { LegalSearchResultData } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchLegalSearchLive, type LegalSearchFilter } from './legal-search-api.live'

export type { LegalSearchFilter } from './legal-search-api.live'

/**
 * The fixture is served only by the development server and the tests: it names real acts as they were when it
 * was copied, so in production the condition is the constant `false` and the fixture's module is never emitted
 * (the same guard as the analytics and changes adapters').
 */
const FIXTURE_BUILD = import.meta.env.DEV || import.meta.env.MODE === 'test'

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
  if (FIXTURE_BUILD && isLegalMockEnabled())
    return (await import('./legal-search-api.mock')).fetchLegalSearchMock(q, { historical: options.historical ?? false, ...(options.filter && { filter: options.filter }) })
  return fetchLegalSearchLive(q, options)
}
