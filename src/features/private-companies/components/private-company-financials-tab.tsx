import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { PrivateCompanyFinancialsSection } from './sections/private-company-financials-section'

type Props = {
  readonly profile: PrivateCompanyProfile
}

export function PrivateCompanyFinancialsTab({ profile }: Props) {
  return <PrivateCompanyFinancialsSection profile={profile} variant="tab" />
}
