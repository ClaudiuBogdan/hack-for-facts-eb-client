import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowUpRight } from 'lucide-react'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { BandRead } from '@/features/national-budget/analytics/components/analytics-parts'
import { nextSearch, type AdvancedState } from '@/features/national-budget/analytics/lib/analytics-state'
import { HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { usePageSearch, type YearView } from './principal.data'

/**
 * The citizens' page's frame: the pinned bar that carries the year, one band
 * per question, and — for the prototype only — a ribbon over each band that
 * switches between its designs (`?<band>=<variant>`), so the owner can pick
 * one per band. A band reads on its own: its skeleton while it waits, the
 * hubs' error and retry if it fails; the page around it stands.
 */

export type BandProps = { readonly view: YearView; readonly index: string; readonly titleId: string }

export type BandVariant = {
  readonly key: string
  readonly title: string
  readonly note: string
  readonly component: (props: BandProps) => ReactNode
}

export type BandDefinition = {
  readonly id: string
  /** The pinned bar's word for it. */
  readonly nav: string
  readonly variants: readonly BandVariant[]
}

/** The variant a band shows: the address's, else its first. */
export function useVariant(band: BandDefinition): BandVariant {
  const { search } = usePageSearch()
  const asked = search[band.id]
  return band.variants.find((variant) => variant.key === asked) ?? band.variants[0]!
}

/** The prototype's ribbon: which design of this band is showing, and the others. */
export function VariantRibbon({ band, current }: { readonly band: BandDefinition; readonly current: BandVariant }) {
  const { set } = usePageSearch()
  if (band.variants.length < 2) return null
  return (
    <div className="border-b border-dashed border-amber-500/60 bg-amber-50/70 dark:bg-amber-950/20">
      <RuledFrame className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2">
        <MonoLabel className="text-amber-800 dark:text-amber-300">{t`Machetă · variante`}</MonoLabel>
        {band.variants.map((variant, position) => (
          <button
            key={variant.key}
            type="button"
            aria-pressed={variant.key === current.key}
            onClick={() => set({ [band.id]: position === 0 ? null : variant.key })}
            className={cn(
              'rounded-sm border px-2 py-0.5 text-xs transition-colors',
              variant.key === current.key ? 'border-amber-700 bg-amber-700 text-white' : 'border-amber-600/40 text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40',
            )}
          >
            {String.fromCharCode(65 + position)} · {variant.title}
          </button>
        ))}
        <span className="basis-full text-xs text-amber-900/80 dark:text-amber-200/80">{current.note}</span>
      </RuledFrame>
    </div>
  )
}

/** One numbered band: the prototype's ribbon, then the ruled column with the chosen design, read on its own. */
export function Band({ band, view, position, variant: forced }: { readonly band: BandDefinition; readonly view: YearView; readonly position: number; readonly variant?: BandVariant }) {
  const chosen = useVariant(band)
  const variant = forced ?? chosen
  const titleId = `${band.id}-title`
  const index = `${String(position).padStart(2, '0')} / ${band.nav}`
  const Component = variant.component
  return (
    <section id={band.id} className="scroll-mt-14 border-b" aria-labelledby={titleId}>
      {forced ? null : <VariantRibbon band={band} current={variant} />}
      <RuledFrame className="py-14 sm:py-20">
        <BandRead resetKey={`${band.id}|${variant.key}|${view.label}`} fallback={<BandPending index={index} />}>
          <Component view={view} index={index} titleId={titleId} />
        </BandRead>
      </RuledFrame>
    </section>
  )
}

function BandPending({ index }: { readonly index: string }) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <HubSectionHead index={index} title={<span className="inline-block h-8 w-64 animate-pulse rounded-sm bg-muted/70" />} />
      </div>
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
  onYear,
}: {
  readonly title: string
  readonly bands: readonly BandDefinition[]
  readonly view: YearView
  readonly views: readonly YearView[]
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
        <YearSelect view={view} views={views} onYear={onYear} />
      </RuledFrame>
    </nav>
  )
}

/** The year every band reads: a native select, so it works on every phone and from the keyboard. */
export function YearSelect({
  view,
  views,
  onYear,
  className,
}: {
  readonly view: YearView
  readonly views: readonly YearView[]
  readonly onYear: (year: number) => void
  readonly className?: string
}) {
  return (
    <label className={cn('flex shrink-0 items-center gap-2 border-l pl-4 text-sm', className)}>
      <span className="sr-only">{t`Anul`}</span>
      <select
        value={view.year}
        onChange={(event) => onYear(Number(event.target.value))}
        className="min-h-9 cursor-pointer rounded-sm border bg-background px-2 text-sm font-semibold tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {[...views].reverse().map((entry) => (
          <option key={entry.year} value={entry.year} disabled={entry.gap !== null}>
            {entry.partial ? t`${entry.year} (în curs)` : entry.year}
          </option>
        ))}
      </select>
    </label>
  )
}

/** A way into the analysis page, for the question a band answers. */
export function AnalyticsLink({ patch, children, className }: { readonly patch: Partial<AdvancedState>; readonly children: ReactNode; readonly className?: string }) {
  return (
    <Link
      to="/national-budget/analytics"
      search={nextSearch({}, patch) as never}
      className={cn('inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline sm:min-h-0', className)}
    >
      {children}
      <ArrowUpRight className="size-3.5" aria-hidden="true" />
    </Link>
  )
}

/** The analysis page's period for a year: the year, or the year in progress from 1 January. */
export const perioadaOf = (view: YearView): string => view.label

/** A band's source line, in the hubs' small print. */
export function SourceNote({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return <p className={cn('mt-5 text-xs leading-relaxed text-muted-foreground', className)}>{children}</p>
}
