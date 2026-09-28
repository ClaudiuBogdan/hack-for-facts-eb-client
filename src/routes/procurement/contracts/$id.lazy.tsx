import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementContractPage } from '@/features/procurement/components/contract/procurement-contract-page'

export const Route = createLazyFileRoute('/procurement/contracts/$id')({
  component: ContractRoutePage,
})

function ContractRoutePage() {
  // The contract is empty on a client-side navigation: the loader only reads while rendering HTML (`lib/ssr/loader-blocking`).
  const data = Route.useLoaderData()
  return <ProcurementContractPage id={data.id} initialData={data} />
}
