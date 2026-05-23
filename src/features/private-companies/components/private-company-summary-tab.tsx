import type {
  PrivateCompanyProfile,
  PrivateCompanyViewTab,
} from '@/schemas/private-company'
import { PrivateCompanyFinancialOverviewChart } from './charts/private-company-financial-overview-chart'
import { PrivateCompanySummaryHighlights } from './private-company-summary-highlights'

type Props = {
  readonly profile: PrivateCompanyProfile
  readonly onTabChange: (tab: PrivateCompanyViewTab) => void
}

export function PrivateCompanySummaryTab({ profile, onTabChange }: Props) {
  return (
    <div className="space-y-6">
      <PrivateCompanyFinancialOverviewChart profile={profile} />
      <PrivateCompanySummaryHighlights
        profile={profile}
        onTabChange={onTabChange}
      />
    </div>
  )
}
