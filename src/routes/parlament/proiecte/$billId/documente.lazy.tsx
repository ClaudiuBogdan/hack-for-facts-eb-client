import { createLazyFileRoute } from '@tanstack/react-router'
import { BillDocumentsTab } from '@/features/parliament/components/bill-documents-tab'
import { BillTabPage } from '@/features/parliament/components/bill-tab-page'

export const Route = createLazyFileRoute('/parlament/proiecte/$billId/documente')({
  component: ParliamentBillDocumenteRoutePage,
})

function ParliamentBillDocumenteRoutePage() {
  const { billId } = Route.useParams()

  return (
    <BillTabPage
      billId={billId}
      render={(bill) => <BillDocumentsTab bill={bill} />}
    />
  )
}
