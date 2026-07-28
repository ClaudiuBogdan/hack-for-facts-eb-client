import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { ParliamentAgendaPage } from '@/features/parliament/components/parliament-agenda-page'

export const Route = createLazyFileRoute('/parlament/agenda/')({
  component: AgendaRoute,
})

function AgendaRoute() {
  const { pagina } = Route.useSearch()
  const navigate = useNavigate()
  return (
    <ParliamentAgendaPage
      page={pagina}
      onPageChange={(page) => {
        void navigate({ to: '/parlament/agenda', search: { pagina: page } })
      }}
    />
  )
}
