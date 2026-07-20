import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementInstitutionPage } from '@/features/procurement/components/procurement-institution-page'

export const Route = createLazyFileRoute('/procurement/institutions/$cui')({
  component: InstitutionRoutePage,
})

function InstitutionRoutePage() {
  const { cui } = Route.useParams()
  const { slice } = Route.useLoaderData()
  return <ProcurementInstitutionPage cui={cui} initialSlice={slice} />
}
