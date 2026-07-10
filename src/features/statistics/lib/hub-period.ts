import type { InsTimePeriod } from '@/schemas/ins'
import type {
  StatisticsIndicatorTile,
  StatisticsTerritoryHubResult,
} from '@/schemas/statistics'
import { periodSortKey } from './period'

/**
 * Client-side period filtering for the territory hub.
 *
 * The hub is fetched exactly once, unfiltered. Every period the user can pick
 * is already present in the tiles' sparklines, so switching periods is a pure
 * transform rather than a second round-trip.
 */

/**
 * Every period present across the hub's tiles, most recent first — and all of
 * them, not the five the old hub happened to show.
 *
 * Sorted on the structured `year`/`quarter`/`month` fields via `periodSortKey`
 * rather than on the ISO string. String order agrees with chronology for the
 * shapes INS emits today, but only accidentally: it depends on zero-padding and
 * on `Q` sorting after digits. Ordering the numbers we were given is the thing
 * that stays true.
 */
export function collectHubPeriodOptions(
  hub: StatisticsTerritoryHubResult | null | undefined,
): readonly InsTimePeriod[] {
  const byIsoPeriod = new Map<string, InsTimePeriod>()

  for (const tile of hub?.tiles ?? []) {
    for (const [period] of tile.sparkline) {
      if (!byIsoPeriod.has(period.iso_period)) {
        byIsoPeriod.set(period.iso_period, period)
      }
    }
  }

  return [...byIsoPeriod.values()].sort(
    (left, right) => periodSortKey(right) - periodSortKey(left),
  )
}

/**
 * Re-anchors each tile's headline value to `period`.
 *
 * A tile with no observation at that period becomes `no-data` rather than
 * silently keeping its latest value — showing a 2023 number under a "2019"
 * filter would be a lie. `latestDataPeriod` is left alone: it is provenance
 * ("data through"), not the current selection.
 */
export function applyHubPeriod(
  hub: StatisticsTerritoryHubResult,
  period: string | null,
): StatisticsTerritoryHubResult {
  if (!period) return hub

  return {
    ...hub,
    tiles: hub.tiles.map((tile) => applyTilePeriod(tile, period)),
  }
}

function applyTilePeriod(
  tile: StatisticsIndicatorTile,
  period: string,
): StatisticsIndicatorTile {
  if (tile.dataStatus === 'catalog-only') return tile

  const match = tile.sparkline.find(([timePeriod]) => timePeriod.iso_period === period)
  const value = match?.[1] ?? null

  return {
    ...tile,
    value,
    // `value_status` is only carried for the tile's own latest observation, so
    // it must not be re-attached to a different period's value.
    valueStatus: period === tile.latestPeriod ? tile.valueStatus : null,
    latestPeriod: period,
    latestYear: match?.[0].year ?? null,
    tileState: value === null ? 'no-data' : 'available',
  }
}
