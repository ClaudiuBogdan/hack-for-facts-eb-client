import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementSearchPage } from '@/features/procurement/components/procurement-search-page'
import { parseProcurementSearch } from '@/schemas/procurement-search'

export const Route = createLazyFileRoute('/achizitii/cautare')({
  component: ProcurementSearchRoutePage,
})

function ProcurementSearchRoutePage() {
  const search = parseProcurementSearch(Route.useSearch())
  return <ProcurementSearchPage params={search} />
}
