import { createLazyFileRoute } from '@tanstack/react-router'
import { BillTabPage } from '@/features/parliament/components/bill-tab-page'
import { BillVotesTab } from '@/features/parliament/components/bill-votes-tab'

export const Route = createLazyFileRoute('/parlament/proiecte/$billId/voturi')({
  component: ParliamentBillVoturiRoutePage,
})

function ParliamentBillVoturiRoutePage() {
  const { billId } = Route.useParams()

  return (
    <BillTabPage
      billId={billId}
      render={(bill) => <BillVotesTab bill={bill} />}
    />
  )
}
