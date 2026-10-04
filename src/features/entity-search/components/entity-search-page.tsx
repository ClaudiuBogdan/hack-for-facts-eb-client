import { isSearchInputError } from '../api/search-input-error'
import { isSearchWithheld } from '../api/search-withheld-error'
import {
  incompleteReasonOf,
  readEntitySearchAnswer,
  type EntitySearchAnswer,
} from '../lib/entity-search-answer'
import { t } from '@lingui/core/macro'
import { useEntityTagLabel } from '@/hooks/filters/useFilterLabels'
import { Button } from '@/components/ui/button'
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
import { EntityCompanyContribution } from './entity-company-contribution'
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

function errorVariant(error: unknown): 'invalid' | 'withheld' | 'error' {
  if (isSearchInputError(error)) return 'invalid'
  return isSearchWithheld(error) ? 'withheld' : 'error'
}

/** An empty answer is a "no match" only when the contract says so (r2 §3, r4). */
function emptyVariant(answer: EntitySearchAnswer): 'degraded' | 'zero' | 'incomplete' {
  if (answer.degraded) return 'degraded'
  return answer.noMatch ? 'zero' : 'incomplete'
}

export function EntitySearchPage() {
  const searchParams = Route.useSearch()
  const navigate = useNavigate({ from: '/experimental/search' })
  const queryClient = useQueryClient()
  const tagLabels = useEntityTagLabel()
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
      isUat: searchParams.isUat,
      entityTags: searchParams.tags,
      excludeEntityTags: searchParams.excludeTags,
      ...(activeOnly && { isActive: true }),
      limit: SEARCH_LIMIT,
    }),
    [activeOnly, normalizedCounty, normalizedQuery, selectedTypes, searchParams.isUat, searchParams.tags, searchParams.excludeTags],
  )

  const search = useEntitySearch(queryInput)
  const hasQuery = normalizedQuery.length > 0
  /**
   * Infinite query: the loaded pages read as one answer, and only if every
   * page was read the same way — a Meili outage, a new index generation or a
   * registry change that starts between "load more" calls lands on a LATER
   * page (D5), and then the search starts again rather than mixing pages. An
   * error or a refusal hides every page the query still holds: a failed
   * re-read must not leave an older answer, or its counts, on screen. Without
   * a query there is no answer at all, whatever the previous one was.
   */
  const answer = useMemo(
    () =>
      hasQuery && !search.isError && search.data
        ? readEntitySearchAnswer(search.data.pages)
        : null,
    [hasQuery, search.isError, search.data],
  )
  const hits = answer?.hits ?? EMPTY_HITS
  const facets = answer?.facets ?? EMPTY_FACETS
  const hasResults = hits.length > 0
  const isDegraded = answer?.degraded ?? false
  const isPlaceholder = Boolean(search.isPlaceholderData)
  // An earlier query's answer kept on screen while this one loads says
  // nothing about this one: its hits stay dimmed, but its emptiness, counts
  // and company state are not shown as this query's answer.
  const settledAnswer = answer !== null && !isPlaceholder ? answer : null
  const isAwaitingAnswer =
    hasQuery && !search.isError && (answer === null || (isPlaceholder && !hasResults))
  const showsSkeleton = isAwaitingAnswer && search.isFetching
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
        isUat: undefined,
        tags: undefined,
        excludeTags: undefined,
        county: undefined,
        active: undefined,
      }),
    })
  }, [navigate])

  // A retry starts the search again from its first page: the pages an error,
  // a refusal or a moved index left behind are dropped, not re-read.
  const retrySearch = useCallback(() => {
    void queryClient.resetQueries({
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
    hasQuery &&
    !search.isError &&
    !answer?.moved &&
    (search.isFetching || answer !== null)
  const countsShown = settledAnswer?.countsShown ?? false

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
      <EntitySearchHeader inputRef={inputRef} />

      <EntitySearchInput
        query={normalizedQuery}
        inputRef={inputRef}
        listboxId={LISTBOX_ID}
        activeDescendantId={activeDescendantId}
        isListboxMounted={showsSkeleton || hasResults}
        isFetching={search.isFetching}
        isPlaceholderData={isPlaceholder}
        onQueryCommit={commitQuery}
        onClear={clearSearch}
        onKeyDown={handleInputKeyDown}
      />

      {(searchParams.isUat !== undefined || searchParams.tags?.length || searchParams.excludeTags?.length) ? (
        <div className="flex flex-wrap gap-2" aria-label={t`Filtre active`}>
          {searchParams.isUat !== undefined && <Button size="sm" variant="secondary"
            onClick={() => { void navigate({ to: '.', search: previous => ({ ...previous, isUat: undefined }) }) }}>
            {searchParams.isUat ? t`Primării` : <>{t`Instituții`} · {t`Fără primării`}</>} ×
          </Button>}
          {(['tags', 'excludeTags'] as const).flatMap(field => (searchParams[field] ?? []).map(tag => (
            <Button key={`${field}:${tag}`} size="sm" variant="secondary"
              onClick={() => { void navigate({ to: '.', search: previous => ({ ...previous, [field]: previous[field]?.filter(value => value !== tag) }) }) }}>
              {field === 'excludeTags' ? '− ' : ''}{tagLabels.map(tag)} ×
            </Button>
          )))}
        </div>
      ) : null}

      {shouldShowFacets ? (
        <EntityFacetChips
          facets={facets}
          selectedTypes={selectedTypes}
          estimatedTotalHits={countsShown && settledAnswer ? settledAnswer.estimatedTotalHits : null}
          showCounts={countsShown}
          onTypesChange={setTypes}
        />
      ) : null}

      <section
        aria-labelledby="entity-search-results-heading"
        className="space-y-3"
      >
        {shouldShowResultsHeader ? (
          <EntityResultsHeader
            shownCount={settledAnswer ? hits.length : null}
            estimatedTotalHits={countsShown && settledAnswer ? settledAnswer.estimatedTotalHits : null}
            engine={answer?.engine ?? null}
            degraded={isDegraded}
          />
        ) : null}

        {settledAnswer && !settledAnswer.moved && !settledAnswer.degraded ? (
          <EntityCompanyContribution
            contribution={settledAnswer.contribution}
            reason={settledAnswer.reason}
          />
        ) : null}

        {!hasQuery ? (
          <EntityEmptyState
            variant="initial"
            selectedTypes={selectedTypes}
            onSelectPopularType={selectPopularType}
          />
        ) : search.isError ? (
          <EntityEmptyState
            variant={errorVariant(search.error)}
            query={normalizedQuery}
            onRetry={retrySearch}
          />
        ) : answer === null || isAwaitingAnswer ? (
          showsSkeleton ? <EntitySearchSkeleton listboxId={LISTBOX_ID} /> : null
        ) : answer.moved ? (
          <EntityEmptyState
            variant="moved"
            query={normalizedQuery}
            onRetry={retrySearch}
          />
        ) : hasResults ? (
          <EntitySearchResults
            hits={hits}
            listboxId={LISTBOX_ID}
            activeIndex={activeIndex}
            isFetching={search.isFetching}
            isPlaceholderData={isPlaceholder}
            getOptionId={getOptionId}
            setRowRef={setRowRef}
            setActionRef={setActionRef}
          />
        ) : (
          <EntityEmptyState
            // "No results" is a claim about the world. When the engine could not
            // be reached, or the company part is not current, or more candidates
            // follow, we did not finish looking, so we must not make it (D5).
            variant={emptyVariant(answer)}
            query={normalizedQuery}
            incompleteReason={incompleteReasonOf(answer, search.hasNextPage)}
            onClearFilters={clearFilters}
            onRetry={retrySearch}
          />
        )}

        {/* The next page is the server's own offset: a page that shows nothing can still have one. */}
        {answer && !answer.moved && !isPlaceholder && search.hasNextPage ? (
          <EntityLoadMore
            isLoading={search.isFetchingNextPage}
            disabled={!search.hasNextPage}
            onClick={() => {
              void search.fetchNextPage()
            }}
          />
        ) : null}
      </section>
    </main>
  )
}
