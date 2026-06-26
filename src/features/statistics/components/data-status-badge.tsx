import { t } from '@lingui/core/macro'
import { CheckCircle2, CircleDashed } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { StatisticsDatasetDataStatus } from '@/schemas/statistics'

type DataStatusBadgeProps = {
  readonly status: StatisticsDatasetDataStatus
}

export function DataStatusBadge({ status }: DataStatusBadgeProps) {
  const isAvailable = status === 'available'
  const Icon = isAvailable ? CheckCircle2 : CircleDashed

  return (
    <Badge
      variant={isAvailable ? 'success' : 'outline'}
      className="gap-1.5 whitespace-nowrap"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {isAvailable ? t`Date disponibile` : t`Doar catalog`}
    </Badge>
  )
}
