import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowUpRight, ChevronDown } from 'lucide-react'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { BandRead } from '@/features/national-budget/analytics/components/analytics-parts'
import { nextSearch, type AdvancedState } from '@/features/national-budget/analytics/lib/analytics-state'
import { HubLoadError, HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { monthText } from '@/features/national-budget/analytics/lib/analytics-format'
import { reasonText } from '@/features/national-budget/analytics/lib/analytics-view'
import { cn } from '@/lib/utils'
import { readKey, siteKeys, type YearView } from '../lib/home-data'
import { useNationalCatalog } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'

/**
 * The page's frame: the pinned bar that carries the year, and one band per
 * question. A band reads on its own: its skeleton while it waits, the hubs'
 * error and retry if it fails; the page around it stands.
 */

export type BandProps = { readonly view: YearView; readonly index: string; readonly titleId: string }

export type BandEntry = {
  readonly id: string
  /** The pinned bar's word for it. */
  readonly nav: string
  /** Its question, for the band's head while it reads or if its read fails. */
  readonly title: string
  readonly component: (props: BandProps) => ReactNode
  /** A band that shows the same years whatever year the page reads (the year in progress): its read doesn't start afresh on a change of year. */
  readonly yearless?: true
}

/**
 * One numbered band: the ruled column with its design, read on its own. A
 * new year is a new read (the boundary is keyed by it, so a failure for one
 * year is not left standing for the next); waiting or failing, the band
 * keeps its question as its head.
 */
export function Band({ band, view, position }: { readonly band: BandEntry; readonly view: YearView; readonly position: number }) {
  const catalog = useNationalCatalog()
  const titleId = `${band.id}-title`
  const index = `${String(position).padStart(2, '0')} / ${band.nav}`
  const Component = band.component
  const head = <HubSectionHead titleId={titleId} index={index} title={band.title} />
  return (
    <section id={band.id} className="scroll-mt-14 border-b" aria-labelledby={titleId}>
      <RuledFrame className="py-14 sm:py-20">
        <BandRead
          key={band.yearless ? readKey(null, catalog) : readKey(view, catalog)}
          resetKey={`${band.id}|${band.yearless ? readKey(null, catalog) : readKey(view, catalog)}`}
          fallback={<BandPending head={head} />}
          renderError={(retry) => (
            <div>
              {head}
              <div className="mt-6">
                <HubLoadError onRetry={retry} />
              </div>
            </div>
          )}
        >
          <Component view={view} index={index} titleId={titleId} />
        </BandRead>
      </RuledFrame>
    </section>
  )
}

function BandPending({ head }: { readonly head: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12" aria-busy="true">
      <div className="lg:col-span-5">{head}</div>
      <div className="lg:col-span-6 lg:col-start-7">
        <HubPending rows={8} />
      </div>
    </div>
  )
}

/** The pinned bar: the page's name, its numbered bands, and the year every band reads. */
export function PageBar({
  title,
  bands,
  view,
  views,
  unavailable,
  onYear,
}: {
  readonly title: string
  readonly bands: readonly BandEntry[]
  readonly view: YearView
  readonly views: readonly YearView[]
  readonly unavailable: ReadonlyMap<number, string | null>
  readonly onYear: (year: number) => void
}) {
  return (
    <nav aria-label={t`Secțiunile paginii`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-5 py-0">
        <span className="hidden min-w-0 truncate py-3 text-sm font-semibold text-foreground lg:block lg:max-w-56">{title}</span>
        {/* Pushed right by its first item's margin, not `justify-end`: an overflowing row then scrolls from its start instead of losing it. */}
        <ol className="flex min-w-0 flex-1 gap-4 overflow-x-auto sm:gap-5 lg:gap-4 xl:gap-5 lg:[&>li:first-child]:ml-auto">
          {bands.map((band, position) => (
            <li key={band.id} className="shrink-0">
              <a href={`#${band.id}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <MonoLabel className="text-primary" aria-hidden="true">
                  {String(position + 1).padStart(2, '0')}
                </MonoLabel>
                {band.nav}
              </a>
            </li>
          ))}
        </ol>
        <label className="flex shrink-0 items-center border-l pl-4">
          <span className="sr-only">{t`Anul`}</span>
          <YearOptions view={view} views={views} unavailable={unavailable} onYear={onYear} className="min-h-9 px-2 pr-8 text-sm" />
        </label>
      </RuledFrame>
    </nav>
  )
}

/**
 * The year every band reads, newest first: a native select, so it works on
 * every phone and from the keyboard. A year the bulletins don't finish (no
 * December release, or one covering another period) is listed but can't be
 * chosen.
 */
export function YearOptions({
  view,
  views,
  unavailable,
  onYear,
  className,
}: {
  readonly view: YearView
  readonly views: readonly YearView[]
  readonly unavailable: ReadonlyMap<number, string | null>
  readonly onYear: (year: number) => void
  readonly className?: string
}) {
  return (
    <span className="relative inline-flex">
      <select
        value={view.year}
        onChange={(event) => onYear(Number(event.target.value))}
        className={cn(
          'cursor-pointer appearance-none rounded-sm border bg-background font-semibold tabular-nums text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
      >
        {[...views].reverse().map((entry) => (
          <option key={entry.year} value={entry.year} disabled={unavailable.has(entry.year)}>
            {entry.partial
              ? t`${entry.year}, până în ${monthText(entry.month).replace(/\s*\d{4}$/u, '')}`
              : unavailable.has(entry.year)
                ? t`${entry.year} — ${reasonText(unavailable.get(entry.year) ?? null)}`
                : entry.year}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    </span>
  )
}

/** A way into the analysis page, for the question a band answers. */
export function AnalyticsLink({ patch, children, className }: { readonly patch: Partial<AdvancedState>; readonly children: ReactNode; readonly className?: string }) {
  return (
    <Link
      to="/national-budget/analytics"
      // The question, and the site's own keys the reader came with (`lang`).
      search={((previous: Record<string, unknown>) => nextSearch(siteKeys(previous), patch)) as never}
      className={cn('inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline sm:min-h-0', className)}
    >
      {children}
      <ArrowUpRight className="size-3.5" aria-hidden="true" />
    </Link>
  )
}

/** A band's source line, in the hubs' small print. */
export function SourceNote({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return <p className={cn('mt-5 text-xs leading-relaxed text-muted-foreground', className)}>{children}</p>
}
