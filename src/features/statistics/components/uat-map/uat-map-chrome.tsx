import { useMemo } from 'react'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { HubLoadError, HubPending, HubSectionHead } from '../hub/hub-chrome'
import type { MapView } from './uat-map-address'
import { seriesMeta } from './uat-map-series'

/**
 * The band's head, and its body's two states before the map. The head —
 * with the series, which live in the address — is the same from the
 * server's render on: it does not wait for the map, and a series chosen
 * while the map loads is the one it opens on.
 */

export function UatMapHead({ view }: { readonly view: MapView }) {
  const { _ } = useLingui()
  const metas = useMemo(() => seriesMeta(_), [_])
  return (
    <HubSectionHead
      titleId="uat-map-title"
      index={t`03 / Pe localități`}
      title={t`Unde se situează localitatea ta`}
      aside={
        <IndicatorToggle
          label={t`Indicatorul de pe harta localităților`}
          options={metas.map((entry) => ({ key: entry.id, label: entry.short }))}
          value={view.series}
          onChange={view.showSeries}
          // Six series on a phone: two rows of three.
          className="grid-flow-row grid-cols-3"
        />
      }
    />
  )
}

/** The map's place at its own proportions, with its controls', legend's, list's and finder's, roughly: little moves when it arrives. */
export function UatMapPending() {
  return (
    <div className="mt-8" aria-hidden="true">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="mb-4 h-9" />
          <div className="aspect-[4000/2827] w-full animate-pulse rounded-sm bg-muted/60" />
          <div className="mt-6 h-32 max-sm:h-52" />
        </div>
        <HubPending rows={10} className="lg:col-span-4" />
      </div>
      <div className="mt-10 h-36 border-t max-sm:h-72" />
    </div>
  )
}

export function UatMapFailed({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div className="mt-8">
      <HubLoadError onRetry={onRetry} />
    </div>
  )
}
