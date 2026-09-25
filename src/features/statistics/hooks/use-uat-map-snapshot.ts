import { queryOptions, useQuery } from '@tanstack/react-query'
import { quietImport } from '@/lib/chunk-recovery'
import type { UatMapGeometry, UatMapSeries, UatMapValues } from '../lib/uat-map-snapshot'
import { statisticsKeys } from './query-config'

/** The snapshot as the map reads it: its shapes and its six series, checked for alignment. */
export interface UatMapSnapshot {
  readonly geometry: UatMapGeometry
  readonly series: readonly UatMapSeries[]
  /** The day the figures were read. */
  readonly generatedAt: string
}

async function loadSnapshot(): Promise<UatMapSnapshot> {
  const [geometry, values] = await Promise.all([
    quietImport(() => import('../data/uat-map-geometry.json')).then((module) => module.default as unknown as UatMapGeometry),
    quietImport(() => import('../data/uat-map-values.json')).then((module) => module.default as unknown as UatMapValues),
  ])
  if (geometry.siruta.length !== values.siruta.length || geometry.siruta.some((siruta, i) => values.siruta[i] !== siruta)) {
    throw new Error('The UAT map figures are not aligned with its shapes: regenerate both with `yarn ins:uat-map`.')
  }
  return { geometry, series: values.series, generatedAt: values.generatedAt }
}

/**
 * Two hashed chunks, ~230 KB gzipped between them, fetched in the browser
 * only, once the map comes near — never part of the page's render, and a
 * failure is the band's to show (`quietImport`), never a reload. They change
 * only with a new snapshot, so they are read once per visit.
 */
export const uatMapSnapshotQueryOptions = () =>
  queryOptions({
    queryKey: statisticsKeys.uatMapSnapshot(),
    queryFn: loadSnapshot,
    staleTime: Infinity,
    gcTime: Infinity,
  })

export function useUatMapSnapshot() {
  return useQuery(uatMapSnapshotQueryOptions())
}
