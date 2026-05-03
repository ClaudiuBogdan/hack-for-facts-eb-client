import { createLazyFileRoute } from '@tanstack/react-router'
import { PnrrDashboard } from '@/features/pnrr/components/PnrrDashboard'
import type { PnrrRouteLoaderData } from './pnrr'

export const Route = createLazyFileRoute('/pnrr')({
  component: PnrrRoutePage,
})

function PnrrRoutePage() {
  const loaderData = Route.useLoaderData() as PnrrRouteLoaderData | undefined

  return (
    <PnrrDashboard
      initialCurrency={loaderData?.initialCurrency}
      ssrSnapshot={loaderData?.seoSnapshot ?? null}
      ssrSnapshotSearchKey={loaderData?.seoSnapshotSearchKey}
    />
  )
}
