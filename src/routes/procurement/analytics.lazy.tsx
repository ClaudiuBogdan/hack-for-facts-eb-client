import { isSeedCurrent } from '@/features/procurement/lib/disclosure-seed'
import { useMemo, useState } from 'react'
import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementAnalyticsPage } from '@/features/procurement/components/analytics/procurement-analytics-page'
import { AnalyticsSeedContext, seedMap } from '@/features/procurement/hooks/use-procurement-analytics'

export const Route = createLazyFileRoute('/procurement/analytics')({
  component: AnalyticsRoutePage,
})

const NO_SEED: never[] = []

function AnalyticsRoutePage() {
  // What the server read — nothing on a client-side navigation (see `lib/ssr/loader-blocking`).
  const data = Route.useLoaderData()
  const { latest } = data
  // D6: a seed of another publication than the one the browser read is never used (`disclosure-seed.ts`).
  const seed = isSeedCurrent(data) ? data.seed : NO_SEED
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
