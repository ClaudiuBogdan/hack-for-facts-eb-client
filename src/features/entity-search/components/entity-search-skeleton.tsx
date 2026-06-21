import { t } from '@lingui/core/macro'
import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  readonly listboxId: string
}

const SKELETON_ROWS = Array.from({ length: 6 }, (_, index) => index)

export function EntitySearchSkeleton({ listboxId }: Props) {
  return (
    <ul
      id={listboxId}
      role="listbox"
      aria-label={t`Rezultate`}
      aria-busy="true"
      className="divide-y-2 divide-[var(--pnrr-border)] border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]"
    >
      {SKELETON_ROWS.map((row) => (
        <li key={row} className="space-y-2 px-5 py-4" role="presentation">
          <Skeleton className="h-4 w-3/4 rounded-none motion-reduce:animate-none" />
          <Skeleton className="h-3 w-1/2 rounded-none motion-reduce:animate-none" />
        </li>
      ))}
    </ul>
  )
}
