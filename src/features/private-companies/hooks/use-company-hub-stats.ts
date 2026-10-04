import { useQuery } from '@tanstack/react-query'
import { isRegistryPublished } from '@/schemas/private-company-registry'
import { fetchCompanyHubStats } from '../api/company-groups-api'
import { retryRegistryRead } from '../api/company-registry-errors'
import { boundScopeKey, useRegistryReadLedger, useReportRegistryMove, type CompanyRegistryScope } from './use-company-registry-scope'

const HUB_STATS_KEY = ['company-hub-stats'] as const

/**
 * The hub's figures under the page's pinned registry scope. Asked only of a
 * published edition (the server refuses the rest, and the page says the
 * state); keyed by the scope, so a figure of another edition or access state
 * is never shown, cached as this one's or used as a placeholder. A refused
 * read — moved or unavailable — opens a refusal episode: the scope's cached
 * figures are retired and the registry re-read, once per episode; an answer
 * accepted after it lets a later refusal act again. The page shows none of
 * the data an earlier success left in the cache.
 */
export function useCompanyHubStats(scope: CompanyRegistryScope) {
  const scopeKey = boundScopeKey(scope)
  const published = scope.status === 'ready' && isRegistryPublished(scope.pinned.registry)
  const ledger = useRegistryReadLedger()
  const query = useQuery({
    queryKey: [...HUB_STATS_KEY, scopeKey] as const,
    queryFn: ({ signal }) => ledger.track(scopeKey ?? '', () => fetchCompanyHubStats(scopeKey ?? '', signal)),
    enabled: scopeKey !== null && published,
    staleTime: 60_000,
    retry: retryRegistryRead,
  })
  useReportRegistryMove(query.error, scope, ledger, HUB_STATS_KEY)
  return query
}
