import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementContractAwardPage } from '@/features/procurement/components/contract-award/procurement-contract-award-page'

export const Route = createLazyFileRoute('/procurement/contract-awards/$id')({
  component: ContractAwardRoutePage,
})

function ContractAwardRoutePage() {
  // The read is empty on a client-side navigation: the loader only reads while rendering HTML (`lib/ssr/loader-blocking`).
  const data = Route.useLoaderData()
  return <ProcurementContractAwardPage id={data.id} initialData={data} />
}
