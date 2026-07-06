import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementOverviewPage } from '@/features/procurement/components/procurement-overview-page'

export const Route = createLazyFileRoute('/procurement/')({
  component: ProcurementOverviewPage,
})
