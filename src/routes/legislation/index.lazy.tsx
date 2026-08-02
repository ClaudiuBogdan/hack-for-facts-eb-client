import { createLazyFileRoute } from '@tanstack/react-router'
import { LegislationPage } from '@/features/legal/components/legislation-page'
import type { LegislationRouteLoaderData } from './index'

export const Route = createLazyFileRoute('/legislation/')({
  component: LegislationRoutePage,
})

function LegislationRoutePage() {
  const loaderData = Route.useLoaderData() as
    | LegislationRouteLoaderData
    | undefined

  return <LegislationPage initialOverview={loaderData?.overview ?? undefined} />
}
