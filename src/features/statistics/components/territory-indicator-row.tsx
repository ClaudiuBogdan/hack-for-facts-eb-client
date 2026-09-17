import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StatisticsIndicatorTile, StatisticsTileBenchmark } from '@/schemas/statistics'
import { formatHubPeriod, formatHubValue } from '../lib/hub-format'
import { tileUnit } from '../lib/territory-groups'
import { RequestDatasetAction } from './request-dataset-action'
import { SourceProvenanceDrawer } from './source-provenance-drawer'
import { TerritorySparkline } from './territory-sparkline'
import { isPeriodStale } from '../lib/period'
import { formatTileValue, tileStatusLabel } from '../lib/territory-values'

function useTileName() {
  const { i18n } = useLingui()
  const romanian = i18n.locale.toLowerCase().startsWith('ro')
  return (tile: StatisticsIndicatorTile) =>
    (romanian ? tile.datasetNameRo : tile.datasetNameEn) || tile.datasetNameRo || tile.datasetNameEn || tile.datasetCode
}

function stateNote(tile: StatisticsIndicatorTile): string | null {
  switch (tile.tileState) {
    case 'available':
      return null
    case 'catalog-only':
      return t`Setul există în catalog, dar observațiile nu sunt încă încărcate.`
    case 'ambiguous':
      return t`Mai multe serii INS corespund selecției. Alege o serie din sursă.`
    case 'period-ambiguous':
      return t`Mai multe frecvențe corespund acestei perioade. Inspectează observațiile din sursă.`
    case 'unavailable':
      return t`Perioada nu este inclusă în istoricul încărcat. Verifică seria completă.`
    case 'no-data':
      return t`Nu există observații pentru acest teritoriu în setul curent.`
  }
}

function compareSearch(tile: StatisticsIndicatorTile, siruta: string, countyCode: string | null | undefined) {
  return {
    cod: tile.datasetCode,
    teritorii: [`siruta:${siruta}`, ...(countyCode ? [`cod:${countyCode}`] : []), 'cod:RO'] as [string, ...string[]],
  }
}

type RowProps = {
  readonly tile: StatisticsIndicatorTile
  readonly siruta: string
  readonly countyCode?: string | null
}

/**
 * One indicator of the territory, as a list row: the name (a link into the
 * dataset scoped to this territory), the latest value with its unit word and
 * period, the history as a sparkline, and the two actions — provenance and
 * compare. A tile that cannot show a value says why in the value column.
 */
export function TerritoryIndicatorRow({ tile, siruta, countyCode }: RowProps) {
  const nameOf = useTileName()
  const formatted = formatTileValue(tile)
  const note = stateNote(tile)
  const statusLabel = tileStatusLabel(tile.valueStatus)
  const stale = tile.tileState === 'available' && isPeriodStale({ latestPeriod: tile.latestPeriod })

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_6rem_9rem_auto]">
      <div className="min-w-0">
        <Link
          to="/ins/seturi/$cod"
          params={{ cod: tile.datasetCode }}
          search={{ teritoriu: `siruta:${siruta}` }}
          className="block truncate text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          title={nameOf(tile)}
        >
          {nameOf(tile)}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{tile.datasetCode}</span>
          {note ? <span>{note}</span> : null}
          {tile.tileState === 'available' && tile.sparklineUnavailable ? (
            <span>
              <Trans>Graficul necesită o singură frecvență compatibilă.</Trans>
            </span>
          ) : null}
        </p>
      </div>
      <div className="hidden text-muted-foreground sm:block">
        {tile.tileState === 'available' && !tile.sparklineUnavailable ? <TerritorySparkline points={tile.sparkline} /> : null}
      </div>
      <div className={cn('text-right', tile.tileState !== 'available' && 'text-muted-foreground')}>
        {formatted ? (
          <>
            <span className="block text-sm font-semibold tabular-nums tracking-tight text-foreground">
              {formatted.value}
              {formatted.unit ? <span className="ml-1 font-normal text-muted-foreground">{formatted.unit}</span> : null}
            </span>
            <span className={cn('block text-xs tabular-nums text-muted-foreground', stale && 'text-amber-800 dark:text-amber-300')}>
              {tile.latestPeriod ? formatHubPeriod(tile.latestPeriod) : '—'}
              {statusLabel ? ` · ${statusLabel}` : null}
              {stale ? ` · ${t`posibil neactualizat`}` : null}
            </span>
          </>
        ) : (
          <>
            <span className="block text-sm">—</span>
            {statusLabel ? <span className="block text-xs">{statusLabel}</span> : null}
          </>
        )}
      </div>
      <div className="col-span-2 flex items-center justify-end gap-3 sm:col-span-1">
        <SourceProvenanceDrawer
          datasetCode={tile.datasetCode}
          datasetName={tile.datasetNameRo}
          periodicity={tile.periodicity}
          unitLabel={tile.unitNameRo ?? tile.unitSymbol}
          latestPeriod={tile.latestPeriod}
        />
        {tile.tileState === 'catalog-only' ? (
          <RequestDatasetAction datasetCode={tile.datasetCode} datasetName={tile.datasetNameRo} siruta={siruta} />
        ) : tile.tileState === 'available' ? (
          <Link
            to="/ins/comparatii"
            search={compareSearch(tile, siruta, countyCode)}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
            aria-label={t`Compară ${nameOf(tile)}`}
          >
            <Trans>Compară</Trans>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        ) : (
          <Link
            to="/ins/seturi/$cod"
            params={{ cod: tile.datasetCode }}
            search={{ teritoriu: `siruta:${siruta}` }}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            <Trans>Inspectează seria din sursă</Trans>
          </Link>
        )}
      </div>
    </li>
  )
}

type HeadlineProps = {
  readonly tile: StatisticsIndicatorTile
  readonly siruta: string
  readonly countyCode?: string | null
  readonly benchmark?: StatisticsTileBenchmark
}

function benchmarkText(latest: StatisticsTileBenchmark['county']): string | null {
  if (!latest?.value) return null
  const numeric = Number(latest.value.replace(',', '.'))
  if (!Number.isFinite(numeric)) return latest.value
  const formatted = formatHubValue(numeric, tileUnit(latest), latest.unitNameRo ?? latest.unitSymbol)
  return `${formatted.value}${formatted.unit ? ` ${formatted.unit}` : ''}${latest.period ? ` (${formatHubPeriod(latest.period)})` : ''}`
}

/** One of the four headline indicators: the value large, the county and national references under it, the same two actions as a row. */
export function TerritoryHeadlineTile({ tile, siruta, countyCode, benchmark }: HeadlineProps) {
  const nameOf = useTileName()
  const formatted = formatTileValue(tile)
  const note = stateNote(tile)
  const statusLabel = tileStatusLabel(tile.valueStatus)
  const stale = tile.tileState === 'available' && isPeriodStale({ latestPeriod: tile.latestPeriod })
  const county = benchmarkText(benchmark?.county ?? null)
  const national = benchmarkText(benchmark?.national ?? null)
  return (
    <article className="flex min-w-0 flex-col gap-1 rounded-lg border border-border/70 bg-card p-4">
      <h3 className="min-w-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Link
          to="/ins/seturi/$cod"
          params={{ cod: tile.datasetCode }}
          search={{ teritoriu: `siruta:${siruta}` }}
          className="block truncate underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title={nameOf(tile)}
        >
          {nameOf(tile)}
        </Link>
      </h3>
      {formatted ? (
        <>
          <p className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-2xl font-semibold tabular-nums tracking-tight">{formatted.value}</span>
            {formatted.unit ? <span className="text-sm text-muted-foreground">{formatted.unit}</span> : null}
          </p>
          <p className={cn('text-xs tabular-nums text-muted-foreground', stale && 'text-amber-800 dark:text-amber-300')}>
            {tile.latestPeriod ? formatHubPeriod(tile.latestPeriod) : '—'}
            {statusLabel ? ` · ${statusLabel}` : null}
            {stale ? ` · ${t`posibil neactualizat`}` : null}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {note ?? '—'}
          {statusLabel ? <span className="block text-xs">{statusLabel}</span> : null}
        </p>
      )}
      {county || national ? (
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          {county ? (
            <span className="block">
              <Trans>Județ</Trans>: {county}
            </span>
          ) : null}
          {national ? (
            <span className="block">
              <Trans>România</Trans>: {national}
            </span>
          ) : null}
        </p>
      ) : null}
      {tile.tileState === 'available' && !tile.sparklineUnavailable ? (
        <TerritorySparkline points={tile.sparkline} width={220} height={32} className="mt-2 w-full" />
      ) : null}
      <div className="mt-auto flex items-center gap-3 pt-3">
        <SourceProvenanceDrawer
          datasetCode={tile.datasetCode}
          datasetName={tile.datasetNameRo}
          periodicity={tile.periodicity}
          unitLabel={tile.unitNameRo ?? tile.unitSymbol}
          latestPeriod={tile.latestPeriod}
        />
        {tile.tileState === 'available' ? (
          <Link
            to="/ins/comparatii"
            search={compareSearch(tile, siruta, countyCode)}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
            aria-label={t`Compară ${nameOf(tile)}`}
          >
            <Trans>Compară</Trans>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        ) : tile.tileState === 'catalog-only' ? (
          <RequestDatasetAction datasetCode={tile.datasetCode} datasetName={tile.datasetNameRo} siruta={siruta} />
        ) : null}
      </div>
    </article>
  )
}
