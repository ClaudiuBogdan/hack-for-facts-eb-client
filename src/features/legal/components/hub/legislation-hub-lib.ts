import { t } from '@lingui/core/macro'
import type { HomeSection } from '@/features/procurement/lib/home-links'
import type { LegalAnalyticsActRow, LegalAnalyticsArgs, LegalAnalyticsLinks, LegalAnalyticsSeries } from '@/schemas/legal-analytics'
import { DEFAULT_QUESTION, searchOfQuestion, type Question } from '../../lib/analytics-question'
import { everyYear } from '../../lib/analytics-years'

/**
 * The legislation hub's arithmetic, reads and addresses, apart from its markup: which answers the server
 * renders, what a link to the analysis page carries, what a chart draws, how an act is named. Pure, so the
 * page stays a composition.
 */

export const PORTAL_URL = 'https://legislatie.just.ro'
export const GAZETTE_URL = 'https://monitoruloficial.ro'

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
/** The acts the head's card ranks: five, so the head stays compact (owner, 25 November 2026). */
export const HEAD_ACTS_SHOWN = 5
export const ISSUERS_SHOWN = 8
export const GAZETTE_SHOWN = 6

/**
 * The Portal's generated citation for an act it gives no number („Doc nr. 47355" is the Constitution): not a
 * citation a reader knows, so the act goes by its title alone.
 */
const GENERATED_CITATION = /^Doc nr\./u

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
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0)
  const last = Math.max(YEARS_FROM, ...series.years.map((row) => row.year))
  const years = everyYear(
    series.years.map((row) => ({ year: row.year, values: row.acts })),
    series.keys.length + 1,
    { from: YEARS_FROM, to: last },
  )
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

/**
 * The answers the server renders into the page: the aggregate views only (the server keeps and caches them by
 * URL). The page goes out publicly cached, so nothing that names an act is among them: the acts ranking and the
 * links are read in the browser, on every visit, as the API serves them `no-store`.
 */
export const LEGAL_HUB_SERVER_READS = [
  ['head', {}],
  ['summary', {}],
  ['series', { lens: 'felul' }],
  ['breakdown', { lens: 'issuer', limit: ISSUERS_SHOWN + 1 }],
] as const satisfies readonly (readonly ['head' | 'summary' | 'series' | 'breakdown', LegalAnalyticsArgs])[]

/** The head's ranking, as the address says it (`clasament`): the acts most amended, or most cited. */
export type HubRanking = 'modificate' | 'citate'
export const DEFAULT_HUB_RANKING: HubRanking = 'modificate'

/** The acts read the head's card makes for a ranking. */
export function hubActsArgs(ranking: HubRanking): LegalAnalyticsArgs {
  return { order: ranking === 'citate' ? 'cited' : 'amended', limit: HEAD_ACTS_SHOWN }
}

/** The page's bands, in order: the pinned bar's links and each band's number. */
export function legalHubSections(): readonly HomeSection[] {
  return [
    { id: 'schimbari', label: t`Schimbări` },
    { id: 'feluri', label: t`Felul actelor` },
    { id: 'emitenti', label: t`Emitenți` },
    { id: 'ani', label: t`An de an` },
    { id: 'legaturi', label: t`Legături` },
    { id: 'monitor', label: t`Monitorul Oficial` },
  ]
}
