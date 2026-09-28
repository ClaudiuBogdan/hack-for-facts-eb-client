import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'

/**
 * The front door's read model: what `/procurement` may say about public
 * procurement in one calendar year, as pure data. Every figure keeps the
 * population it was counted over, so a sentence can say what it sums and a
 * component never has to guess.
 *
 * Semantics the page must not lose (`docs/design/procurement/design.md` §12.1):
 * - SEAP money is the AWARDED value, never payments.
 * - Contract awards and direct acquisitions are separate populations: side by
 *   side, never summed, never one a share of the other.
 * - Framework agreements carry a ceiling, not a purchase: counted, never priced.
 * - A contract award's money covers only the awards with an accepted value,
 *   and until the framework-role build is served it still counts some
 *   framework ceilings as awards — the page marks it provisional.
 * - Consortium money belongs to no single firm: no firm's total holds it.
 * - A count the gate withheld is null: unknown, never 0.
 */

export type HomeGrain = 'contract' | 'direct'

export interface PopulationFigures {
  /** Records in the year; null when the gate withheld the count. */
  readonly count: number | null
  /** Records with an accepted, comparable value. */
  readonly valued: number | null
  /** Σ accepted awarded value, lei; null when the spend gate abstains. */
  readonly value: number | null
  /** Distinct buyers (CUIs) with at least one record. */
  readonly buyers: number | null
  /** Distinct suppliers (CUIs) with at least one record. */
  readonly suppliers: number | null
}

export interface RankedRow {
  /** The dimension key: a CUI, a procedure type, a county code. */
  readonly key: string
  readonly label: string
  readonly count: number
  readonly value: number | null
  /** Share of the scope on the basis the server ranked by. */
  readonly share: number | null
}

export interface Ranking {
  /** What the server actually ranked by — value only where the spend gate allowed it. */
  readonly rankedBy: 'value' | 'count'
  readonly rows: readonly RankedRow[]
}

export interface YearPoint {
  readonly year: number
  readonly value: number | null
  readonly count: number | null
}

export interface MonthPoint {
  /** `YYYY-MM`. */
  readonly month: string
  readonly count: number
}

export interface CountyFigure {
  /** The county code (`CJ`, `B`). */
  readonly code: string
  /** Null when the API published no money for the county: unknown, never 0. */
  readonly value: number | null
  readonly count: number
}

export interface NationalRead {
  /** The calendar year the page describes: the last complete one. */
  readonly year: number
  readonly contract: PopulationFigures
  /** Framework agreements signed in the year: counted only (a ceiling is not a purchase). */
  readonly frameworks: number | null
  readonly direct: PopulationFigures
  readonly buyers: Readonly<Record<HomeGrain, Ranking>>
  /** Direct-acquisition sellers by value (contract money of a firm leaves out its consortia). */
  readonly directSellers: Ranking
  /** Contract awards by procedure type, by number. */
  readonly procedures: Ranking
  readonly counties: Readonly<Record<HomeGrain, readonly CountyFigure[]>>
  /** Direct acquisitions per year, from the first comparable year. */
  readonly directYears: readonly YearPoint[]
  /** The newest month each population is complete enough to read. */
  readonly cutoff: Readonly<Record<HomeGrain, string | null>>
  /**
   * Contract-award money that went to consortia: SEAP publishes the whole
   * award, not each member's part, so no firm's total holds it. `total` is the
   * awards' money (firms + unknown + consortia).
   */
  readonly consortium: { readonly withheld: number; readonly total: number } | null
}

export interface HomeParty {
  readonly cui: string | null
  readonly name: string
}

export interface RecentRecord {
  readonly id: string
  readonly grain: HomeGrain
  readonly date: string | null
  readonly title: string | null
  /** The record's CPV code: names it by what it bought when SEAP left the title empty. */
  readonly cpvCode: string | null
  readonly buyer: HomeParty
  /** Every winner named on the award; more than one is a consortium. */
  readonly winners: readonly HomeParty[]
  readonly value: number
}

// ─────────────────────────────────────────────────────────── the year ──

/** The year the page describes: the last complete calendar year. */
export function homeYear(now: Date = new Date()): number {
  return now.getFullYear() - 1
}

/**
 * The first year direct acquisitions compare with the years after: the
 * legacy SEAP rows of 2016–2018 cannot tell a purchase from a refused offer.
 */
export const DIRECT_COMPARABLE_FROM = 2019

/**
 * The newest month the source is complete enough to read: the last month
 * holding at least half the records of a typical month of the described
 * year. SEAP's feed stops in steps, so its newest months thin out before
 * they end — shown as they are, they would read as a collapse.
 */
export function cutoffMonth(points: readonly MonthPoint[], year: number): string | null {
  const typical = points
    .filter((point) => point.month.startsWith(`${year}-`))
    .map((point) => point.count)
    .sort((a, b) => a - b)
  const median = typical[Math.floor(typical.length / 2)]
  if (median === undefined || median <= 0) return null
  const full = points.filter((point) => point.count >= median / 2).map((point) => point.month).sort()
  return full[full.length - 1] ?? null
}

/** The first and last years of a rising series worth a sentence, or null. */
export function seriesSpan(points: readonly YearPoint[], from: number, to: number): { readonly first: YearPoint; readonly last: YearPoint } | null {
  const full = points.filter((point) => point.year >= from && point.year <= to && point.value !== null)
  const first = full[0]
  const last = full[full.length - 1]
  return first && last && first.year < last.year ? { first, last } : null
}

// ─────────────────────────────────────────────────────── the counties ──

export interface CountyRate {
  readonly code: string
  readonly value: number
}

/**
 * A county figure over its residents. `per` scales it (1 for lei per
 * resident, 100,000 for contracts per 100k). A county with no measure or no
 * population is left out — hatched on the map, never a zero. `national` is
 * the counties' own ratio (their sum over their population), never a mean of
 * rates; the page's national figure is the country's (all records over the
 * national population), which the caller computes.
 */
export function perResidents(
  counties: readonly CountyFigure[],
  population: ReadonlyMap<string, number>,
  measure: (county: CountyFigure) => number | null,
  per = 1,
): { readonly values: readonly CountyRate[]; readonly national: number | null } {
  const values: CountyRate[] = []
  let sum = 0
  let people = 0
  for (const county of counties) {
    const residents = population.get(county.code)
    const amount = measure(county)
    if (!residents || amount === null) continue
    values.push({ code: county.code, value: (amount / residents) * per })
    sum += amount
    people += residents
  }
  return { values, national: people > 0 ? (sum / people) * per : null }
}

/**
 * The year in progress, counted only through the source's cutoff month: the
 * months after it are the feed thinning out, and a column that summed them
 * would say more than „until May". A year whose cutoff falls before it keeps
 * no column at all.
 */
export function truncatePartYear(
  years: readonly YearPoint[],
  months: readonly { readonly month: string; readonly value: number | null; readonly count: number | null }[],
  partYear: number,
  cutoff: string | null,
): readonly YearPoint[] {
  const prefix = `${partYear}-`
  if (!years.some((point) => point.year === partYear)) return years
  if (!cutoff || !cutoff.startsWith(prefix)) return years.filter((point) => point.year !== partYear)
  const kept = months.filter((point) => point.month.startsWith(prefix) && point.month <= cutoff)
  const value = kept.some((point) => point.value !== null) ? kept.reduce((sum, point) => sum + (point.value ?? 0), 0) : null
  const count = kept.some((point) => point.count !== null) ? kept.reduce((sum, point) => sum + (point.count ?? 0), 0) : null
  return years.map((point) => (point.year === partYear ? { year: partYear, value, count } : point))
}

// ───────────────────────────────────────────────────────── the labels ──

/** SEAP spells procedure types without diacritics; the page names them properly. */
const PROCEDURE_LABELS: Readonly<Record<string, MessageDescriptor>> = {
  'licitatie deschisa': msg`Licitație deschisă`,
  'licitatie deschisa accelerata': msg`Licitație deschisă accelerată`,
  'licitatie restransa': msg`Licitație restrânsă`,
  'licitatie restransa accelerata': msg`Licitație restrânsă accelerată`,
  'procedura simplificata': msg`Procedură simplificată`,
  'procedura simplificata proprie': msg`Procedură simplificată proprie`,
  'negociere fara publicare prealabila': msg`Negociere fără anunț prealabil`,
  'negociere cu publicare prealabila': msg`Negociere cu anunț prealabil`,
  'procedura competitiva cu negociere': msg`Procedură competitivă cu negociere`,
  'norme proprii (anexa 2)': msg`Norme proprii (servicii din anexa 2)`,
  'cerere de oferta': msg`Cerere de ofertă`,
  'dialog competitiv': msg`Dialog competitiv`,
  'parteneriat pentru inovare': msg`Parteneriat pentru inovare`,
  'concurs de solutii': msg`Concurs de soluții`,
}

export function procedureLabel(key: string): MessageDescriptor | null {
  return PROCEDURE_LABELS[key.trim().toLowerCase()] ?? null
}

/** Awarded without a public call for competition: a fact about the route, not a finding. */
export function isUnpublishedProcedure(key: string): boolean {
  return key.trim().toLowerCase() === 'negociere fara publicare prealabila'
}

const LETTERS = /[A-Za-zĂÂÎȘŞȚŢăâîșşțţ]/g
const UPPER = /[A-ZĂÂÎȘŞȚŢ]/g
const KEEP_UPPER = new Set(['SA', 'SRL', 'S.A.', 'S.R.L.', 'SCS', 'SNC', 'RA', 'CN', 'SN', 'CNAIR', 'CNIR', 'ANAF', 'ADR', 'ISU', 'IT', 'SC', 'CFR'])
const KEEP_LOWER = new Set(['de', 'si', 'și', 'pentru', 'al', 'a', 'din', 'la', 'cu', 'in', 'în'])

function shouted(text: string): boolean {
  const letters = text.match(LETTERS)?.length ?? 0
  const upper = text.match(UPPER)?.length ?? 0
  return letters >= 4 && upper / letters >= 0.8
}

/** Registry names arrive in capitals; set them the way a reader writes them, legal forms kept. */
export function tidyName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  if (!shouted(trimmed)) return trimmed
  const words = trimmed.toLocaleLowerCase('ro-RO').split(/(\s+|-|\()/)
  return words
    .map((word, index) => {
      const upper = word.toLocaleUpperCase('ro-RO')
      if (KEEP_UPPER.has(upper)) return upper
      if (index > 0 && KEEP_LOWER.has(word)) return word
      return word.charAt(0).toLocaleUpperCase('ro-RO') + word.slice(1)
    })
    .join('')
}

/** Acronyms a procurement title carries; any other word in capitals is a word shouted. */
const TITLE_ACRONYMS = new Set([
  'IT', 'PC', 'TV', 'LED', 'LCD', 'USB', 'SSD', 'HDD', 'RAM', 'CPU', 'GPS', 'PVC', 'UPS', 'DJI', 'HDMI', 'LAN', 'GSM', 'SIM', 'NFC', 'RFID', 'CD', 'DVD', 'DSLR',
  'PNRR', 'CPV', 'DCI', 'ATB', 'OUG', 'HG', 'UE', 'EU', 'ISU', 'PSI', 'SSM', 'CFR', 'ADR', 'GPL', 'SRL', 'SA', 'RA', 'BNR', 'CNAS', 'ANAF', 'TVA', 'ID', 'IP', 'CHE',
  'RCA', 'CASCO', 'ITP', 'DDD', 'ISCIR', 'HACCP', 'GDPR', 'DALI', 'DTAC',
])
/** A model or a series numbered in Roman numerals („MODEL II") keeps them. */
const ROMAN = /^[IVX]{1,4}$/u
/** One-letter Romanian words („REPARATII A AUTOVEHICULELOR", „O ZI"): any other single letter is a label. */
const LETTER_WORDS = new Set(['A', 'O', 'E', 'Ă', 'Î'])
/** Words a letter labels („CORP A", „LOT A"): the letter after them stays a label. */
const LABELLED = new Set(['LOT', 'LOTUL', 'CORP', 'CORPUL', 'BLOC', 'BLOCUL', 'SCARA', 'TIP', 'TIPUL', 'CLASA', 'CATEGORIA', 'ZONA', 'ANEXA', 'VARIANTA'])

function titleWord(word: string, before: string | undefined): string {
  const letters = word.replace(/[^\p{L}]/gu, '')
  const upper = letters.toLocaleUpperCase('ro-RO')
  const label = letters.length === 1 && (!LETTER_WORDS.has(upper) || LABELLED.has((before ?? '').replace(/[^\p{L}]/gu, '').toLocaleUpperCase('ro-RO')))
  if (letters.length === 0 || label || /\d/u.test(word) || ROMAN.test(letters) || TITLE_ACRONYMS.has(upper)) return word
  return word.toLocaleLowerCase('ro-RO')
}

/** The first letter raised — not in a word that capitalises its second („iPad"). */
const raised = (text: string) => (/^\p{Ll}\p{Lu}/u.test(text) ? text : text.charAt(0).toLocaleUpperCase('ro-RO') + text.slice(1))

/**
 * A title set in capitals reads in sentence case (DESIGN.md log, 2026-09-25):
 * every word lower case but a known acronym (IT, PNRR), a word with a digit
 * („10MM", „H2970"), a Roman numeral and a letter used as a label („CORP B")
 * — each part of a dotted word read on its own („ECHIPAMENTE.IT" →
 * „Echipamente.IT"). Anything else stays as SEAP wrote it, its first letter
 * raised.
 */
export function tidyTitle(title: string | null): string | null {
  if (!title) return null
  const trimmed = title.trim().replace(/\s+/g, ' ')
  if (trimmed === '') return null
  if (!shouted(trimmed)) return raised(trimmed)
  const words = trimmed.split(' ')
  return raised(words.map((word, index) => word.split('.').map((part) => titleWord(part, words[index - 1])).join('.')).join(' '))
}
