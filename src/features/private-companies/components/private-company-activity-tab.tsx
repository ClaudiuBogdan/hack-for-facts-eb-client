import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { PrivateCompanyActivitySection } from './sections/private-company-activity-section'

type Props = {
  readonly profile: PrivateCompanyProfile
}

export function PrivateCompanyActivityTab({ profile }: Props) {
  return <PrivateCompanyActivitySection profile={profile} variant="tab" />
}
