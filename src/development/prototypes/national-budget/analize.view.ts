/**
 * The analysis page's reading of its address: which bulletin, law or ANAF
 * year a question reads, how the question is said, and the ready questions.
 * Pure; the words are the prototype's.
 */
import { t } from '@lingui/core/macro'

import type { BudgetCatalog, BudgetEdition } from '@/schemas/national-budget-page'
import { coverageText, inSentence, lineLabel, scopeOf } from './budget.format'
import type { AnalysisState, Axis, Population } from './budget.state'

// ───────────────────────────────────────────────────────────── periods ──

/** The bulletin a year reads: December, or the year in progress's newest month. Null when the catalog has no month that year. */
export function releaseMonthOf(catalog: BudgetCatalog, year: number): string | null {
  const ofYear = catalog.releases.filter((release) => release.periodEnd.startsWith(String(year)))
  if (ofYear.length === 0) return null
  const december = ofYear.find((release) => release.periodEnd.slice(5, 7) === '12')
  if (december) return december.periodEnd.slice(0, 7)
  const selected = ofYear.filter((release) => release.status === 'selected')
  return selected[selected.length - 1]?.periodEnd.slice(0, 7) ?? null
}

/** The newest bulletin month: how recent the page's execution data is. */
export function newestReleaseMonth(catalog: BudgetCatalog): string | null {
  const selected = catalog.releases.filter((release) => release.status === 'selected')
  return selected[selected.length - 1]?.periodEnd.slice(0, 7) ?? null
}

/** The law a year reads: the reviewed edition, the draft for 2026, or none (an edition still pending). */
export function editionOfYear(catalog: BudgetCatalog, year: number): BudgetEdition | null {
  return catalog.editions.find((edition) => edition.budgetYear === year && edition.status === 'law_as_sent') ?? catalog.editions.find((edition) => edition.budgetYear === year) ?? null
}

/**
 * The period in words: „în 2025", „în ian.–iul. 2026". A year in progress
 * names its months, by its own source's newest month (the bulletin's, or
 * ANAF's `anafMonth`).
 */
export function periodPhrase(state: AnalysisState, catalog: BudgetCatalog, anafMonth: string | null = null): string {
  if (state.tip === 'cheltuieli' || state.tip === 'venituri') {
    const month = releaseMonthOf(catalog, state.an)
    if (month && !month.endsWith('-12')) return t`în ${coverageText(month)}`
  }
  if (state.tip === 'ministere' && anafMonth && anafMonth.startsWith(String(state.an)) && !anafMonth.endsWith('-12')) return t`în ${coverageText(anafMonth)}`
  return t`în ${state.an}`
}

// ──────────────────────────────────────────────────────────── headline ──

export type HeadlinePart = {
  readonly role: 'text' | 'budget' | 'row'
  readonly text: string
}

const LEVEL_PHRASE: Readonly<Record<'cheltuieli' | 'venituri', Readonly<Record<number, () => string>>>> = {
  cheltuieli: { 1: () => t`pe grupe`, 2: () => t`pe titluri`, 4: () => t`pe titluri` },
  venituri: { 1: () => t`pe grupe`, 2: () => t`pe categorii`, 4: () => t`pe surse` },
}

/** The question as the headline, in parts: the budget's phrase opens the filters, a drilled line's phrase can be dropped. */
export function headlineParts(state: AnalysisState, catalog: BudgetCatalog, anafMonth: string | null = null): readonly HeadlinePart[] {
  const period = periodPhrase(state, catalog, anafMonth)
  if (state.tip === 'cheltuieli' || state.tip === 'venituri') {
    const noun = state.tip === 'cheltuieli' ? t`Cheltuielile` : t`Veniturile`
    const parts: HeadlinePart[] = [
      { role: 'text', text: `${noun} ` },
      { role: 'budget', text: scopeOf(state.buget) },
    ]
    if (state.rand) {
      parts.push({ role: 'text', text: t`, din ` }, { role: 'row', text: inSentence(lineLabel(state.rand)) }, { role: 'text', text: `, ${period}` })
    } else {
      parts.push({ role: 'text', text: `, ${LEVEL_PHRASE[state.tip][state.nivel]!()}, ${period}` })
    }
    return parts
  }
  if (state.tip === 'lege') {
    const edition = editionOfYear(catalog, state.an)
    if (state.dupa === 'legi') return [{ role: 'text', text: t`Bugetul de stat pentru ${state.an}, în fiecare lege` }]
    if (state.dupa === 'ordonatori') {
      return [{ role: 'text', text: edition?.status === 'draft' ? t`Ce propune proiectul pe ${state.an} fiecărui ordonator` : t`Ce aprobă legea pe ${state.an} fiecărui ordonator` }]
    }
    return [{ role: 'text', text: edition?.status === 'draft' ? t`Ce propune proiectul bugetului pe ${state.an}` : t`Ce a aprobat legea bugetului pe ${state.an}` }]
  }
  return [{ role: 'text', text: t`Plățile ministerelor din bugetul de stat, ${period}` }]
}

export function headlineText(state: AnalysisState, catalog: BudgetCatalog, anafMonth: string | null = null): string {
  return headlineParts(state, catalog, anafMonth)
    .map((part) => part.text)
    .join('')
}

// ─────────────────────────────────────────────────────────────── tabs ──

export function populationLabel(population: Population): string {
  switch (population) {
    case 'cheltuieli':
      return t`Cheltuieli`
    case 'venituri':
      return t`Venituri`
    case 'lege':
      return t`Legea bugetului`
    case 'ministere':
      return t`Ministere`
  }
}

export function axisLabel(axis: Axis): string {
  switch (axis) {
    case 'titluri':
      return t`Pe titluri`
    case 'surse':
      return t`Pe surse`
    case 'bugete':
      return t`Pe bugete`
    case 'legi':
      return t`Pe legi`
    case 'ordonatori':
      return t`Pe ordonatori`
    case 'platit':
      return t`Pe ordonatori`
  }
}

export const LEVELS: Readonly<Record<'cheltuieli' | 'venituri', readonly { readonly key: '1' | '2' | '4'; readonly label: () => string }[]>> = {
  cheltuieli: [
    { key: '1', label: () => t`grupe` },
    { key: '2', label: () => t`titluri` },
  ],
  venituri: [
    { key: '1', label: () => t`grupe` },
    { key: '2', label: () => t`categorii` },
    { key: '4', label: () => t`surse` },
  ],
}

// ─────────────────────────────────────────────────────────── questions ──

export type Question = { readonly id: string; readonly group: 'executie' | 'lege' | 'ministere'; readonly text: () => string; readonly state: Partial<AnalysisState> }

export const QUESTIONS: readonly Question[] = [
  { id: 'pe-ce', group: 'executie', text: () => t`Pe ce s-au cheltuit banii publici în 2025?`, state: { tip: 'cheltuieli', an: 2025 } },
  { id: 'acum', group: 'executie', text: () => t`Cât a cheltuit statul în 2026, până acum?`, state: { tip: 'cheltuieli', an: 2026 } },
  { id: 'curente', group: 'executie', text: () => t`Ce cuprind cheltuielile curente?`, state: { tip: 'cheltuieli', rand: 'cheltuieli curente' } },
  { id: 'de-unde', group: 'executie', text: () => t`De unde vin veniturile publice?`, state: { tip: 'venituri', nivel: 4 } },
  { id: 'taxe', group: 'executie', text: () => t`Cât aduc taxele pe bunuri și servicii, TVA și accizele?`, state: { tip: 'venituri', rand: 'impozite si taxe pe bunuri si servicii' } },
  { id: 'legea', group: 'lege', text: () => t`Ce a aprobat legea bugetului pe 2025?`, state: { tip: 'lege', an: 2025 } },
  { id: 'planul', group: 'lege', text: () => t`Cum s-a schimbat planul pentru 2025 de la o lege la alta?`, state: { tip: 'lege', dupa: 'legi', an: 2025 } },
  { id: 'proiect', group: 'lege', text: () => t`Ce propune proiectul pe 2026 fiecărui ordonator?`, state: { tip: 'lege', dupa: 'ordonatori', an: 2026 } },
  { id: 'ministere', group: 'ministere', text: () => t`Cât a plătit fiecare minister în 2025?`, state: { tip: 'ministere', an: 2025 } },
  { id: 'ministere-acum', group: 'ministere', text: () => t`Cât au plătit ministerele în 2026, până acum?`, state: { tip: 'ministere', an: 2026 } },
]

export function questionGroupLabel(group: Question['group']): string {
  return group === 'executie' ? t`Execuția` : group === 'lege' ? t`Legea bugetului` : t`Ministerele`
}
