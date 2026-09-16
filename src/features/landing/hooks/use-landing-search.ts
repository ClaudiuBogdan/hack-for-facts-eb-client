import { isSearchInputError } from '@/features/entity-search/api/search-input-error'
import { useLingui } from '@lingui/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Analytics } from '@/lib/analytics'
import { searchEntitiesLive } from '@/features/entity-search/api/entity-search-api.live'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import type { EntitySearchHit } from '@/schemas/entity-search'
import { absorbTriggers, searchFilterInput, suggestFilters, tagSearchFilters } from '@/features/landing/lib/search-filters'
import type { SearchFilter } from '@/features/landing/lib/search-filters'

export type SearchStatus =
  | { readonly kind: 'idle' }
  /** Chips and nothing typed. The server answers a blank query with nothing, so the field asks for a name. */
  | { readonly kind: 'scoped' }
  | { readonly kind: 'short'; readonly remaining: number }
  | { readonly kind: 'pending' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'results'; readonly results: readonly EntitySearchHit[]; readonly stale: boolean }
  | { readonly kind: 'empty'; readonly term: string }
  | { readonly kind: 'error' }
  | { readonly kind: 'invalid' }

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
  const [filters, setFilters] = useState<readonly SearchFilter[]>([])
  const { i18n } = useLingui()
  const tagFilters = useMemo(() => tagSearchFilters(i18n.locale), [i18n.locale])
  const serverFilters = searchFilterInput(filters)
  const trimmed = term.trim()
  const normalized = useDebouncedValue(trimmed, debounceMs)
  const isQueryable = normalized.length >= MIN_QUERY_CHARS
  const { data, error, isError, isFetching, isPlaceholderData, isSuccess } = useQuery({
    queryKey: ['landingUniversalSearch', normalized, serverFilters],
    queryFn: async ({ signal }) => {
      const response = await searchEntitiesLive({
        q: normalized, docTypes: LANDING_SEARCH_TYPES, ...serverFilters, limit: SEARCH_LIMIT,
      }, signal)
      if (response.degraded) throw new Error('Search unavailable')
      return response.hits.filter((hit) => hit.href.startsWith('/') && !hit.isExternal)
    },
    enabled: isQueryable,
    retry: false,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })
  const results = useMemo(() => data ?? [], [data])
  const isCurrent = isQueryable && normalized === trimmed && isSuccess && !isPlaceholderData && !isFetching

  const status: SearchStatus = useMemo(() => {
    if (!trimmed) return filters.length > 0 ? { kind: 'scoped' } : { kind: 'idle' }
    if (trimmed.length < MIN_QUERY_CHARS) return { kind: 'short', remaining: MIN_QUERY_CHARS - trimmed.length }
    if (isError && normalized === trimmed) return { kind: isSearchInputError(error) ? 'invalid' : 'error' }
    if (results.length) return { kind: 'results', results, stale: !isCurrent }
    if (isCurrent) return { kind: 'empty', term: trimmed }
    return normalized === trimmed && isFetching ? { kind: 'loading' } : { kind: 'pending' }
  }, [trimmed, normalized, error, isError, isFetching, results, isCurrent, filters])

  const suggestions = useMemo(() => suggestFilters(term, filters, tagFilters), [term, filters, tagFilters])

  /**
   * Accepting a suggestion: the chip goes on, and the word that earned it
   * comes out of the text. Both in one step, so there is never a render in
   * which `firma` is a chip and a word at once.
   */
  const addFilter = useCallback((filter: SearchFilter) => {
    setFilters((current) => {
      if (current.some(f => f.id === filter.id)) return current
      // Public-enterprise and PNRR are role scopes; the API roles list is OR,
      // so never present their combination as an intersection.
      const kept = current.filter(f => {
        if (filter.entityTag) return f.entityTag !== filter.entityTag
        if (f.entityTag) return true
        return filter.id === 'pnrr' ? f.id !== 'public_enterprise'
          : f.id === 'pnrr' && filter.id !== 'public_enterprise'
      })
      return [...kept, filter]
    })
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
