/**
 * Words and numbers for the national budget hub and its analysis page, in the
 * procurement hub's formats (`moneyText`, `percentText`, `monthText` are its
 * own). Prototype strings stay out of the catalogs until a page is promoted.
 */
import { plural, t } from '@lingui/core/macro'

import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import {
  countText,
  moneyFigure,
  moneyText as hubMoneyText,
  monthText,
  percentText as hubPercentText,
  shortMonthText,
} from '@/features/procurement/lib/home-format'
import type { ApprovedFund, ReleaseGapReason, UnavailableReason } from '@/schemas/national-budget-page'

export { countText, moneyFigure, monthText, shortMonthText }

/** The hub's „18,0 mld. lei", with a real minus sign („−3,0 mld. lei"): a refund line is negative. */
export function moneyText(value: number): string {
  return hubMoneyText(value).replace(/^-/u, '−')
}

export function percentText(fraction: number, digits = 1): string {
  return hubPercentText(fraction, digits).replace(/^-/u, '−')
}

/** Billions with one decimal, for a table whose header says „mld. lei". */
export function billionsText(lei: number): string {
  return formatHubNumber(lei / 1e9, { digits: 1 }).replace(/^-/u, '−')
}

/** A long name cut for a figure's label: „Ministerul Muncii Familiei…". */
export function shortName(name: string, max = 34): string {
  if (name.length <= max) return name
  const cut = name.slice(0, max)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 20)).trimEnd()}…`
}

/** January to a release's month: „ian.–dec. 2025", „ian. 2026". */
export function coverageText(month: string): string {
  const year = month.slice(0, 4)
  const last = Number(month.slice(5, 7))
  const short = (value: number) => shortMonthText(`${year}-${String(value).padStart(2, '0')}`).replace(/\s*\d{4}$/u, '')
  return last === 1 ? `${short(1)} ${year}` : `${short(1)}–${short(last)} ${year}`
}

/** „până în august 2026". */
export function throughText(month: string): string {
  return t`până în ${monthText(month)}`
}

/** „până în august", beside a year that already says which. */
export function untilText(month: string): string {
  const name = monthText(month).replace(/\s*\d{4}$/u, '')
  return t`până în ${name}`
}

/** „Toate cele 17 rânduri", „Toate cele 21 de rânduri". */
export function allRowsText(count: number): string {
  return plural(count, { one: 'Un rând', few: 'Toate cele # rânduri', other: 'Toate cele # de rânduri' })
}

export type BudgetScope = 'consolidat' | 'stat'

export const COMPONENT_OF: Readonly<Record<BudgetScope, string>> = {
  consolidat: 'general_consolidated_budget',
  stat: 'state_budget',
}

export function scopeName(scope: BudgetScope): string {
  return scope === 'consolidat' ? t`Bugetul general consolidat` : t`Bugetul de stat`
}

/** The budget in the genitive, after „din cheltuielile …". */
export function scopeOf(scope: BudgetScope): string {
  return scope === 'consolidat' ? t`bugetului general consolidat` : t`bugetului de stat`
}

export function fundName(fund: ApprovedFund): string {
  switch (fund) {
    case 'state_budget':
      return t`Bugetul de stat`
    case 'state_social_insurance':
      return t`Asigurările sociale de stat`
    case 'health_insurance':
      return t`Fondul de sănătate`
    case 'unemployment_insurance':
      return t`Fondul de șomaj`
  }
}

export function missingText(reason: UnavailableReason): string {
  switch (reason) {
    case 'api_pending':
      return t`API în lucru`
    case 'not_in_sample':
      return t`În producție; nu e în eșantionul machetei`
    case 'not_in_edition':
      return t`Legea nu tipărește această valoare`
    case 'not_extracted':
      return t`Nu e în extrasul proiectului`
    case 'no_identity_mapping':
      return t`Lipsește legătura cod ordonator → CUI`
  }
}

export function gapText(reason: ReleaseGapReason): string {
  switch (reason) {
    case 'held_accounting':
      return t`nepublicată: diferențe contabile în analiză`
    case 'source_gap':
      return t`lipsă la sursă`
    case 'missing_bgc_original':
      return t`lipsește originalul BGC`
    case 'incompatible_source':
      return t`sursă incompatibilă: estimări și perioade amestecate`
  }
}

/** The bulletin's lines as a reader names them (the source writes them lowercase, without diacritics). */
const LINE_LABELS: Readonly<Record<string, string>> = {
  'venituri totale': 'Venituri totale',
  'venituri curente': 'Venituri curente',
  'venituri fiscale': 'Venituri fiscale',
  'impozitul pe profit, salarii, venit si castiguri din capital': 'Impozite pe profit, salarii și venit',
  'impozitul pe profit': 'Impozitul pe profit',
  'impozitul pe salarii si venit': 'Impozitul pe salarii și venit',
  'alte impozite pe venit, profit si castiguri din capital': 'Alte impozite pe venit și profit',
  'impozite si taxe pe proprietate': 'Impozite și taxe pe proprietate',
  'impozite si taxe pe bunuri si servicii': 'Impozite pe bunuri și servicii',
  tva: 'TVA',
  accize: 'Accize',
  'alte impozite si taxe pe bunuri si servicii': 'Alte taxe pe bunuri și servicii',
  'taxe pe utilizarea bunurilor, autorizarea utilizarii bunurilor sau pe desfasurarea de activitati': 'Taxe pe utilizarea bunurilor și pe activități',
  'impozit pe comertul exterior si tranzactiile internationale (taxe vamale)': 'Taxe vamale',
  'alte impozite si taxe fiscale': 'Alte impozite și taxe',
  'contributii de asigurari': 'Contribuții sociale',
  'venituri nefiscale': 'Venituri nefiscale',
  subventii: 'Subvenții',
  'venituri din capital': 'Venituri din capital',
  donatii: 'Donații',
  'sume primite de la ue/alti donatori in contul platilor efectuate si prefinantari': 'Bani de la UE pentru plăți și prefinanțări',
  'operatiuni financiare': 'Operațiuni financiare',
  'sume in curs de distribuire': 'Sume în curs de distribuire',
  'alte sume primite de la ue': 'Alte sume de la UE',
  'sume primite de la ue/alti donatori in contul platilor efectuate si prefinantari aferente cadrului financiar 2014-2020': 'Bani de la UE, cadrul 2014–2020',
  'sume aferente asistentei financiare nerambursabile alocate pentru pnrr': 'Granturi PNRR',
  'cheltuieli totale': 'Cheltuieli totale',
  'cheltuieli curente': 'Cheltuieli curente',
  'cheltuieli de personal': 'Cheltuieli de personal',
  'bunuri si servicii': 'Bunuri și servicii',
  dobanzi: 'Dobânzi',
  'transferuri intre unitati ale administratiei publice': 'Transferuri către alte bugete',
  'alte transferuri': 'Alte transferuri',
  'proiecte cu finantare din fonduri externe nerambursabile': 'Proiecte cu fonduri UE',
  'asistenta sociala': 'Asistență socială',
  'proiecte cu finantare din fonduri externe nerambursabile aferente cadrului financiar 2014-2020 si din fondul de modernizare': 'Proiecte UE 2014–2020 și Fondul de modernizare',
  'alte cheltuieli': 'Alte cheltuieli',
  'proiecte cu finantare din sumele reprezentand asistenta financiara nerambursabila aferenta pnrr': 'Proiecte PNRR din granturi',
  'proiecte cu finantare din sumele aferente componentei de imprumut a pnrr': 'Proiecte PNRR din împrumuturi',
  'cheltuieli aferente programelor cu finantare rambursabila': 'Programe cu finanțare rambursabilă',
  'cheltuieli de capital': 'Cheltuieli de capital',
  'active nefinanciare': 'Investiții (active nefinanciare)',
  'active financiare': 'Active financiare',
  imprumuturi: 'Împrumuturi acordate',
  'rambursari de credite': 'Rambursări de credite',
  'plati efectuate in anii precedenti si recuperate in anul curent': 'Plăți din anii trecuți, recuperate',
  'excedent(+) / deficit(-)': 'Sold',
}

export function lineLabel(lineItem: string): string {
  return LINE_LABELS[lineItem] ?? lineItem.charAt(0).toUpperCase() + lineItem.slice(1)
}

/** First letter lowered, for a name inside a sentence (keeps acronyms: „TVA"). */
export function inSentence(label: string): string {
  const second = label.charAt(1)
  if (second && second === second.toLocaleUpperCase('ro-RO') && second !== second.toLocaleLowerCase('ro-RO')) return label
  return label.charAt(0).toLocaleLowerCase('ro-RO') + label.slice(1)
}

const SMALL_WORDS = new Set(['si', 'și', 'de', 'a', 'al', 'ale', 'pentru', 'din', 'cu', 'la', 'in', 'în', 'privind', 'pe'])
const ACRONYMS = new Set(['sri', 'sie', 'sts', 'spp', 'anaf', 'anpc', 'cnsas', 'anrp', 'aaas', 'ancom'])

/** An ANAF entity name, written in capitals or in a mix, as a reader writes it: „Ministerul Muncii Familiei …". */
export function authorityName(name: string): string {
  return name
    .toLocaleLowerCase('ro-RO')
    .split(/(\s+|-)/u)
    .map((word, index) => {
      if (/^\s+$|^-$/u.test(word) || word === '') return word
      if (ACRONYMS.has(word)) return word.toUpperCase()
      if (index > 0 && SMALL_WORDS.has(word)) return word
      return word.charAt(0).toLocaleUpperCase('ro-RO') + word.slice(1)
    })
    .join('')
}
