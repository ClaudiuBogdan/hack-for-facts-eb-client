import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { PrivateCompanyGovernanceSection } from './sections/private-company-governance-section'

type Props = {
  readonly profile: PrivateCompanyProfile
}

export function PrivateCompanyGovernanceTab({ profile }: Props) {
  return <PrivateCompanyGovernanceSection profile={profile} variant="tab" />
}
