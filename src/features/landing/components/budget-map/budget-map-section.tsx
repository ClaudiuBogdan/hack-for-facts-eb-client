import { lazy, Suspense, useEffect } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useInView } from 'react-intersection-observer'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { ErrorBoundary } from '@/components/errors/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { quietImport, reloadForFreshCode } from '@/lib/chunk-recovery'
import { isUpdateAvailableError } from '@/lib/errors-utils'
import { prefetchBudgetMap } from '../../hooks/use-budget-map-data'
import { BUDGET_YEAR, measureById, measureFromSearch, searchForMeasure, type MeasureId } from '../../lib/budget-map-measures'
import { MapLegend } from './map-legend'
import { MapPicker } from './map-picker'

/**
 * The landing's map band: every primărie's budget on a map.
 *
 * Light on purpose: no MapLibre code. The title and the picker are rendered
 * here, on the server too; the map itself (`budget-map.tsx`) is loaded
 * separately.
 *
 * - When the reader scrolls to within about three screens of the band,
 *   everything the map needs is fetched (`prefetchBudgetMap`): its code, the
 *   shapes, the label points and the figures — so it is ready by the time they
 *   reach it. Never during the page's own load: the ~0.8 MB and their parsing
 *   cost a phone ~170 ms of blocking time (Lighthouse, 17 November 2026).
 * - The map — the WebGL context, the tiling — is created only when the band
 *   comes within about a screen of the view.
 *
 * Until then the band holds the map's place at its aspect ratio, so nothing
 * below it moves when it arrives.
 */

const loadMap = () => quietImport(() => import('./budget-map'))
const BudgetMap = lazy(loadMap)

/**
 * The map's place and the legend's, so nothing below moves when they arrive.
 * The legend's place is the legend itself, unseen and without figures: the
 * same words wrap the same way at every width and in both languages, which a
 * measured height could not promise.
 */
function MapPlace({ measureId }: { readonly measureId: MeasureId }) {
  return (
    <div className="w-full">
      <RuledFrame className="px-px sm:px-px">
        <div className="mx-auto w-full bg-muted/30" style={{ maxWidth: 'calc(82vh * 1.4150)', aspectRatio: '1.415' }} />
      </RuledFrame>
      <RuledFrame className="pt-4 pb-14">
        <div className="invisible" aria-hidden="true">
          {/* No scale, so no value is printed and the locale is never read. */}
          <MapLegend measure={measureById(measureId)} scale={null} active={null} coverage={null} outsideMap={1} locale="ro" />
        </div>
      </RuledFrame>
    </div>
  )
}

/**
 * The map's code did not load, or the map threw while starting. Only the
 * first is mended by a reload — the code that failed stays failed in this
 * document — so only it offers one; a browser that cannot draw the map would
 * fail the same way again.
 */
function MapFailed({ error }: { readonly error: Error }) {
  const chunk = isUpdateAvailableError(error)
  return (
    <RuledFrame className="pb-14">
      <div className="flex flex-wrap items-center gap-3 rounded-md border px-4 py-3 text-sm text-muted-foreground">
        {chunk ? t`Harta nu s-a putut încărca.` : t`Harta nu poate fi afișată în acest browser.`}
        {chunk ? (
          <Button size="sm" variant="outline" onClick={() => void reloadForFreshCode()}>
            {t`Încearcă din nou`}
          </Button>
        ) : null}
      </div>
    </RuledFrame>
  )
}

export function BudgetMapSection() {
  const queryClient = useQueryClient()
  // Three screens ahead the files start; one screen ahead the map is built.
  const { ref: approachRef, inView: approaching } = useInView({ rootMargin: '2400px 0px', triggerOnce: true })
  useEffect(() => (approaching ? prefetchBudgetMap(queryClient, loadMap) : undefined), [approaching, queryClient])
  const { ref: nearRef, inView: near } = useInView({ rootMargin: '800px 0px', triggerOnce: true })
  const ref = (node: HTMLElement | null) => {
    approachRef(node)
    nearRef(node)
  }
  // The picked map lives in the address (`?harta=`), so a link reopens it.
  const search = useSearch({ strict: false }) as { readonly harta?: string }
  const measureId: MeasureId = measureFromSearch(search.harta) ?? 'balance'
  const navigate = useNavigate()
  const setMeasureId = (id: MeasureId) =>
    void navigate({ to: '.', search: (previous: Record<string, unknown>) => ({ ...previous, harta: searchForMeasure(id) }), replace: true, resetScroll: false })
  const year = BUDGET_YEAR

  return (
    <section ref={ref} className="border-b" aria-labelledby="budget-map-title" data-budget-map>
      <RuledFrame className="pt-14 pb-6 sm:pt-20">
        {/* The control on the title's centre line from `sm`; on a phone, under it at full width. */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <h2 id="budget-map-title" data-reveal className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            <Trans>Bugetul fiecărei primării în {year}</Trans>
          </h2>
          <MapPicker value={measureId} onChange={setMeasureId} />
        </div>
      </RuledFrame>
      {near ? (
        <ErrorBoundary fallback={MapFailed}>
          <Suspense fallback={<MapPlace measureId={measureId} />}>
            <BudgetMap measureId={measureId} />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <MapPlace measureId={measureId} />
      )}
    </section>
  )
}
