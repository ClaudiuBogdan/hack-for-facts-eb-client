/**
 * The page's URL state, shared by both variants: every control writes the
 * address, so a view is a link. Keys are the future route's (`edition`,
 * `target`, `scope`, `credit`, `release`, `authority`, `q`, `question`,
 * `compare`); `demo` is the prototype's switch for loading, empty, unavailable
 * and error states. Defaults are omitted from the URL.
 */
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback } from 'react'

import type { BudgetCatalog, BudgetEdition, CreditType, EditionKey } from '@/schemas/national-budget-page'

export type Scope = 'state' | 'consolidated'
export type Credit = 'budget' | 'commitment'
export type Question = 'approved' | 'executed' | 'changed'
export type Demo = 'loading' | 'empty' | 'unavailable' | 'error'
const DEMOS: readonly Demo[] = ['loading', 'empty', 'unavailable', 'error']
export type CompareKey = 'forecasts' | 'approved-years' | 'plan-execution' | 'release-periods'

export type PageState = {
  readonly edition: EditionKey
  /** Null: the edition's own year. */
  readonly target: number | null
  readonly scope: Scope
  readonly credit: Credit
  /** `YYYY-MM`; null: derived from the target year. */
  readonly release: string | null
  readonly authority: string | null
  readonly q: string
  readonly question: Question
  readonly compare: CompareKey
  readonly demo: Demo | null
}

export const DEFAULT_STATE: PageState = {
  edition: '2025',
  target: null,
  scope: 'state',
  credit: 'budget',
  release: null,
  authority: null,
  q: '',
  question: 'approved',
  compare: 'forecasts',
  demo: null,
}

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback

/** The router JSON-parses search values: `2025` arrives as a number, `2026-draft` as a string. */
const text = (value: unknown): string | null =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : null

export function parsePageState(search: Record<string, unknown>): PageState {
  const edition = text(search.edition)
  const target = Number(search.target)
  const release = text(search.release)
  return {
    edition: edition && /^\d{4}(-draft)?$/.test(edition) ? edition : DEFAULT_STATE.edition,
    target: Number.isInteger(target) && target > 2000 ? target : null,
    scope: oneOf(search.scope, ['state', 'consolidated'], DEFAULT_STATE.scope),
    credit: oneOf(search.credit, ['budget', 'commitment'], DEFAULT_STATE.credit),
    release: release && /^\d{4}-\d{2}$/.test(release) ? release : null,
    authority: text(search.authority),
    q: text(search.q) ?? '',
    question: oneOf(search.question, ['approved', 'executed', 'changed'], DEFAULT_STATE.question),
    compare: oneOf(search.compare, ['forecasts', 'approved-years', 'plan-execution', 'release-periods'], DEFAULT_STATE.compare),
    demo: typeof search.demo === 'string' && (DEMOS as readonly string[]).includes(search.demo) ? (search.demo as Demo) : null,
  }
}

export type SetPageState = (patch: Partial<PageState>) => void

export function usePageState(): { readonly state: PageState; readonly set: SetPageState } {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const set = useCallback<SetPageState>(
    (patch) => {
      void navigate({
        to: '.',
        search: (previous: Record<string, unknown>) => {
          const next: Record<string, unknown> = { ...previous }
          for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === '' || value === DEFAULT_STATE[key as keyof PageState]) delete next[key]
            // A year-shaped edition goes in as a number, so the address reads `edition=2024`, not `edition=%222024%22`.
            else next[key] = key === 'edition' && typeof value === 'string' && /^\d{4}$/.test(value) ? Number(value) : value
          }
          return next
        },
        replace: true,
        resetScroll: false,
      })
    },
    [navigate],
  )
  return { state: parsePageState(search), set }
}

export const creditTypeOf = (credit: Credit): CreditType => (credit === 'budget' ? 'budget_credits' : 'commitment_credits')

export function editionOf(catalog: BudgetCatalog, key: EditionKey): BudgetEdition {
  return catalog.editions.find((edition) => edition.key === key) ?? catalog.editions.find((edition) => edition.key === DEFAULT_STATE.edition)!
}

export function targetOf(state: PageState, edition: BudgetEdition): number {
  return state.target !== null && edition.targetYears.includes(state.target) ? state.target : edition.budgetYear
}

/**
 * The release the execution side reads: the URL's, else the target year's
 * December when published, else that year's latest published month, else the
 * latest published month. Never a gap month by default.
 */
export function releaseOf(state: PageState, catalog: BudgetCatalog, targetYear: number): string {
  if (state.release) return state.release
  const selected = catalog.releases.filter((release) => release.status === 'selected')
  const ofYear = selected.filter((release) => release.periodEnd.startsWith(String(targetYear)))
  const december = ofYear.find((release) => release.periodEnd.slice(5, 7) === '12')
  const pick = december ?? ofYear.slice(-1)[0] ?? selected.slice(-1)[0]
  return pick ? pick.periodEnd.slice(0, 7) : `${targetYear}-12`
}

/** The latest published month: the default of the questions variant's execution side. */
export function latestRelease(catalog: BudgetCatalog): string {
  return catalog.releases.filter((release) => release.status === 'selected').slice(-1)[0]?.periodEnd.slice(0, 7) ?? ''
}
