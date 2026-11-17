import { useQuery, type QueryClient } from '@tanstack/react-query'
import { COUNTY_SHAPES_URL, LABEL_POINTS_URL, UAT_SHAPES_URL, fetchBudgetFigures, fetchStaticJson, type LabelPoints, type ShapeCollection } from '../api/budget-map'
import { BUDGET_YEAR } from '../lib/budget-map-measures'

/**
 * The budget map's reads as queries — so the background prefetch and the map
 * share one cache entry each — and the prefetch itself.
 */

/**
 * The files are immutable and HTTP-cached: never stale while held, but let go
 * like any query once the landing is left (a refetch is a disk hit, and the
 * UAT shapes are ~2 MB parsed). The figures are held longer, so a reader who
 * takes a while to scroll down still finds the prefetched ones.
 */
const fileQuery = <T,>(url: string) => ({
  queryKey: ['landing', 'budget-map', 'file', url] as const,
  queryFn: () => fetchStaticJson<T>(url),
  staleTime: Infinity,
})

const figuresQuery = (year: string) => ({
  queryKey: ['landing', 'budget-map', 'figures', year] as const,
  queryFn: () => fetchBudgetFigures(year),
  staleTime: 60 * 60 * 1000,
  gcTime: 60 * 60 * 1000,
})

export function useBudgetMapData() {
  const uats = useQuery(fileQuery<ShapeCollection>(UAT_SHAPES_URL))
  const counties = useQuery(fileQuery<ShapeCollection>(COUNTY_SHAPES_URL))
  const labels = useQuery(fileQuery<LabelPoints>(LABEL_POINTS_URL))
  const figures = useQuery(figuresQuery(BUDGET_YEAR))
  const queries = [uats, counties, labels, figures]
  return {
    uats: uats.data,
    counties: counties.data,
    labels: labels.data,
    figures: figures.data?.byUat,
    outsideMap: figures.data?.outsideMap ?? 0,
    failed: queries.some((query) => query.isError),
    /** Asks again for whatever failed. */
    retry: () => {
      for (const query of queries) if (query.isError) void query.refetch()
    },
  }
}

/** Whether the reader asked to save data, or is on a connection where a megabyte is a real cost. */
function constrainedConnection(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  return Boolean(connection?.saveData) || /(^|-)2g$/.test(connection?.effectiveType ?? '')
}

let prefetched = false

/**
 * Everything the map needs, fetched once the reader is heading for it (the
 * section calls this a few screens ahead) and the browser is idle after the
 * page has loaded — so the map is ready by the time they reach it, without
 * competing with the page. The renderer's code comes too, as the largest piece.
 * The map itself is still created only near the view. Skipped on Save-Data and
 * 2G. Returns the cancel for an unmount before it ran.
 */
export function prefetchBudgetMap(queryClient: QueryClient, loadRenderer: () => Promise<unknown>): () => void {
  if (prefetched || typeof window === 'undefined' || constrainedConnection()) return () => {}
  const run = () => {
    prefetched = true
    void loadRenderer().catch(() => undefined)
    void queryClient.prefetchQuery(fileQuery(UAT_SHAPES_URL))
    void queryClient.prefetchQuery(fileQuery(COUNTY_SHAPES_URL))
    void queryClient.prefetchQuery(fileQuery(LABEL_POINTS_URL))
    void queryClient.prefetchQuery(figuresQuery(BUDGET_YEAR))
  }
  const whenIdle = () => {
    if (typeof requestIdleCallback === 'function') {
      const handle = requestIdleCallback(run, { timeout: 4000 })
      return () => cancelIdleCallback(handle)
    }
    const handle = setTimeout(run, 1500)
    return () => clearTimeout(handle)
  }
  if (document.readyState === 'complete') return whenIdle()
  let cancel = () => {}
  const onLoad = () => {
    cancel = whenIdle()
  }
  window.addEventListener('load', onLoad, { once: true })
  return () => {
    window.removeEventListener('load', onLoad)
    cancel()
  }
}
