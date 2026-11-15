import { createLazyFileRoute } from '@tanstack/react-router'
import { PnrrLiveOverviewPage } from '@/features/pnrr/components/live/PnrrLivePages'

export const Route = createLazyFileRoute('/pnrr')({
  component: PnrrLiveOverviewPage,
})
