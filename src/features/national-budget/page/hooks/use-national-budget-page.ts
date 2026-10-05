import { useSuspenseQuery } from '@tanstack/react-query'

import type { ApprovedFund, CreditType, EditionKey } from '@/schemas/national-budget-page'
import { useNationalBudgetAdapter } from '../api/adapter-context'

/**
 * Suspense reads: the server renders the figures (the SSR query integration
 * streams them to the client), so the page's first paint is its answer. Wrap
 * each band in its own Suspense boundary with a matching skeleton.
 */
const KEY = 'national-budget-page'
const OPTIONS = { staleTime: Number.POSITIVE_INFINITY, retry: false } as const

export function useBudgetCatalog() {
  const adapter = useNationalBudgetAdapter()
  return useSuspenseQuery({ queryKey: [KEY, adapter.id, 'catalog'], queryFn: () => adapter.getCatalog(), ...OPTIONS })
}

export function useApprovedTotals(query: { readonly edition: EditionKey; readonly targetYear: number; readonly creditType: CreditType }) {
  const adapter = useNationalBudgetAdapter()
  return useSuspenseQuery({
    queryKey: [KEY, adapter.id, 'totals', query.edition, query.targetYear, query.creditType],
    queryFn: () => adapter.getApprovedTotals(query),
    ...OPTIONS,
  })
}

export function useApprovedSeries(query: { readonly fund: ApprovedFund; readonly line: 'revenue' | 'credits'; readonly creditType: CreditType }) {
  const adapter = useNationalBudgetAdapter()
  return useSuspenseQuery({
    queryKey: [KEY, adapter.id, 'series', query.fund, query.line, query.creditType],
    queryFn: () => adapter.getApprovedSeries(query),
    ...OPTIONS,
  })
}

export function useAuthorities(query: { readonly edition: EditionKey; readonly targetYear: number; readonly creditType: CreditType }) {
  const adapter = useNationalBudgetAdapter()
  return useSuspenseQuery({
    queryKey: [KEY, adapter.id, 'authorities', query.edition, query.targetYear, query.creditType],
    queryFn: () => adapter.getAuthorities(query),
    ...OPTIONS,
  })
}

export function useAuthorityDetail(query: {
  readonly edition: EditionKey
  readonly targetYear: number
  readonly creditType: CreditType
  readonly authorityKey: string
}) {
  const adapter = useNationalBudgetAdapter()
  return useSuspenseQuery({
    queryKey: [KEY, adapter.id, 'authority', query.edition, query.targetYear, query.creditType, query.authorityKey],
    queryFn: () => adapter.getAuthorityDetail(query),
    ...OPTIONS,
  })
}

export function useAnafStateBudget() {
  const adapter = useNationalBudgetAdapter()
  return useSuspenseQuery({ queryKey: [KEY, adapter.id, 'anaf'], queryFn: () => adapter.getAnafStateBudget(), ...OPTIONS })
}

export function useExecutionRelease(month: string) {
  const adapter = useNationalBudgetAdapter()
  return useSuspenseQuery({
    queryKey: [KEY, adapter.id, 'release', month],
    queryFn: () => adapter.getExecutionRelease({ month }),
    ...OPTIONS,
  })
}
