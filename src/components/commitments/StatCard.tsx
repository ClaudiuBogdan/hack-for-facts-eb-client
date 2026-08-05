/**
 * StatCard Component for Commitments Bugetare
 *
 * Displays a KPI card with value and subtitle
 * Three variants: budget (emerald), committed (blue), paid (sky)
 */

import { Trans } from '@lingui/react/macro'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

type StatCardVariant = 'budget' | 'committed' | 'paid'

type Props = {
  readonly title: string
  readonly value: number
  readonly subtitle?: string
  readonly variant: StatCardVariant
  readonly currency?: 'RON' | 'EUR' | 'USD'
  readonly isLoading?: boolean
  /**
   * The figure could not be fetched. Renders an em dash instead of `value`:
   * an unanswered request leaves the amount unknown, and `0 RON` on a card
   * titled "Total Allocated Budget" reads as a finding about a real public
   * institution rather than as a missing datum.
   */
  readonly isError?: boolean
}

export function StatCard({
  title,
  value,
  subtitle,
  currency = 'RON',
  isLoading = false,
  isError = false,
}: Props) {
  if (isLoading) {
    return (
      <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-8 w-40 mb-1" />
        <Skeleton className="h-4 w-48" />
      </div>
    )
  }

  return (
    <div className="bg-card p-4 rounded-xl shadow-sm border border-border group hover:shadow-md transition-shadow">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        {title}
      </p>
      <div>
        <h2 className="text-2xl font-bold text-card-foreground mb-1">
          {isError ? (
            <span aria-hidden>—</span>
          ) : (
            formatCurrency(value, 'compact', currency)
          )}
        </h2>
        {isError ? (
          <p className="text-sm text-muted-foreground">
            <Trans>Could not be loaded</Trans>
          </p>
        ) : (
          subtitle && (
            <p className="text-sm text-muted-foreground font-mono">{subtitle}</p>
          )
        )}
      </div>
    </div>
  )
}
