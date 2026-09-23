import { isInsChartPeriodicity } from '@/lib/ins/source-contract'
import { selectInsPeriodObservation } from '@/lib/ins/source-period'
import type {
  StatisticsIndicatorTile,
  StatisticsTerritoryHubResult,
  StatisticsTileObservation,
} from '@/schemas/statistics'
import { periodSortKey } from './period'

/**
 * Client-side period filtering for the territory page.
 *
 * The hub is fetched exactly once, unfiltered. Every period the reader can
 * pick is already in the tiles' observations, so switching periods is a pure
 * transform rather than a second round-trip.
 */

/**
 * The years the territory has any figure for, most recent first.
 *
 * Years, not every published period: seventy of the seventy-five series are
 * annual, and a list of 236 raw tokens mixing three cadences applied a filter
 * almost no row could answer. A sub-annual series answers a year with its
 * latest cell of that year (`applyTilePeriod`).
 */
export function collectTerritoryYears(
  hub: StatisticsTerritoryHubResult | null | undefined,
): readonly number[] {
  const years = new Set<number>()
  for (const tile of hub?.tiles ?? []) {
    for (const observation of tile.observations) years.add(observation.time_period.year)
  }
  return [...years].sort((left, right) => right - left)
}

/** Whether any tile publishes a cell the period filter can anchor to. */
export function territoryPeriodAvailable(
  hub: StatisticsTerritoryHubResult | null | undefined,
  period: string,
): boolean {
  return (hub?.tiles ?? []).some((tile) => observationAt(tile.observations, period) !== null)
}

/**
 * Re-anchors each tile's headline value to `period`.
 *
 * A tile with no observation at that period says so rather than silently
 * keeping its latest value — showing a 2023 number under a "2019" filter
 * would be a lie. `latestDataPeriod` is left alone: it is provenance ("data
 * through"), not the current selection.
 */
export function applyTerritoryPeriod(
  hub: StatisticsTerritoryHubResult,
  period: string | null,
): StatisticsTerritoryHubResult {
  if (!period) return hub

  return {
    ...hub,
    tiles: hub.tiles.map((tile) => applyTilePeriod(tile, period)),
  }
}

/**
 * The cell a period names in a series: the exact token, or — for a year
 * over a sub-annual series — the latest cell of that year. Two cells under
 * one token (a native period shared across cadences) is an ambiguity, not
 * a pick.
 */
function observationAt(
  observations: readonly StatisticsTileObservation[],
  period: string,
): StatisticsTileObservation | 'ambiguous' | null {
  const exact = selectInsPeriodObservation(observations, period)
  if (exact.status === 'AMBIGUOUS') return 'ambiguous'
  if (exact.status === 'OBSERVATION') return exact.observation
  if (!/^\d{4}$/.test(period)) return null
  const year = Number(period)
  let latest: StatisticsTileObservation | null = null
  for (const observation of observations) {
    if (observation.time_period.year !== year) continue
    if (latest === null || periodSortKey(observation.time_period) > periodSortKey(latest.time_period))
      latest = observation
  }
  return latest
}

/**
 * Whether a period lies on the capped side of a truncated history, where it
 * may exist unseen. The server keeps the latest 200 rows, so only a period
 * before the earliest loaded cell can have been cut; a gap inside the loaded
 * span — a missing month in the earliest year included — or a period after
 * it is simply a period the series has no cell for.
 */
function beforeLoadedHistory(tile: StatisticsIndicatorTile, period: string): boolean {
  if (!tile.truncated) return false
  const requested = tokenMonth(period)
  if (requested === null || tile.observations.length === 0) return false
  const earliest = Math.min(...tile.observations.map((row) => cellMonth(row.time_period)))
  return requested < earliest
}

/**
 * A period as the month it starts in, counted from year 0: one scale for
 * years, quarters and months, whichever redundant fields a row carries.
 */
function cellMonth(period: { readonly year: number; readonly quarter?: number | null; readonly month?: number | null }): number {
  if (period.month) return period.year * 12 + period.month - 1
  if (period.quarter) return period.year * 12 + (period.quarter - 1) * 3
  return period.year * 12
}

function tokenMonth(token: string): number | null {
  const month = /^(\d{4})-(\d{2})$/.exec(token)
  if (month) return cellMonth({ year: Number(month[1]), month: Number(month[2]) })
  const quarter = /^(\d{4})-Q([1-4])$/.exec(token)
  if (quarter) return cellMonth({ year: Number(quarter[1]), quarter: Number(quarter[2]) })
  const year = /^(\d{4})$/.exec(token)
  return year ? cellMonth({ year: Number(year[1]) }) : null
}

function applyTilePeriod(
  tile: StatisticsIndicatorTile,
  period: string,
): StatisticsIndicatorTile {
  if (
    tile.dataStatus === 'catalog-only' ||
    tile.tileState === 'ambiguous' ||
    tile.tileState === 'no-data'
  )
    return tile

  const found = observationAt(tile.observations, period)
  if (found === 'ambiguous')
    return {
      ...tile,
      tileState: 'period-ambiguous',
      value: null,
      valueStatus: null,
      latestPeriod: null,
      latestYear: null,
    }
  if (found !== null) {
    // The line is drawn at the cadence of the figure on screen: an annual
    // cell picked from a monthly-and-annual matrix draws the annual line.
    const cadence = found.time_period.periodicity
    return {
      ...tile,
      value: found.value,
      valueStatus: found.valueStatus,
      latestPeriod: found.time_period.iso_period,
      latestYear: found.time_period.year,
      tileState: 'available',
      sparklineCadence: isInsChartPeriodicity(cadence) ? cadence : null,
    }
  }
  return {
    ...tile,
    value: null,
    valueStatus: null,
    latestPeriod: null,
    latestYear: null,
    tileState: beforeLoadedHistory(tile, period) ? 'unavailable' : 'period-missing',
  }
}
