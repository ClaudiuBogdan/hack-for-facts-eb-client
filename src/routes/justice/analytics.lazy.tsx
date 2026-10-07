import { useState } from 'react'
import { createLazyFileRoute } from '@tanstack/react-router'
import { JusticeAnalysisPage } from '@/features/justice/components/analysis/justice-analysis-page'
import { AnalysisSeedContext, analysisSeedMap } from '@/features/justice/hooks/use-justice-analysis'

export const Route = createLazyFileRoute('/justice/analytics')({
  component: JusticeAnalysisRoutePage,
})

function JusticeAnalysisRoutePage() {
  // What the server read for the document, taken once for the page's life: a later
  // navigation's loader data (empty in the browser) never seeds again.
  const { seed } = Route.useLoaderData()
  const [seeds] = useState(() => analysisSeedMap(seed))
  const search = Route.useSearch()
  return (
    <AnalysisSeedContext value={seeds}>
      <JusticeAnalysisPage search={search} />
    </AnalysisSeedContext>
  )
}
