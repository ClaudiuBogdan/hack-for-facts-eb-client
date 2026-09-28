import type { YearPoint } from './home-model'

/**
 * The shapes a buyer's page and a firm's page share: the other side's parties
 * year by year, counties with their share, contract awards by procedure.
 */

/** One party's direct purchases per year since 2019, with its total. */
export interface PartyYears {
  readonly cui: string
  readonly years: readonly { readonly year: number; readonly value: number | null }[]
  readonly total: number
}

export interface CountyFigureRow {
  readonly code: string
  readonly count: number
  readonly value: number | null
  /** Of the whole population, on the ranking's measure. */
  readonly share: number | null
}

export interface ProcedureCountRow {
  readonly key: string
  readonly count: number
}

/** The newest year with any record other than the page's, across the page's populations: where a page on an empty year points. */
export function newestYearWithRecords(year: number, ...populations: readonly (readonly YearPoint[])[]): number | null {
  const years = populations.flat().filter((point) => point.year !== year && (point.count ?? 0) > 0).map((point) => point.year)
  return years.length > 0 ? Math.max(...years) : null
}
