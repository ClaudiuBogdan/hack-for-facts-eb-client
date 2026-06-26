import { createLazyFileRoute } from '@tanstack/react-router'
import { NgoServicesPage } from '@/features/ngos/components/ngo-services-page'
import type { NgoServicesRouteLoaderData } from './ong-uri.servicii'

export const Route = createLazyFileRoute('/ong-uri/servicii')({
  component: NgoServicesRoutePage,
})

function NgoServicesRoutePage() {
  const search = Route.useSearch()
  const loaderData = Route.useLoaderData() as
    | NgoServicesRouteLoaderData
    | undefined

  return (
    <NgoServicesPage
      initialResult={loaderData?.result ?? null}
      search={search}
    />
  )
}
