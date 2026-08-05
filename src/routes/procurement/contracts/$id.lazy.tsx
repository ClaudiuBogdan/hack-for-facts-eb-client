import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementDetailRoutePage } from '@/features/procurement/components/procurement-detail-route-page'

export const Route = createLazyFileRoute('/procurement/contracts/$id')({
  component: ContractDetailRoutePage,
})

function ContractDetailRoutePage() {
  // `detail` is empty on a client-side navigation — the loader only blocks
  // while rendering HTML. See `lib/ssr/loader-blocking`.
  const { detail, id } = Route.useLoaderData()
  return (
    <ProcurementDetailRoutePage
      grain="contracts"
      id={id}
      initialDetail={detail}
    />
  )
}
