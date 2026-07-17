import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementOverviewPage } from '@/features/procurement/components/procurement-overview-page'
import { parseProcurementOverviewSearch } from '@/schemas/procurement-overview'

export const Route = createLazyFileRoute('/procurement/')({
  component: ProcurementOverviewRoutePage,
})

function ProcurementOverviewRoutePage() {
  const search = parseProcurementOverviewSearch(Route.useSearch())
  return (
    <ProcurementOverviewPage
      filters={{ dateFrom: search.dateFrom, dateTo: search.dateTo }}
    />
  )
}
