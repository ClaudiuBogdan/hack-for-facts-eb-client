import { useNavigate, useSearch } from '@tanstack/react-router'
import { createContext, use, useCallback } from 'react'
import { z } from 'zod'
import type { AnalyticsFilterType } from '@/schemas/charts'
import { Analytics } from '@/lib/analytics'
import { generateHash } from '@/lib/utils'
import { defaultEntityAnalyticsFilter, entityAnalyticsFilterSchema } from '@/lib/entity-analytics-query'

const viewEnum = z.enum(['table', 'chart', 'line-items'])

export { defaultEntityAnalyticsFilter } from '@/lib/entity-analytics-query'

const searchSchema = z.object({
  view: viewEnum.default('table'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(25),
  filter: entityAnalyticsFilterSchema.default(defaultEntityAnalyticsFilter as AnalyticsFilterType),
  treemapPrimary: z.enum(['fn', 'ec']).optional(),
  treemapDepth: z.enum(['chapter', 'subchapter', 'paragraph']).optional(),
  treemapPath: z.string().optional(),
  transferFilter: z.enum(['all', 'no-transfers', 'transfers-only']).optional().default('all'),
})

export type EntityAnalyticsSearch = z.infer<typeof searchSchema>

type SearchRecord = Record<string, unknown>

/**
 * Where the page's state is read and written when it is not the
 * `/entity-analytics` route's own search: a surface that hosts the page's
 * parts on another address (the design harness) provides its own.
 */
export type EntityAnalyticsAddress = {
  readonly search: SearchRecord
  readonly change: (update: (prev: SearchRecord) => SearchRecord) => void
}

export const EntityAnalyticsAddressContext = createContext<EntityAnalyticsAddress | null>(null)

export function useEntityAnalyticsFilter() {
  const hosted = use(EntityAnalyticsAddressContext)
  const routeNavigate = useNavigate({ from: '/entity-analytics' })
  const routeSearch = useSearch({ from: '/entity-analytics', shouldThrow: false })
  const search = searchSchema.parse(hosted ? hosted.search : (routeSearch ?? {}))
  const hostedChange = hosted?.change

  const change = useCallback((update: (prev: SearchRecord) => SearchRecord) => {
    if (hostedChange) {
      hostedChange(update)
      return
    }
    void routeNavigate({ search: (prev) => update(prev as SearchRecord) as never, replace: true, resetScroll: false })
  }, [hostedChange, routeNavigate])

  const setFilter = (partial: Partial<AnalyticsFilterType>) => {
    change((prev) => {
      const prevFilter = (prev as unknown as EntityAnalyticsSearch).filter ?? defaultEntityAnalyticsFilter
      const merged = { ...prevFilter, ...partial }
      const filterHash = generateHash(JSON.stringify(merged))
      Analytics.capture(Analytics.EVENTS.EntityAnalyticsFilterChanged, {
        filter_hash: filterHash,
        ...Analytics.summarizeFilter(merged),
      })
      return { ...prev, filter: merged, page: 1 }
    })
  }

  const setView = (view: 'table' | 'chart' | 'line-items') => {
    Analytics.capture(Analytics.EVENTS.EntityAnalyticsViewChanged, { view })
    change((prev) => ({ ...prev, view }))
  }

  const setSorting = (by: string, order: 'asc' | 'desc') => {
    Analytics.capture(Analytics.EVENTS.EntityAnalyticsSortChanged, { by, order })
    change((prev) => ({ ...prev, sortBy: by, sortOrder: order }))
  }

  const setPagination = (page: number, pageSize?: number) => {
    Analytics.capture(Analytics.EVENTS.EntityAnalyticsPaginationChanged, { page, pageSize: pageSize ?? search.pageSize })
    change((prev) => ({ ...prev, page, pageSize: pageSize ?? (prev as unknown as EntityAnalyticsSearch).pageSize }))
  }

  /** A whole new selection (a ready question): the list goes back to its own order and its first page. */
  const replaceFilter = (filter: AnalyticsFilterType) => {
    Analytics.capture(Analytics.EVENTS.EntityAnalyticsFilterChanged, {
      filter_hash: generateHash(JSON.stringify(filter)),
      ...Analytics.summarizeFilter(filter),
    })
    change((prev) => ({ ...prev, filter, sortBy: undefined, sortOrder: undefined, transferFilter: undefined, treemapPath: undefined, page: 1 }))
  }

  const resetFilter = () => {
    Analytics.capture(Analytics.EVENTS.EntityAnalyticsFilterReset)
    change((prev) => ({ ...prev, filter: defaultEntityAnalyticsFilter, transferFilter: 'all', page: 1 }))
  }

  const setTreemapPrimary = useCallback((primary: 'fn' | 'ec') => {
    change((prev) => ({ ...prev, treemapPrimary: primary, treemapPath: undefined }))
  }, [change])

  const setTreemapDepth = useCallback((depth: 'chapter' | 'subchapter' | 'paragraph') => {
    change((prev) => ({ ...prev, treemapDepth: depth }))
  }, [change])

  const setTreemapPath = useCallback((path?: string) => {
    change((prev) => ({ ...prev, treemapPath: path }))
  }, [change])

  const setTransferFilter = useCallback((filter: 'all' | 'no-transfers' | 'transfers-only') => {
    change((prev) => ({ ...prev, transferFilter: filter }))
  }, [change])

  return {
    search,
    filter: search.filter,
    setFilter,
    replaceFilter,
    view: search.view,
    setView,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
    setSorting,
    page: search.page,
    pageSize: search.pageSize,
    setPagination,
    resetFilter,
    treemapPrimary: search.treemapPrimary,
    treemapDepth: search.treemapDepth,
    setTreemapPrimary,
    setTreemapDepth,
    treemapPath: search.treemapPath,
    setTreemapPath,
    transferFilter: search.transferFilter,
    setTransferFilter,
  }
}
