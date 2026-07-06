import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementShell } from '@/features/procurement/components/procurement-shell'
import { ProcurementSearchContent } from '@/features/procurement/components/procurement-search-content'
import { parseProcurementSearch } from '@/schemas/procurement-search'

export const Route = createLazyFileRoute('/procurement/search')({
  component: ProcurementSearchRoutePage,
})

function ProcurementSearchRoutePage() {
  const search = parseProcurementSearch(Route.useSearch())
  return (
    <ProcurementShell activeTab="search">
      <ProcurementSearchContent search={search} />
    </ProcurementShell>
  )
}
