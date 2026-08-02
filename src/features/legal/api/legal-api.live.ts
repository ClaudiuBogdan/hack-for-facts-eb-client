import { assertLiveApiAvailable } from '@/lib/scraper-references/mock-mode'
import type { LegislationOverview } from '@/schemas/legal'
import { LEGAL_DATASET_ID } from '../lib/mock-mode'

/**
 * Live adapters are not connected yet, so every entrypoint fails loudly.
 *
 * When wiring these up, the overview needs exactly four calls — none of which
 * require new server work:
 *   - `legalActs(first: 1).totalCount` and three `filter: { status: { in: [...] } }`
 *     variants for the KPI strip;
 *   - `legalActs(sort: IN_DEGREE, dir: DESC, first: 7)` for the ranked band;
 *   - `moIssues(filter: { year }, sort: ISSUE_DATE_DESC, pageSize: 5)` for the
 *     gazette band (the year filter is mandatory server-side).
 * Map the DTOs onto `legislationOverviewSchema` and drop the assertion below.
 * See `docs/design/legal/main-page.md` §5.
 */
export async function fetchLegislationOverviewLive(): Promise<LegislationOverview> {
  assertLiveApiAvailable(
    LEGAL_DATASET_ID,
    'Legal live API is not connected yet.',
  )
  throw new Error('Legal live API is not connected yet.')
}
