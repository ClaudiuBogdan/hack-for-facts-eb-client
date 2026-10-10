import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import type { DecimalLocale } from '@/lib/exact-decimal'
import type { CompanyAnalysisBucket } from '@/schemas/company-analytics'
import { basisGroupLabel } from '../../lib/company-analytics-text'
import type { CompanyAnalyticsUrlSearch } from '../../lib/company-analytics-url'
import { hubShare, hubValueText, outsideLabel, type HubCountyMapLayer } from '../../lib/company-hub-analytics'
import { CompanyCountyMap } from './company-county-map'
import { CompanyCountyRank } from './company-county-rank'

/**
 * The map beside the ranking, sharing the county under the pointer, and the
 * year's companies that are on neither: those whose entries in the analysis's
 * ONRC edition name no common county, each group by why. A county opens the
 * analysis's list of the companies the map counted there (`drill`). The
 * shared highlight lives here, not in the page, so pointing at a county
 * re-renders these two and nothing else.
 */
export function HubCountyBand({
  layer,
  legend,
  locale,
  drill,
}: {
  readonly layer: HubCountyMapLayer
  readonly legend: string
  readonly locale: DecimalLocale
  readonly drill: (bucket: CompanyAnalysisBucket) => CompanyAnalyticsUrlSearch | null
}) {
  const [activeCounty, setActiveCounty] = useState<string | undefined>(undefined)
  return (
    <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      {/* The map stays in view beside the full list of 42 where the window is tall enough to hold all of it, legend included. */}
      <div className="lg:top-6 lg:col-span-7 lg:self-start lg:[@media(min-height:42rem)]:sticky" data-reveal>
        {/* A new layer is a new map (a tapped county does not carry over); the revealed wrapper stays. */}
        <CompanyCountyMap key={legend} layer={layer} legend={legend} locale={locale} drill={drill} activeCode={activeCounty} onActiveChange={setActiveCounty} />
      </div>
      <div className="lg:col-span-5 lg:col-start-8" data-reveal>
        <CompanyCountyRank layer={layer} locale={locale} drill={drill} activeCode={activeCounty} onActiveChange={setActiveCounty} />
        {layer.outside.length > 0 ? (
          <div className="mt-6" data-testid="company-hub-county-outside">
            <MonoLabel className="block leading-relaxed text-muted-foreground">{t`Nu sunt pe hartă: firmele fără un județ comun în ediția ONRC a analizei`}</MonoLabel>
            <ul className="mt-2 divide-y divide-border/70 border-y border-border/70">
              {layer.outside.map(({ bucket, value }, index) => {
                const figure = value === null ? null : hubValueText(value, layer.measure, locale)
                const share = hubShare(value, layer.shareWhole, locale)
                return (
                  <li key={bucket.key ?? `${bucket.kind}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto_3.5rem] items-baseline gap-x-4 py-2.5 text-sm">
                    <span className="pl-1 text-muted-foreground">{bucket.basis ? basisGroupLabel('COUNTY', bucket.basis) : outsideLabel(bucket)}</span>
                    <span className="tabular-nums text-foreground">{figure ? `${figure.value} ${figure.unit}` : '—'}</span>
                    <span className="pr-1 text-right tabular-nums text-muted-foreground">{share ?? ''}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
