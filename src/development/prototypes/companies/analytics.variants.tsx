import { CompanyAnalyticsView } from '@/features/private-companies/components/analytics/company-analytics-page'
import { useCompanyAnalyticsPage } from '@/features/private-companies/hooks/use-company-analytics-page'
import { usePrototypeAddress } from './analytics.data'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

/**
 * `propozitie` — the procurement analytics page's anatomy, promoted to
 * `/companies/analytics` on 12 October 2026: the selection as the headline,
 * the year and the measure as the controls row's dropdowns, the pinned bar's
 * ways to show the answer (a table, a map, charts), four bare figures, one
 * tab per open axis over the table or the charts. The prototype now draws
 * the promoted page from its own address, so it shows what is live.
 */
export function AnalyticsPropozitie() {
  const page = useCompanyAnalyticsPage(usePrototypeAddress())
  return (
    <div data-dev-marker={PROTOTYPE_MARKER}>
      <CompanyAnalyticsView page={page} />
    </div>
  )
}
