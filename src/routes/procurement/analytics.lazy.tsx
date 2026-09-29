import { useMemo, useState } from 'react'
import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementAnalyticsPage } from '@/features/procurement/components/analytics/procurement-analytics-page'
import { AnalyticsSeedContext, seedMap } from '@/features/procurement/hooks/use-procurement-analytics'

export const Route = createLazyFileRoute('/procurement/analytics')({
  component: AnalyticsRoutePage,
})

function AnalyticsRoutePage() {
  // What the server read — nothing on a client-side navigation (see `lib/ssr/loader-blocking`).
  const { seed, latest } = Route.useLoaderData()
  // The server's year holds for the page's life: a question asked later plans its keys the same way.
  const [year] = useState(latest ?? null)
  const reads = useMemo(() => seedMap(seed), [seed])
  const seeded = useMemo(() => ({ reads, latest: year }), [reads, year])
  return (
    <AnalyticsSeedContext value={seeded}>
      <ProcurementAnalyticsPage />
    </AnalyticsSeedContext>
  )
}
