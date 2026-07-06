import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementDetailPage } from '@/features/procurement/components/procurement-detail-page'

export const Route = createLazyFileRoute('/procurement/procedures/$id')({
  component: ProcedureDetailRoutePage,
})

function ProcedureDetailRoutePage() {
  const { detail } = Route.useLoaderData()
  return <ProcurementDetailPage grain="procedures" detail={detail} />
}
