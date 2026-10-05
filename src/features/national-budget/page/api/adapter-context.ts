import { createContext, use } from 'react'

import { resolveNationalBudgetPageAdapter, type NationalBudgetPageAdapter } from './national-budget-page-api'

export const NationalBudgetAdapterContext = createContext<NationalBudgetPageAdapter | null>(null)

/** The page's adapter: the provider's, else the env-resolved one (mock or live). */
export function useNationalBudgetAdapter(): NationalBudgetPageAdapter {
  return use(NationalBudgetAdapterContext) ?? resolveNationalBudgetPageAdapter()
}
