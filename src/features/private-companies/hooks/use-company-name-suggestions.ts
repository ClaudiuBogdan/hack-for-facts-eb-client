import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { resolveCompanies } from '../api/private-company-api'
import { isRegistryRefusal, retryRegistryRead } from '../api/company-registry-errors'
import { boundScopeKey, useCompanyRegistryScope } from './use-company-registry-scope'

/** Below two characters a name resolve returns noise, so we don't ask. */
const MIN_QUERY_LENGTH = 2
const SUGGESTION_LIMIT = 8
const DEBOUNCE_MS = 300
const SUGGESTIONS_KEY = ['company-name-suggestions'] as const

/**
 * A refusal acted on: the scope it refused, and how many resolve reads this
 * hook had started by then. Until a read started AFTER it is accepted under
 * that scope, a further refusal of the scope is the same episode.
 */
type RefusalEpisode = { readonly scopeKey: string; readonly afterRead: number }

/**
 * Name suggestions for the company search autocomplete. The draft (not the
 * committed URL `q`) drives this, debounced, so the dropdown tracks typing
 * without a request per keystroke.
 *
 * Bound to the page's pinned registry scope at both ends: the request sends
 * it (`registryScope`) and the answer must carry it — zero hits included —
 * before it is cached or shown (`acceptCompanyResolveResult`); an answer under
 * another scope is refused, never stored under this one. The key is that
 * scope, so a move asks again; a placeholder is only another live entry of
 * the same scope.
 *
 * A refusal by the registry (the scope key refused as stale, a scope that
 * moved during the request, access that could not be rechecked) opens a
 * refusal episode: every suggestion cached under the refused scope is
 * dropped, and the page's scope is told once — it re-reads the registry and
 * reads nothing under the old scope meanwhile; a changed scope still waits for
 * the reader. The episode closes only when a resolve read started after it is
 * accepted under the same scope (a healthy zero counts); a cached entry, a
 * placeholder, the registry answering the same scope again, an error going
 * away or a read begun before the refusal do not close it. So a refusal the
 * registry repeats before any such read is shown as a state, never re-read in
 * a loop; and every later, independent refusal acts again. A failed read
 * shows nothing, never "no match": an earlier answer it kept stays hidden.
 * `degraded` (the search engine was down and a capped fallback answered) is
 * kept apart from an empty answer.
 *
 * `data` is the hits — the one narrow projection the existing callers read.
 */
export function useCompanyNameSuggestions(draft: string) {
  const debounced = useDebouncedValue(draft.trim(), DEBOUNCE_MS)
  const scope = useCompanyRegistryScope()
  const scopeKey = boundScopeKey(scope)
  const enabled = debounced.length >= MIN_QUERY_LENGTH && scopeKey !== null
  const queryClient = useQueryClient()
  // Resolve reads this hook has started, and the open refusal episode, if any.
  const reads = useRef(0)
  const episode = useRef<RefusalEpisode | null>(null)

  const query = useQuery({
    queryKey: [...SUGGESTIONS_KEY, scopeKey, debounced] as const,
    queryFn: async ({ signal }) => {
      reads.current += 1
      const read = reads.current
      const requested = scopeKey ?? ''
      const answer = await resolveCompanies({ dim: 'NAME', q: debounced, limit: SUGGESTION_LIMIT, registryScope: requested }, signal)
      // Accepted under the requested scope: a read started after the refusal closes that scope's episode.
      const open = episode.current
      if (open && open.scopeKey === requested && read > open.afterRead) episode.current = null
      return answer
    },
    enabled,
    retry: retryRegistryRead,
    // Keep the previous list on screen while the next one loads — the dropdown
    // must not collapse mid-keystroke — but only a live entry of the same scope:
    // never one a refusal retired.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === scopeKey && (queryClient.getQueryCache().get(previousQuery.queryHash) as unknown) === previousQuery ? previous : undefined,
    staleTime: 5 * 60 * 1000,
  })

  const refusal = isRegistryRefusal(query.error) ? query.error : null
  const report = scope.status === 'ready' ? scope.reportMoved : null
  useEffect(() => {
    if (refusal === null || scopeKey === null) return
    const open = episode.current
    if (open && open.scopeKey === scopeKey) return
    episode.current = { scopeKey, afterRead: reads.current }
    queryClient.removeQueries({ queryKey: [...SUGGESTIONS_KEY, scopeKey] })
    report?.()
  }, [refusal, scopeKey, report, queryClient])

  const answer = query.isError ? undefined : query.data
  return { ...query, data: answer?.hits, degraded: answer?.degraded ?? false }
}
