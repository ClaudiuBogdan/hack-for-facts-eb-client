import { X } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** One removable filter chip. `onRemove` clears exactly that filter. */
export type StatisticsFilterChip = {
  readonly id: string
  readonly label: string
  readonly onRemove: () => void
}

type Props = {
  readonly chips: readonly StatisticsFilterChip[]
  readonly onClearAll: () => void
  readonly className?: string
}

/**
 * Active-filter chips with a clear-all affordance. Renders nothing when no
 * filter is applied, so callers can mount it unconditionally.
 */
export function StatisticsActiveFilters({ chips, onClearAll, className }: Props) {
  if (chips.length === 0) return null

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2', className)}
      role="group"
      aria-label={t`Filtre active`}
    >
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onRemove}
          aria-label={t`Elimină filtrul ${chip.label}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 py-1 pl-3 pr-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>{chip.label}</span>
          <X aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={onClearAll}
      >
        <Trans>Șterge toate filtrele</Trans>
      </Button>
    </div>
  )
}
