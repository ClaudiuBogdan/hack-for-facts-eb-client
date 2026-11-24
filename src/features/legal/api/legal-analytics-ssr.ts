import { withDeadline } from '@/lib/ssr/deadline-signal'
import { createServerMemo } from '@/lib/ssr/server-memo'
import type { LegalAnalyticsAnswer, LegalAnalyticsArgs, LegalAnalyticsView } from '@/schemas/legal-analytics'
import { fetchLegalAnalytics } from './legal-analytics-api'

/**
 * The analytics pages' server reads, for the route loaders only: the AGGREGATE views of the default question
 * (head, summary, breakdown, series). A published layer never changes, so a read is kept in the server process
 * for as long as a shared cache may keep the page and refreshed past that (`createServerMemo`); a new layer shows
 * within that window. The views that name acts (acts, links) are never read here: they are read in the browser,
 * afresh, as the server serves them `no-store`. A read past its deadline, or refused (503 before the first layer
 * is published), fails: the render goes out `no-store` and the browser reads again.
 */

const SSR_DEADLINE_MS = 5_000
const KEEP_MS = 5 * 60 * 1000

const memo = createServerMemo<LegalAnalyticsAnswer<LegalAnalyticsView>>(KEEP_MS, { maxEntries: 32 })

export function readLegalAnalyticsForSsr<V extends Exclude<LegalAnalyticsView, 'acts' | 'links'>>(
  view: V,
  args: LegalAnalyticsArgs,
): Promise<LegalAnalyticsAnswer<V>> {
  return memo(`${view}:${JSON.stringify(args)}`, () =>
    fetchLegalAnalytics(view, args, withDeadline(undefined, SSR_DEADLINE_MS)),
  ) as Promise<LegalAnalyticsAnswer<V>>
}
