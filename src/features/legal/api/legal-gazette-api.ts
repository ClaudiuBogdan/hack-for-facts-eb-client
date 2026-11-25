import type {
  GazetteBrowseFilter,
  GazetteIssueContents,
  GazetteIssuesPage,
} from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import {
  fetchGazetteIssueContentsLive,
  fetchGazetteIssuesPageLive,
} from './legal-gazette-api.live'

/**
 * The fixture is served only by the development server and the tests: it names real acts as they were when it
 * was copied, so in production the condition is the constant `false` and the fixture's module is never emitted
 * (the same guard as the analytics adapter's).
 */
const FIXTURE_BUILD = import.meta.env.DEV || import.meta.env.MODE === 'test'

export { GAZETTE_CONTENTS_FIRST } from './legal-gazette-api.live'

/** Mock/live dispatcher for the gazette directory (`/legislation/gazette`). */
export async function fetchGazetteIssuesPage(
  filter: GazetteBrowseFilter,
  options: {
    readonly page?: number
    readonly pageSize?: number
    readonly signal?: AbortSignal
  } = {},
): Promise<GazetteIssuesPage> {
  if (FIXTURE_BUILD && isLegalMockEnabled()) return (await import('./legal-gazette-api.mock')).fetchGazetteIssuesPageMock(filter)
  return fetchGazetteIssuesPageLive(filter, options)
}

/** One issue's archive index — fetched on expansion, never per list row. */
export async function fetchGazetteIssueContents(
  moIssueId: string,
  options: { readonly signal?: AbortSignal } = {},
): Promise<GazetteIssueContents> {
  if (FIXTURE_BUILD && isLegalMockEnabled()) return (await import('./legal-gazette-api.mock')).fetchGazetteIssueContentsMock(moIssueId)
  return fetchGazetteIssueContentsLive(moIssueId, options)
}
