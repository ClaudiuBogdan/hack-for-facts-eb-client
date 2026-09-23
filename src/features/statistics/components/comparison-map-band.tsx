import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { StatisticsHubCountyLayer } from '@/schemas/statistics'
import { cn } from '@/lib/utils'
import { formatHubPeriod } from '../lib/hub-format'
import { statisticsTheme } from '../lib/statistics-theme'
import { HubLoadError, HubPending } from './hub/hub-chrome'
import { HubCountyMap, type CountyMapSelection } from './hub/hub-county-map'

/**
 * The compared indicator over every county at the window's end: where the
 * compared counties sit among the 42, and the way to add one — a click on
 * the map puts a county in the comparison or takes it out. The heading and
 * the legend name the period the map shows: while another loads, the map
 * keeps the one it has, dimmed, under its own period.
 */
export function ComparisonMapBand({
  layer,
  label,
  selection,
  loading,
  stale,
  failed,
  onRetry,
  className,
}: {
  readonly layer: StatisticsHubCountyLayer | undefined
  /** The indicator, for the legend. */
  readonly label: string
  readonly selection: CountyMapSelection
  readonly loading: boolean
  /** True while `layer` is another period's, kept until this one loads. */
  readonly stale: boolean
  readonly failed: boolean
  readonly onRetry: () => void
  readonly className?: string
}) {
  const [activeCode, setActiveCode] = useState<string>()
  const period = layer?.period ? formatHubPeriod(layer.period) : null
  return (
    <section aria-labelledby="comparison-map-title" aria-busy={stale || loading} className={cn(statisticsTheme.band, className)}>
      <div className={statisticsTheme.bandHeader}>
        <h2 id="comparison-map-title" className={statisticsTheme.sectionLabel}>
          {period ? <Trans>Județele în {period}</Trans> : <Trans>Județele</Trans>}
        </h2>
        <p className="text-xs text-muted-foreground">
          <Trans>Apasă un județ ca să-l adaugi în comparație sau să-l scoți.</Trans>
        </p>
      </div>
      <div className={cn(statisticsTheme.bandBody, 'transition-opacity', stale && 'opacity-60')}>
        {layer ? (
          <HubCountyMap
            layer={layer}
            legend={period ? t`${label}, ${period}` : label}
            selection={selection}
            activeCode={activeCode}
            onActiveChange={setActiveCode}
            className="mx-auto max-w-2xl"
          />
        ) : failed ? (
          <HubLoadError onRetry={onRetry} />
        ) : loading ? (
          <HubPending rows={8} />
        ) : null}
      </div>
    </section>
  )
}
