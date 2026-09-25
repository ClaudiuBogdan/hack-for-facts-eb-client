import { lazy, Suspense, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { ErrorBoundary } from '@/components/errors/ErrorBoundary'
import { quietImport, reloadForFreshCode } from '@/lib/chunk-recovery'
import { uatMapSnapshotQueryOptions } from '../../hooks/use-uat-map-snapshot'
import { useMapView } from './uat-map-address'
import { UatMapFailed, UatMapHead, UatMapPending } from './uat-map-chrome'

// Loaded for the reader, not by them: a failure is the band's to show, never a reload of the page.
const UatMapBand = lazy(() => quietImport(() => import('./uat-map-band')).then((module) => ({ default: module.UatMapBand })))

/**
 * The UAT map on `/ins`, loaded only as the reader comes near it: its code
 * and its ~230 KB of shapes and figures are none of the page's first load.
 * The two start together — the figures do not wait for the code that reads
 * them. Until then, and on the server, the band is its head and its place.
 */
export function UatMapSection() {
  // A screen ahead of the reader, either way: the ~230 KB are in by the time they arrive.
  const { ref, inView: near } = useInView({ triggerOnce: true, rootMargin: '100% 0px' })
  const queryClient = useQueryClient()
  const view = useMapView()
  useEffect(() => {
    if (near) void queryClient.prefetchQuery(uatMapSnapshotQueryOptions())
  }, [near, queryClient])

  return (
    <section ref={ref} className="border-b" aria-labelledby="uat-map-title">
      <RuledFrame className="py-14 sm:py-20">
        <UatMapHead view={view} />
        {near ? (
          // The code that failed to load stays failed in this document: a retry is a fresh one.
          <ErrorBoundary fallback={() => <UatMapFailed onRetry={() => void reloadForFreshCode()} />}>
            <Suspense fallback={<UatMapPending />}>
              <UatMapBand view={view} />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <UatMapPending />
        )}
      </RuledFrame>
    </section>
  )
}
