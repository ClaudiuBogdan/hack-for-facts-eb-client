import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Analytics } from '@/lib/analytics'
import { searchEntities } from '@/lib/api/entities'
import {
  buildEntitySelectionPath,
  type EntitySelectionBehavior,
} from '@/lib/entity-navigation'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import type { EntitySearchNode } from '@/schemas/entities'

/**
 * The search's state, as one machine.
 *
 * The shipped hook returns `isLoading`, `isError` and `results` and leaves the
 * component to work out which of the eight resulting combinations it is in. Most
 * of them are impossible, two of them are the same thing, and the one that
 * matters — *typed enough, request not sent yet* — has no representation at all,
 * which is why the shipped dropdown opens late and reads as lag.
 *
 * So the states are enumerated here instead, as a discriminated union. Each has
 * exactly one rendered form, the component is a `switch`, and a state nobody
 * designed cannot appear because there is nowhere to put it.
 *
 * The subtle one is `results` with `stale: true`. With `keepPreviousData` the
 * previous term's results stay on screen while the next request is in flight, so
 * the list dims instead of emptying and re-filling — which is the difference
 * between a list that updates and a list that flickers on every keystroke. The
 * flag exists because staleness has to be *visible*: showing yesterday's answer
 * as though it were today's is the one thing this surface must not do.
 */
export type SearchStatus =
  /** Nothing typed. The dropdown is closed; the panel beside it already suggests. */
  | { readonly kind: 'idle' }
  /** Typed, but not yet enough to ask. Carries how many more characters are needed. */
  | { readonly kind: 'short'; readonly remaining: number }
  /** Enough typed, still inside the debounce. No request in flight yet. */
  | { readonly kind: 'pending' }
  /** Request in flight with nothing to show behind it. */
  | { readonly kind: 'loading' }
  /** Results, possibly for a term the reader has already moved on from. */
  | {
      readonly kind: 'results'
      readonly results: readonly EntitySearchNode[]
      readonly stale: boolean
      /** Where they came from. `local` must be visible to the reader. */
      readonly source: SearchSource
    }
  /** Settled, current, and genuinely nothing. Carries the term that found nothing. */
  | { readonly kind: 'empty'; readonly term: string }
  /** The request failed. */
  | { readonly kind: 'error' }

/**
 * Characters before anything is sent.
 *
 * Matches the API client, which refuses to query below three. Stating it here
 * rather than inferring it is what lets the UI say *how many more* instead of
 * going quiet and looking broken.
 */
export const MIN_QUERY_CHARS = 3

/**
 * Whether a list came from the API or from a caller-supplied stand-in.
 *
 * Carried through the state rather than handled at the edge, because the
 * distinction has to survive all the way to the screen: DESIGN.md §Mock-First
 * Contract forbids stand-in data from being presented as served truth, and a
 * list of real institutions with real CUIs is the most convincing possible lie.
 */
export type SearchSource = 'live' | 'local'

/**
 * How long typing has to stop before the request goes.
 *
 * Down from the shipped 500ms. Half a second is past the point where a person
 * reads a pause as the interface thinking rather than as their own typing, and
 * with `keepPreviousData` absorbing the intermediate states there is no longer a
 * flicker cost to asking sooner.
 */
export const SEARCH_DEBOUNCE_MS = 250

/** Results requested. Eight fits the dropdown without it needing to scroll. */
export const SEARCH_LIMIT = 8

type UseLandingSearchOptions = {
  readonly onSelect?: (entity: EntitySearchNode) => void
  readonly selectionBehavior?: EntitySelectionBehavior
  readonly debounceMs?: number
  /**
   * Consulted only when the request fails, and only if supplied.
   *
   * There is deliberately no default. A search that quietly answers from
   * somewhere else when the server is unreachable is a correctness problem, not
   * a resilience feature, so the decision to allow it belongs to the caller —
   * and the caller is then responsible for gating it. Returning an empty list
   * declines, and the error stands.
   */
  readonly fallback?: (term: string) => readonly EntitySearchNode[]
}

type SearchPayload = {
  readonly source: SearchSource
  readonly nodes: readonly EntitySearchNode[]
}

export function useLandingSearch({
  onSelect,
  selectionBehavior = 'navigate-to-preferred-entity',
  debounceMs = SEARCH_DEBOUNCE_MS,
  fallback,
}: UseLandingSearchOptions = {}) {
  const navigate = useNavigate()
  const currentSearch = useSearch({ strict: false }) as Record<string, unknown>

  const [term, setTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const trimmed = term.trim()
  const debouncedTerm = useDebouncedValue(term, debounceMs)
  const normalized = useMemo(() => debouncedTerm.trim(), [debouncedTerm])
  const isQueryable = normalized.length >= MIN_QUERY_CHARS

  // Kept in a ref so changing the fallback identity between renders cannot
  // re-key the query and re-fire a request the reader did not ask for.
  const fallbackRef = useRef(fallback)
  fallbackRef.current = fallback

  const {
    data,
    isError,
    isFetching,
    isPlaceholderData,
    isSuccess,
  } = useQuery<SearchPayload, Error>({
    queryKey: ['landingEntitySearch', normalized],
    queryFn: async () => {
      try {
        return { source: 'live', nodes: await searchEntities(normalized, SEARCH_LIMIT) }
      } catch (error) {
        const local = fallbackRef.current?.(normalized) ?? []
        if (local.length === 0) throw error
        return { source: 'local', nodes: local }
      }
    },
    enabled: isQueryable,
    // The list dims rather than emptying between terms. Without this every
    // keystroke past the debounce tears the dropdown down and builds it again.
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })

  const results = useMemo(() => data?.nodes ?? [], [data])
  const source: SearchSource = data?.source ?? 'live'

  /**
   * Whether what is on screen answers what is in the box.
   *
   * Three things can make it false — the debounce has not fired, the request is
   * in flight, or the data belongs to the previous term — and they have to be
   * treated identically, because the consequence is the same: Enter must not act
   * on it. This is the guard the shipped hook is missing, where typing `Cluj`,
   * pausing, adding ` N` and pressing Enter opens the first result for `Cluj`.
   */
  const isCurrent = isQueryable && normalized === trimmed && !isPlaceholderData && !isFetching

  const status: SearchStatus = useMemo(() => {
    if (trimmed.length === 0) return { kind: 'idle' }
    if (trimmed.length < MIN_QUERY_CHARS) {
      return { kind: 'short', remaining: MIN_QUERY_CHARS - trimmed.length }
    }
    // An error only wins when there is nothing behind it. A failed refetch over
    // a good list should dim the list, not replace it with a failure.
    if (isError && results.length === 0) return { kind: 'error' }
    if (results.length > 0) {
      return { kind: 'results', results, stale: !isCurrent, source }
    }
    if (isSuccess && normalized === trimmed && !isFetching) {
      return { kind: 'empty', term: trimmed }
    }
    return normalized === trimmed && isFetching ? { kind: 'loading' } : { kind: 'pending' }
  }, [trimmed, normalized, isError, isSuccess, isFetching, results, isCurrent, source])

  // A new set of results invalidates whatever was highlighted — the row under
  // the cursor is not the row that was under it. Keyed on the array identity, so
  // a cache hit that returns the same array leaves the highlight alone.
  useEffect(() => {
    setActiveIndex(-1)
  }, [results])

  const reactId = useId()
  const id = useMemo(() => `landing-search-${reactId.replace(/:/g, '')}`, [reactId])

  // Analytics parity with the shipped hook: length and counts, never the term.
  const searchedRef = useRef('')
  useEffect(() => {
    if (!isCurrent || normalized.length < MIN_QUERY_CHARS) return
    if (searchedRef.current === normalized) return
    searchedRef.current = normalized
    Analytics.capture(Analytics.EVENTS.EntitySearchPerformed, {
      query_len: normalized.length,
      results_count: results.length,
      has_results: results.length > 0,
    })
  }, [isCurrent, normalized, results])

  const open = useCallback(() => setIsOpen(true), [])

  const close = useCallback(() => {
    setIsOpen(false)
    setActiveIndex(-1)
  }, [])

  const clear = useCallback(() => {
    setTerm('')
    setActiveIndex(-1)
  }, [])

  const select = useCallback(
    (index: number, options?: { readonly skipNavigate?: boolean }) => {
      const entity = results[index]
      if (!entity) return

      Analytics.capture(Analytics.EVENTS.EntitySearchSelected, { cui: entity.cui })

      if (selectionBehavior !== 'callback-only' && !options?.skipNavigate) {
        const destination = buildEntitySelectionPath(
          { cui: entity.cui, entityType: entity.entity_type, isUat: entity.is_uat },
          selectionBehavior,
        )
        navigate({ to: destination as '/', search: currentSearch as never })
      }

      setTerm('')
      close()
      onSelect?.(entity)
    },
    [results, selectionBehavior, navigate, currentSearch, close, onSelect],
  )

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const count = results.length

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          // Down re-opens a dropdown that was dismissed without clearing the
          // term, which is the only way back to results short of retyping.
          if (!isOpen) {
            open()
            return
          }
          if (count > 0) setActiveIndex((previous) => (previous + 1) % count)
          return

        case 'ArrowUp':
          event.preventDefault()
          if (!isOpen || count === 0) return
          // From nothing selected, Up goes to the *last* result. Treating -1 as
          // an index and taking it modulo the count lands on the first instead,
          // which makes Up and Down do the same thing from a cold start.
          setActiveIndex((previous) => (previous < 0 ? count - 1 : (previous - 1 + count) % count))
          return

        case 'Home':
          if (!isOpen || count === 0) return
          event.preventDefault()
          setActiveIndex(0)
          return

        case 'End':
          if (!isOpen || count === 0) return
          event.preventDefault()
          setActiveIndex(count - 1)
          return

        case 'Enter': {
          if (!isOpen || count === 0) return
          event.preventDefault()
          if (activeIndex > -1) {
            select(activeIndex)
            return
          }
          // Enter with nothing highlighted takes the first result, but only
          // once the list is known to answer the current term.
          if (isCurrent) select(0)
          return
        }

        case 'Escape':
          event.preventDefault()
          // Two stages, per the ARIA combobox pattern: dismiss the list, then
          // clear the field. Collapsing them — as the shipped hook does —
          // destroys a query the reader was still reading results for.
          if (isOpen) {
            close()
            return
          }
          clear()
          return

        default:
      }
    },
    [results, isOpen, activeIndex, isCurrent, open, close, clear, select],
  )

  const onChange = useCallback(
    (value: string) => {
      setTerm(value)
      setActiveIndex(-1)
      open()
    },
    [open],
  )

  return {
    id,
    term,
    onChange,
    status,
    activeIndex,
    /**
     * Whether the dropdown should be on screen. `idle` is excluded on purpose:
     * an empty focused field opens nothing, because the panel beside it is
     * already a list of suggestions and two would compete.
     */
    isDropdownOpen: isOpen && status.kind !== 'idle',
    open,
    close,
    clear,
    select,
    onKeyDown,
  }
}
