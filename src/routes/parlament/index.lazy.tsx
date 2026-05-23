import { createLazyFileRoute } from '@tanstack/react-router'
import { ParliamentPage } from '@/features/parliament/components/parliament-page'

export const Route = createLazyFileRoute('/parlament/')({
  component: ParliamentRoutePage,
})

function ParliamentRoutePage() {
  const search = Route.useSearch()
  return <ParliamentPage search={search} />
}
