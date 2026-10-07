import { createLazyFileRoute } from '@tanstack/react-router'
import { JusticeHubPage } from '@/features/justice/components/hub/justice-hub-page'

export const Route = createLazyFileRoute('/justice/')({
  component: JusticeHubRoutePage,
})

function JusticeHubRoutePage() {
  const search = Route.useSearch()
  return <JusticeHubPage search={search} />
}
