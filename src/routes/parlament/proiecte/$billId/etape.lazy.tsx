import { createLazyFileRoute } from '@tanstack/react-router'
import { BillStagesTab } from '@/features/parliament/components/bill-stages-tab'
import { BillTabPage } from '@/features/parliament/components/bill-tab-page'

export const Route = createLazyFileRoute('/parlament/proiecte/$billId/etape')({
  component: ParliamentBillEtapeRoutePage,
})

function ParliamentBillEtapeRoutePage() {
  const { billId } = Route.useParams()

  return (
    <BillTabPage
      billId={billId}
      render={(bill) => <BillStagesTab bill={bill} />}
    />
  )
}
