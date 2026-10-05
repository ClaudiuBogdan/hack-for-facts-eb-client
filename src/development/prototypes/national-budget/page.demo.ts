/**
 * `?demo=` states for review: the same adapter contract answering as the API
 * would when it is empty, not deployed, or failing. Loading is drawn by the
 * page itself (a promise that never settles would hold the server render).
 */
import { nationalBudgetLiveAdapter, type NationalBudgetPageAdapter } from '@/features/national-budget/page/api/national-budget-page-api'
import type { Demo } from './page.state'

export function withDemo(adapter: NationalBudgetPageAdapter, demo: Demo | null): NationalBudgetPageAdapter {
  if (demo === 'unavailable') return { ...nationalBudgetLiveAdapter, id: 'demo-unavailable' }
  if (demo === 'error') {
    const fail = () => Promise.reject(new Error('Serverul a răspuns cu o eroare (simulare).'))
    return {
      id: 'demo-error',
      mode: adapter.mode,
      getCatalog: fail,
      getApprovedTotals: fail,
      getApprovedSeries: fail,
      getAuthorities: fail,
      getAuthorityDetail: fail,
      getExecutionRelease: fail,
      getAnafStateBudget: fail,
    }
  }
  if (demo === 'empty') {
    // The API answers, with no rows for the selection.
    return {
      ...adapter,
      id: 'demo-empty',
      getApprovedSeries: async (query) => ({ status: 'ok', fund: query.fund, line: query.line, points: [] }),
      getAuthorities: async (query) => {
        const list = await adapter.getAuthorities(query)
        return list.status === 'ok' ? { ...list, rows: [] } : list
      },
      getExecutionRelease: async (query) => {
        const release = await adapter.getExecutionRelease(query)
        return release.status === 'ok' ? { ...release, facts: [] } : release
      },
      getAnafStateBudget: async () => {
        const anaf = await adapter.getAnafStateBudget()
        return anaf.status === 'ok' ? { ...anaf, years: [], authorities: {} } : anaf
      },
    }
  }
  return adapter
}
