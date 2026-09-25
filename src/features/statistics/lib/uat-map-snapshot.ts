/**
 * The shape of the INS hub's UAT map snapshot: two JSON files under
 * `features/statistics/data/`, written by `scripts/generate-ins-uat-map.ts`
 * and imported lazily, as the companies hub keeps its snapshot in the client.
 *
 * Both are columnar — one array per field, aligned by index — which is what
 * keeps 3,181 UATs to ~150 KB (shapes) and ~40 KB (figures) gzipped.
 */

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

export type UatMapSeriesId = 'populatie' | 'spor-natural' | 'sold-domiciliu' | 'salariati' | 'locuinte-noi' | 'apa'

/** Why a UAT has no rate: no cell, too few events, no public network, a negative INS input. */
export type UatMapMissing = 'absent' | 'few' | 'network' | 'negative'

/** Which count a part is: the events a balance is made of. */
export type UatMapPartId = 'births' | 'deaths' | 'arrivals' | 'departures'

/** One figure for every UAT (aligned with `siruta`, null where there is none), its county and Romania. */
export interface UatMapFigures {
  readonly values: readonly (number | null)[]
  readonly national: number | null
  readonly counties: Readonly<Record<string, number | null>>
}

/** A count a balance is made of, in the latest year, for the tooltip. */
export interface UatMapPart extends UatMapFigures {
  readonly id: UatMapPartId
}

/**
 * One series, three ways to read it — the latest year, as Romania has it:
 * the count, the count per 1,000 inhabitants, and the change from the year
 * before. Every figure is the territory page's arithmetic for one year
 * (`computeDerived`, window 1); the county and Romania are computed alike.
 */
export interface UatMapSeries {
  readonly id: UatMapSeriesId
  /** The latest year, and the one it is compared with. Population: the two 1 January counts. */
  readonly year: number
  readonly previousYear: number
  /** The count of the year: people on 1 January, a balance of the year, employees, dwellings, thousand m³. */
  readonly total: UatMapFigures
  /** The same count, a year earlier. */
  readonly previous: UatMapFigures
  /** Per 1,000 inhabitants (litres per inhabitant a day, for water); none for the population itself. */
  readonly rate: UatMapFigures | null
  /**
   * Year on year: a percentage for a level (population, employees, water); a
   * difference, in the count's own unit, for a balance or a count that is
   * often zero (dwellings), where a percentage reads backwards or not at all.
   */
  readonly change: UatMapFigures & { readonly kind: 'percent' | 'difference' }
  /** Indexes of rates read from fewer than 20 events. */
  readonly small: readonly number[]
  /** Why a UAT has no rate, by index. */
  readonly missing: Readonly<Record<number, UatMapMissing>>
  /** Indexes of changes too small to compare: under 20 events, or a count under 20, in either year. */
  readonly unsteady: readonly number[]
  /** The INS flags on a figure's inputs („p"), by index. */
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
