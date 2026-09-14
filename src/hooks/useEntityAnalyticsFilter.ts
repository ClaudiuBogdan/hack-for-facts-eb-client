import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback } from 'react'
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
  transferFilter: z.enum(['all', 'no-transfers', 'transfers-only']).optional().default('no-transfers'),
})

export type EntityAnalyticsSearch = z.infer<typeof searchSchema>

export function useEntityAnalyticsFilter() {
  const navigate = useNavigate({ from: '/entity-analytics' })
  const raw = useSearch({ from: '/entity-analytics' })
  const search = searchSchema.parse(raw)

  const setFilter = (partial: Partial<AnalyticsFilterType>) => {
    navigate({
      search: (prev) => {
        const prevFilter = (prev as unknown as EntityAnalyticsSearch).filter ?? defaultEntityAnalyticsFilter
        const merged = { ...prevFilter, ...partial }
        const filterHash = generateHash(JSON.stringify(merged))
        Analytics.capture(Analytics.EVENTS.EntityAnalyticsFilterChanged, {
          filter_hash: filterHash,
          ...Analytics.summarizeFilter(merged),
        })
        return { ...prev, filter: merged, page: 1 }
      },
      replace: true,
      resetScroll: false,
    })
  }

  const setView = (view: 'table' | 'chart' | 'line-items') => {
    Analytics.capture(Analytics.EVENTS.EntityAnalyticsViewChanged, { view })
    navigate({ search: (prev) => ({ ...prev, view }), replace: true, resetScroll: false })
  }

  const setSorting = (by: string, order: 'asc' | 'desc') => {
    Analytics.capture(Analytics.EVENTS.EntityAnalyticsSortChanged, { by, order })
    navigate({ search: (prev) => ({ ...prev, sortBy: by, sortOrder: order }), replace: true, resetScroll: false })
  }

  const setPagination = (page: number, pageSize?: number) => {
    Analytics.capture(Analytics.EVENTS.EntityAnalyticsPaginationChanged, { page, pageSize: pageSize ?? (search as EntityAnalyticsSearch).pageSize })
    navigate({
      search: (prev) => ({ ...prev, page, pageSize: pageSize ?? (prev as unknown as EntityAnalyticsSearch).pageSize }),
      replace: true,
      resetScroll: false,
    })
  }

  const resetFilter = () => {
    Analytics.capture(Analytics.EVENTS.EntityAnalyticsFilterReset)
    navigate({
      search: (prev) => ({ ...prev, filter: defaultEntityAnalyticsFilter, page: 1 }),
      replace: true,
      resetScroll: false,
    })
  }

  const setTreemapPrimary = useCallback((primary: 'fn' | 'ec') => {
    navigate({
      search: (prev) => ({ ...prev, treemapPrimary: primary, treemapPath: undefined }),
      replace: true,
      resetScroll: false,
    })
  }, [navigate])

  const setTreemapDepth = useCallback((depth: 'chapter' | 'subchapter' | 'paragraph') => {
    navigate({ search: (prev) => ({ ...prev, treemapDepth: depth }), replace: true, resetScroll: false })
  }, [navigate])

  const setTreemapPath = useCallback((path?: string) => {
    navigate({ search: (prev) => ({ ...prev, treemapPath: path }), replace: true, resetScroll: false })
  }, [navigate])

  const setTransferFilter = useCallback((filter: 'all' | 'no-transfers' | 'transfers-only') => {
    navigate({ search: (prev) => ({ ...prev, transferFilter: filter }), replace: true, resetScroll: false })
  }, [navigate])

  return {
    search,
    filter: search.filter,
    setFilter,
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
