import { createLazyFileRoute } from '@tanstack/react-router'
import { StatisticsLandingPage } from '@/features/statistics/pages/statistics-landing-page'

export const Route = createLazyFileRoute('/statistici/')({
  component: StatisticsLandingRoutePage,
})

function StatisticsLandingRoutePage() {
  const search = Route.useSearch()

  return <StatisticsLandingPage search={search} />
}
