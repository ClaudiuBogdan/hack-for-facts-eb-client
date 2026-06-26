import { t } from '@lingui/core/macro'
import { Clock3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buildDataThroughLabel, isPeriodStale } from '../lib/period'

type FreshnessBadgeProps = {
  readonly period: string | null
}

export function FreshnessBadge({ period }: FreshnessBadgeProps) {
  const label = buildDataThroughLabel(period) ?? t`Perioadă necunoscută`
  const stale = isPeriodStale({ latestPeriod: period })

  return (
    <Badge variant={stale ? 'warning' : 'outline'} className="gap-1.5">
      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
      {stale ? t`${label} · posibil neactualizat` : label}
    </Badge>
  )
}
