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
