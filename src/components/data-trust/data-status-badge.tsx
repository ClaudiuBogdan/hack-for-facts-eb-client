import { Trans } from '@lingui/react/macro'
import { Database, ShieldAlert, ShieldCheck, CircleDashed } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DataStatus } from '@/schemas/elections'

type Props = {
  readonly status: DataStatus
  readonly className?: string
}

const STATUS_CONFIG: Record<
  DataStatus,
  { variant: 'secondary' | 'warning' | 'outline'; icon: typeof Database }
> = {
  live: { variant: 'secondary', icon: ShieldCheck },
  mock: { variant: 'outline', icon: Database },
  partial: { variant: 'warning', icon: CircleDashed },
  stale: { variant: 'warning', icon: CircleDashed },
  blocked: { variant: 'warning', icon: ShieldAlert },
  unverified: { variant: 'outline', icon: CircleDashed },
}

/**
 * Communicates the trust status of a dataset surface (mock / live / partial …)
 * with text + icon, never color alone.
 */
export function DataStatusBadge({ status, className }: Props) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn('gap-1', className)}>
      <Icon className="h-3 w-3" aria-hidden />
      {status === 'mock' ? (
        <Trans>Date demonstrative (mock)</Trans>
      ) : status === 'live' ? (
        <Trans>Date live</Trans>
      ) : status === 'partial' ? (
        <Trans>Acoperire parțială</Trans>
      ) : status === 'stale' ? (
        <Trans>Date învechite</Trans>
      ) : status === 'blocked' ? (
        <Trans>Sursă blocată</Trans>
      ) : (
        <Trans>Neverificat</Trans>
      )}
    </Badge>
  )
}
