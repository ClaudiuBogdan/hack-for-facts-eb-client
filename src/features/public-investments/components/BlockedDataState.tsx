import { LockKeyhole } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { EmptyState } from '@/components/ui/empty-state'
import { availabilityLabel } from '../lib/display'
import type { DataAvailabilityStatus } from '../lib/types'

type Props = {
  readonly reason?: DataAvailabilityStatus
  readonly messageParams?: Readonly<Record<string, string | number>>
}

export function BlockedDataState({ reason, messageParams }: Props) {
  const title = reason ? availabilityLabel(reason) : t`Date indisponibile`
  const description =
    reason === 'not-found'
      ? t`Nu am găsit în fixture înregistrarea cerută${messageParams?.code ? ` (${messageParams.code})` : ''}.`
      : t`Această suprafață este mock-first. Activează VITE_USE_MOCK_DATA=true sau VITE_MOCK_DATASETS=all, investments-anghel-saligny ori investments-pndl pentru a vedea fixture-urile locale.`

  return (
    <EmptyState
      icon={<LockKeyhole className="h-5 w-5" aria-hidden="true" />}
      title={title}
      description={description}
    />
  )
}
