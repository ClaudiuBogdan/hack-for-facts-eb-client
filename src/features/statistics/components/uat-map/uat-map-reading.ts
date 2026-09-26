import type { UatMapFigures, UatMapGeometry, UatMapSeries } from '../../lib/uat-map-snapshot'
import { classLayers, mapScale, type MapLayer, type MapScale } from './uat-map-scales'
import type { SeriesMeta } from './uat-map-series'

/**
 * A series made into everything the map draws: its totals' colours, the
 * ranks, the legend's counts. Pure — one call per series, never per hover.
 */

/** What the legend's footer counts, each only when there is any. */
export interface LegendKeys {
  readonly noData: number
  readonly territoryLevel: 'uat' | 'county'
  /** Where there are few, their names: a hatched county can be neither focused nor tapped. */
  readonly noDataNames?: readonly string[]
}

export interface Reading {
  readonly figures: UatMapFigures
  readonly scale: MapScale
  /** The fills, a path per class, at the class's opacity — the legend's own. */
  readonly layers: readonly MapLayer[]
  readonly rank: ReadonlyMap<number, number>
  /** Indexes by total, highest first. */
  readonly order: readonly number[]
  readonly ranked: number
  readonly countyRank: ReadonlyMap<number, number>
  readonly countySize: ReadonlyMap<string, number>
  readonly keys: LegendKeys
  readonly legendTitle: string
}

/** Rank by value, highest first; ties share a rank. */
export function rankOf(values: readonly (number | null)[]): { readonly rank: ReadonlyMap<number, number>; readonly order: readonly number[] } {
  const order = values
    .map((value, index) => [value, index] as const)
    .filter((entry): entry is readonly [number, number] => entry[0] !== null)
    .sort((a, b) => b[0] - a[0])
  const rank = new Map<number, number>()
  order.forEach(([value, index], position) => {
    const previous = order[position - 1]
    rank.set(index, previous && previous[0] === value ? rank.get(previous[1])! : position + 1)
  })
  return { rank, order: order.map(([, index]) => index) }
}

/** Each UAT's place within its county, in the order given — ties share it, as in `rankOf` — and each county's number of ranked UATs. */
export function countyRanks(order: readonly number[], counties: readonly string[], values: readonly (number | null)[]) {
  const rank = new Map<number, number>()
  const size = new Map<string, number>()
  const last = new Map<string, number>()
  for (const index of order) {
    const county = counties[index]!
    const position = (size.get(county) ?? 0) + 1
    size.set(county, position)
    const previous = last.get(county)
    rank.set(index, previous !== undefined && values[previous] === values[index] ? rank.get(previous)! : position)
    last.set(county, index)
  }
  return { rank, size }
}

export function readingOf({
  geometry,
  series,
  meta,
}: {
  readonly geometry: UatMapGeometry
  readonly series: UatMapSeries
  readonly meta: SeriesMeta
}): Reading {
  const figures = series.total
  const scale = mapScale(figures.values, { diverging: meta.signed, separateZero: meta.separateZero })
  const { rank, order } = rankOf(figures.values)
  const within = countyRanks(order, geometry.county, figures.values)
  return {
    figures,
    scale,
    layers: classLayers(scale, geometry.paths),
    rank,
    order,
    ranked: order.length,
    countyRank: within.rank,
    countySize: within.size,
    keys: {
      noData: figures.values.filter((value) => value === null).length,
      territoryLevel: 'uat',
    },
    legendTitle: meta.legend(series),
  }
}
