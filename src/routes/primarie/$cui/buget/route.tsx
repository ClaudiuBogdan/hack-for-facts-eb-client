import { createFileRoute, Outlet } from '@tanstack/react-router'
import { CampaignProgressProvider } from '@/features/campaigns/buget/hooks/use-campaign-progress'

export const Route = createFileRoute('/primarie/$cui/buget')({
  ssr: true,
  component: PrimarieBudgetRouteLayout,
})

function PrimarieBudgetRouteLayout() {
  return (
    <CampaignProgressProvider>
      <Outlet />
    </CampaignProgressProvider>
  )
}
