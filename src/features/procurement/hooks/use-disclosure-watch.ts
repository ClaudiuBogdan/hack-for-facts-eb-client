import { t } from '@lingui/core/macro'
import { endsUnreadable, isDisclosureUnreadable, isPastBound, isSeedCurrent, lastReadAt, markServedAt, markVerifiedPublication, privacyPartOf, retiredPublications, retirePublication, setDisclosureUnreadable, subscribeRetiredPublications } from '../lib/disclosure-seed'
import { DA_DISCLOSURE_CHANGE_BOUND_SECONDS, removeDaQueriesWhenUnshown } from '../lib/disclosure-cache'
import { noteKey, subscribeNewestKey } from '@/lib/disclosure-key'
import { createElement, Fragment, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { notifyManager, useQuery, useQueryClient, type Query, type QueryClient, type QueryFunction, type QueryFunctionContext } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { readDisclosureNow } from '../api/procurement-da-release-status'

/**
 * D6 in an open tab (owner via root): a supplier withheld by a nightly
 * publish disappears within one publish, also from a tab left open on a page
 * read before it. While the cache holds procurement answers, the release's
 * publication is read once a minute (backing off on failures, so an idle tab
 * never loads the API); when it changes, or the page was served from another
 * publication than the one read, every procurement answer is dropped — never
 * reset to a server seed — and the page's loaders run again.
 */

/** The cache roots whose answers can carry a direct-purchase supplier or its money. */
// 'private-company': a company's public money carries its incoming direct purchases (`Company.publicMoney`; the API withholds a supplier's).
const WATCHED_ROOTS: readonly unknown[] = ['procurement', 'public-enterprise', 'private-company']
const WATCH_KEY = ['da-disclosure'] as const
/** `readDisclosureNow`'s answer while D6 is on and its publication cannot be read. */
const DISCLOSURE_UNAVAILABLE = 'd6-unavailable'
/** Never more often than this (root: ≥ 60 s). */
export const WATCH_INTERVAL_MS = 60_000
/** The longest a failing watcher waits between reads. */
export const WATCH_MAX_BACKOFF_MS = 15 * 60_000

/**
 * Privacy fails closed (root, 19 November 2026): past the disclosure-change
 * bound without a successful reading of the publication, the tab drops what
 * it holds and asks nothing again until a reading succeeds.
 */
export const UNREADABLE_AFTER_MS = DA_DISCLOSURE_CHANGE_BOUND_SECONDS * 1000

/** A watched read refused while the publication cannot be read: nothing was asked of the API. */
export class DisclosureUnreadableError extends Error {
  constructor() {
    super('direct-purchase disclosure unreadable: not asked')
    this.name = 'DisclosureUnreadableError'
  }
}

/** Every watched read passes here (the roots' query defaults): refused, without a request, while the publication cannot be read. */
export function gateWatchedRead<T>(queryFn: QueryFunction<T>, context: QueryFunctionContext): T | Promise<T> {
  if (isDisclosureUnreadable() || isPastBound()) return Promise.reject(new DisclosureUnreadableError())
  return queryFn(context)
}

export function isWatchedQuery(query: Pick<Query, 'queryKey'>): boolean {
  return WATCHED_ROOTS.includes(query.queryKey[0])
}

/** The wait before the next read: a minute, doubling per failure in a row, to a quarter of an hour. */
export function watchIntervalOf(failures: number): number {
  return Math.min(WATCH_INTERVAL_MS * 2 ** Math.max(0, failures), WATCH_MAX_BACKOFF_MS)
}

/**
 * Whether the cache holds anything to watch for. A page's `useQuery` adds its
 * query to the cache while that page renders, and the cache tells its
 * listeners at once: the change is passed on through TanStack's batching, as
 * its own `useIsFetching` does, so the watch never updates in the middle of
 * another component's render.
 */
function useHoldsWatched(client: QueryClient): boolean {
  return useSyncExternalStore(
    (notify) => client.getQueryCache().subscribe(notifyManager.batchCalls(notify)),
    () => client.getQueryCache().getAll().some(isWatchedQuery),
    () => false,
  )
}

/** The publications the current page's server render was read under (`disclosure` on its loaders' data). */
export function seedVersionsOf(matches: readonly { readonly loaderData?: unknown }[]): readonly (string | null)[] {
  return matches.flatMap((match) => {
    const data = match.loaderData
    return data && typeof data === 'object' && 'disclosure' in data ? [(data as { readonly disclosure?: string | null }).disclosure ?? null] : []
  })
}

/** When the server renders the page was seeded from read their publication. */
export function seedReadTimesOf(matches: readonly { readonly loaderData?: unknown }[]): readonly number[] {
  return matches.flatMap((match) => {
    const at = (match.loaderData as { readonly disclosureReadAt?: unknown } | undefined)?.disclosureReadAt
    return typeof at === 'number' && Number.isFinite(at) ? [at] : []
  })
}

/** What a purge asks of the router: forget the loader data of pages left, and run the current page's loaders again. */
export interface PurgeRouter {
  readonly clearCache: () => void
  readonly invalidate: () => Promise<unknown>
}

/**
 * Drop every answer of the old publication: stop their reads (a follow-up
 * would carry an old supplier's code), remove them — a reset would bring back
 * a server seed — and, when a view shows one, mount the page afresh: a view
 * keeps its last render's answer until it renders again, and a still-mounted
 * follow-up read would be asked again with an old code. Then forget the
 * loader data of pages left and run the page's loaders again, which in the
 * browser seed nothing, so every read starts from the new publication.
 */
export async function purgePublication(client: QueryClient, router: PurgeRouter): Promise<void> {
  await client.cancelQueries({ predicate: isWatchedQuery })
  const shown = client.getQueryCache().getAll().some((query) => isWatchedQuery(query) && query.getObserversCount() > 0)
  client.removeQueries({ predicate: isWatchedQuery })
  if (shown) retirePublication()
  router.clearCache()
  await router.invalidate()
}

/** Whether the tab holds anything a purge would act on: a watched answer, or a page seeded by a server render. */
function holdsWatched(client: QueryClient, matches: readonly { readonly loaderData?: unknown }[]): boolean {
  return client.getQueryCache().getAll().some(isWatchedQuery) || seedVersionsOf(matches).length > 0
}

export function useDisclosureWatch(): void {
  const client = useQueryClient()
  const router = useRouter()
  const holds = useHoldsWatched(client)
  const unreadable = useSyncExternalStore(subscribeRetiredPublications, isDisclosureUnreadable, () => false)
  useEffect(() => {
    for (const root of WATCHED_ROOTS) client.setQueryDefaults([root], { persister: gateWatchedRead as never })
  }, [client])
  // Supplier names are kept by no key (API 22a47bb2): a page left takes its direct-purchase queries with it.
  useEffect(() => removeDaQueriesWhenUnshown(client.getQueryCache()), [client])
  const watch = useQuery({
    queryKey: WATCH_KEY,
    queryFn: readDisclosureNow,
    // While unreadable the cache holds nothing watched, and the readings go on: the first that succeeds restores the page.
    enabled: holds || unreadable,
    retry: false,
    staleTime: WATCH_INTERVAL_MS,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => watchIntervalOf(query.state.status === 'error' ? query.state.fetchFailureCount : 0),
    refetchIntervalInBackground: true,
  })
  // A newer publication learnt by any read (a response's key): what the tab holds is of an older one, so it goes at once —
  // not after a poll, which can fail — and the watch reads now. Never cancelling a poll in flight: that poll may be the
  // very read that learnt the key (`noteKey` runs before it resolves). The first key a tab sees is no advance.
  useEffect(
    () =>
      subscribeNewestKey((_key, previous) => {
        if (previous === null) return
        void purgePublication(client, { clearCache: () => router.clearCache(), invalidate: () => router.invalidate() })
        void client.refetchQueries({ queryKey: WATCH_KEY }, { cancelRefetch: false })
      }),
    [client, router],
  )
  const seen = useRef<string | null>(null)
  // The publications the page was served under, as it hydrated: a page left before the first reading still had them.
  const [served] = useState(() => {
    // The fail-closed clock starts from the oldest render the tab was served, not from its own start (a CDN copy can be old).
    for (const at of seedReadTimesOf(router.state.matches)) markServedAt(at)
    const versions = seedVersionsOf(router.state.matches)
    // The served seeds' publication is the tab's first key: a newer one learnt later is an advance, and purges them.
    for (const version of versions) noteKey(privacyPartOf(version))
    return versions
  })
  const version = watch.data ?? null
  // A navigation that commits after a purge caches the page it leaves, seed and all: whenever the router settles, a cached page seeded under another publication than the one read is dropped.
  useEffect(
    () =>
      router.subscribe('onResolved', () => {
        router.clearCache({ filter: (match) => !isSeedCurrent(match.loaderData) })
      }),
    [router],
  )
  const readAt = watch.dataUpdatedAt
  // The deadline runs from the last successful reading (module state: a remount or an emptied cache does not restart it),
  // whatever the cache holds now — the router can still hold a page's seed. Checked again whenever the timer fires.
  useEffect(() => {
    if (unreadable) return
    let timer: ReturnType<typeof setTimeout>
    const arm = () => {
      timer = setTimeout(
        () => {
          if (Date.now() - lastReadAt() <= UNREADABLE_AFTER_MS) return arm()
          setDisclosureUnreadable(true)
          // Pages left keep their seeds in the router's cache: none outlives the bound.
          router.clearCache()
          // A tab with nothing watched (another section of the site) only changes state: its loaders are not run again.
          if (holdsWatched(client, router.state.matches)) void purgePublication(client, { clearCache: () => router.clearCache(), invalidate: () => router.invalidate() })
        },
        Math.max(0, lastReadAt() + UNREADABLE_AFTER_MS + 1 - Date.now()),
      )
    }
    arm()
    return () => clearTimeout(timer)
  }, [client, router, unreadable])
  useEffect(() => {
    if (version === null) return
    const before = seen.current
    seen.current = version
    const purgeUnavailable: PurgeRouter = { clearCache: () => router.clearCache(), invalidate: () => router.invalidate() }
    // D6 on with its supplier-privacy publication unreadable: everyone is withheld, and no publication is verified.
    // It is no reading — the clock is not renewed and an unreadable tab is not restored — and entering it drops
    // whatever the tab holds (a read in a brief restoration of access could carry names).
    if (version === DISCLOSURE_UNAVAILABLE) {
      if (before !== version) void purgePublication(client, purgeUnavailable)
      return
    }
    // First: no render from here on uses a seed of another publication, whatever loader data it still holds.
    markVerifiedPublication(version, readAt)
    const purgeRouter: PurgeRouter = { clearCache: () => router.clearCache(), invalidate: () => router.invalidate() }
    if (isDisclosureUnreadable()) {
      // Only a reading made after the tab went unreadable restores it — never a cached one a remounted watch still holds.
      if (!endsUnreadable(readAt)) return
      setDisclosureUnreadable(false)
      // What the page shows was refused, and is read again under this publication.
      if (holdsWatched(client, router.state.matches)) void purgePublication(client, purgeRouter)
      return
    }
    // A new publication since the last reading, or a page served (a CDN copy) from another one than the one read now.
    const changed =
      before !== null
        ? before !== version
        : [...served, ...seedVersionsOf(router.state.matches), ...seedVersionsOf(router.stores.cachedMatches.get())].some((seed) => seed !== version)
    if (changed) void purgePublication(client, purgeRouter)
    // readAt: each successful reading, the same publication included, may end an unreadable spell.
  }, [client, router, served, version, readAt])
}

/** The page, mounted afresh each time a publication is retired (`purgePublication`); while the publication cannot be read, under a notice saying so. */
export function PublicationScope({ children }: { readonly children: ReactNode }) {
  const retired = useSyncExternalStore(subscribeRetiredPublications, retiredPublications, () => 0)
  const unreadable = useSyncExternalStore(subscribeRetiredPublications, isDisclosureUnreadable, () => false)
  return createElement(
    Fragment,
    { key: retired },
    unreadable
      ? createElement(
          'p',
          { role: 'status', className: 'border-b border-border bg-muted px-4 py-3 text-sm text-muted-foreground' },
          t`Datele achizițiilor publice nu sunt afișate acum: platforma nu poate verifica ce furnizori pot fi numiți. Revin singure când verificarea reușește.`,
        )
      : null,
    children,
  )
}

/** Mounted once in the app shell: renders nothing. */
export function DisclosureWatch(): null {
  useDisclosureWatch()
  return null
}
