/**
 * What the loaded pages of one search say, read the shared-search contract's
 * way (r2, r4): every page must have been read the same way (one index
 * generation, one company scope, one company state), counts are generation
 * estimates shown only while the answer is current, and an empty answer is a
 * "no match" only when its INITIAL page alone is current, undegraded, empty
 * and without a next page. A later page without a next one says only that no
 * further page is offered here: never that the query matched nothing, and
 * never that the candidates ran out (the offset bound can end paging first).
 */
import type {
  EntitySearchCompanyContribution,
  EntitySearchContributionReason,
  EntitySearchEngine,
  EntitySearchFacet,
  EntitySearchHit,
  EntitySearchResult,
} from '@/schemas/entity-search'

export interface EntitySearchAnswer {
  readonly hits: readonly EntitySearchHit[]
  /** The first page's facets: filter options, with counts only when `countsShown`. */
  readonly facets: readonly EntitySearchFacet[]
  readonly estimatedTotalHits: number
  /** Estimates describe the generation's candidates; they are shown only for a current answer. */
  readonly countsShown: boolean
  readonly engine: EntitySearchEngine
  readonly degraded: boolean
  readonly contribution: EntitySearchCompanyContribution
  readonly reason: EntitySearchContributionReason | null
  /**
   * A later page was read another way than the first (another generation,
   * company scope or company state): offsets do not line up across
   * generations and company values do not mix across scopes, so the pages are
   * not shown together and the search starts again from its first page.
   */
  readonly moved: boolean
  /** A current, empty initial page with no next page: the only real "no match". */
  readonly noMatch: boolean
}

/**
 * Why an empty answer is not a "no match" (r3/r4): more candidates follow, the
 * company part is not current, or later pages were read and no further page is
 * offered for this request.
 */
export type EntitySearchIncompleteReason = 'more' | 'not-current' | 'no-further-page'

export function incompleteReasonOf(
  answer: EntitySearchAnswer,
  hasNextPage: boolean,
): EntitySearchIncompleteReason {
  if (hasNextPage) return 'more'
  return answer.contribution === 'CURRENT' ? 'no-further-page' : 'not-current'
}

function readingOf(page: EntitySearchResult): string {
  return JSON.stringify([
    page.generation?.generationId ?? null,
    page.generation?.registryScopeKey ?? null,
    page.companyScope,
    page.companyContribution,
    page.companyContributionReason,
  ])
}

export function readEntitySearchAnswer(
  pages: readonly EntitySearchResult[],
): EntitySearchAnswer | null {
  const first = pages[0]
  const last = pages[pages.length - 1]
  if (first === undefined || last === undefined) return null
  const moved = pages.some((page) => readingOf(page) !== readingOf(first))
  const hits = moved ? [] : pages.flatMap((page) => page.hits)
  // One reading: `degraded` comes exactly with `engine_unavailable`, which is
  // part of it, so the first page speaks for every page.
  const current = first.companyContribution === 'CURRENT' && !first.degraded
  return {
    hits,
    facets: moved ? [] : first.facets,
    estimatedTotalHits: first.estimatedTotalHits,
    countsShown: !moved && current,
    engine: first.engine,
    degraded: first.degraded,
    contribution: first.companyContribution,
    reason: first.companyContributionReason,
    moved,
    // Only the initial page can establish a no-match (r3/r4).
    noMatch:
      !moved && current && pages.length === 1 && hits.length === 0 && last.continuation.nextOffset === null,
  }
}
