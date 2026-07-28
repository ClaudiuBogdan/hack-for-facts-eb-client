import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { ParliamentAgendaPage } from '@/features/parliament/components/parliament-agenda-page'

export const Route = createLazyFileRoute('/parlament/agenda/')({
  component: AgendaRoute,
})

function AgendaRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/parlament/agenda/' })

  return (
    <ParliamentAgendaPage
      search={search}
      onSearchChange={(next) => {
        void navigate({
          // Defaults leave no param behind, so the plain URL stays canonical.
          search: () => ({
            ...(next.pagina && next.pagina > 1 ? { pagina: next.pagina } : {}),
            ...(next.an ? { an: next.an } : {}),
            ...(next.q ? { q: next.q } : {}),
          }),
        })
      }}
    />
  )
}
