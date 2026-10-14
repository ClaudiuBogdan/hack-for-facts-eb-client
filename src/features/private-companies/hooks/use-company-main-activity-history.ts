import { useEffect } from 'react'
import { useInfiniteQuery, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query'
import type { CompanyMainActivityHistoryKind, CompanyMainActivityHistoryPage, CompanyMainActivityHistoryResult } from '@/schemas/private-company-main-activity'
import { retryRegistryRead } from '../api/company-registry-errors'
import { fetchCompanyMainActivityHistory } from '../api/private-company-api'

/**
 * The ANAF-assumed main activity's history, page by page, under the main
 * identity the profile shows (its `cacheKey`) and the registry scope the
 * profile was read under. Both are in the key, so a page read under another
 * assignment — a new outcome, new evidence, another currentness, a withdrawn
 * source — is never shown for this one, and is dropped as soon as the
 * profile moves on (`usePurgeMainActivityHistory`). Unchanged ids prove no
 * visibility, though: a page whose row reads otherwise than an earlier copy
 * of it fails (`MainActivityHistoryVisibilityChangedError`), and the page
 * drops everything read and reads again.
 */

const HISTORY_ROOT = 'company-main-activity-history'

export function mainActivityHistoryKey(cui: string, kind: CompanyMainActivityHistoryKind, identity: string, scopeKey: string) {
  return [HISTORY_ROOT, cui, identity, scopeKey, kind] as const
}

/**
 * Drop every history page of the company held under another main identity or
 * scope than the current one — all of them when there is none (no assignment,
 * an unreadable or unavailable one, an older API). Nothing of a withdrawn or
 * replaced interpretation is kept to come back later.
 */
export function purgeMainActivityHistory(client: QueryClient, cui: string, identity: string | null, scopeKey: string): void {
  client.removeQueries({
    queryKey: [HISTORY_ROOT, cui],
    predicate: (query) => identity === null || query.queryKey[2] !== identity || query.queryKey[3] !== scopeKey,
  })
}

/**
 * Drop every history page read for the company, whatever its identity, and
 * read the open one again from its first page: what a visibility change
 * leaves (ids unchanged, rows withdrawn or restored) is never kept.
 */
export function resetMainActivityHistory(client: QueryClient, cui: string): Promise<void> {
  return client.resetQueries({ queryKey: [HISTORY_ROOT, cui] })
}

/**
 * Drop every history page of the company NOW — both kinds, every identity and
 * scope — and cancel a read in flight, so its late response never lands in the
 * cache: the owning company was refused (no longer a public directory
 * company). Called where the refusal is learned and by the owning page's
 * mounted privacy path, never left to a later render of a component the page
 * is about to unmount. Other companies' histories are untouched.
 */
export function removeMainActivityHistory(client: QueryClient, cui: string): void {
  void client.cancelQueries({ queryKey: [HISTORY_ROOT, cui] })
  client.removeQueries({ queryKey: [HISTORY_ROOT, cui] })
}

/** Purges on every change of the profile's main identity or scope, whether or not the history is open. */
export function usePurgeMainActivityHistory(cui: string, identity: string | null, scopeKey: string): void {
  const client = useQueryClient()
  useEffect(() => {
    purgeMainActivityHistory(client, cui, identity, scopeKey)
  }, [client, cui, identity, scopeKey])
}

/**
 * A history row read again with another visibility (`anafWithdrawn`,
 * `onrcWithdrawn`) than an earlier copy of it held: the pages read so far
 * are no longer one answer. Never retried as is: the page drops them all.
 * `anafWithdrawn`: the page that found it reports ANAF's source withdrawn
 * (on any row), so the page hides every ANAF field before reading again.
 */
export class MainActivityHistoryVisibilityChangedError extends Error {
  constructor(readonly anafWithdrawn: boolean) {
    super('a main activity history row changed visibility')
    this.name = 'MainActivityHistoryVisibilityChangedError'
  }
}

type HistoryRows = Pick<CompanyMainActivityHistoryPage, 'outcomes' | 'evidence'>

function visibilities(page: HistoryRows): Map<string, string> {
  const rows = new Map<string, string>()
  for (const row of page.outcomes) rows.set(`outcome:${row.resolutionId}`, `${String(row.anafWithdrawn)}:${String(row.onrcWithdrawn)}`)
  for (const row of page.evidence) rows.set(`evidence:${row.supportId}`, `${String(row.anafWithdrawn)}:${String(row.onrcWithdrawn)}`)
  return rows
}

/** Whether a row of `page` reads with another visibility than its copy in the pages read before (a refetch, an overlapping page). */
export function historyVisibilityChanged(earlier: readonly CompanyMainActivityHistoryResult[], page: HistoryRows): boolean {
  const before = new Map<string, string>()
  for (const result of earlier) if (result.status === 'page') for (const [row, visibility] of visibilities(result.page)) before.set(row, visibility)
  for (const [row, visibility] of visibilities(page)) {
    const seen = before.get(row)
    if (seen !== undefined && seen !== visibility) return true
  }
  return false
}

export function useCompanyMainActivityHistory(request: {
  readonly cui: string
  readonly kind: CompanyMainActivityHistoryKind
  /** The main identity the profile shows; null: nothing to read. */
  readonly identity: string | null
  readonly scopeKey: string
  /** Read only once the reader opens the history. */
  readonly enabled: boolean
}) {
  const { cui, kind, identity, scopeKey } = request
  const client = useQueryClient()
  return useInfiniteQuery({
    queryKey: mainActivityHistoryKey(cui, kind, identity ?? '', scopeKey),
    queryFn: async ({ pageParam, signal, queryKey }) => {
      const result = await fetchCompanyMainActivityHistory({ cui, kind, after: pageParam, scopeKey }, signal)
      const earlier = client.getQueryData<InfiniteData<CompanyMainActivityHistoryResult, string | null>>(queryKey)?.pages ?? []
      if (result.status === 'page' && historyVisibilityChanged(earlier, result.page)) {
        const page = result.page
        throw new MainActivityHistoryVisibilityChangedError(page.outcomes.some((row) => row.anafWithdrawn) || page.evidence.some((row) => row.anafWithdrawn))
      }
      return result
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.status === 'page' ? (last.page.nextCursor ?? undefined) : undefined),
    enabled: request.enabled && identity !== null,
    staleTime: 5 * 60_000,
    // A main activity that moved during the request (`SERVICE_UNAVAILABLE`) is retried like any failure; a visibility change is not.
    retry: (failureCount, error) => !(error instanceof MainActivityHistoryVisibilityChangedError) && retryRegistryRead(failureCount, error),
  })
}
