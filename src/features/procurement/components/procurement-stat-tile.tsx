import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { procurementSectionClassName } from '../lib/procurement-theme'

type Props = {
  readonly label: string
  /** Pre-formatted value (compact figures); "—" when unknown. */
  readonly value: ReactNode
  readonly hint?: string
  readonly badge?: ReactNode
  readonly className?: string
}

/** Square 2px-border stat tile (replaces MetricCard). */
export function ProcurementStatTile({ label, value, hint, badge, className }: Props) {
  return (
    <div className={cn(procurementSectionClassName, 'p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">
          {label}
        </p>
        {badge}
      </div>
      <p className="mt-2 text-2xl font-semibold text-[var(--pnrr-fg)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--pnrr-muted)]">{hint}</p>
      ) : null}
    </div>
  )
}
