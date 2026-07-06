import { t } from '@lingui/core/macro'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { ProcurementStatus } from '@/schemas/procurement'
import { statusBadgeClassName, statusMeta } from '../lib/status-meta'

type Props = {
  readonly status: ProcurementStatus
  readonly className?: string
  readonly withTooltip?: boolean
}

/**
 * Procurement status badge — text + icon + tone color (never color alone).
 * Labels/tones come from `lib/status-meta.ts`; `unknown` is rendered
 * explicitly with a tooltip, never folded away.
 */
export function ProcurementStatusBadge({
  status,
  className,
  withTooltip = true,
}: Props) {
  const meta = statusMeta(status)
  const Icon = meta.icon
  const label = meta.label()

  const badge = (
    <Badge
      variant="outline"
      className={cn('gap-1 font-medium', statusBadgeClassName(status), className)}
      aria-label={t`Status: ${label}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span>{label}</span>
    </Badge>
  )

  if (withTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex">
            {badge}
          </span>
        </TooltipTrigger>
        <TooltipContent>{meta.tooltip()}</TooltipContent>
      </Tooltip>
    )
  }

  return badge
}
