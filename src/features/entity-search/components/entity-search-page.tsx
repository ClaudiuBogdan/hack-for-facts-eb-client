import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type {
  EntitySearchDocType,
  EntitySearchFacet,
  EntitySearchHit,
  EntitySearchInput as EntitySearchQueryInput,
} from '@/schemas/entity-search'
import { Route } from '@/routes/experimental.search'
import {
  entitySearchQueryKey,
  useEntitySearch,
} from '../hooks/use-entity-search'
import { EntityEmptyState } from './entity-empty-state'
import { EntityFacetChips } from './entity-facet-chips'
import { EntityLoadMore } from './entity-load-more'
import { EntityResultsHeader } from './entity-results-header'
import { EntitySearchHeader } from './entity-search-header'
import { EntitySearchInput } from './entity-search-input'
import { EntitySearchResults } from './entity-search-results'
import { EntitySearchSkeleton } from './entity-search-skeleton'

const SEARCH_LIMIT = 20
const LISTBOX_ID = 'es-listbox'
const EMPTY_TYPES: readonly string[] = []
const EMPTY_HITS: readonly EntitySearchHit[] = []
const EMPTY_FACETS: readonly EntitySearchFacet[] = []

function getOptionId(index: number): string {
  return `es-opt-${index}`
}

function normalizeQuery(query: string | undefined): string {
  return query?.trim() ?? ''
}

function normalizeTypes(types: readonly string[] | undefined): readonly string[] {
  if (!types) {
    return EMPTY_TYPES
  }

  const normalizedTypes = [
    ...new Set(types.map((type) => type.trim()).filter(Boolean)),
  ]

  return normalizedTypes.length > 0 ? normalizedTypes : EMPTY_TYPES
}



export function EntitySearchPage() {
  const searchParams = Route.useSearch()
  const navigate = useNavigate({ from: '/experimental/search' })
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const rowRefs = useRef<Array<HTMLLIElement | null>>([])
  const actionRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const [activeIndex, setActiveIndex] = useState(-1)

  const normalizedQuery = normalizeQuery(searchParams.q)
  const selectedTypes = useMemo(
    () => normalizeTypes(searchParams.types),
    [searchParams.types],
  )
  const normalizedCounty = searchParams.county?.trim() || undefined
  const activeOnly = searchParams.active === true

  const queryInput = useMemo<EntitySearchQueryInput>(
    () => ({
      q: normalizedQuery,
      docTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
      county: normalizedCounty,
      ...(activeOnly && { isActive: true }),
      limit: SEARCH_LIMIT,
    }),
    [activeOnly, normalizedCounty, normalizedQuery, selectedTypes],
  )

  const search = useEntitySearch(queryInput)
  // Infinite query: flatten loaded pages; the envelope fields (facets, engine,
  // estimatedTotalHits) describe the whole result set, so read them off page 1.
  const firstPage = search.data?.pages[0]
  const hits = useMemo(
    () => search.data?.pages.flatMap((page) => page.hits) ?? EMPTY_HITS,
    [search.data],
  )
  const facets = firstPage?.facets ?? EMPTY_FACETS
  const hasQuery = normalizedQuery.length > 0
  const hasResults = hits.length > 0
  /**
   * ANY loaded page being degraded degrades the whole answer — not just page 1.
   * The other envelope fields describe the result set and are read off the first
   * page, but a Meili outage that starts between "load more" calls lands on a
   * LATER page, and reading `firstPage` alone would keep presenting a partial
   * list as complete (D5).
   */
  const isDegraded =
    search.data?.pages.some((page) => page.degraded) ?? false
  const isInitialLoading =
    hasQuery && search.isFetching && !search.data && !search.isError
  const activeDescendantId =
    activeIndex >= 0 && activeIndex < hits.length
      ? getOptionId(activeIndex)
      : undefined

  useEffect(() => {
    rowRefs.current.length = hits.length
    actionRefs.current.length = hits.length
    setActiveIndex(hits.length > 0 ? 0 : -1)
  }, [hits])

  useEffect(() => {
    if (activeIndex < 0) {
      return
    }

    rowRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const commitQuery = useCallback(
    (query: string) => {
      const nextQuery = query.trim() || undefined
      const currentQuery = normalizedQuery || undefined

      if (nextQuery === currentQuery) {
        return
      }

      void navigate({
        to: '.',
        // Debounced per-keystroke commit → replace, so a single search doesn't
        // leave one history entry per character typed.
        replace: true,
        search: (previous) => ({
          ...previous,
          q: nextQuery,
        }),
      })
    },
    [navigate, normalizedQuery],
  )

  const clearSearch = useCallback(() => {
    void navigate({
      to: '.',
      search: (previous) => ({
        ...previous,
        q: undefined,
      }),
    })
  }, [navigate])

  const setTypes = useCallback(
    (types: readonly string[]) => {
      void navigate({
        to: '.',
        search: (previous) => ({
          ...previous,
          types: types.length > 0 ? [...types] : undefined,
        }),
      })
    },
    [navigate],
  )

  const selectPopularType = useCallback(
    (docType: EntitySearchDocType) => {
      setTypes([docType])
      inputRef.current?.focus()
    },
    [setTypes],
  )

  const clearFilters = useCallback(() => {
    void navigate({
      to: '.',
      search: (previous) => ({
        ...previous,
        types: undefined,
        county: undefined,
        active: undefined,
      }),
    })
  }, [navigate])

  const retrySearch = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: entitySearchQueryKey(queryInput),
    })
  }, [queryClient, queryInput])

  const setRowRef = useCallback(
    (index: number, node: HTMLLIElement | null) => {
      rowRefs.current[index] = node
    },
    [],
  )

  const setActionRef = useCallback(
    (index: number, node: HTMLAnchorElement | null) => {
      actionRefs.current[index] = node
    },
    [],
  )

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (hits.length === 0) {
        return
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setActiveIndex((current) =>
            current < 0 ? 0 : Math.min(current + 1, hits.length - 1),
          )
          break
        case 'ArrowUp':
          event.preventDefault()
          setActiveIndex((current) =>
            current <= 0 ? 0 : Math.max(current - 1, 0),
          )
          break
        case 'Home':
          event.preventDefault()
          setActiveIndex(0)
          break
        case 'End':
          event.preventDefault()
          setActiveIndex(hits.length - 1)
          break
        case 'Enter':
          if (activeIndex >= 0) {
            event.preventDefault()
            actionRefs.current[activeIndex]?.click()
          }
          break
      }
    },
    [activeIndex, hits.length],
  )

  const shouldShowFacets =
    hasQuery || selectedTypes.length > 0 || facets.length > 0
  const shouldShowResultsHeader =
    hasQuery && !search.isError && (search.isFetching || Boolean(search.data))

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
      <EntitySearchHeader inputRef={inputRef} />

      <EntitySearchInput
        query={normalizedQuery}
        inputRef={inputRef}
        listboxId={LISTBOX_ID}
        activeDescendantId={activeDescendantId}
        isListboxMounted={isInitialLoading || hasResults}
        isFetching={search.isFetching}
        isPlaceholderData={Boolean(search.isPlaceholderData)}
        onQueryCommit={commitQuery}
        onClear={clearSearch}
        onKeyDown={handleInputKeyDown}
      />

      {shouldShowFacets ? (
        <EntityFacetChips
          facets={facets}
          selectedTypes={selectedTypes}
          estimatedTotalHits={firstPage?.estimatedTotalHits ?? null}
          onTypesChange={setTypes}
        />
      ) : null}

      <section
        aria-labelledby="entity-search-results-heading"
        className="space-y-3"
      >
        {shouldShowResultsHeader ? (
          <EntityResultsHeader
            shownCount={hits.length}
            estimatedTotalHits={firstPage?.estimatedTotalHits ?? null}
            engine={firstPage?.engine ?? null}
            degraded={isDegraded}
          />
        ) : null}

        {!hasQuery ? (
          <EntityEmptyState
            variant="initial"
            selectedTypes={selectedTypes}
            onSelectPopularType={selectPopularType}
          />
        ) : search.isError ? (
          <EntityEmptyState variant="error" onRetry={retrySearch} />
        ) : isInitialLoading ? (
          <EntitySearchSkeleton listboxId={LISTBOX_ID} />
        ) : hasResults ? (
          <EntitySearchResults
            hits={hits}
            listboxId={LISTBOX_ID}
            activeIndex={activeIndex}
            isFetching={search.isFetching}
            isPlaceholderData={Boolean(search.isPlaceholderData)}
            getOptionId={getOptionId}
            setRowRef={setRowRef}
            setActionRef={setActionRef}
          />
        ) : null}

        {hasResults && search.hasNextPage ? (
          <EntityLoadMore
            isLoading={search.isFetchingNextPage}
            disabled={!search.hasNextPage}
            onClick={() => {
              void search.fetchNextPage()
            }}
          />
        ) : null}

        {!hasQuery || search.isError || isInitialLoading || hasResults ? null : (
          <EntityEmptyState
            // "No results" is a claim about the world. When the engine could not
            // be reached we did not look, so we must not make it (D5).
            variant={isDegraded ? 'degraded' : 'zero'}
            query={normalizedQuery}
            onClearFilters={clearFilters}
            onRetry={retrySearch}
          />
        )}
      </section>
    </main>
  )
}
