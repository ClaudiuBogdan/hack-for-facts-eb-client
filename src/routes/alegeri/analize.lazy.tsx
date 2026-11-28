import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { ElectionsAnalyticsPage } from '@/features/elections/analytics/components/elections-analytics-page'
import type { ElectionsAnalyticsSearch } from '@/schemas/elections-search'

export const Route = createLazyFileRoute('/alegeri/analize')({
  component: ElectionsAnalyticsRoutePage,
})

function ElectionsAnalyticsRoutePage() {
  const search = Route.useSearch()
  const { mandates } = Route.useLoaderData()
  const navigate = useNavigate({ from: '/alegeri/analize' })
  // Every key written on every change: the root's search is merged under this one.
  const onSearchChange = (next: ElectionsAnalyticsSearch) => void navigate({ search: (previous) => ({ ...previous, ...next }), resetScroll: false, replace: false })
  return <ElectionsAnalyticsPage search={search} onSearchChange={onSearchChange} {...(mandates ? { initialMandates: mandates } : {})} />
}
