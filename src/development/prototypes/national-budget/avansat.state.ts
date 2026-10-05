/**
 * The address of the advanced analysis page, in the procurement pages'
 * Romanian keys. Defaults stay out of the URL; every control writes it, so a
 * view is a link. The router parses search values as JSON: `perioada=2025`
 * arrives as a number, `cumulat=false` as a boolean; both are read back here.
 */
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'

import { isPeriodLabel, type PeriodLabel } from '@/features/national-budget/analytics/lib/series'
import { BUDGET_COMPONENTS } from './avansat.view'

/** What the page reads: the bulletins' spending, revenue and balance; the law; the ministries. */
export type Tip = 'cheltuieli' | 'venituri' | 'sold' | 'lege' | 'ministere'

/** The answer's tab, per population. */
export type Dupa = 'categorii' | 'bugete' | 'timp' | 'fonduri' | 'legi' | 'capitole' | 'aprobat' | 'platit'

export const TABS: Readonly<Record<Tip, readonly Dupa[]>> = {
  cheltuieli: ['categorii', 'bugete', 'timp'],
  venituri: ['categorii', 'bugete', 'timp'],
  sold: ['timp', 'bugete'],
  lege: ['fonduri', 'capitole', 'legi'],
  ministere: ['aprobat', 'platit'],
}

/** The time tab's step. */
export type Pas = 'an' | 'trimestru' | 'luna'

export type LawFund = 'stat' | 'asigurari' | 'sanatate' | 'somaj'

export type Demo = 'loading' | 'error'

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
  /** A line opened or followed (an item without its `mfin.bgc.` prefix), a chapter code, or an authority code. */
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
  readonly demo: Demo | null
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
  demo: null,
}

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => (typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback)

const TIPS: readonly Tip[] = ['cheltuieli', 'venituri', 'sold', 'lege', 'ministere']

function parseAdvanced(search: Record<string, unknown>): AdvancedState {
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
    demo: search.demo === 'loading' || search.demo === 'error' ? search.demo : null,
  }
}

export function useAdvancedState(): { readonly state: AdvancedState; readonly set: (patch: Partial<AdvancedState>) => void } {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const set = useCallback(
    (patch: Partial<AdvancedState>) => {
      void navigate({
        to: '.',
        search: (previous: Record<string, unknown>) => {
          const next: Record<string, unknown> = { ...previous }
          for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === undefined || value === DEFAULTS[key as keyof AdvancedState]) delete next[key]
            // A year is written as a number (`perioada=2024`), not as the quoted text the router keeps for a string.
            else next[key] = key === 'perioada' && typeof value === 'string' && /^\d{4}$/u.test(value) ? Number(value) : value
          }
          // A tab is its population's first unless said otherwise.
          const tip = (next.tip as Tip | undefined) ?? DEFAULTS.tip
          if (next.dupa === TABS[tip][0]) delete next.dupa
          return next
        },
        // Each view is a step in the history: the browser's Back returns to the one before.
        resetScroll: false,
      })
    },
    [navigate],
  )
  const state = useMemo(() => parseAdvanced(search), [search])
  return { state, set }
}

/** An item's id in the address (`expenditure.interest`) and back. */
const ITEM_PREFIX = 'mfin.bgc.'
export const itemOfRand = (rand: string | null): string | null => (rand ? `${ITEM_PREFIX}${rand}` : null)
export const randOfItem = (itemId: string | null): string | null => (itemId ? itemId.replace(ITEM_PREFIX, '') : null)
