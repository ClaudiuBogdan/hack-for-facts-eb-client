import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import type { StatisticsIndicatorTile, StatisticsTileBenchmark } from '@/schemas/statistics'
import { formatHubPeriod } from '../../lib/period'
import { formatTileValue } from '../../lib/territory-values'
import { TerritorySparkline, TerritorySparklineChart } from './territory-sparkline'
import { tileSparklinePoints } from '../../lib/territory-sparkline'
import { useTileName } from '../../hooks/use-tile-name'
import { shortIndicatorName, tileStateNote } from '../../lib/territory-tiles'
import { TerritoryTileAction, TerritoryTileFigure, TerritoryTilePeriod } from './territory-tile-parts'

/**
 * The name is the row's link, and its `after:` box covers the whole row, so
 * the pointer does not have to find the words — the overlay the catalog rows
 * use. The action sits above it (`z-10`).
 */
const ROW_LINK_CLASS =
  'rounded-sm underline-offset-4 after:absolute after:inset-0 after:content-[""] group-hover:underline focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring'

type RowProps = {
  readonly tile: StatisticsIndicatorTile
  readonly siruta: string
  readonly countyCode?: string | null
  /** The period the address pins, for the note a tile with no cell there gives. */
  readonly activePeriod: string | null
}

/**
 * One indicator of the place, as a list row that reads across: what it
 * counts, how it moved, where it stands now — and one action, comparing it
 * with the county and the country. The whole row opens the series for this
 * place.
 *
 * Two lines, laid out as named grid areas so the same six cells serve both
 * widths. On a phone the name takes the first line beside the value, and
 * the code, the line and the period share the second; from `sm` the line has
 * a column of its own and the value column a fixed width, so the lines and
 * the figures of seventy rows stand in columns.
 *
 * The name drops the breakdown INS spells out („pe judete si localitati"):
 * on a page about one place, that breakdown is the page (`shortIndicatorName`).
 * The full name is the row's title and the series' heading.
 */
export function TerritoryIndicatorRow({ tile, siruta, countyCode, activePeriod }: RowProps) {
  const nameOf = useTileName()
  const fullName = nameOf(tile)
  const name = shortIndicatorName(fullName)
  const note = tileStateNote(tile, activePeriod)
  const drawable = tile.tileState === 'available' && tile.sparklineCadence !== null

  return (
    <li
      className={cn(
        'group relative grid items-center gap-x-3 gap-y-0.5 px-4 py-2.5 transition-colors hover:bg-muted/40',
        "grid-cols-[auto_minmax(0,1fr)_auto_2rem] [grid-template-areas:'name_name_value_action'_'code_spark_period_action']",
        "sm:grid-cols-[minmax(0,1fr)_7rem_10rem_2rem] sm:[grid-template-areas:'name_spark_value_action'_'code_spark_period_action']",
      )}
    >
      <div className="min-w-0 [grid-area:name]">
        <Link
          to="/ins/seturi/$cod"
          params={{ cod: tile.datasetCode }}
          search={{ teritoriu: `siruta:${siruta}` }}
          title={fullName === name ? undefined : fullName}
          className={cn(ROW_LINK_CLASS, 'line-clamp-2 text-sm font-medium text-foreground sm:line-clamp-1')}
        >
          {name}
        </Link>
        {note ? <p className="mt-0.5 text-xs text-muted-foreground">{note}</p> : null}
      </div>
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground [grid-area:code]">
        {tile.datasetCode}
      </span>
      <span className="flex min-w-0 items-center [grid-area:spark] sm:justify-center">
        {drawable ? (
          <TerritorySparkline
            points={tileSparklinePoints(tile)}
            truncated={tile.truncated}
            width={96}
            height={24}
            className="h-5 w-16 sm:h-6 sm:w-24"
          />
        ) : null}
      </span>
      <TerritoryTileFigure tile={tile} size="row" className="justify-self-end text-right [grid-area:value]" />
      <TerritoryTilePeriod tile={tile} className="justify-self-end text-right [grid-area:period]" />
      <span className="flex justify-end [grid-area:action]">
        <TerritoryTileAction tile={tile} name={name} siruta={siruta} countyCode={countyCode} className="-mr-1.5" />
      </span>
    </li>
  )
}

type HeadlineProps = {
  readonly tile: StatisticsIndicatorTile
  readonly siruta: string
  readonly countyCode?: string | null
  /** „Sibiu" — the county's name, for the reference row's label. */
  readonly countyName?: string | null
  readonly activePeriod: string | null
  readonly benchmark?: StatisticsTileBenchmark
  /** False on the capital, whose county cell is the page's own value. */
  readonly showCountyReference?: boolean
}

/**
 * A reference figure, through the same formatter as the tile's own — so a
 * confidential county cell prints its flag, never a placeholder value. The
 * unit is left out when it is the tile's own, and the period when it is the
 * tile's period: under „160.228 persoane · 2026", „468.013" says the rest.
 */
function referenceText(
  latest: StatisticsTileBenchmark['county'],
  tile: StatisticsIndicatorTile,
): string | null {
  if (!latest) return null
  const formatted = formatTileValue({
    value: latest.value,
    valueStatus: latest.valueStatus,
    unitSymbol: latest.unitSymbol,
    unitNameRo: latest.unitNameRo,
  })
  if (!formatted) return null
  const own = formatTileValue(tile)
  const unit = formatted.unit && formatted.unit !== own?.unit ? ` ${formatted.unit}` : ''
  const period = latest.period && latest.period !== tile.latestPeriod ? ` (${formatHubPeriod(latest.period)})` : ''
  return `${formatted.value}${unit}${period}`
}

/**
 * One of the four headline indicators: the name, the value large with its
 * period, the history shaded, then the county and the country as two
 * reference rows — the figures a reader weighs the value against. The whole
 * tile opens the series; comparing is the icon beside the name.
 */
export function TerritoryHeadlineTile({
  tile,
  siruta,
  countyCode,
  countyName,
  activePeriod,
  benchmark,
  showCountyReference = true,
}: HeadlineProps) {
  const nameOf = useTileName()
  const fullName = nameOf(tile)
  const name = shortIndicatorName(fullName)
  const note = tileStateNote(tile, activePeriod)
  const county = showCountyReference ? referenceText(benchmark?.county ?? null, tile) : null
  const national = referenceText(benchmark?.national ?? null, tile)
  const drawable = tile.tileState === 'available' && tile.sparklineCadence !== null

  return (
    <article className="@container group relative flex min-w-0 flex-col rounded-lg border border-border/70 bg-card p-4 transition-colors hover:border-border hover:bg-muted/30">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-sm font-medium leading-snug text-foreground">
          <Link
            to="/ins/seturi/$cod"
            params={{ cod: tile.datasetCode }}
            search={{ teritoriu: `siruta:${siruta}` }}
            title={fullName === name ? undefined : fullName}
            className={cn(ROW_LINK_CLASS, 'line-clamp-2')}
          >
            {name}
          </Link>
        </h3>
        <TerritoryTileAction tile={tile} name={name} siruta={siruta} countyCode={countyCode} className="-mr-2 -mt-1.5" />
      </div>
      <p className="mt-3">
        <TerritoryTileFigure tile={tile} size="tile" />
      </p>
      {note ? (
        <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      ) : (
        <TerritoryTilePeriod tile={tile} className="mt-0.5" />
      )}
      {drawable ? (
        <TerritorySparklineChart
          points={tileSparklinePoints(tile)}
          truncated={tile.truncated}
          format={(value) => {
            const formatted = formatTileValue({ ...tile, value: String(value), valueStatus: null })
            return formatted ? [formatted.value, formatted.unit].filter(Boolean).join(' ') : '—'
          }}
          className="mb-3 mt-3 h-10 w-full"
        />
      ) : (
        <span className="mb-3" aria-hidden="true" />
      )}
      {county || national ? (
        // The references close the tile, level across the band however
        // long the names above them run.
        <dl className="mt-auto grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-t border-border/70 pt-2.5 text-xs">
          {county ? (
            <>
              <dt className="truncate text-muted-foreground">
                {countyName ? (
                  <>
                    {/* Two abreast on a phone, a tile is too narrow for
                        „Județul Sibiu" beside a seven-digit figure. */}
                    <span className="@[13rem]:hidden">{t`Județ`}</span>
                    <span className="hidden @[13rem]:inline">{t`Județul ${countyName}`}</span>
                  </>
                ) : (
                  t`Județ`
                )}
              </dt>
              <dd className="text-right tabular-nums text-foreground">{county}</dd>
            </>
          ) : null}
          {national ? (
            <>
              <dt className="text-muted-foreground">{t`România`}</dt>
              <dd className="text-right tabular-nums text-foreground">{national}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
    </article>
  )
}
