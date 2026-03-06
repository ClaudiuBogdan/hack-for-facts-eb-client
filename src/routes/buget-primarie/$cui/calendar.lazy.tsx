import { createLazyFileRoute } from '@tanstack/react-router'
import { CampaignCalendarPage } from '@/features/campaigns/local-budget-2026/components/calendar/CampaignCalendarPage'
import { resolveCampaignCalendarLocale } from '@/features/campaigns/local-budget-2026/schemas/campaign-calendar-search-schema'

export const Route = createLazyFileRoute('/buget-primarie/$cui/calendar')({
  component: CampaignCalendarRoutePage,
})

function CampaignCalendarRoutePage() {
  const { cui } = Route.useParams()
  const search = Route.useSearch()
  const locale = resolveCampaignCalendarLocale(search)

  return <CampaignCalendarPage locale={locale} entityCui={cui} />
}
