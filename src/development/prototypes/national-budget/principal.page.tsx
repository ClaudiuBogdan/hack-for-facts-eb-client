import { Suspense, useEffect, useRef } from 'react'
import { t } from '@lingui/core/macro'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, stopCounting } from '@/features/landing/components/count-up'
import { HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { useYear, usePageSearch } from './principal.data'
import { FiguresBand, HEAD_VARIANTS, PageHead } from './principal.head'
import { BANDS } from './principal.bands'
import { Band, PageBar, VariantRibbon, useVariant } from './principal.shell'
import { StartBand } from './principal.start'

/**
 * The national budget's citizens' page (the front door the analysis page
 * opens from). One year at a time, chosen in the head and in the pinned bar;
 * one band per question a reader asks of a budget. Each band is drawn in a
 * few designs here, switched by the amber ribbon over it, so the owner can
 * pick one per band: `?v=pagina&venituri=treemap`.
 */

function Page() {
  const { view, views, setYear } = useYear()
  const head = useVariant(HEAD_VARIANTS)
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => () => stopCounting(), [])
  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />
      <VariantRibbon band={HEAD_VARIANTS} current={head} />
      <PageHead variant={head.key} view={view} views={views} onYear={setYear} />
      <PageBar title={t`Bugetul național`} bands={BANDS} view={view} views={views} onYear={setYear} />
      <FiguresBand view={view} />
      {BANDS.map((band, position) => (
        <Band key={band.id} band={band} view={view} position={position + 1} />
      ))}
      <StartBand view={view} index={`${String(BANDS.length + 1).padStart(2, '0')} / ${t`Analize`}`} />
    </div>
  )
}

export function CitizensPageVariant() {
  return (
    <Suspense fallback={<RuledFrame className="py-20"><HubPending rows={10} /></RuledFrame>}>
      <Page />
    </Suspense>
  )
}

/** Every design of every band, one after another, each named: to compare them at once. */
function Gallery() {
  const { view } = useYear()
  const { search } = usePageSearch()
  const only = typeof search.banda === 'string' ? search.banda : null
  return (
    <div className="relative w-full overflow-x-clip bg-background">
      {BANDS.filter((band) => only === null || band.id === only).map((band) =>
        band.variants.map((variant, position) => (
          <div key={`${band.id}-${variant.key}`}>
            <div className="border-b border-dashed border-amber-500/60 bg-amber-50/70 dark:bg-amber-950/20">
              <RuledFrame className="py-2">
                <MonoLabel className="text-amber-800 dark:text-amber-300">
                  {band.nav} · {String.fromCharCode(65 + position)} · {variant.title}
                </MonoLabel>
                <span className="mt-1 block text-xs text-amber-900/80 dark:text-amber-200/80">{variant.note}</span>
              </RuledFrame>
            </div>
            <Band band={band} view={view} position={BANDS.indexOf(band) + 1} variant={variant} />
          </div>
        )),
      )}
    </div>
  )
}

export function CitizensGalleryVariant() {
  return (
    <Suspense fallback={<RuledFrame className="py-20"><HubPending rows={10} /></RuledFrame>}>
      <Gallery />
    </Suspense>
  )
}
