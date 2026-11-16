import { lazy, Suspense, useEffect } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useInView } from 'react-intersection-observer'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { ErrorBoundary } from '@/components/errors/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { quietImport, reloadForFreshCode } from '@/lib/chunk-recovery'
import { isUpdateAvailableError } from '@/lib/errors-utils'
import { prefetchBudgetMap } from '../../hooks/use-budget-map-data'
import { BUDGET_YEAR, measureFromSearch, searchForMeasure, type MeasureId } from '../../lib/budget-map-measures'
import { MapPicker } from './map-picker'

/**
 * `04 / Harta` — the landing's last band: every primărie's budget on a map.
 *
 * Light on purpose: no MapLibre code. The title and the picker are rendered
 * here, on the server too; the map itself (`budget-map.tsx`) is loaded
 * separately.
 *
 * - After the page has loaded and the browser is idle, everything the map
 *   needs is fetched at low priority (`prefetchBudgetMap`): its code, the
 *   shapes, the label points and the figures — so it is ready by the time the
 *   reader scrolls to it, without competing with the page.
 * - The map — the WebGL context, the tiling — is created only when the band
 *   comes within about a screen of the view.
 *
 * Until then the band holds the map's place at its aspect ratio, so nothing
 * below it moves when it arrives.
 */

const loadMap = () => quietImport(() => import('./budget-map'))
const BudgetMap = lazy(loadMap)

/** The map's place and the legend's, so nothing below moves when they arrive. */
function MapPlace() {
  return (
    <div className="w-full">
      <div className="mx-auto w-full bg-muted/30" style={{ maxWidth: 'calc(82vh * 1.4150)', aspectRatio: '1.415' }} />
      <RuledFrame className="pt-4 pb-14">
        <div className="h-36 sm:h-28" />
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
  useEffect(() => prefetchBudgetMap(queryClient, loadMap), [queryClient])
  // About a screen ahead of the reader: everything is in by the time they arrive.
  const { ref, inView: near } = useInView({ rootMargin: '800px 0px', triggerOnce: true })
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <MonoLabel className="block text-primary" data-reveal>
              <Trans>04 / Harta</Trans>
            </MonoLabel>
            <h2 id="budget-map-title" data-reveal className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              <Trans>Bugetul fiecărei primării în {year}</Trans>
            </h2>
          </div>
          <MapPicker value={measureId} onChange={setMeasureId} />
        </div>
      </RuledFrame>
      {near ? (
        <ErrorBoundary fallback={MapFailed}>
          <Suspense fallback={<MapPlace />}>
            <BudgetMap measureId={measureId} />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <MapPlace />
      )}
    </section>
  )
}
