import type {
  PrivateCompanyProfile,
  PrivateCompanyViewTab,
} from '@/schemas/private-company'
import { PrivateCompanyAchizitiiTab } from './private-company-achizitii-tab'
import { PrivateCompanyActivityTab } from './private-company-activity-tab'
import { PrivateCompanyFinancialsTab } from './private-company-financials-tab'
import { PrivateCompanyGovernanceTab } from './private-company-governance-tab'
import { PrivateCompanyLocationTab } from './private-company-location-tab'
import { PrivateCompanySummaryTab } from './private-company-summary-tab'

type Props = {
  readonly tab: PrivateCompanyViewTab
  readonly profile: PrivateCompanyProfile
  readonly onTabChange: (tab: PrivateCompanyViewTab) => void
}

export function PrivateCompanyTabContent({
  tab,
  profile,
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
    case 'achizitii':
      return <PrivateCompanyAchizitiiTab profile={profile} />
    case 'governance':
      return <PrivateCompanyGovernanceTab profile={profile} />
    case 'financials':
      return <PrivateCompanyFinancialsTab profile={profile} />
    case 'location':
      return <PrivateCompanyLocationTab profile={profile} />
    default: {
      const exhaustive: never = tab
      return exhaustive
    }
  }
}
