/**
 * The address of the hub and of the analysis page, in the procurement pages'
 * Romanian keys. Defaults stay out of the URL; every control writes it, so a
 * view is a link. `demo=loading|empty|unavailable|error` is the prototype's
 * switch for the states.
 */
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback } from 'react'

import type { Demo } from './page.state'
import type { BudgetScope } from './budget.format'

const DEMOS: readonly Demo[] = ['loading', 'empty', 'unavailable', 'error']

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback

const demoOf = (value: unknown): Demo | null => (typeof value === 'string' && (DEMOS as readonly string[]).includes(value) ? (value as Demo) : null)

function useWriter<S extends object>(defaults: S) {
  const navigate = useNavigate()
  return useCallback(
    (patch: Partial<S>) => {
      void navigate({
        to: '.',
        search: (previous: Record<string, unknown>) => {
          const next: Record<string, unknown> = { ...previous }
          for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === undefined || value === '' || value === defaults[key as keyof S]) delete next[key]
            else next[key] = value
          }
          return next
        },
        replace: true,
        resetScroll: false,
      })
    },
    [navigate, defaults],
  )
}

// ──────────────────────────────────────────────────────────────── hub ──

export type HubState = {
  /** Spending breakdown: the consolidated budget or the state budget. */
  readonly cheltuieli: BudgetScope
  readonly venituri: BudgetScope
  /** The law band: spending (credits) or revenue. */
  readonly lege: 'cheltuieli' | 'venituri'
  /** The years band: payments (ANAF) or what each law approved. */
  readonly ani: 'platit' | 'aprobat'
  /** The hero's ranking: paid (ANAF) or proposed (the March 2026 draft). */
  readonly ordonatori: 'platit' | 'propus'
  readonly demo: Demo | null
}

export const HUB_DEFAULTS: HubState = {
  cheltuieli: 'consolidat',
  venituri: 'consolidat',
  lege: 'cheltuieli',
  ani: 'platit',
  ordonatori: 'platit',
  demo: null,
}

export function useHubState(): { readonly state: HubState; readonly set: (patch: Partial<HubState>) => void } {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const set = useWriter(HUB_DEFAULTS)
  return {
    state: {
      cheltuieli: oneOf(search.cheltuieli, ['consolidat', 'stat'], HUB_DEFAULTS.cheltuieli),
      venituri: oneOf(search.venituri, ['consolidat', 'stat'], HUB_DEFAULTS.venituri),
      lege: oneOf(search.lege, ['cheltuieli', 'venituri'], HUB_DEFAULTS.lege),
      ani: oneOf(search.ani, ['platit', 'aprobat'], HUB_DEFAULTS.ani),
      ordonatori: oneOf(search.ordonatori, ['platit', 'propus'], HUB_DEFAULTS.ordonatori),
      demo: demoOf(search.demo),
    },
    set,
  }
}

// ─────────────────────────────────────────────────────────── analysis ──

/** What the page reads: payments, revenue (both from the MF bulletin), the law, the ministries (ANAF). */
export type Population = 'cheltuieli' | 'venituri' | 'lege' | 'ministere'

/** The answer's axis, per population. */
export type Axis = 'titluri' | 'surse' | 'bugete' | 'legi' | 'ordonatori' | 'platit'

export const AXES: Readonly<Record<Population, readonly Axis[]>> = {
  cheltuieli: ['titluri'],
  venituri: ['surse'],
  lege: ['bugete', 'legi', 'ordonatori'],
  ministere: ['platit'],
}

export type AnalysisState = {
  readonly tip: Population
  readonly buget: BudgetScope
  readonly an: number
  readonly dupa: Axis
  /** How deep the bulletin's tree is cut: 1 the groups, 2 the titles, 4 every line. */
  readonly nivel: 1 | 2 | 4
  /** A line the reader drilled into (its children only); null for the whole tree. */
  readonly rand: string | null
  readonly masura: 'lei' | 'pib'
  /** The law's line: spending (credits) or revenue. */
  readonly linie: 'cheltuieli' | 'venituri'
  readonly credite: 'bugetare' | 'angajament'
  readonly demo: Demo | null
}

export const ANALYSIS_DEFAULTS: AnalysisState = {
  tip: 'cheltuieli',
  buget: 'consolidat',
  an: 2025,
  dupa: 'titluri',
  nivel: 2,
  rand: null,
  masura: 'lei',
  linie: 'cheltuieli',
  credite: 'bugetare',
  demo: null,
}

export function parseAnalysis(search: Record<string, unknown>): AnalysisState {
  const tip = oneOf(search.tip, ['cheltuieli', 'venituri', 'lege', 'ministere'], ANALYSIS_DEFAULTS.tip)
  const year = Number(search.an)
  const nivel = Number(search.nivel)
  const axes = AXES[tip]
  return {
    tip,
    buget: oneOf(search.buget, ['consolidat', 'stat'], ANALYSIS_DEFAULTS.buget),
    an: Number.isInteger(year) && year >= 2006 && year <= 2030 ? year : ANALYSIS_DEFAULTS.an,
    dupa: oneOf(search.dupa, axes, axes[0]!),
    nivel: nivel === 1 || nivel === 4 ? nivel : 2,
    rand: typeof search.rand === 'string' && search.rand.length > 0 ? search.rand : null,
    masura: oneOf(search.masura, ['lei', 'pib'], ANALYSIS_DEFAULTS.masura),
    linie: oneOf(search.linie, ['cheltuieli', 'venituri'], ANALYSIS_DEFAULTS.linie),
    credite: oneOf(search.credite, ['bugetare', 'angajament'], ANALYSIS_DEFAULTS.credite),
    demo: demoOf(search.demo),
  }
}

export function useAnalysisState(): { readonly state: AnalysisState; readonly set: (patch: Partial<AnalysisState>) => void } {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const set = useWriter(ANALYSIS_DEFAULTS)
  return { state: parseAnalysis(search), set }
}
