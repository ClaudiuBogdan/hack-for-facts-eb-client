/** One statement as `parseStatements` reads it: a blank cell is `null`, never 0. */
export interface NgoStatementRow {
  readonly activity: string
  readonly I14: number | null
  readonly I22: number | null
  readonly I30: number | null
  readonly I38: number | null
  /** I1, „Active imobilizate – total": `null` when blank or not an integer. */
  readonly fixedAssets: number | null
}

export declare const REVENUE_INDICATORS: readonly ['I14', 'I22', 'I30', 'I38']

export declare function parseStatements(text: string): {
  readonly statements: ReadonlyMap<string, NgoStatementRow>
  readonly malformed: number
}
