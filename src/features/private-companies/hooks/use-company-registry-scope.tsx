import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { CompanyRegistryCapabilities } from '@/schemas/private-company-registry'
import { fetchCompanyRegistry } from '../api/company-registry-api'
import { isRegistryRefusal } from '../api/company-registry-errors'

/**
 * The ONRC registry scope a company page reads under.
 *
 * Each page mount pins the scope of its OWN successful `companyRegistry` read.
 * That read is keyed by the mount, so no answer cached by another page, an
 * earlier visit or the server can stand in for it, and a failed read pins
 * nothing: an error keeps whatever the cache held, which is exactly what may
 * not be trusted. Every registry-bound read of the page (profile, list pages,
 * facets, hub, suggestions) is keyed by the pin and checked against it. The
 * capabilities are metadata, never an authorization.
 *
 * A bound read that meets another scope or a refusal reports it
 * (`reportMoved`): from that moment nothing is bound and the page's registry
 * facts are hidden, while the registry is re-read (`pending`) or when that
 * re-read fails (`error`), until a read STARTED after the report answers. If
 * it answers another scope, the page says so (`moved`) and switches only when
 * the reader asks (`accept`), restarting every list at its first page; a
 * withdrawal followed by a recovery never switches by itself. A failed
 * registry read at any time hides the facts until a read succeeds. Nothing is
 * cached across requests here: the pin is component state, and the read lives
 * in the request's own query client for as long as the page.
 */

export const COMPANY_REGISTRY_QUERY_KEY = ['company-registry'] as const

export type CompanyRegistryScope =
  | {
      readonly status: 'pending'
      /**
       * No registry read of this page has completed yet. Only then may the
       * server's own answer for the document being hydrated stand in for a pin
       * (`useDocumentBootstrap`); never after a failed read or a report.
       */
      readonly firstRead: boolean
    }
  | { readonly status: 'error'; readonly retry: () => void }
  | {
      readonly status: 'ready'
      /** The scope this page's registry reads are bound to. */
      readonly pinned: CompanyRegistryCapabilities
      /** A fresher registry read that differs from the pinned one; null while the pin holds. */
      readonly moved: CompanyRegistryCapabilities | null
      /** Switch the page to the newest scope; every bound read starts over. */
      readonly accept: () => void
      /** A read found another scope than the pinned one, or was refused: unbind the page and re-read the registry. */
      readonly reportMoved: () => void
    }

type RegistryRead = { readonly capabilities: CompanyRegistryCapabilities; readonly read: number }

/** Numbers the page mounts: each mount's registry read has its own cache entry. */
let pageMounts = 0

export function useCompanyRegistryScopeState(): CompanyRegistryScope {
  const [mount] = useState(() => (pageMounts += 1))
  // Reads are numbered as they start: a report is settled only by a read started after it.
  const started = useRef(0)
  const query = useQuery({
    queryKey: [...COMPANY_REGISTRY_QUERY_KEY, mount] as const,
    queryFn: async ({ signal }): Promise<RegistryRead> => {
      started.current += 1
      const read = started.current
      return { capabilities: await fetchCompanyRegistry(signal), read }
    },
    staleTime: 0,
    // The entry goes with the page.
    gcTime: 0,
  })
  const [pinned, setPinned] = useState<CompanyRegistryCapabilities | null>(null)
  const [doubtAfter, setDoubtAfter] = useState<number | null>(null)
  const failed = query.isError
  const answer = query.data
  // The newest successful read that settles every report; none while the latest read failed.
  const latest = !failed && answer && (doubtAfter === null || answer.read > doubtAfter) ? answer.capabilities : null
  useEffect(() => {
    if (pinned === null && latest) setPinned(latest)
  }, [pinned, latest])
  const { refetch } = query
  const retry = useCallback(() => void refetch(), [refetch])
  const reportMoved = useCallback(() => {
    setDoubtAfter(started.current)
    void refetch()
  }, [refetch])
  const accept = useCallback(() => {
    if (latest) setPinned(latest)
  }, [latest])

  if (latest === null) {
    return failed && !query.isFetching ? { status: 'error', retry } : { status: 'pending', firstRead: !query.isFetchedAfterMount }
  }
  const current = pinned ?? latest
  const moved = latest.registry.scopeKey !== current.registry.scopeKey ? latest : null
  return { status: 'ready', pinned: current, moved, accept, reportMoved }
}

/** One pin per page, provided by `CompanyRegistryScopeProvider` (components/registry). */
export const CompanyRegistryScopeContext = createContext<CompanyRegistryScope | null>(null)

/** Outside a provider nothing is pinned, so nothing registry-bound is read or shown. */
export function useCompanyRegistryScope(): CompanyRegistryScope {
  return useContext(CompanyRegistryScopeContext) ?? { status: 'pending', firstRead: false }
}

/** The scope key a bound read may run under; null while there is none to trust or the page's facts are stale. */
export function boundScopeKey(scope: CompanyRegistryScope): string | null {
  return scope.status === 'ready' && scope.moved === null ? scope.pinned.registry.scopeKey : null
}

/** A refusal acted on: the scope it refused and the refusal itself. */
export type OpenRefusal = { readonly scopeKey: string; readonly refusal: unknown }

/** An open episode, and how many reads had started when it opened. */
type RefusalEpisode = OpenRefusal & { readonly afterRead: number }

/**
 * The reads ONE registry-bound query makes and its refusal episode (the
 * criterion the name suggestions use): a refusal acted on opens an episode
 * for its scope, and only a read STARTED after it whose answer the adapter
 * accepted under that scope closes it — a healthy zero included. A cached or
 * placeholder answer, the registry confirming the same scope, an error going
 * away or a read begun before the refusal do not.
 */
export type RegistryReadLedger = {
  /** Runs one read under `scopeKey`, numbered as it starts; its accepted answer may close the scope's episode. */
  readonly track: <T>(scopeKey: string, read: () => Promise<T>) => Promise<T>
  /** The refusal whose episode is open (acted on, no accepted read since), or null. */
  readonly openRefusal: OpenRefusal | null
  /** Opens an episode for `scopeKey` on `refusal`; false when one is already open for it (the same episode). */
  readonly open: (scopeKey: string, refusal: unknown) => boolean
}

export function useRegistryReadLedger(): RegistryReadLedger {
  const started = useRef(0)
  const episode = useRef<RefusalEpisode | null>(null)
  const [openRefusal, setOpenRefusal] = useState<OpenRefusal | null>(null)
  const track = useCallback(async <T,>(scopeKey: string, read: () => Promise<T>): Promise<T> => {
    started.current += 1
    const number = started.current
    const answer = await read()
    const current = episode.current
    if (current && current.scopeKey === scopeKey && number > current.afterRead) {
      episode.current = null
      setOpenRefusal(null)
    }
    return answer
  }, [])
  const open = useCallback((scopeKey: string, refusal: unknown) => {
    if (episode.current?.scopeKey === scopeKey) return false
    episode.current = { scopeKey, refusal, afterRead: started.current }
    setOpenRefusal({ scopeKey, refusal })
    return true
  }, [])
  return useMemo(() => ({ track, openRefusal, open }), [track, openRefusal, open])
}

/** Whether `query` is still the cache's own entry for its key — not one a refusal retired. */
export function isCachedQuery(queryClient: QueryClient, query: { readonly queryHash: string }): boolean {
  return (queryClient.getQueryCache().get(query.queryHash) as unknown) === query
}

/**
 * A bound read that met another scope or a registry refusal opens a refusal
 * episode (`ledger`) for the pinned scope: every answer this query cached
 * under it is retired (`[...keyBeforeScope, scope]`, so another cached
 * filter can never serve it) and the page re-reads the registry. Further
 * refusals in the same episode do nothing more, so a read the registry keeps
 * refusing under a scope it has just confirmed is shown as a state, not
 * re-read in a loop; once a read started after it is accepted, the next,
 * independent refusal acts again. A changed scope still waits for the reader.
 */
export function useReportRegistryMove(error: unknown, scope: CompanyRegistryScope, ledger: RegistryReadLedger, keyBeforeScope: readonly unknown[]): void {
  const queryClient = useQueryClient()
  const report = scope.status === 'ready' ? scope.reportMoved : null
  const pinnedKey = scope.status === 'ready' ? scope.pinned.registry.scopeKey : null
  const refusal = isRegistryRefusal(error) ? error : null
  const { open } = ledger
  useEffect(() => {
    if (refusal === null || report === null || pinnedKey === null || !open(pinnedKey, refusal)) return
    queryClient.removeQueries({ queryKey: [...keyBeforeScope, pinnedKey] })
    report()
  }, [refusal, report, pinnedKey, open, queryClient, keyBeforeScope])
}
