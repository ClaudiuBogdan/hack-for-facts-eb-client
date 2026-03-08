import { createLazyFileRoute } from '@tanstack/react-router'
import { CampaignProgressProvider } from '@/features/campaigns/buget/hooks/use-campaign-progress'
import { ChallengesLayout } from '@/features/challenges/components/layout/ChallengesLayout'

export const Route = createLazyFileRoute('/primarie/$cui')({
  component: PrimarieEntityLayout,
})

function PrimarieEntityLayout() {
  return (
    <CampaignProgressProvider>
      <ChallengesLayout />
    </CampaignProgressProvider>
  )
}
