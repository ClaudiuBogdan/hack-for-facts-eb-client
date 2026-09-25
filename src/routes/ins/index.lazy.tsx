import { createLazyFileRoute } from '@tanstack/react-router'
import { StatisticsHubPage } from '@/features/statistics/pages/statistics-hub-page'

export const Route = createLazyFileRoute('/ins/')({
  component: StatisticsHubRoutePage,
})

function StatisticsHubRoutePage() {
  // The page reads only the counties' indicator: the localities' map reads its own
  // params, so switching them does not render the page again.
  const indicator = Route.useSearch({ select: (search) => search.indicator })
  const { hub } = Route.useLoaderData()

  return <StatisticsHubPage search={{ indicator }} initialHub={hub} />
}
