import { createLazyFileRoute } from '@tanstack/react-router'
import { LegalActPage } from '@/features/legal/components/legal-act-page'

export const Route = createLazyFileRoute('/legislatie/acte/$id')({
  component: LegalActRoutePage,
})

function LegalActRoutePage() {
  const { id } = Route.useParams()

  return <LegalActPage actId={id} />
}
