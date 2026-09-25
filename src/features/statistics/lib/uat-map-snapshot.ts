/**
 * The shape of the INS hub's UAT map snapshot: two JSON files under
 * `features/statistics/data/`, written by `scripts/generate-ins-uat-map.ts`
 * and imported lazily, as the companies hub keeps its snapshot in the client.
 *
 * Both are columnar — one array per field, aligned by index — which is what
 * keeps 3,181 UATs to ~170 KB (shapes) and ~57 KB (figures) gzipped.
 */

import type { StatisticsHubMapSeries } from '@/schemas/statistics'

export type UatKind = 'comuna' | 'oras' | 'municipiu' | 'resedinta' | 'capitala'

export interface UatMapGeometry {
  /** The GeoJSON the shapes come from. */
  readonly source: string
  /** The grid: the `viewBox` is `0 0 width height`, integer units. */
  readonly width: number
  readonly height: number
  readonly siruta: readonly string[]
  readonly name: readonly string[]
  /** The county code (`CJ`, `B`). */
  readonly county: readonly string[]
  readonly kind: readonly UatKind[]
  /** One SVG path per UAT: an absolute move, then relative lines. */
  readonly paths: readonly string[]
  /** Per UAT, flat: the label point (the point farthest from the edges) and that distance — x, y, room. */
  readonly labels: readonly number[]
  /** Per county code, the bounding box on the grid: x0, y0, x1, y1. */
  readonly counties: Readonly<Record<string, readonly [number, number, number, number]>>
  /** The borders between counties, as open lines. */
  readonly countyBorders: string
  /** The country's outline. */
  readonly outline: string
}

/** The six series, as the hub's address names them (`?harta=`). */
export type UatMapSeriesId = StatisticsHubMapSeries

/** Why a UAT has no figure: no cell, no public network, a negative INS input. */
export type UatMapMissing = 'absent' | 'network' | 'negative'

/** Which count a part is: the events a balance is made of. */
export type UatMapPartId = 'births' | 'deaths' | 'arrivals' | 'departures'

/** One figure for every UAT (aligned with `siruta`, null where there is none), its county and Romania. */
export interface UatMapFigures {
  readonly values: readonly (number | null)[]
  readonly national: number | null
  readonly counties: Readonly<Record<string, number | null>>
}

/** A count a balance is made of, for the tooltip: per UAT only. */
export interface UatMapPart {
  readonly id: UatMapPartId
  readonly values: readonly (number | null)[]
}

/**
 * One series: its total for the latest period Romania has — people on
 * 1 January, the balance of the year, the employees, the dwellings, the
 * thousand m³ — read with the territory page's arithmetic for one year
 * (`computeDerived`: absent cells, negative inputs). The county and Romania
 * are summed alike.
 */
export interface UatMapSeries {
  readonly id: UatMapSeriesId
  /** The period: the year, or the 1 January the population is counted on. */
  readonly year: number
  readonly total: UatMapFigures
  /** Why a UAT has no total, by index. */
  readonly missing: Readonly<Record<number, UatMapMissing>>
  /** The INS flags on a total's inputs („p"), by index; none in the current data, kept for when INS sets them. */
  readonly flags: Readonly<Record<number, string>>
  /** The events a balance is made of; none for a level. */
  readonly parts: readonly UatMapPart[]
}

export interface UatMapValues {
  /** The day the figures were read. */
  readonly generatedAt: string
  readonly api: string
  /** Aligned with the geometry's `siruta`. */
  readonly siruta: readonly string[]
  readonly series: readonly UatMapSeries[]
}
