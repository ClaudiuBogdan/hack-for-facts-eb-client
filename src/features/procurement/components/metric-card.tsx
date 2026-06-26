import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import { DataStatusBadge } from '@/components/shared/procurement-data'
import type { DataStatus } from '@/schemas/procurement'

type Props = {
  readonly label: React.ReactNode
  readonly value: React.ReactNode
  readonly hint?: React.ReactNode
  readonly status?: DataStatus
  readonly statusTooltip?: string
  readonly className?: string
}

/**
 * Compact KPI cell for procurement pages (landing / slices / CPV). Page
 * sections are full-width bands; `MetricCard` is the constrained unit, not a
 * decorative card.
 */
export function MetricCard({ label, value, hint, status, statusTooltip, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-lg border border-border bg-card p-4',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {status ? <DataStatusBadge status={status} tooltip={statusTooltip} /> : null}
      </div>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  )
}

export function MetricCardSkeleton({ className }: { readonly className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-border bg-card p-4',
        className,
      )}
    >
      <div className="h-3 w-20 animate-pulse rounded bg-primary/10" aria-hidden />
      <div className="h-7 w-32 animate-pulse rounded bg-primary/10" aria-hidden />
      <div className="h-3 w-24 animate-pulse rounded bg-primary/10" aria-hidden />
      <span className="sr-only">
        <Trans>Se încarcă…</Trans>
      </span>
    </div>
  )
}
