import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementHomePage } from '@/features/procurement/components/home/procurement-home-page'

export const Route = createLazyFileRoute('/procurement/')({
  component: ProcurementHomeRoutePage,
})

function ProcurementHomeRoutePage() {
  const search = Route.useSearch()
  const initial = Route.useLoaderData()
  return <ProcurementHomePage search={search} initial={initial} />
}
