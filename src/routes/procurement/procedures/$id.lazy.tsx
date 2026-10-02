import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementProcedurePage } from '@/features/procurement/components/procedure/procurement-procedure-page'

export const Route = createLazyFileRoute('/procurement/procedures/$id')({
  component: ProcedureRoutePage,
})

function ProcedureRoutePage() {
  // The procedure is empty on a client-side navigation: the loader only reads while rendering HTML (`lib/ssr/loader-blocking`).
  const data = Route.useLoaderData()
  return <ProcurementProcedurePage id={data.id} initialData={data} />
}
