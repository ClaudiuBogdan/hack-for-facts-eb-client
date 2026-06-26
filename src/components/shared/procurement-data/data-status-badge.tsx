import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  Beaker,
  Clock,
  CircleAlert,
  Lock,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { DataStatus } from '@/schemas/procurement'

type Props = {
  readonly status: DataStatus
  readonly label?: string
  readonly tooltip?: string
  readonly className?: string
}

const STATUS_META: Record<
  DataStatus,
  { label: string; icon: typeof ShieldCheck; className: string }
> = {
  live: { label: 'Live', icon: ShieldCheck, className: 'border-emerald-300 bg-emerald-50 text-emerald-900' },
  mock: { label: 'Mock', icon: Beaker, className: 'border-slate-300 bg-slate-100 text-slate-900' },
  partial: { label: 'Parțial', icon: TriangleAlert, className: 'border-amber-300 bg-amber-50 text-amber-900' },
  stale: { label: 'Învechit', icon: Clock, className: 'border-amber-300 bg-amber-50 text-amber-900' },
  blocked: { label: 'Indisponibil în v1', icon: Lock, className: 'border-rose-300 bg-rose-50 text-rose-900' },
  unverified: { label: 'Neverificat', icon: CircleAlert, className: 'border-slate-300 bg-slate-100 text-slate-900' },
}

/**
 * Small pill next to a KPI/chart title. Status is conveyed by text + icon +
 * color (never color alone). Tooltip gives the precise reason.
 */
export function DataStatusBadge({ status, label, tooltip, className }: Props) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  const text = label ?? meta.label

  const badge = (
    <Badge
      variant="outline"
      className={cn('gap-1 font-medium', meta.className, className)}
      aria-label={t`Status: ${text}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span>{text}</span>
    </Badge>
  )

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex">
            {badge}
          </span>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    )
  }

  return badge
}

export function MockDataStatusBadge({ tooltip }: { readonly tooltip?: string }) {
  return (
    <DataStatusBadge
      status="mock"
      tooltip={tooltip ?? t`Date simulative — API-ul live nu este conectat.`}
    />
  )
}

export function CoverageStatusText({ status }: { readonly status: DataStatus }) {
  switch (status) {
    case 'live':
      return <Trans>Date complete și verificate.</Trans>
    case 'mock':
      return <Trans>Date simulative pentru dezvoltare.</Trans>
    case 'partial':
      return <Trans>Acoperire parțială — unele valori lipsesc.</Trans>
    case 'stale':
      return <Trans>Date învechite — sincronizarea este suspendată.</Trans>
    case 'blocked':
      return <Trans>Indisponibil în versiunea curentă.</Trans>
    case 'unverified':
      return <Trans>Date neverificate.</Trans>
  }
}
