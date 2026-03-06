import { createFileRoute } from '@tanstack/react-router'
import { CampaignLayout } from '@/features/campaigns/local-budget-2026/components/layout/CampaignLayout'

export const Route = createFileRoute('/buget-primarie')({
  ssr: true,
  component: CampaignLayout,
})
