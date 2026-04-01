import { createLazyFileRoute } from '@tanstack/react-router'
import { CampaignNotificationPreferencesPage } from '@/features/campaigns/buget/components/CampaignNotificationPreferencesPage'

export const Route = createLazyFileRoute('/provocare_/notificari')({
  component: CampaignNotificationPreferencesPage,
})
