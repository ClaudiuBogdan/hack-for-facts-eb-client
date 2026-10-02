import { useSyncExternalStore } from 'react'
import { useQueryClient, type Query, type QueryClient } from '@tanstack/react-query'
import type { CompanyAnalysisRelease } from '@/schemas/company-analytics'
import { isReleaseRefused } from '../api/company-analytics-api'
import { companyAnalyticsKeys, releaseOfKey } from './company-analytics-keys'

/**
 * The releases this browser has seen the API refuse, kept for its
 * QueryClient's life and shared by every reader of company figures: the
 * analysis page, its panels and options, the chart builder's company series
 * and their editor. Before a refusal, figures already downloaded may be
 * shown again; once one is seen, none of that release's are:
 *
 * - every company chart read is cancelled and dropped (their keys are an
 *   opaque hash of the chart's series, so all of them — a cancelled read
 *   can no longer fill its query, even if its request ignores the abort);
 * - every cached answer of the release nothing shows is dropped, and the
 *   rest as soon as nothing shows them;
 * - a chart reads no series pinned to it, and draws none; the page shows
 *   none of its figures and reads none.
 *
 * Nothing moves to another release on its own: the page's explicit refresh
 * and the editor's pin do, and a release published since is read as any.
 */

/** The chart builder's company figures (`useChartData`). */
export const COMPANIES_CHART_QUERY_KEY = 'chart-data-companies-v1'

interface Refusals {
  releases: ReadonlySet<string>
  readonly listeners: Set<() => void>
}

const EMPTY: ReadonlySet<string> = new Set()
const byClient = new WeakMap<QueryClient, Refusals>()

/** The release an analytics query holds the figures or capabilities of: named by its key, or — the active release's — by its data. */
function releaseHeldBy(query: Query): string | null {
  const named = releaseOfKey(query.queryKey)
  if (named !== null) return named
  const [scope, feature, kind] = query.queryKey
  if (scope !== companyAnalyticsKeys.all[0] || feature !== companyAnalyticsKeys.all[1] || kind !== 'release') return null
  return (query.state.data as CompanyAnalysisRelease | undefined)?.release.releaseId ?? null
}

/** Cancel, then drop: a read cancelled first cannot store its answer when it lands. */
function drop(client: QueryClient, filters: { readonly queryKey: readonly unknown[]; readonly predicate: (query: Query) => boolean }) {
  void client.cancelQueries(filters)
  client.removeQueries(filters)
}

/** Every cached answer of a refused release nothing shows. */
function dropIdle(client: QueryClient, refusals: Refusals) {
  if (refusals.releases.size === 0) return
  drop(client, {
    queryKey: companyAnalyticsKeys.all,
    predicate: (query) => {
      const release = releaseHeldBy(query)
      return release !== null && refusals.releases.has(release) && query.getObserversCount() === 0
    },
  })
}

function refusalsOf(client: QueryClient): Refusals {
  const known = byClient.get(client)
  if (known) return known
  const refusals: Refusals = { releases: EMPTY, listeners: new Set() }
  byClient.set(client, refusals)
  const cache = client.getQueryCache()
  // A refusal by any analytics read: the page's, a panel's, the editor's release.
  const learn = (query: Query, error: unknown) => {
    const release = releaseOfKey(query.queryKey)
    if (release !== null && isReleaseRefused(error)) rememberRefusedRelease(client, release)
  }
  for (const query of cache.findAll({ queryKey: companyAnalyticsKeys.all })) learn(query, query.state.error)
  cache.subscribe((event) => {
    if (event.type === 'updated' && event.action.type === 'error') learn(event.query, event.action.error)
    // A query of a refused release the page stops showing (withdrawn, or left): dropped then.
    else if (event.type === 'observerRemoved' && refusals.releases.size > 0) queueMicrotask(() => dropIdle(client, refusals))
  })
  return refusals
}

/** The refused releases, as known now. */
export function knownRefusedReleases(client: QueryClient): ReadonlySet<string> {
  return refusalsOf(client).releases
}

/**
 * Remember a release the API refused, and drop what the client holds of it.
 * `keepChartQuery` spares the chart read that is itself reporting the refusal.
 */
export function rememberRefusedRelease(client: QueryClient, release: string, options: { readonly keepChartQuery?: string } = {}): void {
  const refusals = refusalsOf(client)
  if (!refusals.releases.has(release)) {
    refusals.releases = new Set([...refusals.releases, release])
    for (const listener of refusals.listeners) listener()
  }
  // Outside the cache's own notification, which may be the one that reported it.
  queueMicrotask(() => {
    drop(client, { queryKey: [COMPANIES_CHART_QUERY_KEY], predicate: (query) => query.queryHash !== options.keepChartQuery })
    dropIdle(client, refusals)
  })
}

/** The refused releases, rendering again when one is learned. None on the server: a refused release fails its render closed. */
export function useRefusedReleases(): ReadonlySet<string> {
  const refusals = refusalsOf(useQueryClient())
  return useSyncExternalStore(
    (listener) => {
      refusals.listeners.add(listener)
      return () => refusals.listeners.delete(listener)
    },
    () => refusals.releases,
    () => EMPTY,
  )
}
