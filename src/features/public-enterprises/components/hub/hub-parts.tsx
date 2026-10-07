import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { TriangleAlert } from 'lucide-react'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SHOW_MORE_CLASS } from '@/features/procurement/components/home/home-chrome'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'

/**
 * The parts the public-enterprise hub's bands share, in the procurement and
 * national-budget hubs' language: ranked rows (a name over a bar over a mono
 * caption, the figure alone at the right), the band's two columns, the
 * caveats marker.
 */

// ────────────────────────────────────────────────────────────── rows ──

const LIST = 'divide-y divide-border/70 border-y border-border/70'
const ROW = 'group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 px-1'
const ROW_LINK = 'transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'

/** A share of the list's top row; a row with nothing to draw draws no bar. */
function Bar({ fraction }: { readonly fraction: number | null }) {
  if (fraction === null || !Number.isFinite(fraction)) return null
  return (
    <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
      <span className="block h-1 bg-primary/70 transition-colors group-hover:bg-primary" style={{ width: `${Math.min(Math.max(fraction * 100, 0.8), 100).toFixed(1)}%` }} />
    </span>
  )
}

export type RankedRow = {
  readonly key: string
  readonly label: string
  /** The mono caption under the bar: a place, a share, a code. */
  readonly caption?: string
  readonly value: string
  /** Against the list's top row; null draws no bar. */
  readonly fraction: number | null
  /** The row's page: an enterprise's company page or an authority's budget page. */
  readonly link?: RowLink
  /** The full name, where the row cuts it. */
  readonly title?: string
}

export type RowLink = { readonly page: 'company' | 'entity'; readonly cui: string }

/** A row's link through the router: preloaded on intent, its chunk's wait drawn by the app's progress bar. */
function RowLinkTo({ link, className, children }: { readonly link: RowLink; readonly className: string; readonly children: ReactNode }) {
  return link.page === 'company' ? (
    <Link to="/companies/$cui" params={{ cui: link.cui }} preload="intent" className={className}>
      {children}
    </Link>
  ) : (
    <Link to="/entities/$cui" params={{ cui: link.cui }} preload="intent" className={className}>
      {children}
    </Link>
  )
}

/** Rows a ranking or a breakdown shows, numbered when the order is a rank. */
export function RankedRows({ rows, numbered = false, dense = false, className }: { readonly rows: readonly RankedRow[]; readonly numbered?: boolean; readonly dense?: boolean; readonly className?: string }) {
  return (
    <ol className={cn(LIST, className)}>
      {rows.map((row, index) => {
        const name = (
          <span className="min-w-0">
            <span className="block truncate text-sm text-foreground" title={row.title ?? row.label}>
              {row.label}
            </span>
            <Bar fraction={row.fraction} />
            {row.caption ? <MonoLabel className="mt-1 block truncate tabular-nums text-muted-foreground">{row.caption}</MonoLabel> : null}
          </span>
        )
        const body = (
          <>
            {numbered ? (
              <span className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2">
                <MonoLabel className="pt-0.5 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
                {name}
              </span>
            ) : (
              name
            )}
            <span className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-foreground">{row.value}</span>
          </>
        )
        const rowClassName = cn(ROW, dense ? 'py-2' : 'py-2.5')
        return (
          <li key={row.key}>
            {row.link ? (
              <RowLinkTo link={row.link} className={cn(rowClassName, ROW_LINK)}>
                {body}
              </RowLinkTo>
            ) : (
              <div className={rowClassName}>{body}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** The control under a list that opens the rest of it. */
export function ShowMore({ open, onToggle, all }: { readonly open: boolean; readonly onToggle: () => void; readonly all?: string }) {
  return (
    <button type="button" onClick={onToggle} className={SHOW_MORE_CLASS} aria-expanded={open}>
      {open ? t`Arată mai puține` : (all ?? t`Arată mai multe`)}
    </button>
  )
}

/** A band's one line under its rows, when a fact about them needs saying there. */
export function BandNote({ children }: { readonly children: ReactNode }) {
  return <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{children}</p>
}

/** A band's two columns: the numbered title and its lede at the left, the rows at the right, their tops aligned. */
export function BandColumns({
  titleId,
  index,
  title,
  lede,
  children,
}: {
  readonly titleId: string
  readonly index: string
  readonly title: ReactNode
  readonly lede: ReactNode
  readonly children: ReactNode
}) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <HubSectionHead titleId={titleId} index={index} title={title} lede={lede} />
      </div>
      <div className={cn('min-w-0 lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────── caveats ──

/**
 * What a reader must know before trusting a figure, behind one marker in the
 * head: amber with the count, the list on a tap. Hidden, never dropped.
 */
export function CaveatsMarker({ notes, className }: { readonly notes: readonly string[]; readonly className?: string }) {
  if (notes.length === 0) return null
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn('inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 text-amber-800 hover:text-amber-950 sm:min-h-0 sm:min-w-0 dark:text-amber-300 dark:hover:text-amber-200', className)}
          aria-label={t`De știut despre aceste cifre: ${notes.length}`}
        >
          <TriangleAlert className="size-4" aria-hidden="true" />
          <MonoLabel className="tabular-nums">{notes.length}</MonoLabel>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,24rem)] text-xs leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">{t`De știut`}</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-4">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
