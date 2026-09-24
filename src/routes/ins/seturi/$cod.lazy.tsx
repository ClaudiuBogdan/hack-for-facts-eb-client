import { useCallback } from 'react'
import { createLazyFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { EmptyState } from '@/components/ui/empty-state'
import { StatisticsBackLink } from '@/features/statistics/components/statistics-back-link'
import {
  detailScopeKey,
  type DetailSearchPatch,
} from '@/features/statistics/lib/dataset-selection'
import { StatisticsDatasetDetailPage } from '@/features/statistics/pages/statistics-dataset-detail-page'
import { statisticsTheme } from '@/features/statistics/lib/statistics-theme'

export const Route = createLazyFileRoute('/ins/seturi/$cod')({
  component: StatisticsDatasetDetailRoutePage,
  notFoundComponent: StatisticsDatasetNotFound,
})

function StatisticsDatasetDetailRoutePage() {
  const params = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { tier0, series, scopeKey } = Route.useLoaderData()
  // Seed only when the loader answered for THIS scope: a mis-seeded key
  // would serve a wrong cell for the whole 24h staleTime.
  const scopeMatches = scopeKey === detailScopeKey(search)

  /** Every control writes exactly one key, so a patch merges into the URL. */
  const onSearchChange = useCallback(
    (patch: DetailSearchPatch) => {
      navigate({
        replace: true,
        search: (previous) => ({ ...previous, ...patch }),
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

/** An unknown matrix code: the server answers 404 with the page's own frame. */
function StatisticsDatasetNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <div className={statisticsTheme.detailPage}>
        <StatisticsBackLink to="/ins/seturi">
          <Trans>Înapoi la seturi de date</Trans>
        </StatisticsBackLink>
        <EmptyState
          title={t`Set de date negăsit`}
          description={t`Nu am găsit o matrice INS cu acest cod.`}
        />
      </div>
    </div>
  )
}
