import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementDetailPage } from '@/features/procurement/components/procurement-detail-page'

export const Route = createLazyFileRoute('/procurement/contracts/$id')({
  component: ContractDetailRoutePage,
})

function ContractDetailRoutePage() {
  const { detail } = Route.useLoaderData()
  return <ProcurementDetailPage grain="contracts" detail={detail} />
}
