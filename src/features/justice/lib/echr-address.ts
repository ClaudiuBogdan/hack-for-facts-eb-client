import { ECHR_FIRST_YEAR, ECHR_LAST_YEAR, ECHR_REFERENCE_YEAR } from './echr-years'

/**
 * The ECHR page's address (design.md §17–18): the year (`an`) and the tab
 * (`vedere`), each left out at its default — the bare page is the last
 * whole year's years table. No snapshot here: the route module, which every
 * page loads, reads the address through this file.
 */

export const ECHR_SEARCH_KEYS = ['an', 'vedere'] as const
export type EchrSearchKey = (typeof ECHR_SEARCH_KEYS)[number]

/** The answer's tabs: the years, or the year's judgments. */
export const ECHR_VIEWS = ['ani', 'hotarari'] as const
export type EchrView = (typeof ECHR_VIEWS)[number]

export type EchrQuestion = {
  readonly year: number
  readonly view: EchrView
}

export const ECHR_DEFAULT_QUESTION: EchrQuestion = { year: ECHR_REFERENCE_YEAR, view: 'ani' }

/** A year the snapshot holds, as the router gives it (a number, or digits); anything else is the default year. */
function yearOf(value: unknown): number {
  const year = typeof value === 'number' ? value : typeof value === 'string' && /^\d{4}$/u.test(value) ? Number(value) : NaN
  return Number.isInteger(year) && year >= ECHR_FIRST_YEAR && year <= ECHR_LAST_YEAR ? year : ECHR_DEFAULT_QUESTION.year
}

export function echrQuestionOf(search: Readonly<Record<string, unknown>>): EchrQuestion {
  return {
    year: yearOf(search.an),
    view: ECHR_VIEWS.find((view) => view === search.vedere) ?? ECHR_DEFAULT_QUESTION.view,
  }
}

/**
 * The question as the address's keys, a default as `undefined` so a merge
 * over the previous address drops it; the year travels as a number, which
 * the router writes bare (`an=2018`).
 */
export function echrSearchOf(question: EchrQuestion): Record<EchrSearchKey, number | EchrView | undefined> {
  return {
    an: question.year === ECHR_DEFAULT_QUESTION.year ? undefined : question.year,
    vedere: question.view === ECHR_DEFAULT_QUESTION.view ? undefined : question.view,
  }
}

/** Whether the address asks the bare page: no key of the page's in it. */
export function isBareEchrSearch(search: Readonly<Record<string, unknown>>): boolean {
  return ECHR_SEARCH_KEYS.every((key) => search[key] === undefined)
}
