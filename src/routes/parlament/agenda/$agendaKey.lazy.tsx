import { createLazyFileRoute } from '@tanstack/react-router'
import { ParliamentAgendaDetailPage } from '@/features/parliament/components/parliament-agenda-detail-page'

export const Route = createLazyFileRoute('/parlament/agenda/$agendaKey')({
  component: AgendaDetailRoute,
})

function AgendaDetailRoute() {
  const { agendaKey } = Route.useParams()
  return <ParliamentAgendaDetailPage agendaKey={agendaKey} />
}
