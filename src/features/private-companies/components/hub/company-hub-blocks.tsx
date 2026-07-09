import type { ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type { CompanyGroupSlice } from '@/schemas/private-company-search'
import { formatInteger } from '../../lib/formatting'

/** Shared block chrome: a titled, bordered card with an optional trailing note. */
export function HubBlock({
  title,
  note,
  children,
  className,
}: {
  readonly title: ReactNode
  readonly note?: ReactNode
  readonly children: ReactNode
  readonly className?: string
}) {
  return (
    <section
      className={cn(
        'border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5',
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--pnrr-fg)]">
          {title}
        </h2>
        {note ? (
          <p className="text-xs text-[var(--pnrr-muted)]">{note}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

/** Grey placeholder rows, sized to the block they stand in for. */
export function HubBlockSkeleton({ rows = 5 }: { readonly rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="h-6 w-full animate-pulse bg-[var(--pnrr-subtle)]"
        />
      ))}
    </div>
  )
}

export function HubBlockError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div role="alert" className="space-y-3 text-sm text-[var(--pnrr-muted)]">
      <p>
        <Trans>Nu am putut încărca acest bloc.</Trans>
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="border-2 border-[var(--pnrr-border)] px-3 py-1.5 text-xs font-bold text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-hover)]"
      >
        <Trans>Reîncearcă</Trans>
      </button>
    </div>
  )
}

/**
 * A ranked list of groups with proportional count bars. Each row links into the
 * directory with the corresponding filter already applied.
 */
export function HubGroupBars({
  groups,
  buildSearch,
  testId,
}: {
  readonly groups: ReadonlyArray<CompanyGroupSlice>
  readonly buildSearch: (group: CompanyGroupSlice) => Record<string, unknown>
  readonly testId: string
}) {
  const max = groups.reduce((peak, group) => Math.max(peak, group.count), 0)
  if (groups.length === 0) {
    return (
      <p className="text-sm text-[var(--pnrr-muted)]">
        <Trans>Nu există date de afișat.</Trans>
      </p>
    )
  }

  return (
    <ul className="space-y-1.5" data-testid={testId}>
      {groups.map((group) => (
        <li key={group.key}>
          <Link
            to="/companies/search"
            search={buildSearch(group)}
            className="group block px-1 py-1.5 transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-semibold text-[var(--pnrr-fg)] group-hover:underline">
                {group.label ?? group.key}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-[var(--pnrr-muted)]">
                {formatInteger(group.count)}
              </span>
            </span>
            <span
              aria-hidden
              className="mt-1 block h-1.5 bg-[var(--pnrr-subtle)]"
            >
              <span
                className="block h-full bg-[var(--pnrr-blue)]"
                style={{ width: `${max > 0 ? (group.count / max) * 100 : 0}%` }}
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
