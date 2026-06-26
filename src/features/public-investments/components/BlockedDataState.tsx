import { LockKeyhole } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { EmptyState } from '@/components/ui/empty-state'
import { availabilityLabel } from '../lib/display'
import type { DataAvailabilityStatus } from '../lib/types'

type Props = {
  readonly reason?: DataAvailabilityStatus
  readonly messageKey?: string
  readonly messageParams?: Readonly<Record<string, string | number>>
}

export function BlockedDataState({ reason, messageKey, messageParams }: Props) {
  const title = reason ? availabilityLabel(reason) : t`Date indisponibile`
  const description = blockedDescription(reason, messageKey, messageParams)

  return (
    <EmptyState
      icon={<LockKeyhole className="h-5 w-5" aria-hidden="true" />}
      title={title}
      description={description}
    />
  )
}

function blockedDescription(
  reason?: DataAvailabilityStatus,
  messageKey?: string,
  messageParams?: Readonly<Record<string, string | number>>,
): string {
  const code = String(messageParams?.code ?? messageParams?.sourceRowKey ?? '').trim()

  switch (messageKey) {
    case 'publicInvestments.blocked.objectiveNotFound':
      return code
        ? t`Nu am găsit în fixture obiectivul cerut (${code}).`
        : t`Nu am găsit în fixture obiectivul cerut.`
    case 'publicInvestments.blocked.evidenceNotFound':
      return code
        ? t`Nu am găsit în fixture dovada cerută (${code}).`
        : t`Nu am găsit în fixture dovada cerută.`
    case 'publicInvestments.blocked.localityNotFound':
      return code
        ? t`Nu am găsit în fixture localitatea cerută (${code}).`
        : t`Nu am găsit în fixture localitatea cerută.`
    case 'publicInvestments.blocked.countyNotFound':
      return code
        ? t`Nu am găsit în fixture județul cerut (${code}).`
        : t`Nu am găsit în fixture județul cerut.`
    case 'publicInvestments.blocked.liveNotConnected':
      return t`Această suprafață este mock-first. Activează VITE_USE_MOCK_DATA=true sau VITE_MOCK_DATASETS=all, investments-anghel-saligny ori investments-pndl pentru a vedea fixture-urile locale.`
    default:
      if (reason === 'not-found') {
        return code
          ? t`Nu am găsit în fixture înregistrarea cerută (${code}).`
          : t`Nu am găsit în fixture înregistrarea cerută.`
      }
      return t`Această suprafață este mock-first. Activează VITE_USE_MOCK_DATA=true sau VITE_MOCK_DATASETS=all, investments-anghel-saligny ori investments-pndl pentru a vedea fixture-urile locale.`
  }
}
