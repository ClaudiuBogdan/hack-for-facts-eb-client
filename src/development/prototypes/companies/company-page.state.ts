/**
 * URL state for the prototype, read loosely from the harness URL so every
 * view is a deep link — the real route would own these keys in its search
 * schema, as `/companies` owns `clasament`, `domenii` and `indicator`.
 *
 * - `masura`: the measure the financial chart shows;
 * - `plati`: contracts or direct purchases, for who pays and what for (unset:
 *   whichever the company has, contracts first);
 * - `sectiune`: the open tab of the questions-first layout;
 * - `firma`: which fixture company — prototype only; the route has the CUI.
 */
import { useNavigate, useSearch } from '@tanstack/react-router'
import { COMPANY_FIXTURE_KEYS, type CompanyFixtureKey } from './company-page.fixtures'

export const FINANCIAL_MEASURES = ['cifra-de-afaceri', 'profit', 'salariati'] as const
export type FinancialMeasure = (typeof FINANCIAL_MEASURES)[number]

export const PAYMENT_GRAINS = ['contracte', 'achizitii-directe'] as const
export type PaymentGrain = (typeof PAYMENT_GRAINS)[number]

export const COMPANY_SECTIONS = ['finante', 'bani-publici', 'activitati', 'registru'] as const
export type CompanySection = (typeof COMPANY_SECTIONS)[number]

export interface CompanyPageState {
  readonly company: CompanyFixtureKey
  readonly measure: FinancialMeasure
  readonly grain: PaymentGrain | null
  readonly section: CompanySection
}

type Key = 'firma' | 'masura' | 'plati' | 'sectiune'

const DEFAULTS: Record<Key, string | undefined> = {
  firma: COMPANY_FIXTURE_KEYS[0],
  masura: 'cifra-de-afaceri',
  plati: undefined,
  sectiune: 'finante',
}

function oneOf<T extends string>(values: readonly T[], value: unknown): T | undefined {
  return typeof value === 'string' && (values as readonly string[]).includes(value) ? (value as T) : undefined
}

export function useCompanyPageState() {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const state: CompanyPageState = {
    company: oneOf(COMPANY_FIXTURE_KEYS, search.firma) ?? COMPANY_FIXTURE_KEYS[0],
    measure: oneOf(FINANCIAL_MEASURES, search.masura) ?? 'cifra-de-afaceri',
    grain: oneOf(PAYMENT_GRAINS, search.plati) ?? null,
    section: oneOf(COMPANY_SECTIONS, search.sectiune) ?? 'finante',
  }
  // One navigation per change, however many keys it sets: two in a row would
  // each start from the URL before the other landed.
  const set = (patch: Partial<Record<Key, string | undefined>>) =>
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => {
        const next = { ...previous }
        for (const [key, value] of Object.entries(patch) as [Key, string | undefined][]) {
          next[key] = value === DEFAULTS[key] ? undefined : value
        }
        return next
      },
      replace: true,
      resetScroll: false,
    })
  return {
    state,
    setMeasure: (value: FinancialMeasure) => set({ masura: value }),
    /** `fallback`: the company's own default grain, which stays out of the URL like any default. */
    setGrain: (value: PaymentGrain, fallback: PaymentGrain | null) => set({ plati: value === fallback ? undefined : value }),
    setSection: (value: CompanySection) => set({ sectiune: value }),
    /** Opens a tab, and with it the chart's measure when the answer is about one. */
    openSection: (section: CompanySection, measure?: FinancialMeasure) => set(measure ? { sectiune: section, masura: measure } : { sectiune: section }),
    /** Another company: the per-company choices go back to their defaults. */
    setCompany: (value: CompanyFixtureKey) => set({ firma: value, plati: undefined, masura: undefined, sectiune: undefined }),
  }
}
