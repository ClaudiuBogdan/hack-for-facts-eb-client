import type {
  PrivateCompanyProfile,
  PrivateCompanyViewTab,
} from '@/schemas/private-company'
import { PrivateCompanyActivityTab } from './private-company-activity-tab'
import { PrivateCompanyFinancialsTab } from './private-company-financials-tab'
import { PrivateCompanyGovernanceTab } from './private-company-governance-tab'
import { PrivateCompanyLocationTab } from './private-company-location-tab'
import { PrivateCompanySummaryTab } from './private-company-summary-tab'
import { LitigationSliceSection } from '@/features/justice/components/litigation-slice-section'

type Props = {
  readonly tab: PrivateCompanyViewTab
  readonly profile: PrivateCompanyProfile
  readonly cui: string
  readonly litPage: number
  readonly onLitPageChange: (page: number) => void
  readonly onTabChange: (tab: PrivateCompanyViewTab) => void
}

export function PrivateCompanyTabContent({
  tab,
  profile,
  cui,
  litPage,
  onLitPageChange,
  onTabChange,
}: Props) {
  switch (tab) {
    case 'summary':
      return (
        <PrivateCompanySummaryTab
          profile={profile}
          onTabChange={onTabChange}
        />
      )
    case 'activity':
      return <PrivateCompanyActivityTab profile={profile} />
    case 'governance':
      return <PrivateCompanyGovernanceTab profile={profile} />
    case 'financials':
      return <PrivateCompanyFinancialsTab profile={profile} />
    case 'location':
      return <PrivateCompanyLocationTab profile={profile} />
    case 'litigii':
      return (
        <LitigationSliceSection
          cui={cui}
          page={litPage}
          onPageChange={onLitPageChange}
        />
      )
    default: {
      const exhaustive: never = tab
      return exhaustive
    }
  }
}
