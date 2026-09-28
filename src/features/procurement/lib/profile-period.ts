import { DIRECT_COMPARABLE_FROM } from './home-model'

/**
 * What a procurement profile describes (a buyer's page, a firm's). By default
 * the last twelve months SEAP has complete — the newest data, a whole year's
 * worth of months, compared with the twelve before; or a calendar year: a
 * complete one, compared with the year before, or the year in progress, read
 * through SEAP's cutoff and compared with nothing (a few months against a
 * whole year's, their last ones may still be filling).
 *
 * The twelve months' change keeps one caveat: the cutoff takes a month once
 * it holds half a typical month's records, so the window's last month may
 * still be filling — the change can read a few points low, never a year's
 * worth. Said in the design doc (§15), not on the page.
 *
 * The cutoff is the earlier of the two populations' — direct purchases' and
 * contracts' — so one date covers the page; the months after it are the feed
 * thinning out.
 */

/** SEAP's cutoff month per population (`YYYY-MM`), derived from the national monthly counts; null when none can be told. */
export interface Cutoff {
  readonly direct: string | null
  readonly contract: string | null
}

/** What a page is asked to describe: the last twelve months (`recent`, the default), or a calendar year. */
export type PeriodChoice = 'recent' | number

export const RECENT = 'recent' satisfies PeriodChoice

/** An analysis scope's period: a year, or a span of months. */
export type PeriodScope = { readonly year: number } | { readonly from: string; readonly to: string }

/** The period a profile describes, as the page shows and links it. */
export interface ProfilePeriod {
  /** The last twelve months through the cutoff, or a calendar year. */
  readonly kind: 'recent' | 'year'
  /** The calendar year; for the last twelve months, the year they end in. */
  readonly year: number
  /** The first month read (`YYYY-MM`). */
  readonly from: string
  /** The last month read when the period stops at SEAP's cutoff (the last twelve months, the year in progress); null for a complete year. */
  readonly through: string | null
}

export interface Period extends ProfilePeriod {
  /** The twelve months the period spans, oldest first: its month-by-month reads. */
  readonly months: readonly string[]
  readonly scope: PeriodScope
  /** What the change compares with: the twelve months before, the whole year before; null for 2019 (the year before is legacy SEAP) and the year in progress. */
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

/** `2026-05` moved by `offset` months: `2026-05`, -11 → `2025-06`. */
export function shiftMonth(month: string, offset: number): string {
  const [year, index] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year ?? 2000, (index ?? 1) - 1 + offset, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Twelve months from `from`, oldest first. */
function twelveMonths(from: string): readonly string[] {
  return Array.from({ length: 12 }, (_, index) => shiftMonth(from, index))
}

/** The page's cutoff: the earlier of the two populations' known months; null when neither is known. */
export function pageCutoff(cutoff: Cutoff | null): string | null {
  const [earliest] = [cutoff?.direct ?? null, cutoff?.contract ?? null].filter((month): month is string => month !== null).sort()
  return earliest ?? null
}

/**
 * The month the year in progress is read through: the page's cutoff, when it
 * falls in the year. None — the page then abstains from saying the year is
 * complete to any month — when no cutoff is known, or when either
 * population's still lies in the year before.
 */
export function throughMonth(year: number, cutoff: Cutoff | null): string | null {
  const month = pageCutoff(cutoff)
  return month?.startsWith(`${year}-`) ? month : null
}

/** The last twelve months' span: through the page's cutoff; null when it cannot be told. */
export function recentWindow(cutoff: Cutoff | null): { readonly from: string; readonly through: string } | null {
  const through = pageCutoff(cutoff)
  return through ? { from: shiftMonth(through, -11), through } : null
}

/** The year asked for, when a page can describe it (2019 through the year in progress); anything else, and no year, is the last twelve months. */
export function periodChoice(requested: number | undefined, latest: number): PeriodChoice {
  return requested !== undefined && Number.isInteger(requested) && requested >= DIRECT_COMPARABLE_FROM && requested <= latest + 1 ? requested : RECENT
}

/** Whether a choice's reads wait for SEAP's cutoff: the last twelve months end at it, the year in progress stops at it. */
export function needsCutoff(choice: PeriodChoice, latest: number): boolean {
  return choice === RECENT || choice > latest
}

/**
 * A choice's period. The last twelve months end at the page's cutoff and
 * compare with the twelve before; with no cutoff known they cannot be told,
 * and the page describes the last complete year instead (read again later —
 * the caller marks it partial). A year past the last complete one stops at
 * the cutoff; with no cutoff in the year it is the calendar year so far,
 * compared with nothing.
 */
export function periodOf(choice: PeriodChoice, latest: number, cutoff: Cutoff | null): Period {
  if (choice === RECENT) {
    const window = recentWindow(cutoff)
    if (!window) return periodOf(latest, latest, null)
    const { from, through } = window
    return {
      kind: 'recent',
      year: Number(through.slice(0, 4)),
      from,
      through,
      months: twelveMonths(from),
      scope: { from, to: through },
      before: { from: shiftMonth(from, -12), to: shiftMonth(through, -12) },
      range: { gte: `${from}-01`, lte: lastDayOf(through) },
    }
  }
  const year = choice
  const from = `${year}-01`
  const through = year > latest ? throughMonth(year, cutoff) : null
  if (!through) {
    return {
      kind: 'year',
      year,
      from,
      through: null,
      months: twelveMonths(from),
      scope: { year },
      // A year in progress with no known end compares with no whole year.
      before: year <= latest && year - 1 >= DIRECT_COMPARABLE_FROM ? { year: year - 1 } : null,
      range: { gte: `${year}-01-01`, lte: `${year}-12-31` },
    }
  }
  return {
    kind: 'year',
    year,
    from,
    through,
    months: twelveMonths(from),
    scope: { from, to: through },
    before: null,
    range: { gte: `${year}-01-01`, lte: lastDayOf(through) },
  }
}

/**
 * Whether a profile's period answers a choice: its own, or — for the last
 * twelve months — the last complete year it fell back to when no cutoff was
 * known (the profile is then partial, and read again).
 */
export function answersChoice(period: ProfilePeriod, choice: PeriodChoice): boolean {
  return choiceOf(period) === choice || (choice === RECENT && period.kind === 'year')
}

/** The calendar year a page describes; null for the last twelve months. */
export function periodYear(period: ProfilePeriod): number | null {
  return period.kind === 'year' ? period.year : null
}

/** A link to another profile page on the same period: its year — or nothing, the last twelve months being the default. */
export function periodLinkSearch(period: ProfilePeriod): { readonly year?: number } {
  return period.kind === 'year' ? { year: period.year } : {}
}

/** The year in progress, read so far: a part of a year, said as such. */
export function isPartYear(period: ProfilePeriod): boolean {
  return period.kind === 'year' && period.through !== null
}

/** The part of a period a profile keeps: what the page shows and links. */
export function profilePeriodOf(period: Period): ProfilePeriod {
  return { kind: period.kind, year: period.year, from: period.from, through: period.through }
}

/** The choice a profile's period answers: the page's dropdown value, the link to another page on the same period. */
export function choiceOf(period: ProfilePeriod): PeriodChoice {
  return period.kind === 'recent' ? RECENT : period.year
}
