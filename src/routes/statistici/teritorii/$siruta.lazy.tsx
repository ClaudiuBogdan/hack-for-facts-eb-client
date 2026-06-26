import { createLazyFileRoute } from '@tanstack/react-router'
import { StatisticsTerritoryHubPage } from '@/features/statistics/pages/statistics-territory-hub-page'

export const Route = createLazyFileRoute('/statistici/teritorii/$siruta')({
  component: StatisticsTerritoryRoutePage,
})

function StatisticsTerritoryRoutePage() {
  const params = Route.useParams()
  const search = Route.useSearch()

  return (
    <StatisticsTerritoryHubPage
      siruta={params.siruta}
      search={search}
    />
  )
}
