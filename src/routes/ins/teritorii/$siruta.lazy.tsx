import { createLazyFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { EmptyState } from '@/components/ui/empty-state'
import { StatisticsBackLink } from '@/features/statistics/components/statistics-back-link'
import { StatisticsTerritoryHubPage } from '@/features/statistics/pages/statistics-territory-hub-page'

export const Route = createLazyFileRoute('/ins/teritorii/$siruta')({
  component: StatisticsTerritoryRoutePage,
  notFoundComponent: StatisticsTerritoryNotFound,
})

function StatisticsTerritoryRoutePage() {
  const params = Route.useParams()
  const search = Route.useSearch()
  const { hub } = Route.useLoaderData()

  return (
    <StatisticsTerritoryHubPage
      siruta={params.siruta}
      search={search}
      {...(hub ? { initialHub: hub } : {})}
    />
  )
}

/** No INS territory answers to this SIRUTA: the server says 404 in the page's own frame. */
function StatisticsTerritoryNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
        <StatisticsBackLink to="/ins">
          <Trans>Înapoi la statistici</Trans>
        </StatisticsBackLink>
        <EmptyState
          title={t`Teritoriu negăsit`}
          description={t`Nu am găsit un teritoriu INS pentru acest SIRUTA.`}
        />
      </div>
    </div>
  )
}
