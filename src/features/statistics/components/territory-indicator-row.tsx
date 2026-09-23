import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import type { StatisticsIndicatorTile, StatisticsTileBenchmark } from '@/schemas/statistics'
import { formatHubPeriod } from '../lib/hub-format'
import { statisticsTheme } from '../lib/statistics-theme'
import { formatTileValue } from '../lib/territory-values'
import { TerritorySparkline } from './territory-sparkline'
import { tileSparklinePoints } from '../lib/territory-sparkline'
import { useTileName } from '../hooks/use-tile-name'
import { tileStateNote } from '../lib/territory-tiles'
import { TerritoryTileActions, TerritoryTileValue } from './territory-tile-parts'

/** A 24px hit area around the 16px name link (WCAG 2.2 AA 2.5.8). */
const NAME_LINK_CLASS =
  '-mx-1 -my-1 block truncate rounded-sm px-1 py-1 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

type RowProps = {
  readonly tile: StatisticsIndicatorTile
  readonly siruta: string
  readonly countyCode?: string | null
  /** The period the address pins, for the note a tile with no cell there gives. */
  readonly activePeriod: string | null
}

/**
 * One indicator of the territory, as a list row: the name (a link into the
 * dataset scoped to this territory), the latest value with its unit word and
 * period, the history as a sparkline, and the two actions — provenance and
 * compare. A tile that cannot show a value says why in the value column.
 */
export function TerritoryIndicatorRow({ tile, siruta, countyCode, activePeriod }: RowProps) {
  const nameOf = useTileName()
  const name = nameOf(tile)
  const note = tileStateNote(tile, activePeriod)

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_6rem_9rem_auto]">
      <div className="min-w-0">
        <Link
          to="/ins/seturi/$cod"
          params={{ cod: tile.datasetCode }}
          search={{ teritoriu: `siruta:${siruta}` }}
          className={`${NAME_LINK_CLASS} text-sm font-medium text-foreground`}
          title={name}
        >
          {name}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{tile.datasetCode}</span>
          {note ? <span>{note}</span> : null}
          {tile.truncated ? (
            <span>
              <Trans>Istoricul încărcat este limitat la ultimele 200 de observații.</Trans>
            </span>
          ) : null}
          {tile.tileState === 'available' && tile.sparklineCadence === null ? (
            <span>
              <Trans>Graficul necesită o frecvență compatibilă.</Trans>
            </span>
          ) : null}
        </p>
      </div>
      <div className="hidden text-muted-foreground sm:block">
        {tile.tileState === 'available' && tile.sparklineCadence !== null ? <TerritorySparkline points={tileSparklinePoints(tile)} /> : null}
      </div>
      <TerritoryTileValue tile={tile} activePeriod={activePeriod} size="row" />
      <TerritoryTileActions
        tile={tile}
        name={name}
        siruta={siruta}
        countyCode={countyCode}
        className="col-span-2 justify-end sm:col-span-1"
      />
    </li>
  )
}

type HeadlineProps = {
  readonly tile: StatisticsIndicatorTile
  readonly siruta: string
  readonly countyCode?: string | null
  readonly activePeriod: string | null
  readonly benchmark?: StatisticsTileBenchmark
  /** False on the capital, whose county cell is the page's own value. */
  readonly showCountyReference?: boolean
}

/**
 * A reference figure, through the same formatter as the tile's own — so a
 * confidential county cell prints its flag, never a placeholder value.
 */
function benchmarkText(latest: StatisticsTileBenchmark['county']): string | null {
  if (!latest) return null
  const formatted = formatTileValue({
    value: latest.value,
    valueStatus: latest.valueStatus,
    unitSymbol: latest.unitSymbol,
    unitNameRo: latest.unitNameRo,
  })
  if (!formatted) return null
  return `${formatted.value}${formatted.unit ? ` ${formatted.unit}` : ''}${latest.period ? ` (${formatHubPeriod(latest.period)})` : ''}`
}

/** One of the four headline indicators: the value large, the county and national references under it, the same two actions as a row. */
export function TerritoryHeadlineTile({
  tile,
  siruta,
  countyCode,
  activePeriod,
  benchmark,
  showCountyReference = true,
}: HeadlineProps) {
  const nameOf = useTileName()
  const name = nameOf(tile)
  const county = showCountyReference ? benchmarkText(benchmark?.county ?? null) : null
  const national = benchmarkText(benchmark?.national ?? null)
  return (
    <article className={`${statisticsTheme.band} flex min-w-0 flex-col gap-1 p-4`}>
      <h3 className={`${statisticsTheme.sectionLabel} min-w-0`}>
        <Link
          to="/ins/seturi/$cod"
          params={{ cod: tile.datasetCode }}
          search={{ teritoriu: `siruta:${siruta}` }}
          className={`${NAME_LINK_CLASS} hover:text-foreground`}
          title={name}
        >
          {name}
        </Link>
      </h3>
      <TerritoryTileValue tile={tile} activePeriod={activePeriod} size="tile" />
      {tile.truncated ? (
        <p className="text-xs text-muted-foreground">
          <Trans>Istoricul încărcat este limitat la ultimele 200 de observații.</Trans>
        </p>
      ) : null}
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
      {tile.tileState === 'available' && tile.sparklineCadence !== null ? (
        <TerritorySparkline points={tileSparklinePoints(tile)} width={220} height={32} className="mt-2 w-full" />
      ) : null}
      <TerritoryTileActions tile={tile} name={name} siruta={siruta} countyCode={countyCode} className="mt-auto pt-3" />
    </article>
  )
}
