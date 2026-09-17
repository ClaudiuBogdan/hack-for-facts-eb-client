import { createLazyFileRoute } from '@tanstack/react-router'
import { StatisticsHubPage } from '@/features/statistics/pages/statistics-hub-page'

export const Route = createLazyFileRoute('/ins/')({
  component: StatisticsHubRoutePage,
})

function StatisticsHubRoutePage() {
  const search = Route.useSearch()
  const { hub } = Route.useLoaderData()

  return <StatisticsHubPage search={search} initialHub={hub} />
}
