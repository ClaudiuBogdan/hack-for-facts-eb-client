import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { t } from '@lingui/core/macro'

type PrivateCompanySourceId = PrivateCompanyProfile['sources'][number]['id']

export type PrivateCompanySourceReference = {
  readonly id: PrivateCompanySourceId
  readonly name: string
  readonly snapshotDate: string
  readonly label?: string
}

const PRIVATE_COMPANY_SOURCE_ORDER: readonly PrivateCompanySourceId[] = [
  'onrc',
  'anaf',
]

function getPrivateCompanySourceName(id: PrivateCompanySourceId): string {
  switch (id) {
    case 'onrc':
      return t`ONRC open data`
    case 'anaf':
      return t`ANAF public fiscal data`
    default: {
      const exhaustive: never = id
      return exhaustive
    }
  }
}

export function getPrivateCompanySources(profile: PrivateCompanyProfile) {
  const onrcSource = profile.sources.find((source) => source.id === 'onrc')
  const anafSource = profile.sources.find((source) => source.id === 'anaf')
  return { onrcSource, anafSource }
}

export function getPrivateCompanySourceReferences(
  profile: PrivateCompanyProfile,
): PrivateCompanySourceReference[] {
  return PRIVATE_COMPANY_SOURCE_ORDER.flatMap((id) => {
    const source = profile.sources.find((entry) => entry.id === id)
    if (!source) {
      return []
    }

    return [
      {
        id,
        name: getPrivateCompanySourceName(id),
        snapshotDate: source.snapshotDate,
        label: source.label,
      },
    ]
  })
}

export function formatPrivateCompanyRegistrationDate(
  registrationDate: string | null,
): string | null {
  if (!registrationDate) {
    return null
  }
  const date = new Date(registrationDate)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date.toLocaleDateString('ro-RO')
}
