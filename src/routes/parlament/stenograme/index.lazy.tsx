import { createLazyFileRoute } from '@tanstack/react-router'
import { ParliamentStenogramePage } from '@/features/parliament/components/parliament-stenograme-page'

export const Route = createLazyFileRoute('/parlament/stenograme/')({
  component: RouteComponent,
})

function RouteComponent() {
  const search = Route.useSearch()
  return <ParliamentStenogramePage search={search} />
}
