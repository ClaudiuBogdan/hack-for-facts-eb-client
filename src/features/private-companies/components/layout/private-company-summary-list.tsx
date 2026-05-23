import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type SummaryListRow = {
  readonly term: ReactNode
  readonly detail: ReactNode
  readonly wide?: boolean
}

type Props = {
  readonly rows: readonly SummaryListRow[]
  readonly className?: string
}

export function PrivateCompanySummaryList({ rows, className }: Props) {
  return (
    <dl className={cn('company-summary-list', className)}>
      {rows.map((row, index) => (
        <div
          key={index}
          className={cn(
            'company-summary-list__row',
            row.wide && 'company-summary-list__row--address',
          )}
        >
          <dt>{row.term}</dt>
          <dd>{row.detail}</dd>
        </div>
      ))}
    </dl>
  )
}
