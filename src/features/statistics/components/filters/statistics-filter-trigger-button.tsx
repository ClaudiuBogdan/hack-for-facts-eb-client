import { SlidersHorizontal } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  readonly activeCount: number
  readonly onClick: () => void
  readonly className?: string
}

/** "Filtre" sheet trigger carrying a badge with the active-filter count. */
export function StatisticsFilterTriggerButton({
  activeCount,
  onClick,
  className,
}: Props) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn('relative h-10 gap-2', className)}
      onClick={onClick}
      aria-label={
        activeCount > 0
          ? t`Filtre (${activeCount} active)`
          : t`Filtre`
      }
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden />
      <span>{t`Filtre`}</span>
      {activeCount > 0 ? (
        <Badge
          variant="default"
          className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full p-0 px-1 text-[11px] tabular-nums"
        >
          {activeCount}
        </Badge>
      ) : null}
    </Button>
  )
}
