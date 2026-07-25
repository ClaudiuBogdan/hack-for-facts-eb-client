import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementSupplierPage } from '@/features/procurement/components/procurement-supplier-page'

export const Route = createLazyFileRoute('/procurement/suppliers/$cui')({
  component: SupplierRoutePage,
})

function SupplierRoutePage() {
  const { cui } = Route.useParams()
  const filters = Route.useSearch()
  return <ProcurementSupplierPage cui={cui} filters={filters} />
}
