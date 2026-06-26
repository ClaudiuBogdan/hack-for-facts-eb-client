import { createFileRoute } from '@tanstack/react-router'
import { parseLandingSearch } from '@/schemas/public-investments'
import { PublicInvestmentsLandingPage } from '@/features/public-investments/pages/PublicInvestmentsLandingPage'

export const Route = createFileRoute('/investitii-publice/')({
  validateSearch: parseLandingSearch,
  component: LandingRoute,
})

function LandingRoute() {
  return <PublicInvestmentsLandingPage search={Route.useSearch()} />
}
