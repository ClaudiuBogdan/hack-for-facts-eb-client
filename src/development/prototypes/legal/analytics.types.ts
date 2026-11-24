/**
 * The shape of the legislation analytics prototype's fixture (`analytics.fixture.ts`), generated from real data
 * by the scrapper session's `gen_fixture.py` (the 11-18 search plan, the title rules, the issuer list, the
 * chains resolved from titles). Numbers only where the page counts; names in `dims`.
 */
export type Quartiles = { readonly n: number; readonly p25?: number; readonly median?: number; readonly p75?: number }

export type LegalFixture = {
  readonly stamp: {
    readonly generatedAt: string
    readonly snapshot: string
    readonly snapshotDate: string
    readonly acts: number
    readonly actsWithText: number
    readonly sources: readonly string[]
  }
  readonly dims: {
    /** 0 = the year is not known. */
    readonly years: readonly number[]
    readonly types: readonly string[]
    readonly kinds: readonly { readonly key: string; readonly group: string }[]
    /** Lineage level; the last two are „alți emitenți" and „fără emitent". */
    readonly issuers: readonly { readonly name: string; readonly family: string; readonly basis: string }[]
    readonly dinamica: readonly string[]
  }
  /** Flat rows of 7: year index, type index, kind index, issuer index, versions band, has text (0/1), acts. */
  readonly cube: readonly number[]
  readonly months: readonly { readonly month: string; readonly bands: readonly number[] }[]
  readonly ordinances: {
    readonly years: readonly { readonly year: number; readonly oug: readonly number[]; readonly og: readonly number[] }[]
    readonly days: Quartiles
    readonly daysByType: Readonly<Record<string, Quartiles>>
    readonly laws: number
    readonly resolved: number
    readonly notInCorpus: number
    readonly unparsed: number
  }
  readonly promulgation: { readonly status: Readonly<Record<string, number>>; readonly days: Quartiles }
  readonly amendments: { readonly status: Readonly<Record<string, number>>; readonly flows: readonly (readonly [string, number])[] }
  readonly court: { readonly status: Readonly<Record<string, number>>; readonly codes: readonly (readonly [string, number])[] }
  readonly acts: readonly LegalActRow[]
}

export type LegalActRow = {
  readonly id: number
  readonly title: string
  /** Type index. */
  readonly t: number
  readonly y: number
  /** Kind index. */
  readonly k: number
  /** Issuer index. */
  readonly i: number
  /** Consolidated versions beyond the original. */
  readonly v: number
  /** Times amended (titles resolved to this act). */
  readonly am: number
  /** Times named in a court decision's title. */
  readonly cc: number
  /** 1 when the act has text in the index (it can be placed on the map). */
  readonly u: number
}
