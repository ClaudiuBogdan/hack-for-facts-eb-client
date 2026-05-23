import { createLazyFileRoute } from '@tanstack/react-router'
import { BillDetailsTab } from '@/features/parliament/components/bill-details-tab'
import { BillTabPage } from '@/features/parliament/components/bill-tab-page'

export const Route = createLazyFileRoute('/parlament/proiecte/$billId/')({
  component: ParliamentBillDetailsRoutePage,
})

function ParliamentBillDetailsRoutePage() {
  const { billId } = Route.useParams()

  return (
    <BillTabPage
      billId={billId}
      render={(bill) => <BillDetailsTab bill={bill} />}
    />
  )
}
