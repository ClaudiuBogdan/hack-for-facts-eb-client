import { displayCompanyName } from '@/features/private-companies/lib/company-profile-model'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import type { NgoIdentityMethod, NgoOrganization, NgoStatement } from './api'

/**
 * The NGO profile's reading of `ngoOrganizationProfile`, as pure functions:
 * names and places for people, exact amounts, a statement read by its own
 * labels, and the few figures the page leads with.
 *
 * The API gives no standard metrics — each statement carries its year's
 * dictionary — so every figure here is found by its label, never by its code,
 * and a year whose labels do not say it stays empty.
 */

// ─────────────────────────────────────────────────────────── the words ──

/** Registry capitals drop the diacritics of the words every name starts with. */
const NGO_WORDS: Readonly<Record<string, string>> = {
  ASOCIATIA: 'Asociația',
  FUNDATIA: 'Fundația',
  ORGANIZATIA: 'Organizația',
  FEDERATIA: 'Federația',
  UNIUNEA: 'Uniunea',
  LIGA: 'Liga',
}

/** „ASOCIATIA BANCA PENTRU ALIMENTE" → „Asociația Banca pentru Alimente". */
export function displayNgoName(name: string): string {
  const cleaned = name.replace(/\s+/gu, ' ').trim()
  const [first = '', ...rest] = cleaned.split(' ')
  const lead = NGO_WORDS[first.replace(/[^\p{L}]/gu, '').toUpperCase()]
  return lead && rest.length > 0 ? `${lead} ${displayCompanyName(rest.join(' '))}` : displayCompanyName(cleaned)
}

const fold = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/-/g, ' ').toUpperCase().trim()

export function countyOf(name: string | null): { readonly code: string; readonly name: string } | null {
  if (!name) return null
  const county = ROMANIA_COUNTIES.find((entry) => fold(entry.nameRo) === fold(name))
  return county ? { code: county.code, name: county.nameRo } : null
}

/** „SECTORUL 3 - BUCURESTI" → „Sectorul 3"; „BORSEC - HR" → „Borsec". */
export function localityOf(locality: string | null): string | null {
  if (!locality) return null
  const town = locality.replace(/\s+-\s+[\p{L} ]+$/u, '').trim()
  return town ? displayCompanyName(town) : null
}

/** „Sectorul 3, București"; the county alone where the town is the county's name („București"). */
export function placeOf(organization: Pick<NgoOrganization, 'county' | 'locality'>): string | null {
  const county = countyOf(organization.county)
  const town = localityOf(organization.locality)
  if (!town) return county?.name ?? null
  if (!county || fold(town) === fold(county.name)) return county?.name ?? town
  return `${town}, ${county.name}`
}

export type RegistryStatus = 'registered' | 'dissolved' | 'inLiquidation' | 'deregistered' | 'unknown'

export function statusOf(organization: Pick<NgoOrganization, 'sourceRegistryStatus'>): RegistryStatus {
  switch (organization.sourceRegistryStatus) {
    case 'Inregistrat':
      return 'registered'
    case 'Dizolvata':
      return 'dissolved'
    case 'In Lichidare':
      return 'inLiquidation'
    case 'Radiat':
      return 'deregistered'
    default:
      return 'unknown'
  }
}

/** Whether the platform only inferred the CUI; the page says so wherever the CUI's data leads. */
export function isInferred(method: NgoIdentityMethod): boolean {
  return method === 'fiscal_exact_name_county' || method === 'document_registration_bridge'
}

// ─────────────────────────────────────────────────────────── the money ──

const INTEGER = /^-?\d+$/

/** A filed value: the exact string, and a number only where one is safe to draw with. */
export interface Amount {
  readonly raw: string | null
  readonly value: number | null
}

export function amountOf(raw: string | null): Amount {
  if (raw === null || !INTEGER.test(raw)) return { raw: null, value: null }
  const value = Number(raw)
  return { raw, value: Number.isSafeInteger(value) ? value : null }
}

/**
 * An exact integer string grouped by thousands without passing through a
 * float („4539948" → „4.539.948"), so no filed value is ever rounded.
 */
export function formatExact(raw: string, locale: 'ro' | 'en'): string {
  const negative = raw.startsWith('-')
  const digits = raw.replace(/^-/, '').replace(/^0+(?=\d)/, '')
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, locale === 'ro' ? '.' : ',')
  return `${negative ? '−' : ''}${grouped}`
}

// ────────────────────────────────────────────────────── the statement ──

/** The two columns of the non-profit form: the year's plan, and what happened by 31 December. */
export type StatementColumn = 'planned' | 'actual'

/**
 * A label's base and column. The dictionaries date the column („la
 * 31.12.2024") and the date is often a stale copy — the 2025 dictionary says
 * 2024 — so the year always comes from the statement, never from the label.
 */
export function parseLabel(label: string): { readonly base: string; readonly column: StatementColumn | null } {
  const text = label.replace(/\s+/gu, ' ').trim()
  const planned = /\s*-\s*prevederi anuale\s*$/iu
  const actual = /\s*-\s*la 31\.12\.\d{4}\s*$/iu
  if (planned.test(text)) return { base: text.replace(planned, ''), column: 'planned' }
  if (actual.test(text)) return { base: text.replace(actual, ''), column: 'actual' }
  return { base: text, column: null }
}

export interface StatementRow {
  readonly base: string
  readonly codes: readonly string[]
  readonly planned: Amount | null
  readonly actual: Amount
  readonly kind: 'balance' | 'result' | 'staff'
}

/** The statement as rows: a planned and an actual cell under one base become one row with two columns. */
export function statementRows(statement: NgoStatement): readonly StatementRow[] {
  const rows: StatementRow[] = []
  for (const { code, label, value } of statement.indicators) {
    const { base, column } = parseLabel(label)
    const staff = /^efectivul de personal/iu.test(base)
    const previous = rows[rows.length - 1]
    if (column === 'actual' && previous && previous.base === base && previous.planned !== null) {
      rows[rows.length - 1] = { ...previous, codes: [...previous.codes, code], actual: amountOf(value) }
      continue
    }
    rows.push({
      base,
      codes: [code],
      planned: column === 'planned' ? amountOf(value) : null,
      actual: column === 'planned' ? { raw: null, value: null } : amountOf(value),
      kind: staff ? 'staff' : column ? 'result' : 'balance',
    })
  }
  return rows
}

const FIGURE_LABELS = {
  revenue: /^venituri totale$/iu,
  expenses: /^cheltuieli totale$/iu,
  surplus: /^excedent\/profit$/iu,
  deficit: /^deficit\/pierdere$/iu,
  nonProfit: /^venituri din activit[aă][tț]ile f[aă]r[aă] scop patrimonial$/iu,
  economic: /^venituri din activit[aă][tț]ile economice$/iu,
  special: /^venituri din activit[aă][tț]ile cu destina[tț]ie special[aă]$/iu,
  cash: /^casa [sș]i conturi la b[aă]nci$/iu,
  debts: /^datorii$/iu,
} as const

export type FigureKey = keyof typeof FIGURE_LABELS

/** The figures a page leads with, each the actual column of the row its label names; absent where no label does. */
export function keyFigures(statement: NgoStatement): Readonly<Record<FigureKey, Amount | null>> {
  const rows = statementRows(statement)
  const find = (pattern: RegExp) => rows.find((row) => pattern.test(row.base.replace(/^[A-Z]\.\s*/u, '')))?.actual ?? null
  return Object.fromEntries(Object.entries(FIGURE_LABELS).map(([key, pattern]) => [key, find(pattern)])) as Record<FigureKey, Amount | null>
}

export interface YearPoint {
  readonly year: number
  readonly statement: NgoStatement | null
  readonly revenue: number | null
  readonly expenses: number | null
}

/**
 * Every year from the first statement to the last, the missing ones kept as
 * gaps: a year without a statement in the published files is unknown, not a
 * zero and not a proof that nothing was filed.
 */
export function yearSeries(statements: readonly NgoStatement[]): readonly YearPoint[] {
  const sorted = [...statements].sort((a, b) => a.fiscalYear - b.fiscalYear)
  const first = sorted[0]?.fiscalYear
  const last = sorted[sorted.length - 1]?.fiscalYear
  if (first === undefined || last === undefined) return []
  const byYear = new Map(sorted.map((statement) => [statement.fiscalYear, statement]))
  return Array.from({ length: last - first + 1 }, (_, index) => {
    const year = first + index
    const statement = byYear.get(year) ?? null
    const figures = statement ? keyFigures(statement) : null
    return { year, statement, revenue: figures?.revenue?.value ?? null, expenses: figures?.expenses?.value ?? null }
  })
}

export function latestStatement(statements: readonly NgoStatement[]): NgoStatement | null {
  return [...statements].sort((a, b) => b.fiscalYear - a.fiscalYear)[0] ?? null
}

/**
 * The year's result: a surplus as a positive number, a deficit as a negative
 * one, zero only where both rows report zero, and null where the rows do not
 * say — a zero beside a blank cell is not a zero result.
 */
export function resultOf(statement: NgoStatement): number | null {
  const { surplus, deficit } = keyFigures(statement)
  if (surplus?.value && surplus.value > 0) return surplus.value
  if (deficit?.value && deficit.value > 0) return -deficit.value
  if (surplus?.value === 0 && deficit?.value === 0) return 0
  return null
}
