import type { QueryClient } from '@tanstack/react-query'
import { entityRankingFilter } from '@/lib/api/entity-analytics'
import { entityAnalyticsSearchSchema, resolveEntityAnalyticsFilter } from '@/lib/entity-analytics-query'
import { figuresRead, largestRead, selectionOf, type Preferences } from '../lib/public-institutions-selection'
import { figuresQueryOptions, largestQueryOptions, rankingQueryOptions } from './public-institutions-queries'

/**
 * What the server reads for the page's HTML: the ranking and the selection's
 * figures, from the address and the reader's preferences, the page's own
 * selection (`selectionOf`), so the browser finds every read it makes in the
 * cache. A read that fails (the API busy, a 429) is left to the page, which
 * reads it again in the browser: `prefetchQuery` never throws.
 */
export async function prefetchPublicInstitutions(queryClient: QueryClient, search: Record<string, unknown>, preferences: Preferences): Promise<void> {
  const address = entityAnalyticsSearchSchema.parse(search)
  const selection = selectionOf(address, preferences, resolveEntityAnalyticsFilter, entityRankingFilter)
  await Promise.all([
    queryClient.prefetchQuery(rankingQueryOptions(selection)),
    figuresRead(selection) ? queryClient.prefetchQuery(figuresQueryOptions(selection)) : null,
    largestRead(selection) ? queryClient.prefetchQuery(largestQueryOptions(selection)) : null,
  ])
}
