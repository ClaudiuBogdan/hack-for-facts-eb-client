import { Link } from '@tanstack/react-router'
import type { ParliamentGroup } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import { getChamberLabel } from '../lib/formatting'
import { PARLIAMENT_GROUP_FALLBACK_COLOR } from '../lib/group-colors'

type Props = {
  readonly group: ParliamentGroup
  readonly activeCount: number
  readonly totalCount: number
  readonly hasActiveFilters: boolean
}

/** Party legend card with color swatch, name, and seat count */
export function PartyLegendCard({
  group,
  activeCount,
  totalCount,
  hasActiveFilters,
}: Props) {
  const color = group.color ?? PARLIAMENT_GROUP_FALLBACK_COLOR
  const isDimmed = hasActiveFilters && activeCount === 0

  return (
    <Link
      to="/parlament/grupuri/$groupId"
      params={{ groupId: group.groupId }}
      className={cn(
        'group flex items-start gap-3 border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-parliament-focus',
        isDimmed
          ? 'border-parliament-border-strong bg-parliament-page opacity-60 hover:bg-parliament-frame-hover'
          : 'border-parliament-border-strong bg-parliament-card hover:bg-parliament-page',
      )}
    >
      <span className="relative mt-0.5 h-8 w-8 shrink-0 border border-parliament-ink/10">
        <span
          className="absolute inset-0"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        {hasActiveFilters && activeCount < totalCount ? (
          <span
            className="absolute inset-x-0 bottom-0 bg-parliament-inactive"
            style={{ height: `${((totalCount - activeCount) / totalCount) * 100}%` }}
            aria-hidden
          />
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'font-black leading-tight',
            isDimmed
              ? 'text-parliament-frame-muted'
              : 'text-parliament-frame-fg',
          )}
        >
          {group.shortName ?? group.name}
        </p>
        {group.shortName ? (
          <p className="mt-1 line-clamp-2 text-sm text-parliament-frame-muted">
            {group.name}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-parliament-frame-muted">
          {hasActiveFilters ? (
            <>
              <span
                className={cn(
                  'font-bold tabular-nums',
                  activeCount > 0
                    ? 'text-parliament-frame-fg'
                    : 'text-parliament-frame-muted',
                )}
              >
                {activeCount}
              </span>
              <span className="text-parliament-frame-muted"> / {totalCount}</span>
              {' · '}
              {activeCount === 1 ? 'evidențiat' : 'evidențiați'}
            </>
          ) : (
            <>
              <span className="font-bold tabular-nums text-parliament-frame-fg">
                {totalCount}
              </span>{' '}
              {getChamberLabel(group.chamber)}
            </>
          )}
        </p>
      </div>
    </Link>
  )
}
