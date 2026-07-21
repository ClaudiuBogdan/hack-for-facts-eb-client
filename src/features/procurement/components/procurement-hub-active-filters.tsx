import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProcurementHubFilterState } from '../hooks/use-procurement-hub-state'
import type { HubFilterChip } from '../lib/hub-filter-chips'
import {
  procurementActiveFilterChipClassName,
  procurementActiveFilterChipPrefixClassName,
  procurementActiveFilterChipValueClassName,
  procurementActiveFilterClearClassName,
} from '../lib/procurement-theme'

type Props = {
  readonly hub: ProcurementHubFilterState
  readonly compact?: boolean
  readonly className?: string
}

function kindSuffix(kind: HubFilterChip['kind']): string | null {
  if (kind === 'list-only') return t`List only`
  // Buyer geo on list, supplier geo everywhere — not applied to the active query.
  if (kind === 'not-on-list') return t`Not applied yet`
  return null
}

/**
 * Hub chips — applied, list-only (C1), and not-on-list (B1) variants.
 */
export function ProcurementHubActiveFilters({
  hub,
  compact = false,
  className,
}: Props) {
  const chips = hub.hubChips
  if (chips.length === 0) return null

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        compact ? 'py-1' : 'pb-1 pt-2',
        className,
      )}
      aria-label={t`Active procurement filters`}
    >
      <div className="flex min-w-0 w-full flex-1 flex-wrap items-center gap-2 sm:w-auto">
        {compact ? (
          <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center bg-[var(--pnrr-fg)] px-1.5 text-xs font-black text-[var(--pnrr-bg)]">
            {chips.length}
          </span>
        ) : null}
        {chips.map((chip) => {
          const suffix = kindSuffix(chip.kind)
          return (
            <span
              key={chip.key}
              className={cn(
                procurementActiveFilterChipClassName,
                chip.kind !== 'applied' && 'opacity-80',
              )}
            >
              <span className="min-w-0 truncate">
                <span className={procurementActiveFilterChipPrefixClassName}>
                  {chip.prefix}:{' '}
                </span>
                <span className={procurementActiveFilterChipValueClassName}>
                  {chip.value}
                </span>
                {suffix ? (
                  <span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">
                    ({suffix})
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => hub.updateFilters(chip.clear)}
                aria-label={t`Remove filter ${chip.prefix}`}
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </span>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => hub.clearFilters()}
        className={cn(
          procurementActiveFilterClearClassName,
          compact && 'hidden sm:inline-flex',
        )}
      >
        <Trans>Clear all</Trans>
      </button>
    </div>
  )
}
