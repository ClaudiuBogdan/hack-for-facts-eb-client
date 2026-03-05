import { createLazyFileRoute } from '@tanstack/react-router'
import { CampaignCalendarPage } from '@/features/campaigns/local-budget-2026/components/calendar/CampaignCalendarPage'
import { resolveCampaignCalendarLocale } from '@/features/campaigns/local-budget-2026/schemas/campaign-calendar-search-schema'
import { ChallengesLayout } from '@/features/challenges/components/layout/ChallengesLayout'

export const Route = createLazyFileRoute('/bugete-locale-2026/calendar')({
  component: CampaignCalendarRoutePage,
})

function CampaignCalendarRoutePage() {
  const search = Route.useSearch()
  const locale = resolveCampaignCalendarLocale(search)

  return (
    <ChallengesLayout>
      <CampaignCalendarPage locale={locale} entityCui={search.entityCui} />
    </ChallengesLayout>
  )
}
