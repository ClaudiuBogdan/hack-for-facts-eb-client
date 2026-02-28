import { createFileRoute } from '@tanstack/react-router'
import { CampaignLayout } from '@/features/campaigns/local-budget-2026/components/layout/CampaignLayout'

export const Route = createFileRoute('/bugete-locale-2026')({
  ssr: true,
  component: CampaignLayout,
})
