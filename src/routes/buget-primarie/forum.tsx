import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCampaignDefinition } from '@/features/campaigns/local-budget-2026/hooks/use-campaign-content'

export const Route = createFileRoute('/buget-primarie/forum')({
  ssr: true,
  loader: () => {
    const campaign = getCampaignDefinition()

    throw redirect({
      href: campaign.forumUrl,
      statusCode: 307,
    })
  },
})
