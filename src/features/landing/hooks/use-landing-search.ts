import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Analytics } from '@/lib/analytics'
import { searchEntitiesLive } from '@/features/entity-search/api/entity-search-api.live'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import type { EntitySearchHit } from '@/schemas/entity-search'
import { absorbTriggers, narrowHits, suggestFilters } from '@/features/landing/lib/search-filters'
import type { SearchFilter } from '@/features/landing/lib/search-filters'

export type SearchStatus =
  | { readonly kind: 'idle' }
  /** Chips and nothing typed. The server answers a blank query with nothing, so the field asks for a name. */
  | { readonly kind: 'scoped' }
  | { readonly kind: 'short'; readonly remaining: number }
  | { readonly kind: 'pending' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'results'; readonly results: readonly EntitySearchHit[]; readonly stale: boolean }
  /**
   * `narrowed` is true when the server did return rows and every one of them
   * was removed by a chip. The two are different messages: "nothing matches"
   * versus "nothing of this kind among what came back" — and the second has to
   * be said, because a chip is applied to the first page only (see
   * `search-filters.ts`).
   */
  | { readonly kind: 'empty'; readonly term: string; readonly narrowed: boolean }
  | { readonly kind: 'error' }

export const MIN_QUERY_CHARS = 3
export const SEARCH_DEBOUNCE_MS = 250
export const SEARCH_LIMIT = 8

// Use existing internal destination mappings. Parliament person/case keys and
// source-only publication links need separate routing work before inclusion.
export const LANDING_SEARCH_TYPES = [
  'organization', 'company', 'public_enterprise', 'ngo', 'legal_act',
] as const

export function useSearchResults({
  debounceMs = SEARCH_DEBOUNCE_MS,
  docTypes = LANDING_SEARCH_TYPES,
  suggestions: suggestionsEnabled = true,
}: {
  readonly debounceMs?: number
  /**
   * The families the request asks for. The landing sends its whole set; a
   * page that is about one kind of thing (the companies hub) sends that kind
   * alone, and the narrowing then happens on the server, over the whole
   * index, rather than on the first page as a chip does.
   */
  readonly docTypes?: readonly string[]
  /**
   * Whether category words in the text may become chips. Off when the scope
   * is fixed by the caller: a *Primării* chip over company-only rows can only
   * narrow them to nothing.
   */
  readonly suggestions?: boolean
} = {}) {
  const [term, setTerm] = useState('')
  const [filters, setFilters] = useState<readonly SearchFilter[]>([])
  const trimmed = term.trim()
  const normalized = useDebouncedValue(trimmed, debounceMs)
  const isQueryable = normalized.length >= MIN_QUERY_CHARS
  // The request carries the query and the caller's fixed scope only. Chips are
  // not sent — see the module comment in `search-filters.ts` — so the key is
  // the term and the scope, and adding or removing a chip never refetches.
  // The scope is in the key because the same term over different families
  // is a different answer, and two fields on two pages must not share one.
  const scopeKey = docTypes.join(',')
  const { data, isError, isFetching, isPlaceholderData, isSuccess } = useQuery({
    queryKey: ['landingUniversalSearch', scopeKey, normalized],
    queryFn: async ({ signal }) => {
      const response = await searchEntitiesLive({
        q: normalized, docTypes, limit: SEARCH_LIMIT,
      }, signal)
      if (response.degraded) throw new Error('Search unavailable')
      return response.hits.filter((hit) => hit.href.startsWith('/') && !hit.isExternal)
    },
    enabled: isQueryable,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })
  const served = useMemo(() => data ?? [], [data])
  const results = useMemo(() => narrowHits(served, filters), [served, filters])
  const isCurrent = isQueryable && normalized === trimmed && isSuccess && !isPlaceholderData && !isFetching

  const status: SearchStatus = useMemo(() => {
    if (!trimmed) return filters.length > 0 ? { kind: 'scoped' } : { kind: 'idle' }
    if (trimmed.length < MIN_QUERY_CHARS) return { kind: 'short', remaining: MIN_QUERY_CHARS - trimmed.length }
    if (isError && normalized === trimmed) return { kind: 'error' }
    if (results.length) return { kind: 'results', results, stale: !isCurrent }
    if (isCurrent) return { kind: 'empty', term: trimmed, narrowed: served.length > 0 }
    return normalized === trimmed && isFetching ? { kind: 'loading' } : { kind: 'pending' }
  }, [trimmed, normalized, isError, isFetching, results, served, isCurrent, filters])

  const suggestions = useMemo(
    () => (suggestionsEnabled ? suggestFilters(term, filters) : []),
    [suggestionsEnabled, term, filters],
  )

  /**
   * Accepting a suggestion: the chip goes on, and the word that earned it
   * comes out of the text. Both in one step, so there is never a render in
   * which `firma` is a chip and a word at once.
   */
  const addFilter = useCallback((filter: SearchFilter) => {
    setFilters((current) => (current.some((f) => f.id === filter.id) ? current : [...current, filter]))
    setTerm((current) => absorbTriggers(current, filter))
  }, [])

  const removeFilter = useCallback((filter: SearchFilter) => {
    setFilters((current) => current.filter((f) => f.id !== filter.id))
  }, [])

  /** The whole field: text and chips together. Escape's second stage and the clear button. */
  const reset = useCallback(() => {
    setTerm('')
    setFilters([])
  }, [])

  const searchedRef = useRef('')
  useEffect(() => {
    if (!isCurrent || searchedRef.current === normalized) return
    searchedRef.current = normalized
    Analytics.capture(Analytics.EVENTS.EntitySearchPerformed, {
      query_len: normalized.length,
      results_count: results.length,
      has_results: results.length > 0,
      filter_count: filters.length,
    })
  }, [isCurrent, normalized, results, filters])

  return { term, setTerm, filters, suggestions, addFilter, removeFilter, reset, status, results, isCurrent }
}

export function useEntitySelection({
  onSelect,
}: { readonly onSelect?: (entity: EntitySearchHit) => void } = {}) {
  const navigate = useNavigate()
  return useCallback((entity: EntitySearchHit | undefined, options?: { readonly skipNavigate?: boolean }) => {
    if (!entity?.href || entity.isExternal) return
    Analytics.capture(Analytics.EVENTS.EntitySearchSelected, {
      entity_id: entity.id, doc_type: entity.docType,
    })
    if (!options?.skipNavigate) navigate({ to: entity.href as '/' })
    onSelect?.(entity)
  }, [navigate, onSelect])
}
