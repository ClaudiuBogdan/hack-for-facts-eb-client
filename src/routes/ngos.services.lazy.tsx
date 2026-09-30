import { createLazyFileRoute } from '@tanstack/react-router'
import { NgoServicesPage } from '@/features/ngos/components/ngo-services-page'
import type { NgoServicesRouteLoaderData } from './ngos.services'

export const Route = createLazyFileRoute('/ngos/services')({
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
