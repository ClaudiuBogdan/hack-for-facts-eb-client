import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementOverviewPage } from '@/features/procurement/components/procurement-overview-page'
import { parseProcurementHubSearch } from '@/schemas/procurement-hub'

export const Route = createLazyFileRoute('/procurement/')({
  component: ProcurementOverviewRoutePage,
})

function ProcurementOverviewRoutePage() {
  const hubState = parseProcurementHubSearch(Route.useSearch())
  return <ProcurementOverviewPage hubState={hubState} />
}
