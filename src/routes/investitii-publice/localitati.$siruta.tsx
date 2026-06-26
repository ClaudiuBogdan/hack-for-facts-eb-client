import { createFileRoute } from '@tanstack/react-router'
import { parseTerritorySearch } from '@/schemas/public-investments'
import { PublicInvestmentsTerritoryPage } from '@/features/public-investments/pages/PublicInvestmentsTerritoryPage'

export const Route = createFileRoute('/investitii-publice/localitati/$siruta')({
  validateSearch: parseTerritorySearch,
  component: LocalityRoute,
})

function LocalityRoute() {
  const params = Route.useParams()
  return (
    <PublicInvestmentsTerritoryPage
      scope="locality"
      code={params.siruta}
      search={Route.useSearch()}
    />
  )
}
