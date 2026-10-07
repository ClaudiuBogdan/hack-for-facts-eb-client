import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { Info, TriangleAlert } from 'lucide-react'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { HUB, count, s1001ListDate, sourceDate } from './hub.model'

/**
 * The parts every variant of the public-enterprise hub shares, in the
 * procurement and national-budget hubs' language: ranked rows (a name over a
 * bar over a mono caption, the figure alone at the right), the caveats marker
 * and the page's one source line.
 */

// ────────────────────────────────────────────────────────────── rows ──

export const LIST = 'divide-y divide-border/70 border-y border-border/70'
const ROW = 'group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 px-1'
const ROW_LINK = 'transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none'

function Bar({ fraction }: { readonly fraction: number | null }) {
  if (fraction === null) return null
  return (
    <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
      <span className="block h-1 bg-primary/70 transition-colors group-hover:bg-primary" style={{ width: `${Math.min(Math.max(fraction * 100, 0.8), 100).toFixed(1)}%` }} />
    </span>
  )
}

export type RankedRow = {
  readonly key: string
  readonly label: string
  readonly caption?: string
  readonly value: string
  /** Against the top row; null draws no bar. */
  readonly fraction: number | null
  readonly href?: string
  readonly title?: string
}

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

// ─────────────────────────────────────────────────────────── caveats ──

/**
 * What a reader must know before trusting a figure, behind one marker in the
 * head: amber with the count, the list on a tap. Hidden, never dropped.
 */
export function CaveatsMarker({ className }: { readonly className?: string }) {
  const { i18n } = useLingui()
  const n = (value: number) => count(value, i18n.locale)
  const partial = HUB.sources.filter((source) => source.laneStatus !== 'available').length
  const implausible = HUB.financials.implausibleEmployees[0]
  const notes = [
    t`Lista ANAF (S1001) și anunțurile AMEPIP sunt încărcate parțial (${partial} din 3 surse); sursele nu spun ce lipsește.`,
    t`„Controlează" înseamnă autoritatea pe care o numește sursa, nu cine deține acțiunile. Numele autorităților sunt cele din sursă.`,
    t`Sursele nu se potrivesc: pentru ${n(HUB.control.disagreements)} întreprinderi, lista ANAF și anunțurile AMEPIP numesc altă autoritate; ${n(HUB.status.crossings.radiatedButS1001Active)} radiate din registrul comerțului sunt active în lista ANAF.`,
    t`${n(HUB.control.noS1001)} membri nu sunt în lista ANAF (doar în registrul AMEPIP); ${n(HUB.members.historical)} întreprinderi au ieșit din liste și nu sunt numărate.`,
    t`Nicio sumă pe toate întreprinderile: populația e provizorie, iar anii și indicatorii lipsesc la multe dintre ele. Clasamentele folosesc anul ${HUB.financials.year}.`,
    ...(implausible ? [t`Un număr de salariați evident greșit (${n(Number(implausible.employees))}, CUI ${implausible.cui}) e lăsat afară din clasament.`] : []),
  ]
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn('inline-flex min-h-11 items-center gap-1.5 text-amber-800 hover:text-amber-950 sm:min-h-0 dark:text-amber-300 dark:hover:text-amber-200', className)}
          aria-label={t`${notes.length} lucruri de știut despre aceste cifre`}
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

/** A band's one line under its rows, when a single fact needs saying there. */
export function BandNote({ children }: { readonly children: ReactNode }) {
  return <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{children}</p>
}

/** An „i" with the band's method on a tap: kept out of the way, never dropped. */
export function MethodMark({ children, label }: { readonly children: ReactNode; readonly label: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex size-11 items-center justify-center text-muted-foreground hover:text-foreground sm:size-8" aria-label={label}>
          <Info className="size-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,22rem)] text-xs leading-relaxed text-muted-foreground">
        {children}
      </PopoverContent>
    </Popover>
  )
}

// ──────────────────────────────────────────────────────────── source ──

/** The page's sources, once, with each one's own date. */
export function SourceLine({ className }: { readonly className?: string }) {
  const { i18n } = useLingui()
  const link = 'font-medium text-foreground underline-offset-4 hover:underline'
  const s1001 = HUB.sources.find((source) => source.family === 's1001')
  const amepip = HUB.sources.find((source) => source.family === 'amepip')
  const listDate = s1001ListDate(i18n.locale)
  const amepipDate = sourceDate('amepip', i18n.locale)
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {t`Surse:`}{' '}
      <a href={s1001?.sourceUrl ?? 'https://www.anaf.ro'} target="_blank" rel="noreferrer" className={link}>
        {t`lista ANAF a întreprinderilor publice`}
        <span aria-hidden="true"> ↗</span>
      </a>
      {listDate ? `, ${listDate}` : ''}
      {' · '}
      <a href={amepip?.sourceUrl ?? 'https://amepip.gov.ro'} target="_blank" rel="noreferrer" className={link}>
        {t`registrul AMEPIP`}
        <span aria-hidden="true"> ↗</span>
      </a>
      {amepipDate ? `, ${amepipDate}` : ''}
      {' · '}
      {t`registrul comerțului și bilanțurile ANAF, din paginile firmelor`}
    </p>
  )
}
