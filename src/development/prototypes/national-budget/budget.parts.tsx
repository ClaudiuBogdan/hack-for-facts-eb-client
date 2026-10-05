import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * The parts the national budget hub and its analysis page share, in the
 * procurement hub's language: the rows (name over a bar over a mono caption,
 * the figure alone on the right), the marks for a mock and a draft, the links
 * between the two pages.
 */

// ───────────────────────────────────────────────────────────── marks ──

const MARK = 'rounded-[2px] border border-amber-700/40 px-1 py-px text-amber-800 dark:border-amber-300/40 dark:text-amber-300'

/** The page's data is a design sample, said once in the head, explained on a tap. */
export function SampleMark({ className }: { readonly className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn('inline-flex min-h-11 cursor-help items-center sm:min-h-0', className)}>
          <MonoLabel className={MARK}>{t`Machetă · API în lucru`}</MonoLabel>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,22rem)] space-y-2 text-xs leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">{t`Date pentru machetă — API în lucru`}</p>
        <p>{t`Legile bugetului 2019–2025 și buletinele MF din decembrie 2025 și iulie 2026: rânduri reale din producție, eșantionul revizuit. Serverul nu le expune încă.`}</p>
        <p>{t`Plățile ministerelor: citite din API-ul de execuție ANAF, care funcționează azi.`}</p>
        <p>{t`Proiectul pe 2026: extras din PDF-urile din martie 2026, nevalidat; marcat „proiect".`}</p>
      </PopoverContent>
    </Popover>
  )
}

/** A value from the March 2026 draft: a mono word beside it, the reason on a tap. */
export function DraftMark({ className }: { readonly className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn('inline-flex cursor-help align-middle', className)}>
          <MonoLabel className={MARK}>{t`proiect`}</MonoLabel>
          <span className="sr-only">{t`: de ce`}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-xs leading-relaxed">
        {t`Proiectul legii bugetului pe 2026, Anexa 3, martie 2026: cifre extrase din PDF, nevalidate. Nu e legea adoptată.`}
      </PopoverContent>
    </Popover>
  )
}

// ────────────────────────────────────────────────────────────── rows ──

export const LIST = 'divide-y divide-border/70 border-y border-border/70'
const ROW = 'group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 px-1'
const ROW_LINK = 'transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none'

/** A share of the top row; none for a row whose measure cannot be drawn (a negative). */
export function Bar({ fraction, muted = false }: { readonly fraction: number | null; readonly muted?: boolean }) {
  if (fraction === null) return null
  return (
    <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
      <span
        className={cn('block h-1 transition-colors', muted ? 'bg-amber-600/60' : 'bg-primary/70 group-hover:bg-primary')}
        style={{ width: `${Math.min(Math.max(fraction * 100, 0.8), 100).toFixed(1)}%` }}
      />
    </span>
  )
}

export type RankedRow = {
  readonly key: string
  readonly label: string
  /** The mono caption under the bar: a share, a count, a code. */
  readonly caption?: string
  readonly value: string
  /** Against the top row; null draws no bar. */
  readonly fraction: number | null
  readonly href?: string
  readonly mark?: ReactNode
  readonly title?: string
}

/** Rows a ranking or a breakdown shows, numbered when the order is a rank. */
export function RankedRows({
  rows,
  numbered = false,
  dense = false,
  draft = false,
  className,
}: {
  readonly rows: readonly RankedRow[]
  readonly numbered?: boolean
  readonly dense?: boolean
  /** The rows are the draft's: the bars in the draft's colour. */
  readonly draft?: boolean
  readonly className?: string
}) {
  return (
    <ol className={cn(LIST, className)}>
      {rows.map((row, index) => {
        const name = (
          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm text-foreground" title={row.title ?? row.label}>
                {row.label}
              </span>
              {row.mark}
            </span>
            <Bar fraction={row.fraction} muted={draft} />
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
        const className = cn(ROW, dense ? 'py-2' : 'py-2.5')
        return (
          <li key={row.key}>
            {row.href ? (
              <a href={row.href} className={cn(className, ROW_LINK)}>
                {body}
              </a>
            ) : (
              <div className={className}>{body}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

// ───────────────────────────────────────────────────────────── links ──

export const HUB_PATH = '/development/national-budget/hub'
export const ANALYZE_PATH = '/development/national-budget/analize'

/** A link into the analysis page, its question written in the address (the page's own keys). */
export function analyzeHref(search: Readonly<Record<string, string | number | null | undefined>>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) if (value !== null && value !== undefined && value !== '') params.set(key, String(value))
  const query = params.toString()
  return query ? `${ANALYZE_PATH}?${query}` : ANALYZE_PATH
}

export function entityHref(cui: string): string {
  return `/entities/${cui}`
}
