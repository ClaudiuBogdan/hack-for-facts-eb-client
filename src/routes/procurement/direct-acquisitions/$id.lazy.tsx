import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementDetailRoutePage } from '@/features/procurement/components/procurement-detail-route-page'

export const Route = createLazyFileRoute('/procurement/direct-acquisitions/$id')({
  component: DirectAcquisitionDetailRoutePage,
})

function DirectAcquisitionDetailRoutePage() {
  // `detail` is empty on a client-side navigation — the loader only blocks
  // while rendering HTML. See `lib/ssr/loader-blocking`.
  const { detail, id } = Route.useLoaderData()
  return (
    <ProcurementDetailRoutePage
      grain="direct_acquisitions"
      id={id}
      initialDetail={detail}
    />
  )
}
