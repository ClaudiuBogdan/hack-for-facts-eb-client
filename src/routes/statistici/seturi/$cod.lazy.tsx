import { useCallback } from 'react'
import { createLazyFileRoute } from '@tanstack/react-router'
import {
  detailScopeKey,
  type DetailSearchPatch,
} from '@/features/statistics/lib/dataset-selection'
import { StatisticsDatasetDetailPage } from '@/features/statistics/pages/statistics-dataset-detail-page'

export const Route = createLazyFileRoute('/statistici/seturi/$cod')({
  component: StatisticsDatasetDetailRoutePage,
})

function StatisticsDatasetDetailRoutePage() {
  const params = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { tier0, series, scopeKey } = Route.useLoaderData()
  // Seed only when the loader answered for THIS scope: a mis-seeded key
  // would serve a wrong cell for the whole 24h staleTime.
  const scopeMatches = scopeKey === detailScopeKey(search)

  /**
   * Every control writes exactly one key, so a patch merges into the URL.
   * Changing a filter invalidates the current offset — `pagina` is dropped
   * unless the patch is itself a page change.
   */
  const onSearchChange = useCallback(
    (patch: DetailSearchPatch) => {
      navigate({
        replace: true,
        search: (previous) => ({
          ...previous,
          ...('pagina' in patch ? {} : { pagina: undefined }),
          ...patch,
        }),
      })
    },
    [navigate],
  )

  return (
    <StatisticsDatasetDetailPage
      code={params.cod}
      search={search}
      onSearchChange={onSearchChange}
      {...(scopeMatches && tier0 ? { initialTier0: tier0 } : {})}
      {...(scopeMatches && series ? { initialSeries: series } : {})}
    />
  )
}
