import { createLazyFileRoute } from '@tanstack/react-router'
import { StatisticsLandingPage } from '@/features/statistics/pages/statistics-landing-page'

export const Route = createLazyFileRoute('/statistici/')({
  component: StatisticsLandingRoutePage,
})

function StatisticsLandingRoutePage() {
  const search = Route.useSearch()
  const { landingData, landingCatalog } = Route.useLoaderData()

  return (
    <StatisticsLandingPage
      search={search}
      {...(landingData ? { initialLandingData: landingData } : {})}
      {...(landingCatalog ? { initialLandingCatalog: landingCatalog } : {})}
    />
  )
}
