import { isSeedCurrent } from '@/features/procurement/lib/disclosure-seed'
import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementContractPage } from '@/features/procurement/components/contract/procurement-contract-page'

export const Route = createLazyFileRoute('/procurement/contracts/$id')({
  component: ContractRoutePage,
})

function ContractRoutePage() {
  // The contract is empty on a client-side navigation: the loader only reads while rendering HTML (`lib/ssr/loader-blocking`).
  const data = Route.useLoaderData()
  // D6: a seed of another publication than the one the browser read is never used (`disclosure-seed.ts`): its context carries the pair's direct purchases.
  return <ProcurementContractPage id={data.id} initialData={isSeedCurrent(data) ? data : { id: data.id }} />
}
