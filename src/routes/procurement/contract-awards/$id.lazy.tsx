import { createLazyFileRoute } from '@tanstack/react-router'
import { isSeedCurrent } from '@/features/procurement/lib/disclosure-seed'
import { ProcurementContractAwardPage } from '@/features/procurement/components/contract-award/procurement-contract-award-page'

export const Route = createLazyFileRoute('/procurement/contract-awards/$id')({
  component: ContractAwardRoutePage,
})

function ContractAwardRoutePage() {
  // The read is empty on a client-side navigation: the loader only reads while rendering HTML (`lib/ssr/loader-blocking`).
  const data = Route.useLoaderData()
  // A seed read under another publication than the one the browser read last is never used (`disclosure-seed.ts`).
  return <ProcurementContractAwardPage id={data.id} initialData={isSeedCurrent(data) ? data : { id: data.id }} />
}
