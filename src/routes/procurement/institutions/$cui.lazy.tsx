import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementInstitutionPage } from '@/features/procurement/components/procurement-institution-page'

export const Route = createLazyFileRoute('/procurement/institutions/$cui')({
  component: InstitutionRoutePage,
})

function InstitutionRoutePage() {
  const { cui } = Route.useParams()
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
