import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { PrivateCompanyLocationSection } from './sections/private-company-location-section'

type Props = {
  readonly profile: PrivateCompanyProfile
}

export function PrivateCompanyLocationTab({ profile }: Props) {
  return <PrivateCompanyLocationSection profile={profile} variant="tab" />
}
