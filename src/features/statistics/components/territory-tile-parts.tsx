import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StatisticsIndicatorTile } from '@/schemas/statistics'
import { formatHubPeriod } from '../lib/hub-format'
import { isPeriodStale } from '../lib/period'
import { tileCompareSearch, tileStateNote, tileUnitName } from '../lib/territory-tiles'
import { formatTileValue, tileStatusLabel } from '../lib/territory-values'
import { InsProvenanceDrawer } from './ins-provenance-drawer'
import { RequestDatasetAction } from './request-dataset-action'

/** A 24px hit area around a 16px text link (WCAG 2.2 AA 2.5.8), as the back link does. */
const TEXT_LINK_CLASS =
  '-my-1 inline-flex items-center gap-1 rounded-sm px-1.5 py-1 text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

type ValueProps = {
  readonly tile: StatisticsIndicatorTile
  readonly activePeriod: string | null
  /** `row` sets the figure small and right-aligned; `tile` sets it large. */
  readonly size: 'row' | 'tile'
}

/**
 * A tile's figure: the value with its unit word, then the period and the
 * INS flag under it — or, when there is no figure, why. The value and the
 * unit are separated by a real space, so a screen reader says „163.582
 * persoane", not „163582persoane".
 */
export function TerritoryTileValue({ tile, activePeriod, size }: ValueProps) {
  const formatted = formatTileValue(tile)
  const note = tileStateNote(tile, activePeriod)
  const statusLabel = tileStatusLabel(tile.valueStatus)
  const stale = tile.tileState === 'available' && isPeriodStale({ latestPeriod: tile.latestPeriod })
  const periodLine = (
    <span
      className={cn(
        'block text-xs tabular-nums text-muted-foreground',
        stale && 'text-amber-800 dark:text-amber-300',
      )}
    >
      {tile.latestPeriod ? formatHubPeriod(tile.latestPeriod) : '—'}
      {statusLabel ? ` · ${statusLabel}` : null}
      {stale ? ` · ${t`posibil neactualizat`}` : null}
    </span>
  )

  if (size === 'tile') {
    return formatted ? (
      <>
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-2xl font-semibold tabular-nums tracking-tight">{formatted.value}</span>
          {formatted.unit ? (
            <>
              {' '}
              <span className="text-sm text-muted-foreground">{formatted.unit}</span>
            </>
          ) : null}
        </p>
        <p>{periodLine}</p>
      </>
    ) : (
      <p className="text-sm text-muted-foreground">
        {note ?? '—'}
        {statusLabel ? <span className="block text-xs">{statusLabel}</span> : null}
      </p>
    )
  }

  return (
    <div className={cn('text-right', tile.tileState !== 'available' && 'text-muted-foreground')}>
      {formatted ? (
        <>
          <span className="block text-sm font-semibold tabular-nums tracking-tight text-foreground">
            {formatted.value}
            {formatted.unit ? (
              <>
                {' '}
                <span className="font-normal text-muted-foreground">{formatted.unit}</span>
              </>
            ) : null}
          </span>
          {periodLine}
        </>
      ) : (
        <>
          <span className="block text-sm">—</span>
          {statusLabel ? <span className="block text-xs">{statusLabel}</span> : null}
        </>
      )}
    </div>
  )
}

type ActionsProps = {
  readonly tile: StatisticsIndicatorTile
  readonly name: string
  readonly siruta: string
  readonly countyCode?: string | null
  readonly className?: string
}

/**
 * What a reader can do with one tile: see where it comes from, compare it,
 * ask for its data, or inspect an ambiguous series at the source. Each
 * control names its matrix for assistive tech; each link is a 24px target.
 */
export function TerritoryTileActions({ tile, name, siruta, countyCode, className }: ActionsProps) {
  const { i18n } = useLingui()
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <InsProvenanceDrawer
        datasetCode={tile.datasetCode}
        datasetName={name}
        periodicity={tile.periodicity}
        unitLabel={tileUnitName(tile, i18n.locale)}
        latestPeriod={tile.latestPeriod}
      />
      {tile.tileState === 'catalog-only' ? (
        <RequestDatasetAction datasetCode={tile.datasetCode} datasetName={name} siruta={siruta} />
      ) : tile.tileState === 'available' || tile.tileState === 'period-missing' ? (
        <Link
          to="/ins/comparatii"
          search={tileCompareSearch(tile, siruta, countyCode)}
          className={TEXT_LINK_CLASS}
          aria-label={t`Compară ${name}`}
        >
          <Trans>Compară</Trans>
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      ) : (
        <Link
          to="/ins/seturi/$cod"
          params={{ cod: tile.datasetCode }}
          search={{ teritoriu: `siruta:${siruta}` }}
          className={TEXT_LINK_CLASS}
          aria-label={t`Inspectează seria din sursă: ${name}`}
        >
          <Trans>Inspectează seria din sursă</Trans>
        </Link>
      )}
    </div>
  )
}
