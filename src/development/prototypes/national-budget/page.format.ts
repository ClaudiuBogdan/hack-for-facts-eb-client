/**
 * Words and numbers for the page. The feature layer returns codes; every
 * Romanian label is made here (prototype strings stay out of the catalogs
 * until a variant is promoted).
 */
import { t } from '@lingui/core/macro'

import { getUserLocale } from '@/lib/utils'
import type { CheckDimension, Comparison, ComparisonKind } from '@/features/national-budget/page/model/comparability'
import type {
  ApprovedFund,
  BudgetEdition,
  CreditType,
  ReleaseGapReason,
  UnavailableReason,
  ValueOrigin,
} from '@/schemas/national-budget-page'

const locale = () => (getUserLocale() === 'ro' ? 'ro-RO' : 'en-GB')

// ── Numbers ─────────────────────────────────────────────────────────────────

/** A sum of lei, split for display: the figure and its scale (`499,58` / `mld. lei`). */
export function leiParts(lei: number): { readonly value: string; readonly unit: string } {
  const abs = Math.abs(lei)
  const [divisor, unit] = abs >= 1e9 ? [1e9, t`mld. lei`] : abs >= 1e6 ? [1e6, t`mil. lei`] : [1, t`lei`]
  const value = new Intl.NumberFormat(locale(), {
    minimumFractionDigits: divisor === 1 ? 0 : 2,
    maximumFractionDigits: divisor === 1 ? 0 : 2,
  }).format(lei / divisor)
  return { value: value.replace('-', '−'), unit }
}

export function formatLei(lei: number): string {
  const parts = leiParts(lei)
  return `${parts.value} ${parts.unit}`
}

/** A table's one unit, from its largest value: every cell in it is read on the same scale. */
export type TableUnit = { readonly divisor: number; readonly label: string }

export function tableUnit(values: readonly number[]): TableUnit {
  const max = Math.max(0, ...values.map(Math.abs))
  return max >= 1e9 ? { divisor: 1e9, label: t`mld. lei` } : { divisor: 1e6, label: t`mil. lei` }
}

/** A cell on its table's scale; a non-zero value below the last decimal says so rather than reading 0. */
export function formatInUnit(lei: number, unit: TableUnit): string {
  const scaled = lei / unit.divisor
  if (scaled !== 0 && Math.abs(scaled) < 0.005) return `${scaled < 0 ? '−' : ''}<${new Intl.NumberFormat(locale(), { minimumFractionDigits: 2 }).format(0.01)}`
  return new Intl.NumberFormat(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(scaled).replace('-', '−')
}

/** Billions with two decimals, no unit: for a table whose header names the unit. */
export function formatBillions(lei: number): string {
  return new Intl.NumberFormat(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(lei / 1e9).replace('-', '−')
}

export function formatSignedLei(lei: number): string {
  const parts = leiParts(Math.abs(lei))
  return `${lei > 0 ? '+' : lei < 0 ? '−' : ''}${parts.value} ${parts.unit}`
}

/** Every digit, for evidence: `499.582.980.000 lei`. */
export function formatExactLei(lei: number): string {
  return `${new Intl.NumberFormat(locale(), { maximumFractionDigits: 2 }).format(lei)} ${t`lei`}`.replace('-', '−')
}

export function formatPercent(value: number, digits = 1, signed = false): string {
  const text = new Intl.NumberFormat(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Math.abs(value))
  const sign = value > 0 ? (signed ? '+' : '') : value < 0 ? '−' : ''
  return `${sign}${text} %`
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat(locale()).format(value)
}

// ── Periods ─────────────────────────────────────────────────────────────────

export function monthShort(month: number): string {
  return new Intl.DateTimeFormat(locale(), { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2020, month - 1, 1)))
}

export function monthLong(month: number): string {
  return new Intl.DateTimeFormat(locale(), { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2020, month - 1, 1)))
}

/** A release's coverage, January to its month: `ian.–iul. 2026`, `ian. 2026`. */
export function coverageLabel(month: string): string {
  const year = month.slice(0, 4)
  const last = Number(month.slice(5, 7))
  if (last === 1) return `${monthShort(1)} ${year}`
  return `${monthShort(1)}–${monthShort(last)} ${year}`
}

export function monthLabel(month: string): string {
  return `${monthLong(Number(month.slice(5, 7)))} ${month.slice(0, 4)}`
}

// ── Budgets and editions ────────────────────────────────────────────────────

export function fundLabel(fund: ApprovedFund): string {
  switch (fund) {
    case 'state_budget':
      return t`Bugetul de stat`
    case 'state_social_insurance':
      return t`Asigurările sociale de stat`
    case 'health_insurance':
      return t`Sănătate (FNUASS)`
    case 'unemployment_insurance':
      return t`Șomaj`
  }
}

export function componentLabel(component: string): string {
  if (component === 'state_budget') return t`Bugetul de stat`
  if (component === 'general_consolidated_budget') return t`Bugetul general consolidat`
  return component
}

export function editionLabel(edition: BudgetEdition): string {
  return edition.status === 'draft' ? t`Proiectul bugetului ${edition.budgetYear}` : t`Legea bugetului ${edition.budgetYear}`
}

export function editionVersion(edition: BudgetEdition): string {
  return edition.status === 'draft' ? t`martie 2026, nevalidat` : t`trimisă la Monitorul Oficial`
}

/** What a plan figure is, said in full: „Aprobat pentru 2025", „Estimare pentru 2026 din bugetul 2025". */
export function measureLabel(edition: BudgetEdition, targetYear: number): string {
  const own = targetYear === edition.budgetYear
  if (edition.status === 'draft') {
    return own ? t`Propus pentru ${targetYear}` : t`Estimare pentru ${targetYear} din proiectul ${edition.budgetYear}`
  }
  return own ? t`Aprobat pentru ${targetYear}` : t`Estimare pentru ${targetYear} din bugetul ${edition.budgetYear}`
}

export function measureShort(edition: BudgetEdition, targetYear: number): string {
  if (targetYear !== edition.budgetYear) return t`estimare`
  return edition.status === 'draft' ? t`propus` : t`aprobat`
}

export function creditLabel(credit: CreditType): string {
  return credit === 'budget_credits' ? t`credite bugetare` : t`credite de angajament`
}

export function originLabel(origin: ValueOrigin): string {
  switch (origin) {
    case 'real_sample':
      return t`eșantion real`
    case 'draft_static':
      return t`proiect, nevalidat`
    case 'synthetic_demo':
      return t`valoare inventată`
  }
}

// ── Missing values ──────────────────────────────────────────────────────────

export function unavailableText(reason: UnavailableReason): string {
  switch (reason) {
    case 'api_pending':
      return t`API în lucru`
    case 'not_in_sample':
      return t`În producție, nu în eșantionul machetei`
    case 'not_in_edition':
      return t`Sursa nu tipărește această valoare`
    case 'not_extracted':
      return t`Nu e în extrasul proiectului`
    case 'no_identity_mapping':
      return t`Lipsește maparea cod ordonator → CUI`
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

// ── Execution lines ─────────────────────────────────────────────────────────

/** Display names for the bulletin's lines (the source writes them lowercase, without diacritics). */
const LINE_LABELS: Readonly<Record<string, string>> = {
  'venituri totale': 'Venituri totale',
  'venituri curente': 'Venituri curente',
  'venituri fiscale': 'Venituri fiscale',
  'impozitul pe profit, salarii, venit si castiguri din capital': 'Impozite pe profit, salarii, venit și câștiguri',
  'impozitul pe profit': 'Impozitul pe profit',
  'impozitul pe salarii si venit': 'Impozitul pe salarii și venit',
  'alte impozite pe venit, profit si castiguri din capital': 'Alte impozite pe venit și profit',
  'impozite si taxe pe proprietate': 'Impozite și taxe pe proprietate',
  'impozite si taxe pe bunuri si servicii': 'Impozite și taxe pe bunuri și servicii',
  tva: 'TVA',
  accize: 'Accize',
  'alte impozite si taxe pe bunuri si servicii': 'Alte impozite și taxe pe bunuri și servicii',
  'taxe pe utilizarea bunurilor, autorizarea utilizarii bunurilor sau pe desfasurarea de activitati': 'Taxe pe utilizarea bunurilor și pe activități',
  'impozit pe comertul exterior si tranzactiile internationale (taxe vamale)': 'Taxe vamale',
  'alte impozite si taxe fiscale': 'Alte impozite și taxe fiscale',
  'contributii de asigurari': 'Contribuții de asigurări',
  'venituri nefiscale': 'Venituri nefiscale',
  subventii: 'Subvenții',
  'venituri din capital': 'Venituri din capital',
  donatii: 'Donații',
  'sume primite de la ue/alti donatori in contul platilor efectuate si prefinantari': 'Sume de la UE pentru plăți și prefinanțări',
  'operatiuni financiare': 'Operațiuni financiare',
  'sume in curs de distribuire': 'Sume în curs de distribuire',
  'alte sume primite de la ue': 'Alte sume de la UE',
  'sume primite de la ue/alti donatori in contul platilor efectuate si prefinantari aferente cadrului financiar 2014-2020':
    'Sume de la UE, cadrul 2014–2020',
  'sume aferente asistentei financiare nerambursabile alocate pentru pnrr': 'Granturi PNRR',
  'cheltuieli totale': 'Cheltuieli totale',
  'cheltuieli curente': 'Cheltuieli curente',
  'cheltuieli de personal': 'Cheltuieli de personal',
  'bunuri si servicii': 'Bunuri și servicii',
  dobanzi: 'Dobânzi',
  'transferuri intre unitati ale administratiei publice': 'Transferuri între administrații',
  'alte transferuri': 'Alte transferuri',
  'proiecte cu finantare din fonduri externe nerambursabile': 'Proiecte cu fonduri UE',
  'asistenta sociala': 'Asistență socială',
  'proiecte cu finantare din fonduri externe nerambursabile aferente cadrului financiar 2014-2020 si din fondul de modernizare':
    'Proiecte UE 2014–2020 și Fondul de modernizare',
  'alte cheltuieli': 'Alte cheltuieli',
  'proiecte cu finantare din sumele reprezentand asistenta financiara nerambursabila aferenta pnrr': 'Proiecte PNRR din granturi',
  'proiecte cu finantare din sumele aferente componentei de imprumut a pnrr': 'Proiecte PNRR din împrumuturi',
  'cheltuieli aferente programelor cu finantare rambursabila': 'Programe cu finanțare rambursabilă',
  'cheltuieli de capital': 'Cheltuieli de capital',
  'active nefinanciare': 'Active nefinanciare',
  'active financiare': 'Active financiare',
  imprumuturi: 'Împrumuturi',
  'rambursari de credite': 'Rambursări de credite',
  'plati efectuate in anii precedenti si recuperate in anul curent': 'Plăți din anii trecuți, recuperate',
  'excedent(+) / deficit(-)': 'Sold: excedent (+) / deficit (−)',
}

export function lineLabel(lineItem: string): string {
  return LINE_LABELS[lineItem] ?? lineItem.charAt(0).toUpperCase() + lineItem.slice(1)
}

/** A law form's capitals in sentence case, keeping roman numerals and codes. */
export function sentenceCase(label: string): string {
  return label
    .toLowerCase()
    .replace(/^([a-zăâîșț])/u, (letter) => letter.toUpperCase())
    .replace(/\b(i{1,3}|iv|v|vi{0,3}|ix|x{1,2}i{0,3}|xi?v|xv)\b/gu, (numeral) => numeral.toUpperCase())
}

// ── Comparisons ─────────────────────────────────────────────────────────────

export function comparisonKindLabel(kind: ComparisonKind): string {
  switch (kind) {
    case 'plan_evolution':
      return t`Același an, din legi diferite`
    case 'year_over_year':
      return t`Un an față de altul`
    case 'plan_vs_execution':
      return t`Plan față de execuție`
    case 'execution_periods':
      return t`Execuție față de execuție`
  }
}

export function checkLabel(dimension: CheckDimension): string {
  switch (dimension) {
    case 'scope':
      return t`Bugetul`
    case 'unit':
      return t`Unitatea`
    case 'period':
      return t`Perioada`
    case 'basis':
      return t`Ce se măsoară`
    case 'version':
      return t`Versiunea`
    case 'measure':
      return t`Tipul valorii`
    case 'status':
      return t`Starea execuției`
  }
}

/** Why a check came out as it did, in the comparison's own terms. */
export function checkDetail(kind: ComparisonKind, check: Comparison['checks'][number]): string {
  const { dimension, outcome } = check
  if (dimension === 'unit') {
    if (kind === 'plan_vs_execution') return t`ambele în lei: legea în mii de lei ×1.000, execuția deja în lei`
    if (kind === 'execution_periods') return t`ambele în lei, cum le declară buletinul`
    return t`ambele din lege, în mii de lei ×1.000`
  }
  if (kind === 'plan_vs_execution') {
    if (dimension === 'version') return t`legea trimisă la Monitorul Oficial, nu creditele finale după rectificări`
    if (dimension === 'basis')
      return outcome === 'same' ? t`venituri prevăzute și încasate` : t`credite (plafoane de plată) față de plăți efectuate`
    if (dimension === 'period') return outcome === 'same' ? t`anul întreg` : t`perioade diferite`
    if (dimension === 'measure') return outcome === 'same' ? t`aprobat` : t`o estimare nu e un plan aprobat`
    if (dimension === 'status') return outcome === 'same' ? t`execuție efectivă` : t`execuția e o estimare`
    return outcome === 'same' ? t`același buget` : t`bugete diferite`
  }
  if (dimension === 'version') {
    if (kind === 'execution_periods') return t`buletinele nu declară dacă cifrele sunt finale`
    return outcome === 'noted' ? t`o lege și un proiect: versiuni diferite` : t`aceeași versiune`
  }
  if (dimension === 'measure')
    return outcome === 'noted' ? t`estimări și aprobări: arată cum s-a schimbat planul` : outcome === 'same' ? t`aprobat față de aprobat` : t`o estimare față de o aprobare`
  if (dimension === 'period') {
    if (kind === 'year_over_year') return t`ani diferiți, sume nominale (fără inflație)`
    if (kind === 'execution_periods') return outcome === 'same' ? t`aceleași luni, ani diferiți` : t`acoperiri diferite: cumulatul nu se împarte în luni`
    return t`același an-țintă`
  }
  if (dimension === 'status') return outcome === 'same' ? t`execuție efectivă` : t`o estimare nu e execuție`
  if (dimension === 'basis') return outcome === 'same' ? t`aceeași mărime` : t`mărimi diferite`
  return outcome === 'same' ? t`același buget` : t`bugete diferite`
}
