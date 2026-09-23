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
  if (found !== null)
    return {
      ...tile,
      value: found.value,
      valueStatus: found.valueStatus,
      latestPeriod: found.time_period.iso_period,
      latestYear: found.time_period.year,
      tileState: 'available',
    }
  // Before the loaded history the period may well exist unseen; inside it,
  // the series simply has no cell there.
  return {
    ...tile,
    value: null,
    valueStatus: null,
    latestPeriod: null,
    latestYear: null,
    tileState: tile.truncated ? 'unavailable' : 'period-missing',
  }
}
