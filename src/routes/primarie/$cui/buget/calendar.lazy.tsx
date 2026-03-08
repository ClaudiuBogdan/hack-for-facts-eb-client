import { createLazyFileRoute } from '@tanstack/react-router'
import { BugetCalendarPage } from '@/features/campaigns/buget/components/calendar/buget-calendar-page'
import { resolveCampaignCalendarLocale } from '@/features/campaigns/buget/schemas/campaign-calendar-search-schema'

export const Route = createLazyFileRoute('/primarie/$cui/buget/calendar')({
  component: BugetCalendarRoutePage,
})

function BugetCalendarRoutePage() {
  const { cui } = Route.useParams()
  const search = Route.useSearch()
  const locale = resolveCampaignCalendarLocale(search)

  return <BugetCalendarPage locale={locale} entityCui={cui} />
}
