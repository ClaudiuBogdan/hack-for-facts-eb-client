import { createFileRoute } from '@tanstack/react-router'
import { parseTerritorySearch } from '@/schemas/public-investments'
import { PublicInvestmentsTerritoryPage } from '@/features/public-investments/pages/PublicInvestmentsTerritoryPage'

export const Route = createFileRoute('/investitii-publice/judete/$countyCode')({
  validateSearch: parseTerritorySearch,
  component: CountyRoute,
})

function CountyRoute() {
  const params = Route.useParams()
  return (
    <PublicInvestmentsTerritoryPage
      scope="county"
      code={params.countyCode}
      search={Route.useSearch()}
    />
  )
}
