import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementRecordDetail } from '@/features/procurement/components/procurement-record-detail'

export const Route = createLazyFileRoute('/procurement/procedures/$id')({
  component: ProcedureDetailRoutePage,
})

function ProcedureDetailRoutePage() {
  const { detail } = Route.useLoaderData()
  return <ProcurementRecordDetail detail={detail} className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8" />
}
