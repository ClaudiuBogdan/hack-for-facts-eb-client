import { createLazyFileRoute } from '@tanstack/react-router'
import { ParliamentStenogramReaderPage } from '@/features/parliament/components/parliament-stenogram-reader-page'

export const Route = createLazyFileRoute(
  '/parlament/stenograme/sedinte/$sessionKey',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { sessionKey } = Route.useParams()
  const search = Route.useSearch()
  return (
    <ParliamentStenogramReaderPage sessionKey={sessionKey} search={search} />
  )
}
