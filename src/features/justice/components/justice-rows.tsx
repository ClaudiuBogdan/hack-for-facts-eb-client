import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'

/**
 * The justice pages' ranked rows, in the procurement front door's shape: a
 * name with a share bar and a quiet line under it, the figure alone on the
 * right, so a name never truncates the figure on a phone. A row that opens a
 * page is a link to it, whole.
 */

export interface ShareRow {
  readonly key: string
  readonly label: ReactNode
  readonly meta?: ReactNode
  readonly value: string
  /** The row's bar, as a fraction of the longest. */
  readonly fraction: number
  /** The court the row opens; none for a row with nowhere to go. */
  readonly courtCode?: string
}

const LIST = 'divide-y divide-border/70 border-y border-border/70'
const ROW = 'group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 px-1 py-2.5'
const ROW_LINK = 'transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none'

export function ShareRows({ rows, numbered = true, className }: { readonly rows: readonly ShareRow[]; readonly numbered?: boolean; readonly className?: string }) {
  return (
    <ol className={cn(LIST, className)}>
      {rows.map((row, index) => {
        const body = (
          <>
            <span className={cn('grid min-w-0 gap-x-2', numbered ? 'grid-cols-[1.75rem_minmax(0,1fr)]' : 'grid-cols-1')}>
              {numbered ? <MonoLabel className="pt-0.5 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel> : null}
              <span className="min-w-0">
                <span className="block truncate text-sm text-foreground">{row.label}</span>
                <ShareBar fraction={row.fraction} />
                {row.meta ? <MonoLabel className="mt-1 block truncate tabular-nums text-muted-foreground">{row.meta}</MonoLabel> : null}
              </span>
            </span>
            <span className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-foreground">{row.value}</span>
          </>
        )
        return (
          <li key={row.key}>
            {row.courtCode ? (
              <Link to="/justice/courts/$code" params={{ code: row.courtCode }} className={cn(ROW, ROW_LINK)}>
                {body}
              </Link>
            ) : (
              <div className={ROW}>{body}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** A share of the longest row; a sliver for the smallest, so every row shows one. */
export function ShareBar({ fraction, className }: { readonly fraction: number; readonly className?: string }) {
  return (
    <span className={cn('mt-1 block h-1 bg-muted', className)} aria-hidden="true">
      <span
        className="block h-1 bg-primary/70 transition-colors group-hover:bg-primary"
        style={{ width: `${Math.min(Math.max(fraction * 100, 0.8), 100).toFixed(1)}%` }}
      />
    </span>
  )
}
