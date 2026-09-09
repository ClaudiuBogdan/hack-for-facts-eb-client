import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Analytics } from '@/lib/analytics'
import { searchEntitiesLive } from '@/features/entity-search/api/entity-search-api.live'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import type { EntitySearchHit } from '@/schemas/entity-search'

export type SearchStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'short'; readonly remaining: number }
  | { readonly kind: 'pending' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'results'; readonly results: readonly EntitySearchHit[]; readonly stale: boolean }
  | { readonly kind: 'empty'; readonly term: string }
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
}: { readonly debounceMs?: number } = {}) {
  const [term, setTerm] = useState('')
  const trimmed = term.trim()
  const normalized = useDebouncedValue(trimmed, debounceMs)
  const isQueryable = normalized.length >= MIN_QUERY_CHARS
  const { data, isError, isFetching, isPlaceholderData, isSuccess } = useQuery({
    queryKey: ['landingUniversalSearch', normalized],
    queryFn: async ({ signal }) => {
      const response = await searchEntitiesLive({
        q: normalized, docTypes: LANDING_SEARCH_TYPES, limit: SEARCH_LIMIT,
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
  const results = useMemo(() => data ?? [], [data])
  const isCurrent = isQueryable && normalized === trimmed && isSuccess && !isPlaceholderData && !isFetching

  const status: SearchStatus = useMemo(() => {
    if (!trimmed) return { kind: 'idle' }
    if (trimmed.length < MIN_QUERY_CHARS) return { kind: 'short', remaining: MIN_QUERY_CHARS - trimmed.length }
    if (isError && normalized === trimmed) return { kind: 'error' }
    if (results.length) return { kind: 'results', results, stale: !isCurrent }
    if (isCurrent) return { kind: 'empty', term: trimmed }
    return normalized === trimmed && isFetching ? { kind: 'loading' } : { kind: 'pending' }
  }, [trimmed, normalized, isError, isFetching, results, isCurrent])

  const searchedRef = useRef('')
  useEffect(() => {
    if (!isCurrent || searchedRef.current === normalized) return
    searchedRef.current = normalized
    Analytics.capture(Analytics.EVENTS.EntitySearchPerformed, {
      query_len: normalized.length,
      results_count: results.length,
      has_results: results.length > 0,
    })
  }, [isCurrent, normalized, results])

  return { term, setTerm, status, results, isCurrent }
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
