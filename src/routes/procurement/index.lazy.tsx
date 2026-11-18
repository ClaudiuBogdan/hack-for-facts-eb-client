import { isSeedCurrent } from '@/features/procurement/lib/disclosure-seed'
import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementHomePage } from '@/features/procurement/components/home/procurement-home-page'

export const Route = createLazyFileRoute('/procurement/')({
  component: ProcurementHomeRoutePage,
})

function ProcurementHomeRoutePage() {
  const search = Route.useSearch()
  const initial = Route.useLoaderData()
  // D6: a seed of another publication than the one the browser read is never used (`disclosure-seed.ts`).
  return <ProcurementHomePage search={search} initial={isSeedCurrent(initial) ? initial : { year: initial.year }} />
}
