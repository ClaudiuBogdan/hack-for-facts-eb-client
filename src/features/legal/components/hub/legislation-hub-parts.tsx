import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { bandNumber } from '@/features/private-companies/components/hub/company-hub-sections'
import { HomeBand } from '@/features/procurement/components/home/home-section-nav'
import type { HomeSection } from '@/features/procurement/lib/home-links'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { LegalAnalyticsError } from '../../api/legal-analytics-api'
import { fmt, pct } from '../../lib/analytics-format'

/**
 * The legislation hub's shared pieces, in the hubs' language (companies, procurement, NGOs): a numbered band
 * with its sentence beside its chart, ranked rows with a bar, a line's place while it loads, and the one-line
 * note of a read that failed. Presentational: every figure comes in as a prop.
 */

/** A link under a band or a list to the page that holds the rest: the hubs' `SHOW_MORE_CLASS`. */
export const MORE_LINK_CLASS = 'mt-4 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline sm:min-h-9'

/** A line's place: a pulse the height of the text around it (a no-break space sets it). */
export function PendingBar({ className }: { readonly className?: string }) {
  return <span className={cn('inline-block animate-pulse rounded-sm bg-muted align-top motion-reduce:animate-none', className)}>{' '}</span>
}

/** A band's rows before they arrive, each the height of a row. */
export function PendingRows({ rows, className }: { readonly rows: number; readonly className?: string }) {
  return (
    <div className={cn('divide-y divide-border/70 border-y border-border/70', className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="py-2">
          <span className="block text-sm">
            <PendingBar className="w-2/3" />
          </span>
          <span className="mt-1 block h-1 bg-muted" />
        </div>
      ))}
    </div>
  )
}

/**
 * A read that failed, in one line, with the way to try again: the rest of the page stays. Before the first
 * analytics layer is published the API answers 503, a designed state, said as such.
 */
export function BandNote({ error, onRetry }: { readonly error: unknown; readonly onRetry: () => void }) {
  const unavailable = error instanceof LegalAnalyticsError && error.kind === 'unavailable'
  return (
    <p role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-border/70 py-3 text-sm text-muted-foreground">
      <span>{unavailable ? t`Cifrele analizei nu sunt încă publicate pe acest server.` : t`Această parte nu s-a încărcat.`}</span>
      <button type="button" onClick={onRetry} className="inline-flex min-h-11 items-center font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0">
        {t`Încearcă din nou`}
      </button>
    </p>
  )
}

/**
 * One numbered band: on the left its place in the pinned bar, its title and the sentence that carries its
 * figure; on the right its chart or list, then the link to its page.
 */
export function Band({
  id,
  sections,
  title,
  lede,
  note,
  children,
}: {
  readonly id: string
  readonly sections: readonly HomeSection[]
  readonly title: ReactNode
  /** The band's sentence, with its one figure; a pulse while the figure loads. */
  readonly lede: ReactNode
  /** What qualifies the figures, in small type under the sentence. */
  readonly note?: ReactNode
  readonly children: ReactNode
}) {
  const titleId = `legal-hub-${id}-title`
  const label = sections.find((section) => section.id === id)?.label ?? ''
  return (
    <HomeBand id={id} labelledBy={titleId}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <HubSectionHead titleId={titleId} index={`${bandNumber(sections, id)} / ${label}`} title={title} lede={lede} />
          {note ? (
            <p className="mt-4 max-w-[56ch] text-xs leading-relaxed text-muted-foreground" data-reveal>
              {note}
            </p>
          ) : null}
        </div>
        <div className={cn('min-w-0 lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          {children}
        </div>
      </div>
    </HomeBand>
  )
}

/** The figure a band's sentence carries: the page's ink, not the sentence's grey. */
export function Figure({ children }: { readonly children: ReactNode }) {
  return <strong className="font-semibold tabular-nums text-foreground">{children}</strong>
}

export type BarRow = {
  readonly key: string
  readonly label: string
  readonly acts: number
  /** Wraps the row in its link; a row without one is plain. */
  readonly link?: (row: ReactNode, className: string) => ReactNode
}

/**
 * Ranked rows: a name, its acts and its share of `total`, and a bar that is that share: the bar and the figure
 * printed beside it say the same thing (a bar against the largest row would fill the track beside „32,1%").
 * `quiet` draws the rows a band counts apart from its groups.
 */
export function BarRows({
  rows,
  total,
  quiet = false,
  className,
}: {
  readonly rows: readonly BarRow[]
  readonly total: number
  readonly quiet?: boolean
  readonly className?: string
}) {
  return (
    <ol className={cn('divide-y divide-border/70 border-y border-border/70', className)}>
      {rows.map((row) => {
        const line = 'group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 py-2'
        const share = total > 0 ? Math.min(Math.max(row.acts / total, 0), 1) : 0
        const content = (
          <>
            <span className="min-w-0">
              <span className={cn('block truncate text-sm font-medium first-letter:uppercase', quiet ? 'text-muted-foreground' : 'text-foreground')}>{row.label}</span>
              <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
                <span
                  className={cn('block h-1 transition-colors', quiet ? 'bg-muted-foreground/40' : 'bg-primary/70', row.link && !quiet && 'group-hover:bg-primary')}
                  style={{ width: `${(share * 100).toFixed(1)}%` }}
                />
              </span>
            </span>
            <span className="text-right">
              <span className={cn('block text-sm font-semibold tabular-nums', quiet ? 'text-muted-foreground' : 'text-foreground')}>{fmt(row.acts)}</span>
              <MonoLabel className="block tabular-nums text-muted-foreground">{total > 0 ? pct(row.acts / total) : '—'}</MonoLabel>
            </span>
          </>
        )
        return <li key={row.key}>{row.link ? row.link(content, cn(line, 'transition-colors hover:bg-muted/40')) : <div className={line}>{content}</div>}</li>
      })}
    </ol>
  )
}
