import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementDirectPurchasePage } from '@/features/procurement/components/direct-purchase/procurement-direct-purchase-page'

export const Route = createLazyFileRoute('/procurement/direct-acquisitions/$id')({
  component: DirectPurchaseRoutePage,
})

function DirectPurchaseRoutePage() {
  // The purchase is empty on a client-side navigation: the loader only reads while rendering HTML (`lib/ssr/loader-blocking`).
  const data = Route.useLoaderData()
  return <ProcurementDirectPurchasePage id={data.id} initialData={data} />
}
