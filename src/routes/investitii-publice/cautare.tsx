import { createFileRoute } from '@tanstack/react-router'
import { parseSearchState } from '@/schemas/public-investments'
import { PublicInvestmentsSearchPage } from '@/features/public-investments/pages/PublicInvestmentsSearchPage'

export const Route = createFileRoute('/investitii-publice/cautare')({
  validateSearch: parseSearchState,
  component: SearchRoute,
})

function SearchRoute() {
  return <PublicInvestmentsSearchPage search={Route.useSearch()} />
}
