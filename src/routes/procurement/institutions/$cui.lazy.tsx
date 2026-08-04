import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementInstitutionPage } from '@/features/procurement/components/procurement-institution-page'

export const Route = createLazyFileRoute('/procurement/institutions/$cui')({
  component: InstitutionRoutePage,
})

function InstitutionRoutePage() {
  const { cui } = Route.useParams()
  // Empty on a client-side navigation — the loader only blocks while rendering
  // HTML, so the page's own queries fill these in. See `lib/ssr/loader-blocking`.
  const { slice, overview } = Route.useLoaderData()
  const filters = Route.useSearch()
  return (
    <ProcurementInstitutionPage
      cui={cui}
      initialSlice={slice}
      initialOverview={overview}
      filters={filters}
    />
  )
}
