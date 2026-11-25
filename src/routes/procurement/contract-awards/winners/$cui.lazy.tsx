import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementContractAwardWinnerPage } from '@/features/procurement/components/contract-award/procurement-contract-award-winner-page'

export const Route = createLazyFileRoute('/procurement/contract-awards/winners/$cui')({
  component: WinnerRoutePage,
})

function WinnerRoutePage() {
  const { cui } = Route.useParams()
  const search = Route.useSearch()
  return <ProcurementContractAwardWinnerPage cui={cui} search={search} />
}
