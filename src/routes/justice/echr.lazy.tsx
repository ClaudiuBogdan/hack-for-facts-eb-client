import { createLazyFileRoute } from '@tanstack/react-router'
import { JusticeEchrPage } from '@/features/justice/components/echr/justice-echr-page'

export const Route = createLazyFileRoute('/justice/echr')({
  component: JusticeEchrRoutePage,
})

function JusticeEchrRoutePage() {
  const search = Route.useSearch()
  return <JusticeEchrPage search={search} />
}
