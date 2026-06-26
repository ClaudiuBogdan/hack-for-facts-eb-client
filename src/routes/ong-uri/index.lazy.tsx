import { createLazyFileRoute } from '@tanstack/react-router'
import { NgoLandingPage } from '@/features/ngos/components/ngo-landing-page'
import type { NgoLandingRouteLoaderData } from './index'

export const Route = createLazyFileRoute('/ong-uri/')({
  component: NgoLandingRoutePage,
})

function NgoLandingRoutePage() {
  const loaderData = Route.useLoaderData() as
    | NgoLandingRouteLoaderData
    | undefined

  return <NgoLandingPage initialCoverage={loaderData?.coverage ?? null} />
}
