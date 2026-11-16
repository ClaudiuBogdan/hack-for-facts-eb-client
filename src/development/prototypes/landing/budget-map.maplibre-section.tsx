import { lazy, Suspense, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { prefetchBudgetMap } from './budget-map.maplibre-resources'

/**
 * The landing's map section, as the page would mount it. Light on purpose: it
 * holds no MapLibre code.
 *
 * - After the page has loaded and the browser is idle, everything the map
 *   needs is fetched at low priority (`prefetchBudgetMap`): its code, the
 *   shapes, the label points and the figures.
 * - The map itself — the WebGL context, the tiling — is created only when the
 *   section comes within about a screen of the view.
 *
 * On the server and before either, the section holds its place at the map's
 * own aspect ratio, so nothing below it moves when it arrives.
 */

const loadMap = () => import('./budget-map.maplibre')
const MapLibreBudgetMap = lazy(loadMap)

function Placeholder() {
  return (
    <div className="w-full border-y bg-background py-8">
      <div className="mx-auto w-full bg-muted/40" style={{ maxWidth: 'calc(82vh * 1.4150)', aspectRatio: '1.415' }} />
    </div>
  )
}

export function BudgetMapSection() {
  const queryClient = useQueryClient()
  useEffect(() => prefetchBudgetMap(queryClient, loadMap), [queryClient])
  const { ref, inView } = useInView({ rootMargin: '800px 0px', triggerOnce: true })
  return (
    <div ref={ref}>
      {inView ? (
        <Suspense fallback={<Placeholder />}>
          <MapLibreBudgetMap />
        </Suspense>
      ) : (
        <Placeholder />
      )}
    </div>
  )
}
