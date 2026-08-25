import type {
  PrivateCompanyProfile,
  PrivateCompanyViewTab,
} from '@/schemas/private-company'
import { PrivateCompanyFinancialOverviewChart } from './charts/private-company-financial-overview-chart'
import { PrivateCompanySummaryHighlights } from './private-company-summary-highlights'
import { PrivateCompanyMoneySources } from './sections/private-company-money-sources'
import { PrivateCompanyTrajectory } from './sections/private-company-trajectory'

type Props = {
  readonly profile: PrivateCompanyProfile
  readonly onTabChange: (tab: PrivateCompanyViewTab) => void
}

/**
 * Summary tab. The company's own financials lead, then the links onward, then
 * what public institutions paid it. The public-money band sits last on purpose:
 * it is a different subject from the figures above it, and interleaving the two
 * made a run of large RON amounts read as one continuous financial story.
 *
 * Each band renders nothing when it has no data, so a thin company collapses to
 * the chart alone rather than to a page of empty headings.
 */
export function PrivateCompanySummaryTab({ profile, onTabChange }: Props) {
  return (
    <div className="space-y-8">
      <PrivateCompanyFinancialOverviewChart profile={profile} />
      <PrivateCompanyTrajectory profile={profile} />
      <PrivateCompanySummaryHighlights
        profile={profile}
        onTabChange={onTabChange}
      />
      <PrivateCompanyMoneySources profile={profile} />
    </div>
  )
}
