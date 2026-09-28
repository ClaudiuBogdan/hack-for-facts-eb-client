import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementSupplierPage } from '@/features/procurement/components/supplier/procurement-supplier-page'

export const Route = createLazyFileRoute('/procurement/suppliers/$cui')({
  component: SupplierRoutePage,
})

function SupplierRoutePage() {
  const { cui } = Route.useParams()
  const search = Route.useSearch()
  // Only the year on a client-side navigation — the loader reads while rendering HTML only (see `lib/ssr/loader-blocking`).
  const initial = Route.useLoaderData()
  return <ProcurementSupplierPage cui={cui} search={search} initial={initial} />
}
