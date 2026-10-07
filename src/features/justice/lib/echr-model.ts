import type { EchrJudgment, EchrSnapshot, EchrVersion, EchrYear } from './echr-snapshot-types'

/**
 * The ECHR page's model, pure: the snapshot's years and judgments, what a
 * year adds up to, and how long its applications waited. No figure here is
 * the Court's own statistic: the waits are read from the application
 * numbers (their suffix is the year an application was lodged), by
 * Transparenta.eu.
 */

/** The year an application was lodged, from its number's suffix (`6946/03` → 2003); null for a number of another shape. */
export function lodgedYear(application: string): number | null {
  const match = /^\d+\/(\d{2})$/u.exec(application.trim())
  if (!match?.[1]) return null
  const suffix = Number(match[1])
  // The Court received its first applications in 1959; a suffix of 59 or more is the 1900s.
  return suffix >= 59 ? 1900 + suffix : 2000 + suffix
}

/** The years from the oldest application a judgment decides to the judgment; null when no number gives a year. */
export function waitYears(judgment: Pick<EchrJudgment, 'date' | 'applications'>): number | null {
  const years = judgment.applications.map(lodgedYear).filter((year): year is number => year !== null)
  if (years.length === 0) return null
  return Number(judgment.date.slice(0, 4)) - Math.min(...years)
}

/** The median of whole years, the lower middle for an even count; null for none. */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? (sorted[middle] ?? null) : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

export function yearsOf(snapshot: EchrSnapshot): readonly number[] {
  return snapshot.years.map((entry) => entry.year)
}

/** „2009–2026": the years the snapshot holds. */
export function yearSpan(snapshot: EchrSnapshot): string {
  const years = yearsOf(snapshot)
  return years.length > 0 ? `${Math.min(...years)}–${Math.max(...years)}` : ''
}

/**
 * The first year the capture holds whole. Checked against HUDOC's own search
 * on 2026-10-07: every year from 2010 holds HUDOC's judgments against Romania,
 * ECLI for ECLI; 2009 holds 153 of its 168.
 */
export const ECHR_FIRST_WHOLE_YEAR = 2010

/** The last year the capture holds whole: the one before its newest document's. */
export function referenceYear(snapshot: EchrSnapshot): number {
  return Number(snapshot.newest.slice(0, 4)) - 1
}

/** How whole a year is: before the capture went whole, the capture's last (running) year, or whole. */
export function yearState(snapshot: EchrSnapshot, year: number): 'partial' | 'running' | 'whole' {
  if (year < ECHR_FIRST_WHOLE_YEAR) return 'partial'
  return year > referenceYear(snapshot) ? 'running' : 'whole'
}

/** A year the page can describe, or the reference year for any other. */
export function askedYear(snapshot: EchrSnapshot, value: unknown): number {
  const year = typeof value === 'number' ? value : typeof value === 'string' && /^\d{4}$/u.test(value) ? Number(value) : NaN
  return yearsOf(snapshot).includes(year) ? year : referenceYear(snapshot)
}

export function judgmentsIn(snapshot: EchrSnapshot, year: number): readonly EchrJudgment[] {
  const prefix = `${year}-`
  return snapshot.judgments.filter((judgment) => judgment.date.startsWith(prefix))
}

export function yearEntry(snapshot: EchrSnapshot, year: number): EchrYear | null {
  return snapshot.years.find((entry) => entry.year === year) ?? null
}

export type EchrFigures = {
  readonly year: number
  readonly judgments: number
  /** The judgments of the year before; null when the snapshot has none. */
  readonly judgmentsBefore: number | null
  readonly applications: number
  /** The median wait of the year's judgments, in years; null with no judgment. */
  readonly medianWait: number | null
  /** The judgments deciding more than one application. */
  readonly joined: number
  readonly communicated: number
  readonly decisions: number
  readonly state: 'partial' | 'running' | 'whole'
  /** The judgments' change on the year before, only between two whole years. */
  readonly change: number | null
}

export function figuresOf(snapshot: EchrSnapshot, year: number): EchrFigures {
  const entry = yearEntry(snapshot, year)
  const judgments = judgmentsIn(snapshot, year)
  const waits = judgments.map(waitYears).filter((wait): wait is number => wait !== null)
  const before = yearEntry(snapshot, year - 1)?.judgments ?? null
  const count = entry?.judgments ?? 0
  const compares = yearState(snapshot, year) === 'whole' && yearState(snapshot, year - 1) === 'whole' && before !== null && before > 0
  return {
    year,
    judgments: count,
    judgmentsBefore: before,
    applications: entry?.applications ?? 0,
    medianWait: median(waits),
    joined: judgments.filter((judgment) => judgment.applications.length > 1).length,
    communicated: entry?.communicated ?? 0,
    decisions: entry?.decisions ?? 0,
    state: yearState(snapshot, year),
    change: compares ? (count - before) / before : null,
  }
}

/** Every year's median wait, for the years band. */
export function medianWaitByYear(snapshot: EchrSnapshot): ReadonlyMap<number, number | null> {
  return new Map(yearsOf(snapshot).map((year) => [year, median(judgmentsIn(snapshot, year).map(waitYears).filter((wait): wait is number => wait !== null))]))
}

/** A judgment's page on HUDOC, in its language's interface. */
export function hudocUrl(version: EchrVersion): string {
  return `https://hudoc.echr.coe.int/${version.language === 'fr' ? 'fre' : 'eng'}?i=${encodeURIComponent(version.item)}`
}
