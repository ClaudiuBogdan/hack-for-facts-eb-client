import type {
  GazetteBrowseFilter,
  GazetteIssueContents,
  GazetteIssuesPage,
} from '@/schemas/legal'
import {
  legislationGazetteContentsFixture,
  legislationGazetteIssuesFixture,
} from '../mocks/fixtures/legislation-gazette'

/**
 * Mock gazette lane: the fixture issues filtered client-side. Small on
 * purpose — the real paging behaviour (page/pageSize, past-the-end `total: 0`)
 * is pinned against the live adapter, not re-invented here; the fixture's job
 * is to exercise every ROW state (archive index present/absent, e-Monitor
 * link present/absent, PIM, Bis suffix).
 */
export async function fetchGazetteIssuesPageMock(
  filter: GazetteBrowseFilter,
): Promise<GazetteIssuesPage> {
  const items = legislationGazetteIssuesFixture.filter(
    (issue) =>
      issue.issueYear === filter.year &&
      (filter.part === undefined || issue.partCode === filter.part),
  )
  return { items, total: items.length, hasNextPage: false }
}

/** Issues without a fixture entry render the honest "no recorded contents" state. */
export async function fetchGazetteIssueContentsMock(
  moIssueId: string,
): Promise<GazetteIssueContents> {
  return (
    legislationGazetteContentsFixture[moIssueId] ?? {
      items: [],
      hasMore: false,
    }
  )
}
