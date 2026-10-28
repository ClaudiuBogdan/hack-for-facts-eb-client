import { queryOptions, useQuery } from '@tanstack/react-query'
import { quietImport, reloadForFreshCode } from '@/lib/chunk-recovery'
import { readCountyShapesFile, type CountyShapes } from '../lib/county-shapes'
import { statisticsKeys } from './query-config'

async function loadCountyShapes(): Promise<CountyShapes> {
  const file = await quietImport(() => import('../data/county-shapes.json'))
  return readCountyShapesFile(file.default)
}

/**
 * The county maps' shapes: one hashed chunk (≈27 KB brotli), already
 * projected and labelled (`lib/county-shapes`), fetched in the browser only
 * and only when a map asks — never part of a page's first load, and a
 * failure is the map's to show (`quietImport`), never a reload. They change
 * only with a new boundary file, so they are read once per visit.
 */
export const countyShapesQueryOptions = () =>
  queryOptions({
    queryKey: statisticsKeys.countyShapes(),
    queryFn: loadCountyShapes,
    staleTime: Infinity,
    gcTime: Infinity,
  })

/**
 * The shapes, once `enabled`: a map passes whether it is near the screen, so
 * a band far down the page costs nothing until the reader comes towards it.
 * Shapes already read (another map, an earlier page) come back at once.
 */
export function useCountyShapes({ enabled }: { readonly enabled: boolean }) {
  return useQuery({ ...countyShapesQueryOptions(), enabled })
}

/**
 * The map's „try again": the browser keeps a chunk that failed for the rest of
 * the document, so asking again means a fresh one (`reloadForFreshCode`), as
 * the UAT map does; offline, where a reload would show the browser's error
 * page, the read is asked again in place.
 */
export function retryCountyShapes(refetch: () => Promise<unknown>) {
  if (!reloadForFreshCode()) void refetch()
}
