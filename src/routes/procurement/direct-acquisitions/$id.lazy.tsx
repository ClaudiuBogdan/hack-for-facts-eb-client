import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementDetailPage } from '@/features/procurement/components/procurement-detail-page'

export const Route = createLazyFileRoute('/procurement/direct-acquisitions/$id')({
  component: DirectAcquisitionDetailRoutePage,
})

function DirectAcquisitionDetailRoutePage() {
  const { detail } = Route.useLoaderData()
  return <ProcurementDetailPage grain="direct_acquisitions" detail={detail} />
}
