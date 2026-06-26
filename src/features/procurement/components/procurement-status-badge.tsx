import { t } from '@lingui/core/macro'
import {
  CheckCircle2,
  Clock,
  CircleAlert,
  CircleSlash,
  PauseCircle,
  FileText,
  Trophy,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { ProcurementStatus } from '@/schemas/procurement'

type Props = {
  readonly status: ProcurementStatus
  readonly className?: string
  readonly withTooltip?: boolean
}

const STATUS_META: Record<
  ProcurementStatus,
  { label: string; icon: typeof CheckCircle2; className: string; tooltip: string }
> = {
  published: {
    label: t`Publicat`,
    icon: FileText,
    className: 'border-slate-300 bg-slate-100 text-slate-900',
    tooltip: t`Procedură publicată în SEAP.`,
  },
  in_evaluation: {
    label: t`În evaluare`,
    icon: Clock,
    className: 'border-amber-300 bg-amber-50 text-amber-900',
    tooltip: t`Ofertele sunt în evaluare.`,
  },
  awarded: {
    label: t`Atribuit`,
    icon: Trophy,
    className: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    tooltip: t`Câștigător atribuit.`,
  },
  cancelled: {
    label: t`Anulat`,
    icon: CircleSlash,
    className: 'border-slate-300 bg-slate-100 text-slate-900',
    tooltip: t`Procedură anulată.`,
  },
  suspended: {
    label: t`Suspendat`,
    icon: PauseCircle,
    className: 'border-amber-300 bg-amber-50 text-amber-900',
    tooltip: t`Procedură suspendată.`,
  },
  finalized: {
    label: t`Finalizat`,
    icon: CheckCircle2,
    className: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    tooltip: t`Contract finalizat.`,
  },
  offered: {
    label: t`Ofertat`,
    icon: FileText,
    className: 'border-slate-300 bg-slate-100 text-slate-900',
    tooltip: t`Ofertă depusă.`,
  },
  // 'unknown' is first-class — never fold it away.
  unknown: {
    label: t`Nedeterminat`,
    icon: CircleAlert,
    className: 'border-slate-300 bg-slate-100 text-slate-900',
    tooltip: t`Stadiu necunoscut în sursa de date.`,
  },
}

/**
 * Procurement status badge — text + icon + color (never color alone).
 * `unknown` is rendered explicitly with a tooltip, per UX §6.3.
 */
export function ProcurementStatusBadge({ status, className, withTooltip = true }: Props) {
  const meta = STATUS_META[status]
  const Icon = meta.icon

  const badge = (
    <Badge
      variant="outline"
      className={cn('gap-1 font-medium', meta.className, className)}
      aria-label={t`Stadiu: ${meta.label}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span>{meta.label}</span>
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
        <TooltipContent>{meta.tooltip}</TooltipContent>
      </Tooltip>
    )
  }

  return badge
}
