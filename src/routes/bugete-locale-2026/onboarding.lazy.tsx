import { createLazyFileRoute } from '@tanstack/react-router'
import { CampaignOnboarding } from '@/features/campaigns/local-budget-2026/components/onboarding/CampaignOnboarding'

export const Route = createLazyFileRoute('/bugete-locale-2026/onboarding')({
  component: CampaignOnboarding,
})
