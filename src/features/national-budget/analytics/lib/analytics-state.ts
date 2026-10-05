/**
 * The address of the national budget's analysis page (`/national-budget/analytics`),
 * in the procurement pages' Romanian keys. Defaults stay out of the URL; every
 * control writes it, so a view is a link. The router parses search values as
 * JSON: `perioada=2025` arrives as a number, `cumulat=false` as a boolean; both
 * are read back here.
 */
import { isPeriodLabel, type PeriodLabel } from './series'

/** What the page reads: the bulletins' spending, revenue and balance; the law; the ministries. */
export type Tip = 'cheltuieli' | 'venituri' | 'sold' | 'lege' | 'ministere'

/** The answer's tab, per population. */
export type Dupa = 'categorii' | 'bugete' | 'timp' | 'fonduri' | 'legi' | 'capitole' | 'aprobat'

export const TABS: Readonly<Record<Tip, readonly Dupa[]>> = {
  cheltuieli: ['categorii', 'bugete', 'timp'],
  venituri: ['categorii', 'bugete', 'timp'],
  sold: ['timp', 'bugete'],
  lege: ['fonduri', 'capitole', 'legi'],
  ministere: ['aprobat'],
}

/** The time tab's step. */
export type Pas = 'an' | 'trimestru' | 'luna'

export type LawFund = 'stat' | 'asigurari' | 'sanatate' | 'somaj'

/** The bulletin's columns that are budgets in their own right, in its order. */
export const BUDGET_COMPONENTS = [
  'state_budget',
  'territorial_units_budget',
  'state_social_insurance_budget',
  'unemployment_insurance_budget',
  'national_health_insurance_fund',
  'ministry_external_loans',
  'public_bodies_own_revenue_budget',
  'nonrefundable_external_funds',
  'treasury_budget',
  'national_road_infrastructure_company_budget',
  'exim_source_component',
] as const

/** One of the budgets the bulletin prints a column for (the state budget, the local budgets, …). */
export type BudgetKey = (typeof BUDGET_COMPONENTS)[number]

export type AdvancedState = {
  readonly tip: Tip
  readonly dupa: Dupa
  /** The bulletins' period (`2025`, `2026-Q2`, `2026-07`); null: the newest month. */
  readonly perioada: PeriodLabel | null
  /** A month from 1 January (the bulletin's own figure) or the month alone. */
  readonly cumulat: boolean
  readonly pas: Pas
  /** A line followed (an item without its `mfin.bgc.` prefix), a chapter code, or an authority code. */
  readonly rand: string | null
  /** One budget instead of the consolidated one: its printed column, from 1 January. Null: the consolidated budget. */
  readonly buget: BudgetKey | null
  /** The law's year (its edition); null: the newest. */
  readonly an: number | null
  readonly fond: LawFund
  readonly linie: 'cheltuieli' | 'venituri'
  readonly credite: 'bugetare' | 'angajament'
  /** The law's spending by chapter (what for) or by title (what kind). */
  readonly clasificare: 'capitole' | 'titluri'
}

export const DEFAULTS: AdvancedState = {
  tip: 'cheltuieli',
  dupa: 'categorii',
  perioada: null,
  cumulat: true,
  pas: 'an',
  rand: null,
  buget: null,
  an: null,
  fond: 'stat',
  linie: 'cheltuieli',
  credite: 'bugetare',
  clasificare: 'capitole',
}

/** The address's keys the page reads; any other (`lang`) is the site's. */
export const SEARCH_KEYS = Object.keys(DEFAULTS) as readonly (keyof AdvancedState)[]

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => (typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback)

const TIPS: readonly Tip[] = ['cheltuieli', 'venituri', 'sold', 'lege', 'ministere']

/** The page's state from its address: a key it can't read falls back to its default, never to an error. */
export function parseAdvanced(search: Record<string, unknown>): AdvancedState {
  const tip = oneOf(search.tip, TIPS, DEFAULTS.tip)
  const tabs = TABS[tip]
  const perioada = search.perioada === undefined ? null : String(search.perioada)
  const an = Number(search.an)
  return {
    tip,
    dupa: oneOf(search.dupa, tabs, tabs[0]!),
    perioada: isPeriodLabel(perioada) ? perioada : null,
    cumulat: search.cumulat !== false && search.cumulat !== 'false' && search.cumulat !== 0,
    pas: oneOf(search.pas, ['an', 'trimestru', 'luna'], DEFAULTS.pas),
    rand: typeof search.rand === 'string' || typeof search.rand === 'number' ? String(search.rand) : null,
    buget: (BUDGET_COMPONENTS as readonly unknown[]).includes(search.buget) ? (search.buget as BudgetKey) : null,
    an: Number.isInteger(an) && an >= 2000 && an <= 2100 ? an : null,
    fond: oneOf(search.fond, ['stat', 'asigurari', 'sanatate', 'somaj'], DEFAULTS.fond),
    linie: oneOf(search.linie, ['cheltuieli', 'venituri'], DEFAULTS.linie),
    credite: oneOf(search.credite, ['bugetare', 'angajament'], DEFAULTS.credite),
    clasificare: oneOf(search.clasificare, ['capitole', 'titluri'], DEFAULTS.clasificare),
  }
}

/**
 * The address a change writes, from the page's state as read (`parseAdvanced`)
 * and the change: a value the page couldn't read (`tip=altceva`) leaves with
 * the first change, as does a default; a year or a code travels as a number
 * (`perioada=2024`, `rand=25`, not the `"25"` the router writes for a string
 * that would read as a number; a code with a leading zero stays text, and the
 * router writes it bare, `rand=0100`, since it can't read as a number); a tab
 * stays only where its population has it, and not as the population's first.
 * The site's own keys (`lang`) are kept as they are.
 */
export function nextSearch(previous: Record<string, unknown>, patch: Partial<AdvancedState>): Record<string, unknown> {
  const state: Partial<AdvancedState> = { ...parseAdvanced(previous), ...patch }
  const next: Record<string, unknown> = { ...previous }
  for (const key of SEARCH_KEYS) {
    const value = state[key]
    if (value === null || value === undefined || value === DEFAULTS[key]) delete next[key]
    else next[key] = (key === 'perioada' || key === 'rand') && typeof value === 'string' && /^[1-9]\d{0,8}$/u.test(value) ? Number(value) : value
  }
  const tabs = TABS[state.tip ?? DEFAULTS.tip]
  if (!tabs.includes(next.dupa as Dupa) || next.dupa === tabs[0]) delete next.dupa
  return next
}

/** The filters that differ from the defaults: the count on the „Filtre" button. */
export function filterCount(state: AdvancedState): number {
  const execution = state.tip !== 'lege' && state.tip !== 'ministere'
  let count = 0
  if (state.perioada !== null && execution) count += 1
  if (state.an !== null && !execution) count += 1
  if (state.rand && !(execution && state.dupa === 'categorii')) count += 1
  if (state.buget && execution) count += 1
  if (state.credite !== DEFAULTS.credite && !execution) count += 1
  if (state.fond !== DEFAULTS.fond && state.tip === 'lege') count += 1
  return count
}

/** An item's id in the address (`expenditure.interest`) and back. */
const ITEM_PREFIX = 'mfin.bgc.'
export const itemOfRand = (rand: string | null): string | null => (rand ? `${ITEM_PREFIX}${rand}` : null)
export const randOfItem = (itemId: string | null): string | null => (itemId ? itemId.replace(ITEM_PREFIX, '') : null)
