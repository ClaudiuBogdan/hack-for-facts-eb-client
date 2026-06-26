import { Fragment, type ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, CalendarRange, ShieldOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CoverageMeta } from '@/schemas/elections'
import { DataStatusBadge } from './data-status-badge'
import { FreshnessBadge } from './freshness-badge'

type Props = {
  readonly coverage: CoverageMeta
  readonly className?: string
}

/** A compact, restrained ribbon of authorities · years · freshness · gaps · status. */
export function CoverageRibbon({ coverage, className }: Props) {
  const inaccessibleCount = coverage.inaccessibleCount
  const yearRangeLabel =
    coverage.yearsRange === null
      ? null
      : coverage.yearsRange[0] === coverage.yearsRange[1]
        ? String(coverage.yearsRange[0])
        : `${coverage.yearsRange[0]}–${coverage.yearsRange[1]}`

  const chips: ReactNode[] = []

  if (coverage.authorities.length > 0) {
    chips.push(
      <span
        key="authorities"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
      >
        {coverage.authorities.join(' · ')}
      </span>,
    )
  }

  if (yearRangeLabel !== null) {
    chips.push(
      <span
        key="years"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
      >
        <CalendarRange className="h-3 w-3" aria-hidden />
        {yearRangeLabel}
      </span>,
    )
  }

  chips.push(
    <FreshnessBadge
      key="freshness"
      asOf={coverage.retrievedAt ?? coverage.publishedAt}
    />,
  )

  if (coverage.inaccessibleCount > 0) {
    chips.push(
      <span
        key="inaccessible"
        className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"
      >
        <ShieldOff className="h-3 w-3" aria-hidden />
        <Trans>{inaccessibleCount} surse inaccesibile</Trans>
      </span>,
    )
  }

  if (coverage.knownGaps.length > 0) {
    const gapCount = coverage.knownGaps.length
    chips.push(
      <span
        key="gaps"
        className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"
        title={coverage.knownGaps.join(' · ')}
      >
        <AlertTriangle className="h-3 w-3" aria-hidden />
        <Trans>{gapCount} goluri cunoscute</Trans>
      </span>,
    )
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border bg-muted/30 px-3 py-2',
        className,
      )}
    >
      {chips.map((chip, index) => (
        <Fragment key={index}>
          {chip}
          {index < chips.length - 1 && (
            <span className="text-xs text-muted-foreground/40" aria-hidden>
              ·
            </span>
          )}
        </Fragment>
      ))}
      <div className="ml-auto">
        <DataStatusBadge status={coverage.dataStatus} />
      </div>
    </div>
  )
}
