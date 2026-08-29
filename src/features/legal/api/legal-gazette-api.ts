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
import {
  fetchGazetteIssueContentsMock,
  fetchGazetteIssuesPageMock,
} from './legal-gazette-api.mock'

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
  if (isLegalMockEnabled()) return fetchGazetteIssuesPageMock(filter)
  return fetchGazetteIssuesPageLive(filter, options)
}

/** One issue's archive index — fetched on expansion, never per list row. */
export async function fetchGazetteIssueContents(
  moIssueId: string,
  options: { readonly signal?: AbortSignal } = {},
): Promise<GazetteIssueContents> {
  if (isLegalMockEnabled()) return fetchGazetteIssueContentsMock(moIssueId)
  return fetchGazetteIssueContentsLive(moIssueId, options)
}
