import { Suspense, useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { ErrorBoundary } from '@sentry/react'
import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { Info, RotateCcw, TriangleAlert, CircleSlash } from 'lucide-react'

import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { BudgetCatalog, BudgetEdition, ReleaseIndexEntry, UnavailableReason, ValueOrigin } from '@/schemas/national-budget-page'
import { coverageLabel, editionLabel, gapText, leiParts, monthLabel, monthShort, originLabel, unavailableText } from './page.format'

// ── Frame and labels ────────────────────────────────────────────────────────

/** The hubs' ruled column, with the 16px phone gutter. */
export function Frame({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return <RuledFrame className={cn('px-4 sm:px-8', className)}>{children}</RuledFrame>
}

export function Eyebrow({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return <MonoLabel className={cn('block text-muted-foreground', className)}>{children}</MonoLabel>
}

export const LINK =
  'inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline sm:min-h-0'

/** The page-wide mock label, and what each value mark means. */
export function MockStrip() {
  return (
    <div className="border-b border-amber-600/30 bg-amber-50/70 dark:bg-amber-950/20" role="note" aria-label={t`Starea datelor`}>
      <Frame className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-xs">
        <span className="font-semibold text-amber-900 dark:text-amber-200">{t`Date pentru machetă — API în lucru`}</span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
          <span>{t`Cifrele fără marcaj: rânduri reale din eșantionul revizuit.`}</span>
          <span className="inline-flex items-center gap-1">
            <OriginChip origin="draft_static" /> {t`proiectul din martie 2026`}
          </span>
          <span className="inline-flex items-center gap-1">
            <OriginChip origin="synthetic_demo" /> {t`valori inventate`}
          </span>
        </span>
      </Frame>
    </div>
  )
}

/** Marks a value that is not a reviewed real row. Real rows carry no chip. */
export function OriginChip({ origin, className }: { readonly origin: ValueOrigin; readonly className?: string }) {
  if (origin === 'real_sample') return null
  return (
    <span
      title={originLabel(origin)}
      className={cn(
        'inline-flex h-4 shrink-0 items-center border px-1 font-mono text-[0.625rem] uppercase leading-none tracking-wider',
        origin === 'draft_static'
          ? 'border-amber-600/50 text-amber-800 dark:text-amber-300'
          : 'border-dashed border-foreground/50 text-foreground/80',
        className,
      )}
    >
      {origin === 'draft_static' ? t`proiect` : t`demo`}
    </span>
  )
}

/** A sum of lei: the figure, then its scale in quiet type. */
export function Money({
  lei,
  className,
  unitClassName,
  tabular = false,
}: {
  readonly lei: number
  readonly className?: string
  readonly unitClassName?: string
  readonly tabular?: boolean
}) {
  const parts = leiParts(lei)
  return (
    <span className={cn('whitespace-nowrap', tabular && 'tabular-nums', className)}>
      {parts.value}
      <span className={cn('ml-1 text-[0.55em] font-normal text-muted-foreground', unitClassName)}>{parts.unit}</span>
    </span>
  )
}

// ── Notes, missing values, source ───────────────────────────────────────────

/** One marker for what a reader should know before the numbers: amber with a count when something is off. */
export function NotesMarker({ alerts, facts }: { readonly alerts: readonly string[]; readonly facts: readonly string[] }) {
  const count = alerts.length
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'inline-flex min-h-11 min-w-11 items-center justify-center gap-1 px-1 text-xs tabular-nums sm:h-7 sm:min-h-0 sm:min-w-7',
          count > 0 ? 'text-amber-700 hover:text-amber-800 dark:text-amber-400' : 'text-muted-foreground hover:text-foreground',
        )}
        aria-label={count > 0 ? t`${count} atenționări despre aceste cifre` : t`Despre aceste cifre`}
      >
        {count > 0 ? <TriangleAlert className="size-3.5" aria-hidden="true" /> : <Info className="size-3.5" aria-hidden="true" />}
        {count > 0 ? count : null}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,28rem)] space-y-2 text-sm">
        {alerts.map((alert) => (
          <p key={alert} className="border-l-2 border-amber-600/60 pl-3 text-foreground">
            {alert}
          </p>
        ))}
        {facts.map((fact) => (
          <p key={fact} className="text-muted-foreground">
            {fact}
          </p>
        ))}
      </PopoverContent>
    </Popover>
  )
}

/** A value the page cannot show, and why. Never a zero, never a blank. */
export function Missing({ reason, className }: { readonly reason: UnavailableReason; readonly className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm text-muted-foreground', className)}>
      <CircleSlash className="size-3.5 shrink-0" aria-hidden="true" />
      {unavailableText(reason)}
    </span>
  )
}

export function SourceLine({ items, method }: { readonly items: readonly ReactNode[]; readonly method: readonly string[] }) {
  return (
    <footer className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>{t`Surse:`}</span>
      {items.map((item, index) => (
        <span key={index} className="inline-flex items-center gap-2">
          {item}
          {index < items.length - 1 ? <span aria-hidden="true">·</span> : null}
        </span>
      ))}
      <span aria-hidden="true">·</span>
      <Popover>
        <PopoverTrigger className="min-h-11 underline-offset-4 hover:text-foreground hover:underline sm:min-h-0">{t`Cum citim datele`}</PopoverTrigger>
        <PopoverContent align="start" className="w-[min(92vw,32rem)] space-y-2 text-sm text-muted-foreground">
          {method.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </PopoverContent>
      </Popover>
    </footer>
  )
}

export function ExternalLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-foreground hover:underline">
      {children}
    </a>
  )
}

// ── Boundaries ──────────────────────────────────────────────────────────────

/** A band's own loading and error states, so one failing read never blanks the page. */
export function Band({ fallback, children, label }: { readonly fallback: ReactNode; readonly children: ReactNode; readonly label: string }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          fallback={({ resetError }) => (
            <div role="alert" className="flex flex-wrap items-center gap-3 border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
              <TriangleAlert className="size-4 text-destructive" aria-hidden="true" />
              <span>{t`Nu am putut citi: ${label}.`}</span>
              <button
                type="button"
                onClick={() => {
                  reset()
                  resetError()
                }}
                className="inline-flex min-h-11 items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                {t`Reîncearcă`}
              </button>
            </div>
          )}
        >
          <Suspense fallback={fallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}

export function Skeleton({ className }: { readonly className?: string }) {
  return <span aria-hidden="true" className={cn('block animate-pulse bg-muted/70 motion-reduce:animate-none', className)} />
}

export function BandSkeleton({ rows = 4, className, label }: { readonly rows?: number; readonly className?: string; readonly label: string }) {
  return (
    <div aria-busy="true" aria-label={label} className={cn('space-y-2', className)}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className={cn('h-6', index === 0 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

// ── Controls ────────────────────────────────────────────────────────────────

export type SegmentOption<T extends string | number> = {
  readonly value: T
  readonly label: ReactNode
  readonly title?: string
}

/** A row of mutually exclusive buttons: a quick filter, keyboard and screen-reader plain. */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
  size = 'md',
}: {
  readonly label: string
  readonly value: T
  readonly options: readonly SegmentOption<T>[]
  readonly onChange: (value: T) => void
  readonly className?: string
  readonly size?: 'sm' | 'md'
}) {
  return (
    <div role="group" aria-label={label} className={cn('inline-flex flex-wrap border', className)}>
      {options.map((option, index) => {
        const active = option.value === value
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-11 whitespace-nowrap text-sm transition-colors sm:min-h-0',
              size === 'sm' ? 'px-2.5 sm:px-3' : 'px-3',
              size === 'sm' ? 'sm:py-1' : 'sm:py-1.5',
              index > 0 && 'border-l',
              active ? 'bg-foreground font-medium text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/** The law editions, newest first; the draft apart; the editions not loaded yet listed and disabled. */
export function EditionSelect({
  catalog,
  value,
  onChange,
  className,
}: {
  readonly catalog: BudgetCatalog
  readonly value: string
  readonly onChange: (key: string) => void
  readonly className?: string
}) {
  const laws = catalog.editions.filter((edition) => edition.status === 'law_as_sent').slice().reverse()
  const drafts = catalog.editions.filter((edition) => edition.status === 'draft')
  const current = catalog.editions.find((edition) => edition.key === value)
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn('h-11 w-auto min-w-52 gap-2 rounded-none sm:h-9', className)} aria-label={t`Legea bugetului`}>
        {/* Radix renders an empty value on the server; name it so the first paint says which law. */}
        <SelectValue>{current ? editionLabel(current) : null}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{t`Proiect`}</SelectLabel>
          {drafts.map((edition) => (
            <SelectItem key={edition.key} value={edition.key}>
              {editionLabel(edition)} · {t`martie 2026`}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>{t`Legi, trimise la Monitorul Oficial`}</SelectLabel>
          {laws.map((edition) => (
            <SelectItem key={edition.key} value={edition.key}>
              {editionLabel(edition)}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>{t`Încă neîncărcate`}</SelectLabel>
          {catalog.pendingEditions.map((pending) => (
            <SelectItem key={pending.budgetYear} value={`pending-${pending.budgetYear}`} disabled>
              {t`Legea bugetului ${pending.budgetYear}`} · {pending.reason === 'deployment_in_progress' ? t`în încărcare` : t`în așteptare`}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export function TargetYears({
  edition,
  value,
  onChange,
}: {
  readonly edition: BudgetEdition
  readonly value: number
  readonly onChange: (year: number) => void
}) {
  return (
    <Segmented
      label={t`Anul la care se referă valorile`}
      value={value}
      onChange={onChange}
      size="sm"
      options={edition.targetYears.map((year) => ({
        value: year,
        label:
          year === edition.budgetYear ? (
            <>
              {year} <span className="text-[0.75em]">{edition.status === 'draft' ? t`propus` : t`aprobat`}</span>
            </>
          ) : (
            <>
              {year}{' '}
              <span className="text-[0.75em]" aria-hidden="true">
                {t`est.`}
              </span>
              <span className="sr-only">{t`estimare`}</span>
            </>
          ),
      }))}
    />
  )
}

// ── Releases and coverage ───────────────────────────────────────────────────

function releaseYears(releases: readonly ReleaseIndexEntry[]): readonly (readonly [string, readonly ReleaseIndexEntry[]])[] {
  const byYear = new Map<string, ReleaseIndexEntry[]>()
  for (const release of releases) {
    const year = release.periodEnd.slice(0, 4)
    byYear.set(year, [...(byYear.get(year) ?? []), release])
  }
  return [...byYear.entries()].slice().reverse()
}

/**
 * Picks a monthly bulletin. Every month is listed: published ones are
 * buttons (those outside the design sample say so), gap months are visible and
 * open their reason rather than vanishing.
 */
export function ReleasePicker({
  releases,
  value,
  onChange,
  className,
}: {
  readonly releases: readonly ReleaseIndexEntry[]
  readonly value: string
  readonly onChange: (month: string) => void
  readonly className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn('inline-flex h-11 items-center gap-2 border px-3 text-sm hover:bg-muted sm:h-9', className)}
        aria-label={t`Buletinul de execuție: ${monthLabel(value)}`}
      >
        <span className="text-muted-foreground">{t`Execuție`}</span>
        <span className="font-medium tabular-nums">{coverageLabel(value)}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[min(70vh,28rem)] w-[min(94vw,26rem)] overflow-y-auto p-3">
        <p className="mb-2 text-xs text-muted-foreground">{t`Fiecare buletin cumulează de la 1 ianuarie până la sfârșitul lunii.`}</p>
        <div className="space-y-1">
          {releaseYears(releases).map(([year, months]) => (
            <div key={year} className="grid grid-cols-[2.75rem_repeat(12,minmax(0,1fr))] items-center gap-0.5">
              <span className="text-xs tabular-nums text-muted-foreground">{year}</span>
              {Array.from({ length: 12 }, (_, index) => {
                const month = `${year}-${String(index + 1).padStart(2, '0')}`
                const entry = months.find((release) => release.periodEnd.startsWith(month))
                if (!entry) return <span key={month} aria-hidden="true" />
                const selected = month === value
                const gap = entry.status === 'gap'
                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => {
                      onChange(month)
                      setOpen(false)
                    }}
                    aria-pressed={selected}
                    aria-label={
                      gap && entry.gapReason
                        ? t`${monthLabel(month)}: ${gapText(entry.gapReason)}`
                        : entry.inSample
                          ? t`${monthLabel(month)}, în eșantion`
                          : monthLabel(month)
                    }
                    title={gap && entry.gapReason ? gapText(entry.gapReason) : undefined}
                    className={cn(
                      'h-8 text-[0.625rem] tabular-nums transition-colors',
                      selected
                        ? 'bg-foreground text-background'
                        : gap
                          ? 'border border-dashed border-destructive/60 text-destructive'
                          : entry.inSample
                            ? 'bg-primary/15 font-semibold text-foreground hover:bg-primary/25'
                            : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {monthShort(index + 1).replace('.', '')}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[0.6875rem] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block size-2.5 bg-primary/30" aria-hidden="true" /> {t`în eșantionul machetei`}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block size-2.5 border border-dashed border-destructive/60" aria-hidden="true" /> {t`lună nepublicată`}
          </span>
        </p>
      </PopoverContent>
    </Popover>
  )
}

/** What the data holds: the law editions and the monthly bulletins, gaps drawn as gaps. */
export function CoverageBand({ catalog, className }: { readonly catalog: BudgetCatalog; readonly className?: string }) {
  const years = releaseYears(catalog.releases).slice().reverse()
  const gaps = catalog.releases.filter((release) => release.status === 'gap')
  const reviewed = catalog.editions.filter((edition) => edition.review === 'reviewed')
  return (
    <section aria-labelledby="coverage-title" className={cn('space-y-4', className)}>
      <h2 id="coverage-title" className="text-sm font-semibold">
        {t`Ce acoperă datele`}
      </h2>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-2">
          <Eyebrow>{t`Legi ale bugetului`}</Eyebrow>
          <ol className="flex flex-wrap gap-1" aria-label={t`Legi ale bugetului, pe ani`}>
            {[...catalog.pendingEditions.map((pending) => pending.budgetYear), ...catalog.editions.map((edition) => edition.budgetYear)]
              .slice().sort((a, b) => a - b)
              .map((year) => {
                const edition = catalog.editions.find((item) => item.budgetYear === year)
                const pending = catalog.pendingEditions.find((item) => item.budgetYear === year)
                return (
                  <li
                    key={year}
                    className={cn(
                      'flex h-7 items-center gap-1 px-1.5 text-xs tabular-nums',
                      edition?.review === 'reviewed' && 'bg-foreground text-background',
                      edition?.status === 'draft' && 'border border-amber-600/50 text-amber-800 dark:text-amber-300',
                      pending && 'border border-dashed text-muted-foreground',
                    )}
                    title={pending ? (pending.reason === 'deployment_in_progress' ? t`în încărcare` : t`în așteptare`) : edition ? editionLabel(edition) : undefined}
                  >
                    {year}
                  </li>
                )
              })}
          </ol>
          <p className="text-xs text-muted-foreground">
            {t`${reviewed.length} legi revizuite (${reviewed[0]?.budgetYear}–${reviewed.slice(-1)[0]?.budgetYear}); 2018 în încărcare; 2015–2017 în așteptare; 2026 doar ca proiect.`}
          </p>
        </div>
        <div className="space-y-2">
          <Eyebrow>{t`Buletine lunare de execuție`}</Eyebrow>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-x-2 gap-y-1.5" role="img" aria-label={t`${catalog.executionCoverage.count} luni publicate din ianuarie 2006 până în iulie 2026; ${gaps.length} luni lipsă`}>
            {years.map(([year, months]) => (
              <div key={year} className="flex items-center gap-1">
                <span className="w-7 text-[0.625rem] tabular-nums text-muted-foreground">{year.slice(2)}</span>
                <span className="flex gap-px">
                  {months.map((release) => (
                    <span
                      key={release.periodEnd}
                      className={cn(
                        'h-3 w-[3px]',
                        release.status === 'gap' ? 'bg-destructive' : release.inSample ? 'bg-primary' : 'bg-foreground/25',
                      )}
                    />
                  ))}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {t`${catalog.executionCoverage.count} luni publicate, ian. 2006 – iul. 2026. Lipsesc:`}{' '}
            {gaps.map((gap, index) => (
              <span key={gap.periodEnd}>
                <span className="text-foreground">{monthLabel(gap.periodEnd.slice(0, 7))}</span> ({gap.gapReason ? gapText(gap.gapReason) : ''})
                {index < gaps.length - 1 ? '; ' : '.'}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  )
}
