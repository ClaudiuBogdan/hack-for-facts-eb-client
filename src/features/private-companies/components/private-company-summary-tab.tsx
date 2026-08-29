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
 * Summary tab. Financials lead, then what the company was paid from public
 * budgets, then the links onward. Each band renders nothing when it has no
 * data, so a thin company collapses to the chart alone rather than to a page
 * of empty headings.
 */
export function PrivateCompanySummaryTab({ profile, onTabChange }: Props) {
  return (
    <div className="space-y-8">
      <PrivateCompanyFinancialOverviewChart profile={profile} />
      <PrivateCompanyTrajectory profile={profile} />
      <PrivateCompanyMoneySources profile={profile} />
      <PrivateCompanySummaryHighlights
        profile={profile}
        onTabChange={onTabChange}
      />
    </div>
  )
}
