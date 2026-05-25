import { cn } from '@/lib/utils'

export function ParliamentChamberMark({
  color,
  className,
}: {
  readonly color: string
  readonly className?: string
}) {
  return (
    <span
      className={cn(
        'mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--pnrr-card)] ring-2 ring-[var(--pnrr-border)]',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill={color}>
        <path d="M12 3 4 9v12h16V9l-8-6Zm0 2.2 6 4.5V19H6v-9.3l6-4.5Z" />
      </svg>
    </span>
  )
}
