import { useQuery } from '@tanstack/react-query'
import type { ShapeCollection } from '@/features/landing/api/budget-map'
import { budgetFiguresQuery, useBudgetMapShapes } from '@/features/landing/hooks/use-budget-map-data'
import type { BudgetFigures } from '@/features/landing/lib/budget-map-measures'
import type { LabelPoints } from '@/features/landing/lib/budget-map-style'
import type { Basis, Level } from '../lib/map-page-measures'

/**
 * What the map page reads: the landing map's shapes and label points (the same
 * files and cache entries) and one year's figures on the picked count and
 * level. The map and the table share it.
 */

export interface MapPageData {
  readonly uats: ShapeCollection | undefined
  readonly counties: ShapeCollection | undefined
  readonly labels: LabelPoints | undefined
  /**
   * By SIRUTA code, or by county code on the county level. Undefined while this
   * year's figures load: nothing from another year, count or level stands in.
   */
  readonly figures: ReadonlyMap<string, BudgetFigures> | undefined
  /** Budgets with figures but no shape (the capital's own budget, drawn as its sectors). */
  readonly outsideMap: number
  /** Something the map reads failed: the shapes, the label points or the figures. */
  readonly failed: boolean
  /** Something the table reads failed: the figures, or the shapes of the picked level (it needs no label points). */
  readonly tableFailed: boolean
  /** Asks again for whatever failed. */
  readonly retry: () => void
  /** Asks again for what the table reads, if it failed: not the map's other files (the UAT shapes are ~2 MB). */
  readonly retryTable: () => void
}

export function useMapPageData(year: string, basis: Basis, level: Level): MapPageData {
  const { uats, counties, labels } = useBudgetMapShapes()
  const figures = useQuery(budgetFiguresQuery(year, { normalization: basis, granularity: level === 'county' ? 'County' : 'UAT' }))
  const queries = [uats, counties, labels, figures]
  const tableQueries = [figures, level === 'county' ? counties : uats]
  return {
    uats: uats.data,
    counties: counties.data,
    labels: labels.data,
    figures: figures.data?.byUat,
    outsideMap: figures.data?.outsideMap ?? 0,
    failed: queries.some((query) => query.isError),
    tableFailed: tableQueries.some((query) => query.isError),
    retry: () => {
      for (const query of queries) if (query.isError) void query.refetch()
    },
    retryTable: () => {
      for (const query of tableQueries) if (query.isError) void query.refetch()
    },
  }
}
