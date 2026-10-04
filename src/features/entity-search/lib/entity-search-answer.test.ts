import { describe, expect, it } from 'vitest'
import type { EntitySearchResult } from '@/schemas/entity-search'
import { mapSearchResult } from '../api/graphql/entity-search-mappers'
import { searchEntitiesResponseSchema } from '../api/graphql/entity-search-queries'
import {
  CURRENT_EMPTY_FIRST_PAGE_WITH_MORE,
  CURRENT_EMPTY_LAST_PAGE,
  CURRENT_EMPTY_PAGE_WITH_MORE,
  CURRENT_NO_MATCH,
  CURRENT_PAGE,
  DEGRADED_PAGE,
  MOVED_GENERATION_PAGE,
  MOVED_SCOPE_PAGE,
  PARTIAL_PAGE,
  UNAVAILABLE_PAGE,
  WITHHELD_EMPTY_PAGE_WITH_MORE,
  WITHHELD_NEXT_PAGE,
} from '../api/graphql/entity-search.fixtures'
import { incompleteReasonOf, readEntitySearchAnswer } from './entity-search-answer'

/** A fixture as the transport hands it to the page. */
function page(fixture: unknown): EntitySearchResult {
  const answer = searchEntitiesResponseSchema.parse({ searchEntities: fixture }).searchEntities
  if (answer === null) throw new Error('fixture has no answer')
  return mapSearchResult(answer)
}

describe('readEntitySearchAnswer', () => {
  it('has no answer without a page', () => {
    expect(readEntitySearchAnswer([])).toBeNull()
  })

  it('calls only a current, complete, empty answer a no match', () => {
    expect(readEntitySearchAnswer([page(CURRENT_NO_MATCH)])?.noMatch).toBe(true)
    // Current and empty, but more candidates follow.
    expect(readEntitySearchAnswer([page(CURRENT_EMPTY_PAGE_WITH_MORE)])?.noMatch).toBe(false)
    // Empty and complete, but not current.
    expect(readEntitySearchAnswer([page({ ...CURRENT_NO_MATCH, ...WITHHELD_EMPTY_PAGE_WITH_MORE, continuation: { candidatesReturned: 0, nextOffset: null } })])?.noMatch).toBe(false)
    expect(readEntitySearchAnswer([page(DEGRADED_PAGE)])?.noMatch).toBe(false)
    // Every page shown nothing, but an earlier page had hits: not empty at all.
    const paged = readEntitySearchAnswer([page(CURRENT_PAGE), page(CURRENT_EMPTY_PAGE_WITH_MORE), page(CURRENT_EMPTY_LAST_PAGE)])
    expect(paged?.noMatch).toBe(false)
    expect(paged?.hits).toHaveLength(4)
  })

  it('never calls an empty later page without a next page a no-match (r3/r4)', () => {
    // Page 1 at offset 0 showed nothing but had a next page; page 2 shows
    // nothing and offers none. Only the initial page can establish a no-match.
    const answer = readEntitySearchAnswer([page(CURRENT_EMPTY_FIRST_PAGE_WITH_MORE), page(CURRENT_EMPTY_LAST_PAGE)])
    expect(answer).toMatchObject({ hits: [], moved: false, contribution: 'CURRENT', noMatch: false })
    if (!answer) throw new Error('no answer')
    expect(incompleteReasonOf(answer, false)).toBe('no-further-page')
    expect(incompleteReasonOf(answer, true)).toBe('more')
    // The same empty initial page alone, with its next page, is no no-match either.
    expect(readEntitySearchAnswer([page(CURRENT_EMPTY_FIRST_PAGE_WITH_MORE)])?.noMatch).toBe(false)
  })

  it('never calls an all-empty walk to the offset bound a no-match (F28 review P2)', () => {
    // 51 current pages at offsets 0, 20, …, 1000, each with 20 candidates and
    // nothing visible, the estimate at 5000. The API supports no offset past
    // 1000, so the last page's null continuation is the bound, not the end.
    const walk = Array.from({ length: 51 }, (_, index) => {
      const offset = index * 20
      const nextOffset = offset + 20 <= 1000 ? offset + 20 : null
      // The transport's own rule: a next offset is this page's offset plus its candidates.
      if (nextOffset !== null) expect(nextOffset).toBe(offset + 20)
      return page({
        ...CURRENT_PAGE,
        estimatedTotalHits: 5000,
        hits: [],
        continuation: { candidatesReturned: 20, nextOffset },
      })
    })
    expect(walk[50]?.continuation.nextOffset).toBeNull()
    expect(walk[49]?.continuation.nextOffset).toBe(1000)

    const answer = readEntitySearchAnswer(walk)
    expect(answer).toMatchObject({ hits: [], moved: false, contribution: 'CURRENT', noMatch: false })
    if (!answer) throw new Error('no answer')
    expect(incompleteReasonOf(answer, false)).toBe('no-further-page')

    // The genuine initial no-match is unchanged.
    expect(readEntitySearchAnswer([page(CURRENT_NO_MATCH)])?.noMatch).toBe(true)
  })

  it('says why an empty non-current answer is no no-match', () => {
    const answer = readEntitySearchAnswer([page({ ...UNAVAILABLE_PAGE, hits: [], continuation: { candidatesReturned: 3, nextOffset: null } })])
    if (!answer) throw new Error('no answer')
    expect(answer.noMatch).toBe(false)
    expect(incompleteReasonOf(answer, false)).toBe('not-current')
  })

  it('shows counts only for a current, undegraded answer', () => {
    expect(readEntitySearchAnswer([page(CURRENT_PAGE)])?.countsShown).toBe(true)
    expect(readEntitySearchAnswer([page(PARTIAL_PAGE)])?.countsShown).toBe(false)
    expect(readEntitySearchAnswer([page(UNAVAILABLE_PAGE)])?.countsShown).toBe(false)
    expect(readEntitySearchAnswer([page(DEGRADED_PAGE)])?.countsShown).toBe(false)
  })

  it('reads pages that were read the same way as one answer', () => {
    const answer = readEntitySearchAnswer([page(WITHHELD_EMPTY_PAGE_WITH_MORE), page(WITHHELD_NEXT_PAGE)])
    expect(answer).toMatchObject({ moved: false, contribution: 'UNAVAILABLE', reason: 'company_check_unavailable' })
    expect(answer?.hits.map((hit) => hit.docType)).toEqual(['legal_act'])
  })

  it.each([
    ['a new generation', MOVED_GENERATION_PAGE],
    ['a new company scope', MOVED_SCOPE_PAGE],
    ['another company state', { ...UNAVAILABLE_PAGE, continuation: { candidatesReturned: 20, nextOffset: 40 } }],
    ['a degraded engine', DEGRADED_PAGE],
  ])('drops every page, facet and count when a later page has %s', (_name, later) => {
    const answer = readEntitySearchAnswer([page(CURRENT_PAGE), page(later)])
    expect(answer).toMatchObject({ moved: true, hits: [], facets: [], countsShown: false, noMatch: false })
  })
})
