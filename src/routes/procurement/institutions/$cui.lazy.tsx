import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementBuyerPage } from '@/features/procurement/components/buyer/procurement-buyer-page'

export const Route = createLazyFileRoute('/procurement/institutions/$cui')({
  component: InstitutionRoutePage,
})

function InstitutionRoutePage() {
  const { cui } = Route.useParams()
  const search = Route.useSearch()
  // Only the year on a client-side navigation — the loader reads while rendering HTML only (see `lib/ssr/loader-blocking`).
  const initial = Route.useLoaderData()
  return <ProcurementBuyerPage cui={cui} search={search} initial={initial} />
}
