import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type ChallengeEntityYearMenuProps = {
  readonly title: string
  readonly years: readonly number[]
  readonly selectedYear: number
  readonly onYearChange: (year: number) => void
}

export function ChallengeEntityYearMenu({
  title,
  years,
  selectedYear,
  onYearChange,
}: ChallengeEntityYearMenuProps) {
  return (
    <div
      data-testid="challenge-entity-year-menu"
      className="w-full space-y-3 p-2"
    >
      <h3 className="px-2 pt-2 text-lg font-semibold text-muted-foreground sm:px-1.5 sm:text-xs">
        {title}
      </h3>

      <div className="divide-y divide-border/40 sm:divide-y-0">
        {years.map((year) => {
          const isActive = year === selectedYear

          return (
            <button
              key={year}
              type="button"
              aria-pressed={isActive}
              className={cn(
                'flex w-full items-center justify-between gap-3 px-2 py-3.5 text-left text-base font-medium tabular-nums touch-manipulation transition-colors sm:rounded-md sm:px-1.5 sm:py-2 sm:text-sm',
                'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground',
              )}
              onClick={() => onYearChange(year)}
            >
              <span>{year}</span>
              {isActive ? (
                <Check className="h-4 w-4 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
