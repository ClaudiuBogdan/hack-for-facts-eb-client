/**
 * The national budget analysis page's words: periods, lines, budgets,
 * chapters, titles, statuses, the headline and the ready questions. The
 * names the page gives the bulletin's lines and the law's chapters and titles
 * are its own, translated; a code it doesn't know keeps the source's words.
 */
import { t } from '@lingui/core/macro'

import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { exactChange, exactPercent } from '@/features/national-budget/analytics/lib/exact'
import { periodTypeOf, shiftYears, yearOf, type PeriodLabel } from '@/features/national-budget/analytics/lib/series'
import type { BudgetApprovedForm, BudgetApprovedStatus, BudgetApprovedTotalKey, BudgetExecutionCoverage, BudgetFund, BudgetSection, BudgetSeriesBasis, PeriodType } from '@/schemas/national-budget-api'
import { inSentence, lineLabel, monthText } from './analytics-format'
import { BUDGET_COMPONENTS, type AdvancedState, type BudgetKey, type Dupa, type LawFund, type Pas, type Tip } from './analytics-state'

export { BUDGET_COMPONENTS }

// ─────────────────────────────────────────────────────────────── periods ──

/** The bulletins' period the page reads, resolved against what is loaded. */
export type ExecPeriod = {
  readonly label: PeriodLabel
  readonly type: PeriodType
  readonly basis: BudgetSeriesBasis
  /** The release whose cumulative figures (GDP shares, the budgets) belong to the period's end. */
  readonly releaseMonth: string
  /** The period is the release's own figure (from 1 January): its GDP share and its budgets apply as printed. */
  readonly cumulative: boolean
}

export function lastCompleteYear(coverage: BudgetExecutionCoverage): number {
  const year = yearOf(coverage.lastMonth)
  return coverage.lastMonth.endsWith('-12') ? year : year - 1
}

export function execPeriodOf(state: Pick<AdvancedState, 'perioada' | 'cumulat'>, coverage: BudgetExecutionCoverage): ExecPeriod {
  let label = state.perioada ?? coverage.lastMonth
  let cumulat = state.cumulat
  const type = periodTypeOf(label)
  // A year the bulletins have not finished is its newest month, from 1 January; past the last month, the last month.
  if (type === 'YEAR' && yearOf(label) > lastCompleteYear(coverage)) {
    label = coverage.lastMonth
    cumulat = true
  } else if (type === 'MONTH' && label > coverage.lastMonth) label = coverage.lastMonth
  const resolved = periodTypeOf(label)
  if (resolved === 'YEAR') return { label, type: resolved, basis: 'FULL_YEAR', releaseMonth: `${label}-12`, cumulative: true }
  if (resolved === 'QUARTER') {
    const end = `${label.slice(0, 4)}-${String(Number(label.slice(6)) * 3).padStart(2, '0')}`
    return { label, type: resolved, basis: 'PERIOD_DIFFERENCE', releaseMonth: end, cumulative: false }
  }
  return { label, type: resolved, basis: cumulat ? 'YTD' : 'PERIOD_DIFFERENCE', releaseMonth: label, cumulative: cumulat }
}

/** A budget's figures are its release's own, from 1 January: a quarter or a month alone reads as its release's cumulative figure. */
export function cumulativeOf(period: ExecPeriod): ExecPeriod {
  if (period.cumulative) return period
  return { label: period.releaseMonth, type: 'MONTH', basis: 'YTD', releaseMonth: period.releaseMonth, cumulative: true }
}

const monthName = (month: string) => monthText(month).replace(/\s*\d{4}$/u, '')

/** „2025", „ianuarie–iulie 2026", „iulie 2026", „aprilie–iunie 2026". */
export function periodText(label: PeriodLabel, basis: BudgetSeriesBasis): string {
  const type = periodTypeOf(label)
  if (type === 'YEAR') return label
  const year = label.slice(0, 4)
  if (type === 'QUARTER') {
    const last = Number(label.slice(6)) * 3
    return `${monthName(`${year}-${String(last - 2).padStart(2, '0')}`)}–${monthName(`${year}-${String(last).padStart(2, '0')}`)} ${year}`
  }
  if (basis === 'YTD' && !label.endsWith('-01')) return `${monthName(`${year}-01`)}–${monthName(label)} ${year}`
  return monthText(label)
}

/** A column's head: „2025", „T2 '26", „iul. '26". */
export function periodShort(label: PeriodLabel): string {
  const type = periodTypeOf(label)
  if (type === 'YEAR') return label
  if (type === 'QUARTER') {
    const quarter = label.slice(6)
    const year = label.slice(2, 4)
    return t({ message: `T${quarter} '${year}`, comment: 'A quarter as a column head: quarter number, two-digit year' })
  }
  return `${monthName(label).slice(0, 3)}. '${label.slice(2, 4)}`
}

/** The same period a year earlier, as the comparison column names it. */
export function previousText(period: ExecPeriod): string {
  return periodText(shiftYears(period.label, -1), period.basis)
}

/** Why an execution period has no value, in a few words. The code is open-ended: an unknown one is said as written. */
export function reasonText(reason: string | null): string {
  switch (reason) {
    case null:
      return t`fără valoare`
    case 'missing_endpoint_release':
      return t`lipsește buletinul lunii`
    case 'missing_predecessor_release':
      return t`lipsește buletinul lunii dinainte`
    case 'incompatible_endpoint_coverage':
      return t`buletinul acoperă altă perioadă`
    case 'incompatible_predecessor_coverage':
      return t`buletinul dinainte acoperă altă perioadă`
    case 'after_last_release':
      return t`după ultimul buletin încărcat`
    case 'before_first_release':
      return t`înainte de primul buletin încărcat`
    case 'no_budget_columns':
      return t`buletinul nu are coloana acestui buget (buletin PDF)`
    case 'blank_in_source':
      return t`gol în buletin`
    default:
      return reason.replace(/_/gu, ' ')
  }
}

export function approvedStatusText(status: BudgetApprovedStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return t`tipărit`
    case 'SLOT_WITHOUT_VALUE':
      return t`legea nu tipărește o valoare aici`
    case 'NO_MATCHING_RECORD':
      return t`niciun rând de total de acest fel în lege`
    case 'AMBIGUOUS':
      return t`mai multe citiri ale anexei: nu alegem una`
    case 'FORM_NOT_LOADED':
      return t`anexa nu e încărcată`
    case 'NOT_IN_EDITION':
      return t`legea nu are acest an`
    case 'EDITION_NOT_LOADED':
      return t`legea nu e încărcată`
    case 'MULTIPLE_EDITIONS':
      return t`mai multe legi pentru același an`
  }
}

/**
 * Change against a base, as a reader says it: „+12,3%", „−4,0%". Computed on
 * the exact decimals and rounded at the digit shown (no float in between);
 * none when the base is not a positive amount.
 */
export function changeText(now: string | null, before: string | null): string | null {
  const change = now !== null && before !== null ? exactChange(now, before, 1) : null
  return change === null ? null : `${formatHubNumber(change, { digits: 1, signed: true }).replace(/^-/u, '−')}%`
}

/** The same change as a fraction, for a figure. */
export function changeOf(now: string | null, before: string | null): number | null {
  const change = now !== null && before !== null ? exactChange(now, before, 1) : null
  return change === null ? null : change / 100
}

/** A part of a whole as a fraction, divided on the exact decimals and rounded at one decimal of a percentage, for a figure. */
export function shareOf(part: string | null | undefined, whole: string | null | undefined): number | null {
  const share = part && whole ? exactPercent(part, whole, 1) : null
  return share === null ? null : share / 100
}

// ────────────────────────────────────────────────────────────── sections ──

export const SECTION_OF = {
  cheltuieli: 'EXPENDITURE',
  venituri: 'REVENUE',
  sold: 'BALANCE',
} as const satisfies Readonly<Record<'cheltuieli' | 'venituri' | 'sold', BudgetSection>>

export const isExecution = (tip: Tip): tip is 'cheltuieli' | 'venituri' | 'sold' => tip === 'cheltuieli' || tip === 'venituri' || tip === 'sold'

/** The cut the figures' „largest line" reads: the spending titles, the revenue sources. The tables show the whole tree. */
export const TOP_DEPTH = { EXPENDITURE: 2, REVENUE: 4 } as const

/** The series catalog's lines a reader names differently from the bulletins' layout the hub knows. */
const EXTRA_LINES: Readonly<Record<string, () => string>> = {
  'transferuri - total': () => t({ message: `Transferuri – total (subtotal, până în 2021)`, context: 'national budget classification' }),
  'proiecte cu finantare din fonduri externe nerambursabile aferente cadrului financiar 2014-2020': () => t({ message: `Proiecte UE 2014–2020`, context: 'national budget classification' }),
  'venituri suplimentare incasate din digitalizare': () => t({ message: `Venituri suplimentare din digitalizare`, context: 'national budget classification' }),
  'excedent(+) / deficit(-)': () => t({ message: `Sold (excedent + / deficit −)`, context: 'national budget classification' }),
}

export function itemLabel(sourceLabel: string | undefined, itemId: string): string {
  if (!sourceLabel) return itemId.replace(/^mfin\.bgc\./u, '')
  return EXTRA_LINES[sourceLabel]?.() ?? lineLabel(sourceLabel)
}

// ───────────────────────────────────────────────────────────── budgets ──

/** The columns that consolidate them: before transfers, the transfers taken out, the financial operations, the consolidated budget. */
export const BRIDGE_COMPONENTS = [
  'budget_total_before_transfers',
  'signed_interbudget_transfers',
  'general_consolidated_budget_before_financial_operations',
  'signed_financial_operations',
  'general_consolidated_budget',
] as const

export function componentLabel(component: string): string {
  switch (component) {
    case 'state_budget':
      return t`Bugetul de stat`
    case 'territorial_units_budget':
      return t`Bugetele locale`
    case 'state_social_insurance_budget':
      return t`Asigurările sociale de stat (pensii)`
    case 'unemployment_insurance_budget':
      return t`Asigurările pentru șomaj`
    case 'national_health_insurance_fund':
      return t`Fondul de sănătate (FNUASS)`
    case 'ministry_external_loans':
      return t`Credite externe ale ministerelor`
    case 'public_bodies_own_revenue_budget':
      return t`Instituții finanțate din venituri proprii`
    case 'nonrefundable_external_funds':
      return t`Fonduri externe nerambursabile`
    case 'treasury_budget':
      return t`Trezoreria statului`
    case 'national_road_infrastructure_company_budget':
      return t`CNAIR (drumuri naționale)`
    case 'exim_source_component':
      return t`EximBank, componenta de surse`
    case 'budget_total_before_transfers':
      return t`Toate bugetele, înainte de transferuri`
    case 'signed_interbudget_transfers':
      return t`Transferuri între bugete (se scad)`
    case 'general_consolidated_budget_before_financial_operations':
      return t`Consolidat, înainte de operațiuni financiare`
    case 'signed_financial_operations':
      return t`Operațiuni financiare`
    case 'general_consolidated_budget':
      return t`Bugetul general consolidat`
    default:
      return component.replace(/_/gu, ' ')
  }
}

// ──────────────────────────────────────────────────────────────── the law ──

export const FUND_OF: Readonly<Record<LawFund, BudgetFund>> = {
  stat: 'STATE_BUDGET',
  asigurari: 'STATE_SOCIAL_INSURANCE',
  sanatate: 'HEALTH_INSURANCE',
  somaj: 'UNEMPLOYMENT_INSURANCE',
}

export const LAW_FUNDS: readonly LawFund[] = ['stat', 'asigurari', 'sanatate', 'somaj']

export const SYNTHESIS_OF: Readonly<Record<LawFund, BudgetApprovedForm>> = {
  stat: 'STATE_BUDGET_SYNTHESIS',
  asigurari: 'STATE_SOCIAL_INSURANCE_SYNTHESIS',
  sanatate: 'HEALTH_INSURANCE_SYNTHESIS',
  somaj: 'UNEMPLOYMENT_INSURANCE_SYNTHESIS',
}

/** The spending total a fund's law prints: 5001 for the state budget, 5000 („total general") for the others. Never summed. */
export const SPENDING_TOTAL_OF: Readonly<Record<LawFund, BudgetApprovedTotalKey>> = {
  stat: 'EXPENDITURE_5001_STATE_BUDGET',
  asigurari: 'EXPENDITURE_5000_TOTAL_GENERAL',
  sanatate: 'EXPENDITURE_5000_TOTAL_GENERAL',
  somaj: 'EXPENDITURE_5000_TOTAL_GENERAL',
}

export const SPENDING_CODE_OF: Readonly<Record<LawFund, string>> = { stat: '5001', asigurari: '5000', sanatate: '5000', somaj: '5000' }

export function fundLabel(fund: LawFund): string {
  switch (fund) {
    case 'stat':
      return t`Bugetul de stat`
    case 'asigurari':
      return t`Asigurările sociale de stat`
    case 'sanatate':
      return t`Fondul de sănătate`
    case 'somaj':
      return t`Fondul de șomaj`
  }
}

/** A printed label in capitals, as a sentence: „ALTE SERVICII PUBLICE" → „Alte servicii publice" (no diacritics to restore). */
export function sentenceCase(printed: string): string {
  const text = printed.replace(/\s+/gu, ' ').trim().toLocaleLowerCase('ro-RO')
  return text.charAt(0).toLocaleUpperCase('ro-RO') + text.slice(1)
}

/** The functional classification's chapters, as a reader names them. */
const CHAPTERS: Readonly<Record<string, () => string>> = {
  '5101': () => t({ message: `Autorități publice și acțiuni externe`, context: 'national budget classification' }),
  '5301': () => t({ message: `Cercetare fundamentală și cercetare-dezvoltare`, context: 'national budget classification' }),
  '5401': () => t({ message: `Alte servicii publice generale`, context: 'national budget classification' }),
  '5501': () => t({ message: `Datoria publică și împrumuturi`, context: 'national budget classification' }),
  '5601': () => t({ message: `Transferuri între niveluri ale administrației`, context: 'national budget classification' }),
  '6001': () => t({ message: `Apărare`, context: 'national budget classification' }),
  '6101': () => t({ message: `Ordine publică și siguranță națională`, context: 'national budget classification' }),
  '6501': () => t({ message: `Învățământ`, context: 'national budget classification' }),
  '6601': () => t({ message: `Sănătate`, context: 'national budget classification' }),
  '6701': () => t({ message: `Cultură, recreere și religie`, context: 'national budget classification' }),
  '6801': () => t({ message: `Asigurări și asistență socială`, context: 'national budget classification' }),
  '7001': () => t({ message: `Locuințe, servicii și dezvoltare publică`, context: 'national budget classification' }),
  '7401': () => t({ message: `Protecția mediului`, context: 'national budget classification' }),
  '8001': () => t({ message: `Acțiuni generale economice, comerciale și de muncă`, context: 'national budget classification' }),
  '8101': () => t({ message: `Combustibili și energie`, context: 'national budget classification' }),
  '8201': () => t({ message: `Industrie extractivă, prelucrătoare și construcții`, context: 'national budget classification' }),
  '8301': () => t({ message: `Agricultură, silvicultură, piscicultură și vânătoare`, context: 'national budget classification' }),
  '8401': () => t({ message: `Transporturi`, context: 'national budget classification' }),
  '8501': () => t({ message: `Comunicații`, context: 'national budget classification' }),
  '8601': () => t({ message: `Cercetare și dezvoltare în domeniul economic`, context: 'national budget classification' }),
  '8701': () => t({ message: `Alte acțiuni economice`, context: 'national budget classification' }),
}

/** The economic classification's titles and groups, by their code. */
const TITLES: Readonly<Record<string, () => string>> = {
  '01': () => t({ message: `Cheltuieli curente`, context: 'national budget classification' }),
  '10': () => t({ message: `Cheltuieli de personal`, context: 'national budget classification' }),
  '20': () => t({ message: `Bunuri și servicii`, context: 'national budget classification' }),
  '30': () => t({ message: `Dobânzi`, context: 'national budget classification' }),
  '40': () => t({ message: `Subvenții`, context: 'national budget classification' }),
  '50': () => t({ message: `Fonduri de rezervă`, context: 'national budget classification' }),
  '51': () => t({ message: `Transferuri între unități ale administrației publice`, context: 'national budget classification' }),
  '55': () => t({ message: `Alte transferuri`, context: 'national budget classification' }),
  '56': () => t({ message: `Proiecte cu fonduri externe nerambursabile`, context: 'national budget classification' }),
  '57': () => t({ message: `Asistență socială`, context: 'national budget classification' }),
  '58': () => t({ message: `Proiecte UE 2014–2020 și Fondul de modernizare`, context: 'national budget classification' }),
  '59': () => t({ message: `Alte cheltuieli`, context: 'national budget classification' }),
  '60': () => t({ message: `Proiecte PNRR din granturi`, context: 'national budget classification' }),
  '61': () => t({ message: `Proiecte PNRR din împrumuturi`, context: 'national budget classification' }),
  '65': () => t({ message: `Programe cu finanțare rambursabilă`, context: 'national budget classification' }),
  '70': () => t({ message: `Cheltuieli de capital`, context: 'national budget classification' }),
  '71': () => t({ message: `Active nefinanciare (investiții)`, context: 'national budget classification' }),
  '72': () => t({ message: `Active financiare`, context: 'national budget classification' }),
  '79': () => t({ message: `Operațiuni financiare`, context: 'national budget classification' }),
  '80': () => t({ message: `Împrumuturi`, context: 'national budget classification' }),
  '81': () => t({ message: `Rambursări de credite`, context: 'national budget classification' }),
}

/** Groups over titles: shown as a row's heading, never ranked against the titles. */
export const TITLE_GROUPS = new Set(['01', '70', '79', '84', '85'])

const REVENUE_CHAPTERS: Readonly<Record<string, () => string>> = {
  '0101': () => t({ message: `Impozit pe profit`, context: 'national budget classification' }),
  '0201': () => t({ message: `Alte impozite pe venit și profit (persoane juridice)`, context: 'national budget classification' }),
  '0301': () => t({ message: `Impozit pe venit`, context: 'national budget classification' }),
  '0401': () => t({ message: `Cote și sume defalcate din impozitul pe venit (se scad)`, context: 'national budget classification' }),
  '0501': () => t({ message: `Alte impozite pe venit, profit și câștiguri din capital`, context: 'national budget classification' }),
  '0701': () => t({ message: `Impozite și taxe pe proprietate`, context: 'national budget classification' }),
  '1001': () => t({ message: `TVA`, context: 'national budget classification' }),
  '1101': () => t({ message: `Sume defalcate din TVA (se scad)`, context: 'national budget classification' }),
  '1201': () => t({ message: `Alte impozite și taxe pe bunuri și servicii`, context: 'national budget classification' }),
  '1401': () => t({ message: `Accize`, context: 'national budget classification' }),
  '1601': () => t({ message: `Taxe pe utilizarea bunurilor și pe activități`, context: 'national budget classification' }),
  '1701': () => t({ message: `Resurse proprii ale bugetului UE`, context: 'national budget classification' }),
  '2001': () => t({ message: `Contribuțiile angajatorilor`, context: 'national budget classification' }),
  '2101': () => t({ message: `Contribuțiile asiguraților`, context: 'national budget classification' }),
  '3001': () => t({ message: `Venituri din proprietate`, context: 'national budget classification' }),
  '3101': () => t({ message: `Venituri din dobânzi`, context: 'national budget classification' }),
  '3301': () => t({ message: `Venituri din servicii și alte activități`, context: 'national budget classification' }),
  '3401': () => t({ message: `Taxe administrative și permise`, context: 'national budget classification' }),
  '3501': () => t({ message: `Amenzi, penalități și confiscări`, context: 'national budget classification' }),
  '3601': () => t({ message: `Diverse venituri`, context: 'national budget classification' }),
  '3901': () => t({ message: `Valorificarea unor bunuri`, context: 'national budget classification' }),
  '4501': () => t({ message: `Bani de la UE pentru plăți și prefinanțări`, context: 'national budget classification' }),
  '4801': () => t({ message: `Bani de la UE, cadrul 2014–2020`, context: 'national budget classification' }),
  '4901': () => t({ message: `Granturi PNRR`, context: 'national budget classification' }),
  '9901': () => t({ message: `Deficit`, context: 'national budget classification' }),
}

/** The law's chapters a reader can look for: spending (they open on their titles) and revenue, without the printed deficit. */
export function lawChapters(): readonly { readonly code: string; readonly label: string; readonly linie: 'cheltuieli' | 'venituri' }[] {
  return [
    ...Object.entries(CHAPTERS).map(([code, label]) => ({ code, label: label(), linie: 'cheltuieli' as const })),
    ...Object.entries(REVENUE_CHAPTERS)
      .filter(([code]) => code !== '9901')
      .map(([code, label]) => ({ code, label: label(), linie: 'venituri' as const })),
  ]
}

export function chapterLabel(code: string, printed: string | null): string {
  return CHAPTERS[code]?.() ?? REVENUE_CHAPTERS[code]?.() ?? sentenceCase(printed ?? code)
}

export function titleLabel(code: string, printed: string | null): string {
  return TITLES[code]?.() ?? sentenceCase((printed ?? code).replace(/^TITLUL\s+[IVXL]+\s+/u, ''))
}

// ─────────────────────────────────────────────────────────── the question ──

type HeadPart = { readonly text: string; readonly role?: 'row' | 'budget' | 'scope' }

const execNoun: Readonly<Record<'cheltuieli' | 'venituri' | 'sold', () => string>> = {
  cheltuieli: () => t`cheltuielile publice`,
  venituri: () => t`veniturile publice`,
  sold: () => t`deficitul`,
}

/** The question the page answers, as its headline: the phrases a reader can change are marked. */
export function headlineParts({
  state,
  period,
  rowLabel,
  budget = null,
  lawYear,
  authorityName,
}: {
  readonly state: AdvancedState
  readonly period: ExecPeriod | null
  /** The line followed (the time and budgets tabs) or the chapter opened: never on the categories tab, which shows the whole tree. */
  readonly rowLabel: string | null
  /** One budget, as a sentence names it („bugetul de stat"); null: the consolidated budget. */
  readonly budget?: string | null
  readonly lawYear: number | null
  readonly authorityName: string | null
}): readonly HeadPart[] {
  const when = period ? periodText(period.label, period.basis) : ''
  const row = (text: string): HeadPart => ({ text, role: 'row' })
  const step = (pas: Pas) => (pas === 'an' ? t`pe ani` : pas === 'trimestru' ? t`pe trimestre` : state.cumulat || budget ? t`lună de lună, de la 1 ianuarie` : t`pe luni`)
  if (budget && state.dupa !== 'bugete' && (state.tip === 'cheltuieli' || state.tip === 'venituri')) {
    // One budget: „Cât s-a cheltuit din bugetul de stat pe dobânzi", „Cât s-a încasat în bugetele locale din TVA".
    const spending = state.tip === 'cheltuieli'
    const scope: HeadPart = { text: budget, role: 'budget' }
    if (state.dupa === 'timp') {
      return rowLabel
        ? [{ text: spending ? t`Cât s-a cheltuit din ` : t`Cât s-a încasat în ` }, scope, { text: spending ? t({ message: ` pe `, context: 'spent from <budget> on <line>' }) : t({ message: ` din `, context: 'collected in <budget> from <line>' }) }, row(inSentence(rowLabel)), { text: `, ${step(state.pas)}?` }]
        : [{ text: spending ? t`Cât s-a cheltuit din ` : t`Cât s-a încasat în ` }, scope, { text: `, ${step(state.pas)}?` }]
    }
    return [{ text: spending ? t`Pe ce s-a cheltuit din ` : t`Din ce s-a încasat în ` }, scope, { text: `, ${when}?` }]
  }
  if (budget && state.tip === 'sold' && state.dupa === 'timp') return [{ text: t`Cum a evoluat deficitul în ` }, { text: budget, role: 'budget' }, { text: `, ${step(state.pas)}?` }]
  if (state.tip === 'cheltuieli' || state.tip === 'venituri') {
    const spending = state.tip === 'cheltuieli'
    if (state.dupa === 'timp') {
      // „Cât s-a cheltuit pe dobânzi", „Cât s-a încasat din TVA": a line's name agrees with no verb of its own.
      return rowLabel
        ? [{ text: spending ? t`Cât s-a cheltuit pe ` : t`Cât s-a încasat din ` }, row(inSentence(rowLabel)), { text: `, ${step(state.pas)}?` }]
        : [{ text: t`Cum au evoluat ` }, { text: execNoun[state.tip](), role: 'scope' }, { text: `, ${step(state.pas)}?` }]
    }
    if (state.dupa === 'bugete') {
      return rowLabel
        ? [{ text: spending ? t`Cât a cheltuit fiecare buget pe ` : t`Cât a încasat fiecare buget din ` }, row(inSentence(rowLabel)), { text: t` în ${when}?` }]
        : [{ text: spending ? t`Cât a cheltuit fiecare buget public în ${when}?` : t`Cât a încasat fiecare buget public în ${when}?` }]
    }
    return [{ text: spending ? t`Pe ce s-au cheltuit banii publici în ${when}?` : t`De unde au venit banii publici în ${when}?` }]
  }
  if (state.tip === 'sold') {
    return state.dupa === 'bugete' ? [{ text: t`Ce deficit a avut fiecare buget în ${when}?` }] : [{ text: t`Cum a evoluat deficitul, ${step(state.pas)}?` }]
  }
  const year = lawYear ?? 0
  if (state.tip === 'lege') {
    const fund = inSentence(fundLabel(state.fond))
    if (state.dupa === 'legi') return [{ text: t`Cum s-a schimbat planul pentru ` }, { text: fund, role: 'scope' }, { text: t` de la o lege la alta?` }]
    if (state.dupa === 'capitole') {
      if (state.linie === 'venituri') return [{ text: t`Din ce venituri plănuiește legea pe ${year} ` }, { text: fund, role: 'scope' }, { text: '?' }]
      if (rowLabel) return [{ text: t`Pe ce merg banii pentru ` }, row(inSentence(rowLabel)), { text: t` în legea pe ${year}?` }]
      return [
        { text: state.clasificare === 'titluri' ? t`Ce fel de cheltuieli aprobă legea pe ${year} pentru ` : t`Pe ce domenii împarte legea pe ${year} ` },
        { text: fund, role: 'scope' },
        { text: '?' },
      ]
    }
    return [{ text: t`Ce aprobă legea bugetului pe ${year}?` }]
  }
  if (authorityName) return [{ text: t`Pe ce cheltuie ` }, row(authorityName), { text: t` în legea pe ${year}?` }]
  return [{ text: t`Cât primește fiecare minister în legea pe ${year}?` }]
}

export function headlineText(parts: readonly HeadPart[]): string {
  return parts.map((part) => part.text).join('')
}

export function populationLabel(tip: Tip): string {
  switch (tip) {
    case 'cheltuieli':
      return t`Cheltuieli`
    case 'venituri':
      return t`Venituri`
    case 'sold':
      return t`Deficit`
    case 'lege':
      return t`Legea`
    case 'ministere':
      return t`Ministere`
  }
}

export function tabLabel(dupa: Dupa): string {
  switch (dupa) {
    case 'categorii':
      return t`Pe categorii`
    case 'bugete':
      return t`Pe bugete`
    case 'timp':
      return t`În timp`
    case 'fonduri':
      return t`Pe fonduri`
    case 'capitole':
      return t`Pe capitole`
    case 'legi':
      return t`Lege după lege`
    case 'aprobat':
      return t`Aprobat în lege`
  }
}

// ───────────────────────────────────────────────────────── the questions ──

export type Question = { readonly id: string; readonly group: 'executie' | 'lege'; readonly text: () => string; readonly state: Partial<AdvancedState> }

export const QUESTIONS: readonly Question[] = [
  { id: 'deficit-luni', group: 'executie', text: () => t`Cum a evoluat deficitul lună de lună?`, state: { tip: 'sold', dupa: 'timp', pas: 'luna', cumulat: false } },
  { id: 'deficit-ani', group: 'executie', text: () => t`Cât deficit a avut fiecare an din 2006?`, state: { tip: 'sold', dupa: 'timp', pas: 'an' } },
  { id: 'dobanzi', group: 'executie', text: () => t`Cât plătește statul pe dobânzi, an de an?`, state: { tip: 'cheltuieli', dupa: 'timp', pas: 'an', rand: 'expenditure.interest' } },
  { id: 'decembrie', group: 'executie', text: () => t`Cât se cheltuie în fiecare lună (și în decembrie)?`, state: { tip: 'cheltuieli', dupa: 'timp', pas: 'luna', cumulat: false } },
  { id: 'tva', group: 'executie', text: () => t`Cât TVA se încasează pe trimestru?`, state: { tip: 'venituri', dupa: 'timp', pas: 'trimestru', rand: 'revenue.vat' } },
  { id: 'bugete', group: 'executie', text: () => t`Cât cheltuie fiecare buget public, de la stat la primării?`, state: { tip: 'cheltuieli', dupa: 'bugete' } },
  { id: 'buget-stat', group: 'executie', text: () => t`Pe ce cheltuie bugetul de stat, de la 1 ianuarie?`, state: { tip: 'cheltuieli', buget: 'state_budget' } },
  {
    id: 'locale-bunuri',
    group: 'executie',
    text: () => t`Cât cheltuie primăriile pe bunuri și servicii, an de an?`,
    state: { tip: 'cheltuieli', dupa: 'timp', pas: 'an', buget: 'territorial_units_budget', rand: 'expenditure.goods_services' },
  },
  {
    id: 'investitii',
    group: 'executie',
    text: () => t`Cât s-a investit (active nefinanciare), an de an?`,
    state: { tip: 'cheltuieli', dupa: 'timp', pas: 'an', rand: 'expenditure.nonfinancial_assets' },
  },
  { id: 'capitole', group: 'lege', text: () => t`Pe ce domenii împarte legea bugetul de stat?`, state: { tip: 'lege', dupa: 'capitole' } },
  { id: 'estimari', group: 'lege', text: () => t`Cât de mult s-au schimbat estimările de la o lege la alta?`, state: { tip: 'lege', dupa: 'legi' } },
  { id: 'ministere', group: 'lege', text: () => t`Cât primește fiecare minister în legea bugetului?`, state: { tip: 'ministere', dupa: 'aprobat' } },
  { id: 'venituri-lege', group: 'lege', text: () => t`Din ce venituri plănuiește legea bugetul de stat?`, state: { tip: 'lege', dupa: 'capitole', linie: 'venituri' } },
]

export function questionGroupLabel(group: Question['group']): string {
  return group === 'executie' ? t`Execuția (buletinele MF)` : t`Legea bugetului`
}

/** A year label of a law: „legea pe 2025". */
export function lawText(year: number): string {
  return t`legea pe ${year}`
}

export const yearsOfLaw = (editions: readonly { readonly budgetYear: number }[]): readonly number[] => [...new Set(editions.map((edition) => edition.budgetYear))].sort((a, b) => b - a)

// ──────────────────────────────────────────────────────────── budgets ──

/** A budget as a sentence names it: „bugetul de stat", „bugetele locale". */
export const budgetPhrase = (component: BudgetKey): string => inSentence(componentLabel(component))

/** What a budget's period reads: the year, or its release from 1 January. */
export const budgetWhen = (period: ExecPeriod): string => (period.type === 'YEAR' ? period.label : periodText(period.releaseMonth, 'YTD'))
