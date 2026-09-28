import { DIRECT_COMPARABLE_FROM } from './home-model'

/**
 * What a procurement profile's year covers (a buyer's page, a firm's). A
 * complete year is the calendar year. The year in progress runs through
 * SEAP's cutoff month — the earlier of the two populations', so one date
 * covers the page; the months after it are the feed thinning out — and is
 * compared with nothing: its last months may still be filling, so a change
 * would partly measure the feed.
 */

/** SEAP's cutoff month per population (`YYYY-MM`), derived from the national monthly counts; null when none can be told. */
export interface Cutoff {
  readonly direct: string | null
  readonly contract: string | null
}

/** An analysis scope's period: a year, or a span of months. */
export type PeriodScope = { readonly year: number } | { readonly from: string; readonly to: string }

export interface Period {
  readonly year: number
  /** The last month read in the year in progress; null for a complete year. */
  readonly through: string | null
  readonly scope: PeriodScope
  /** The whole year before, for the change; null for 2019 (the year before does not compare) and for the year in progress. */
  readonly before: PeriodScope | null
  /** The record lists' date range. */
  readonly range: { readonly gte: string; readonly lte: string }
}

/** `2026-05` → `2026-05-31`. */
export function lastDayOf(month: string): string {
  const [year, index] = month.split('-').map(Number)
  const day = new Date(Date.UTC(year ?? 2000, index ?? 1, 0)).getUTCDate()
  return `${month}-${String(day).padStart(2, '0')}`
}

/**
 * The month the year in progress is read through: the earlier of the two
 * cutoffs. None — the page then abstains from saying the year is complete
 * to any month — when no cutoff is known, or when either population's still
 * lies in the year before.
 */
export function throughMonth(year: number, cutoff: Cutoff | null): string | null {
  const months = [cutoff?.direct ?? null, cutoff?.contract ?? null].filter((month): month is string => month !== null).sort()
  const [earliest] = months
  return earliest?.startsWith(`${year}-`) ? earliest : null
}

/**
 * The newest year with data worth a page: the year in progress once SEAP's
 * data reaches into it (the page's cutoff month — the earlier population's —
 * falls in it), else the last complete year: in January the year in progress
 * holds almost nothing.
 */
export function newestYear(latest: number, cutoff: Cutoff | null): number {
  return throughMonth(latest + 1, cutoff) ? latest + 1 : latest
}

/**
 * A year's period. Past the last complete year it stops at the cutoff; with
 * no cutoff in the year (none read, or a population's feed has not reached
 * it) it is the calendar year so far, compared with nothing.
 */
export function periodOf(year: number, latest: number, cutoff: Cutoff | null): Period {
  const through = year > latest ? throughMonth(year, cutoff) : null
  if (!through) {
    return {
      year,
      through: null,
      scope: { year },
      // A year in progress with no known end compares with no whole year.
      before: year <= latest && year - 1 >= DIRECT_COMPARABLE_FROM ? { year: year - 1 } : null,
      range: { gte: `${year}-01-01`, lte: `${year}-12-31` },
    }
  }
  return {
    year,
    through,
    scope: { from: `${year}-01`, to: through },
    before: null,
    range: { gte: `${year}-01-01`, lte: lastDayOf(through) },
  }
}
