import { createLazyFileRoute } from '@tanstack/react-router'
import { ParliamentSpeechesPage } from '@/features/parliament/components/parliament-speeches-page'

export const Route = createLazyFileRoute('/parlament/stenograme/')({
  component: RouteComponent,
})

function RouteComponent() {
  const search = Route.useSearch()
  return <ParliamentSpeechesPage search={search} />
}
