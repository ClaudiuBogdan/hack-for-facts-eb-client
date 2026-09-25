import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowLeftRight } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { StatisticsIndicatorTile } from '@/schemas/statistics'
import { formatHubPeriod, isPeriodStale } from '../../lib/period'
import { tileCompareSearch } from '../../lib/territory-tiles'
import { formatTileValue, tileStatusLabel } from '../../lib/territory-values'
import { RequestDatasetAction } from '../request-dataset-action'

/**
 * A tile's figure: the value with its unit word — or a dash when there is no
 * figure, the reason being said beside the name. The value and the unit are
 * separated by a real space, so a screen reader says „163.582 persoane", not
 * „163582persoane".
 */
export function TerritoryTileFigure({
  tile,
  size,
  className,
}: {
  readonly tile: StatisticsIndicatorTile
  /** `row` sets the figure small; `tile` sets it large. */
  readonly size: 'row' | 'tile'
  readonly className?: string
}) {
  const formatted = formatTileValue(tile)
  if (!formatted) {
    return <span className={cn('text-sm text-muted-foreground', className)}>—</span>
  }
  return (
    <span
      className={cn(
        'tabular-nums tracking-tight text-foreground',
        size === 'tile' ? 'text-2xl font-semibold' : 'text-sm font-semibold',
        className,
      )}
    >
      {formatted.value}
      {formatted.unit ? (
        <>
          {' '}
          <span className={cn('font-normal tracking-normal text-muted-foreground', size === 'tile' ? 'text-sm' : 'text-xs')}>
            {formatted.unit}
          </span>
        </>
      ) : null}
    </span>
  )
}

/**
 * The figure's period, with the INS flag and an amber „possibly not updated"
 * when the series stopped long ago. Nothing for a tile with no figure.
 */
export function TerritoryTilePeriod({
  tile,
  className,
}: {
  readonly tile: StatisticsIndicatorTile
  readonly className?: string
}) {
  const statusLabel = tileStatusLabel(tile.valueStatus)
  const stale = tile.tileState === 'available' && isPeriodStale({ latestPeriod: tile.latestPeriod })
  if (!tile.latestPeriod && !statusLabel) return null
  return (
    <span
      className={cn(
        'text-xs tabular-nums text-muted-foreground',
        stale && 'text-amber-800 dark:text-amber-300',
        className,
      )}
    >
      {tile.latestPeriod ? formatHubPeriod(tile.latestPeriod) : null}
      {tile.latestPeriod && statusLabel ? ' · ' : null}
      {statusLabel}
      {stale ? ` · ${t`posibil neactualizat`}` : null}
    </span>
  )
}

type ActionProps = {
  readonly tile: StatisticsIndicatorTile
  readonly name: string
  readonly siruta: string
  readonly countyCode?: string | null
  readonly className?: string
}

/**
 * The one action a tile carries besides opening its series: compare it with
 * the county and the country — an icon, named for assistive tech and in a
 * tooltip, because seventy rows each ending in the word „Compară" read as a
 * column of the same word. A matrix listed without data offers a request
 * instead. Everything else is on the series the row opens.
 */
export function TerritoryTileAction({ tile, name, siruta, countyCode, className }: ActionProps) {
  if (tile.tileState === 'catalog-only') {
    return (
      <span className={cn('relative z-10', className)}>
        <RequestDatasetAction datasetCode={tile.datasetCode} datasetName={name} siruta={siruta} />
      </span>
    )
  }
  if (tile.tileState !== 'available' && tile.tileState !== 'period-missing') return null
  const label = countyCode ? t`Compară cu județul și țara` : t`Compară cu țara`
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/ins/comparatii"
          search={tileCompareSearch(tile, siruta, countyCode)}
          aria-label={`${label}: ${name}`}
          // 32px: clear of the 24px floor in WCAG 2.5.8, and above the
          // row's own link, which covers the row.
          className={cn(
            'relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
        >
          <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
