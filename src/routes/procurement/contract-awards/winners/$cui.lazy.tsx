import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementContractAwardWinnerPage } from '@/features/procurement/components/contract-award/procurement-contract-award-winner-page'
import { parseProcurementContractAwardWinnerSearch } from '@/schemas/procurement-contract-award-winner'

export const Route = createLazyFileRoute('/procurement/contract-awards/winners/$cui')({
  component: WinnerRoutePage,
})

function WinnerRoutePage() {
  const { cui } = Route.useParams()
  // Read through the parser again: whatever the router kept of the URL, the page sends the API only what it takes.
  const search = parseProcurementContractAwardWinnerSearch(Route.useSearch())
  return <ProcurementContractAwardWinnerPage cui={cui} search={search} />
}
