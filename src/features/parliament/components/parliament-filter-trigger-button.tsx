import { SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  readonly activeCount: number
  readonly onClick: () => void
  readonly className?: string
}

/**
 * "Filtre" trigger with an active-count badge (GOV.UK-light restyle). Shared by
 * the member interventii tab, the global stenograme page and the proiecte tab —
 * extracted from the member sheet, which re-exports it under its old name.
 */
export function FilterTriggerButton({ activeCount, onClick, className }: Props) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'relative h-11 gap-2 rounded-none border-2 border-[#b1b4b6] bg-white px-4 text-sm font-semibold text-[#0b0c0c] hover:bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]',
        className,
      )}
      onClick={onClick}
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden />
      <span>Filtre</span>
      {activeCount > 0 ? (
        <Badge
          variant="default"
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#1d70b8] p-0 text-[11px] text-white"
        >
          {activeCount}
        </Badge>
      ) : null}
    </Button>
  )
}
