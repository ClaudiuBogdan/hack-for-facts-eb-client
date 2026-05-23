import { createLazyFileRoute } from '@tanstack/react-router'
import { BillRouteLayout } from '@/features/parliament/components/bill-route-layout'

export const Route = createLazyFileRoute('/parlament/proiecte/$billId')({
  component: ParliamentBillRouteLayoutPage,
})

function ParliamentBillRouteLayoutPage() {
  const { billId } = Route.useParams()
  return <BillRouteLayout billId={billId} />
}
