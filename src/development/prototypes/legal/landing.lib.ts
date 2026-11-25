import { DEFAULT_QUESTION, searchOfQuestion, type Question } from '@/features/legal/lib/analytics-question'
import type { LegalAnalyticsActRow, LegalAnalyticsLinks, LegalAnalyticsSeries } from '@/schemas/legal-analytics'

/**
 * The landing prototype's arithmetic and addresses, apart from its markup: what a link to the analysis page
 * carries, what a chart draws, how a leader is named. Pure, so the page stays a composition.
 */

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
export const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

export const PORTAL_URL = 'https://legislatie.just.ro'
export const GAZETTE_URL = 'https://monitoruloficial.ro'

/** The examples the current front door offers: act numbers and act names, the only shapes the finder answers. */
export const SEARCH_EXAMPLES = ['Codul fiscal', 'Codul muncii', 'OUG 57/2019', 'Legea 98/2016'] as const

/**
 * The analysis page's address of a question, written by the page's own writer (`searchOfQuestion`): only keys
 * its parser reads, only what differs from the default question.
 */
export function analysisSearch(patch: Partial<Question> = {}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(searchOfQuestion({ ...DEFAULT_QUESTION, ...patch }))) {
    if (value !== undefined) out[key] = value
  }
  return out
}

/** A civil date `days` before another, both `YYYY-MM-DD`. */
export function isoDaysBefore(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

/** The window the changes band counts: this many days, ending today. */
export const CHANGES_WINDOW_DAYS = 30
export const CHANGES_SHOWN = 8
export const LEADERS_SHOWN = 10
export const ISSUERS_SHOWN = 8
export const GAZETTE_SHOWN = 6

/**
 * The Portal's generated citation for an act it gives no number („Doc nr. 47355" is the Constitution): not a
 * citation a reader knows, so the act goes by its title alone.
 */
const GENERATED_CITATION = /^Doc nr\./u

/** A leader's name: the title first and the citation under it; the title alone under a generated citation. */
export function leaderName(act: Pick<LegalAnalyticsActRow, 'citation' | 'title'>): { readonly primary: string; readonly secondary: string | null } {
  const title = act.title?.trim() ?? ''
  if (title === '') return { primary: act.citation, secondary: null }
  if (GENERATED_CITATION.test(act.citation)) return { primary: title, secondary: null }
  return { primary: title, secondary: act.citation }
}

/** The day the Portal's title ends on („LEGE (R) 95 14/04/2006") and its republication mark. */
const TITLE_DAY = /\s*\d{1,2}\/\d{1,2}\/\d{4}\s*$/u
const REPUBLISHED = /\s*\(R\)/gu

/**
 * An act in one line. The Portal's title is most often its citation said again („HG 1705 29/11/2006" for
 * „HG nr. 1705/2006"): then the act goes by its citation alone. A title that is a name („COD FISCAL",
 * „CONSTITUTIE") is the act's name, in the source's own spelling, with its citation beside it unless the
 * citation is one the Portal generated.
 */
export function actName(act: Pick<LegalAnalyticsActRow, 'citation' | 'title'>): { readonly name: string; readonly citation: string | null } {
  const words = (act.title ?? '').replace(TITLE_DAY, '').replace(REPUBLISHED, '').trim()
  const generated = GENERATED_CITATION.test(act.citation)
  if (words !== '' && !/\d/u.test(words)) {
    const name = words.charAt(0).toLocaleUpperCase('ro') + words.slice(1).toLocaleLowerCase('ro')
    return { name, citation: generated ? null : act.citation }
  }
  return { name: generated && words !== '' ? words : act.citation, citation: null }
}

/** The years chart starts here: the corpus holds a few hundred earlier acts, in scattered years. */
export const YEARS_FROM = 1990

export type YearsChart = {
  /** One column a year from `YEARS_FROM` to the last year served, a year without acts as zeros. */
  readonly years: readonly { readonly year: number; readonly values: readonly number[] }[]
  /** Acts of the years before `YEARS_FROM`: counted by the API, not drawn. */
  readonly earlier: number
  /** The year with the most acts among those drawn, and its acts. */
  readonly peak: { readonly year: number; readonly acts: number } | null
}

export function yearsChart(series: LegalAnalyticsSeries): YearsChart {
  const width = series.keys.length + 1
  const byYear = new Map(series.years.map((row) => [row.year, row.acts]))
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0)
  const last = Math.max(YEARS_FROM, ...series.years.map((row) => row.year))
  const years: { year: number; values: readonly number[] }[] = []
  for (let year = YEARS_FROM; year <= last; year += 1) {
    years.push({ year, values: byYear.get(year) ?? Array.from({ length: width }, () => 0) })
  }
  let peak: YearsChart['peak'] = null
  for (const row of years) {
    const acts = sum(row.values)
    if (acts > 0 && (peak === null || acts > peak.acts)) peak = { year: row.year, acts }
  }
  const earlier = series.years.filter((row) => row.year < YEARS_FROM).reduce((total, row) => total + sum(row.acts), 0)
  return { years, earlier, peak }
}

/** The kinds of link the band counts, in the order it shows them. */
export const LINK_KINDS = ['amends', 'court_names', 'promulgates', 'approves_ordinance', 'rejects_ordinance'] as const
export type LinkKind = (typeof LINK_KINDS)[number]

/** Of one kind of link: those whose target is an act of the corpus, and all those read in titles. */
export function linkCounts(links: LegalAnalyticsLinks, kind: LinkKind): { readonly resolved: number; readonly read: number } {
  let resolved = 0
  let read = 0
  for (const row of links.byKind) {
    if (row.kind !== kind) continue
    read += row.links
    if (row.note === 'resolved') resolved += row.links
  }
  return { resolved, read }
}
