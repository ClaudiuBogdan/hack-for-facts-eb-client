import { useQuery, type QueryClient } from '@tanstack/react-query'
import type { FeatureCollection, Geometry } from 'geojson'
import { budgetFiguresQuery } from './budget-map.data'
import type { LabelPoints } from './budget-map.maplibre-style'

/**
 * What the MapLibre map loads, as queries — so a background prefetch and the
 * map share one cache entry each — and the prefetch itself.
 *
 * Files are dated and served immutable and compressed (`nitro.config.ts`).
 */

export const UAT_URL = '/geojson/uat-2026-10-28.json'
export const COUNTY_URL = '/geojson/judete-2026-10-28.json'
export const LABEL_POINTS_URL = '/geojson/label-points-2026-10-28.json'

type Props = Record<string, unknown>

/** A file at low fetch priority: the map never competes with what the page shows first. */
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { priority: 'low' } as RequestInit)
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return (await response.json()) as T
}

const fileQuery = <T,>(url: string) => ({
  queryKey: ['landing-budget-map', 'file', url] as const,
  queryFn: () => fetchJson<T>(url),
  staleTime: Infinity,
  gcTime: Infinity,
})

export function useMapLibreResources() {
  const uats = useQuery(fileQuery<FeatureCollection<Geometry, Props>>(UAT_URL))
  const counties = useQuery(fileQuery<FeatureCollection<Geometry, Props>>(COUNTY_URL))
  const labels = useQuery(fileQuery<LabelPoints>(LABEL_POINTS_URL))
  const figures = useQuery(budgetFiguresQuery())
  const all = [uats, counties, labels, figures]
  return {
    uats: uats.data,
    counties: counties.data,
    labels: labels.data,
    figures: figures.data,
    failed: all.some((query) => query.isError),
  }
}

/** Whether the reader asked to save data, or is on a connection where 1 MB is a real cost. */
function constrainedConnection(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  return Boolean(connection?.saveData) || /(^|-)2g$/.test(connection?.effectiveType ?? '')
}

let prefetched = false

/**
 * Everything the map needs, fetched while the browser is idle after the page
 * has loaded — so the map is ready by the time the reader scrolls to it,
 * without competing with the page itself. The MapLibre module comes too: its
 * code is the largest piece. The map is still created only near the view (the
 * component), since WebGL setup is work the top of the page should not pay.
 * Skipped on Save-Data and 2G.
 */
export function prefetchBudgetMap(queryClient: QueryClient, loadRenderer: () => Promise<unknown>): () => void {
  if (prefetched || typeof window === 'undefined' || constrainedConnection()) return () => {}
  const run = () => {
    prefetched = true
    void loadRenderer().catch(() => undefined)
    void queryClient.prefetchQuery(fileQuery(UAT_URL))
    void queryClient.prefetchQuery(fileQuery(COUNTY_URL))
    void queryClient.prefetchQuery(fileQuery(LABEL_POINTS_URL))
    void queryClient.prefetchQuery(budgetFiguresQuery())
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
