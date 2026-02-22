import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback } from 'react'
import { z } from 'zod'
import { AnalyticsFilterSchema, AnalyticsFilterType, createDefaultExecutionYearReportPeriod } from '@/schemas/charts'
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES, DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES } from '@/lib/analytics-defaults'
import { withDefaultExcludes } from '@/lib/filterUtils'
import { Analytics } from '@/lib/analytics'
import { generateHash } from '@/lib/utils'
import { parseSearchParamJson } from '@/lib/router-search'

const viewEnum = z.enum(['table', 'chart', 'line-items'])

export const defaultEntityAnalyticsFilter: AnalyticsFilterType = withDefaultExcludes({
  account_category: 'ch',
  report_period: createDefaultExecutionYearReportPeriod(),
  normalization: 'total',
  report_type: 'Executie bugetara agregata la nivel de ordonator principal',
  exclude: {
    economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
    functional_prefixes: [...DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES],
  },
})

const filterSchema = z.preprocess(parseSearchParamJson, AnalyticsFilterSchema)

const searchSchema = z.object({
  view: viewEnum.default('table'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(25),
  filter: filterSchema.default(defaultEntityAnalyticsFilter as AnalyticsFilterType),
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
        return { ...prev, filter: merged }
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
      search: (prev) => ({ ...prev, filter: defaultEntityAnalyticsFilter }),
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
