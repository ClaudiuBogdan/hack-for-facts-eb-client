import { createLazyFileRoute } from '@tanstack/react-router'
import { ParliamentSpeechDetailPage } from '@/features/parliament/components/parliament-speech-detail-page'

export const Route = createLazyFileRoute('/parlament/stenograme/$speechKey')({
  component: RouteComponent,
})

function RouteComponent() {
  const { speechKey } = Route.useParams()
  return <ParliamentSpeechDetailPage speechKey={speechKey} />
}
