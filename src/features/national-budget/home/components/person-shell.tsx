import { Suspense, useDeferredValue, useEffect, useState, type ReactNode } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import { ChevronDown } from 'lucide-react'

import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { BandRead } from '@/features/national-budget/analytics/components/analytics-parts'
import { monthText } from '@/features/national-budget/analytics/lib/analytics-format'
import { nationalCatalogOptions, useNationalCatalog } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { personYearsOf } from '../hooks/use-person-data'
import { useUnfinishedYears } from '../hooks/use-home-data'
import { useAskedYear, useShownYear } from '../hooks/use-home-year'
import type { YearView } from '../lib/home-data'
import { monthName, populationText } from '../lib/person-format'
import { PageYearContext, usePageYear } from '../hooks/use-page-year'

/**
 * The page's frame (promoted from the prototype `national-budget/persoana`,
 * variant `lucru`): one year for the whole page, from the address (`an`),
 * and the sections in the site's ruled column, each reading and failing on
 * its own. A picked year reaches the year menus at once and the figures
 * once they are read, so a year change never falls back to skeletons.
 */

/** The address's year (as shown: a year the bulletins don't finish opens the default) for every section below. */
export function PageYearProvider({ children }: { readonly children: ReactNode }) {
  const catalog = useNationalCatalog()
  const { view: shown, setYear } = useShownYear()
  const views = personYearsOf(catalog)
  const year = useDeferredValue(shown.year)
  const viewOf = (wanted: number) => views.find((entry) => entry.year === wanted) ?? shown
  return <PageYearContext value={{ view: viewOf(year), picked: shown, pending: year !== shown.year, views, setYear }}>{children}</PageYearContext>
}

/**
 * The year as the hero and the bar set it: one flat button with the year,
 * a menu of every year in a grid of four, newest first, the chosen one
 * filled, the year in progress marked with a dot and named under the grid.
 */
export function YearPicker({ className, label = true }: { readonly className?: string; readonly label?: boolean }) {
  const { picked: view, views, setYear } = usePageYear()
  const running = views.filter((entry) => entry.partial)
  const item =
    'relative flex cursor-pointer select-none items-center justify-center rounded-md text-sm tabular-nums outline-none transition-colors data-[highlighted]:bg-muted data-[state=checked]:bg-primary data-[state=checked]:font-semibold data-[state=checked]:text-primary-foreground'
  const until = (entry: YearView) => t`până în ${monthName(entry.month)}`
  return (
    <DropdownMenu.Root modal={false}>
      <div className={cn('inline-flex items-center gap-2.5', className)}>
        {label ? <span className="text-sm text-muted-foreground">{t`Anul`}</span> : null}
        <DropdownMenu.Trigger
          aria-label={view.partial ? t`Anul: ${view.year}, ${until(view)}` : t`Anul: ${view.year}`}
          className="group inline-flex h-10 items-center gap-2.5 rounded-md border border-border bg-background pl-4 pr-3 text-base font-semibold tabular-nums outline-none transition-colors hover:border-foreground/30 focus-visible:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/30 data-[state=open]:border-foreground/40"
        >
          {view.year}
          {view.partial ? <span className="text-sm font-normal text-muted-foreground">{until(view)}</span> : null}
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
        </DropdownMenu.Trigger>
      </div>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 w-72 rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[side=bottom]:slide-in-from-top-1"
        >
          <DropdownMenu.RadioGroup value={String(view.year)} onValueChange={(value) => setYear(Number(value))} className="grid grid-cols-4 gap-1">
            {/* The years the bulletins don't finish are listed, not offered; read at the page's start, so it seldom waits. */}
            <Suspense fallback={null}>
              <YearItems views={views} className={cn(item, 'h-9 gap-1 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40')} until={until} />
            </Suspense>
          </DropdownMenu.RadioGroup>
          {running.map((entry) => (
            <p key={entry.year} className="mt-2 flex items-center gap-1.5 border-t px-1 pt-2 text-xs text-muted-foreground">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground/70" />
              {t`${entry.year}: anul în curs, ${until(entry)}`}
            </p>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function YearItems({ views, className, until }: { readonly views: readonly YearView[]; readonly className: string; readonly until: (entry: YearView) => string }) {
  const unfinished = useUnfinishedYears(views)
  return views.map((entry) => (
    <DropdownMenu.RadioItem
      key={entry.year}
      value={String(entry.year)}
      disabled={unfinished.has(entry.year)}
      className={className}
      aria-label={entry.partial ? t`${entry.year}, în curs, ${until(entry)}` : String(entry.year)}
    >
      {entry.year}
      {entry.partial ? <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-60" /> : null}
    </DropdownMenu.RadioItem>
  ))
}

/**
 * One section: an anchor, a title and a sentence, drawn at once; then what
 * reads its data, in its own year scope. No key on the year: the section
 * keeps its figures until the new year's are read, a step fainter meanwhile.
 */
export function Section({ id, title, lede, children }: { readonly id: string; readonly title: string; readonly lede?: ReactNode; readonly children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-16 border-b">
      <RuledFrame className="py-14 sm:py-16">
        <h2 id={`${id}-title`} className="max-w-[28ch] text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {title}
        </h2>
        {lede ? <div className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">{lede}</div> : null}
        <div className="mt-8">
          <YearScope fallback={<SectionPending />}>
            <Faint>{children}</Faint>
          </YearScope>
        </div>
      </RuledFrame>
    </section>
  )
}

/** What reads the page's year: it waits for the catalog on its own, then reads the year from the address. */
export function YearScope({ fallback, children }: { readonly fallback: ReactNode; readonly children: ReactNode }) {
  return (
    <BandRead fallback={fallback} renderError={(retry) => <YearError retry={retry} />}>
      <PageYearProvider>{children}</PageYearProvider>
    </BandRead>
  )
}

/**
 * A read that failed; a year picked since, or a new catalog (a bulletin
 * landed and the read's snapshot moved), is read again rather than left on
 * the failure.
 */
function YearError({ retry }: { readonly retry: () => void }) {
  const asked = useAskedYear()
  // The catalog as the cache has it, without reading it here.
  const snapshot = useQuery({ ...nationalCatalogOptions(), enabled: false }).data?.snapshots.execution
  const now = `${asked} ${snapshot}`
  const [failedFor] = useState(now)
  useEffect(() => {
    if (now !== failedFor) retry()
  }, [now, failedFor, retry])
  return <HubLoadError onRetry={retry} />
}

/** A step fainter while a picked year is read (`aria-busy` says so). */
export function Faint({ children }: { readonly children: ReactNode }) {
  const { pending } = usePageYear()
  return (
    <div aria-busy={pending} className={cn('transition-opacity duration-200', pending && 'opacity-60')}>
      {children}
    </div>
  )
}

function SectionPending() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="h-9 animate-pulse rounded bg-muted/70" style={{ width: `${92 - row * 9}%` }} />
      ))}
    </div>
  )
}

/** A figure inside a note or a sentence: the number in the foreground, its words after it. */
export function Mark({ children }: { readonly children: ReactNode }) {
  return <span className="font-medium tabular-nums text-foreground">{children}</span>
}

export function Note({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return <p className={cn('mt-6 max-w-[80ch] text-xs leading-relaxed text-muted-foreground', className)}>{children}</p>
}

/** A section's figure: the amount, what it is, and short notes that lead with their figure. */
export function Stat({ value, unit, label, notes }: { readonly value: string; readonly unit: string; readonly label: string; readonly notes: readonly ReactNode[] }) {
  return (
    <div>
      <p className="flex items-baseline gap-1.5 text-4xl font-semibold tabular-nums tracking-tight">
        {value}
        <span className="whitespace-nowrap text-sm font-medium tracking-normal text-muted-foreground">{unit}</span>
      </p>
      <p className="mt-2 text-sm font-medium">{label}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {notes.filter(Boolean).map((note, line) => (
          <span key={line} className="block">
            {note}
          </span>
        ))}
      </p>
    </div>
  )
}

/** The population the page divides by and how recent the bulletins are: said once, at the page's foot. */
export function DataNote({ className }: { readonly className?: string }) {
  const { view } = usePageYear()
  const catalog = useNationalCatalog()
  const newest = catalog.execution.coverage.lastMonth
  const people = populationText(view.year)
  const date = monthText(newest)
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {people ? t`${people} locuitori la 1 ianuarie ${view.year}, populația rezidentă după INS (Tempo POP105A; 2026, provizoriu).` : null}{' '}
      {t`Date până în ${date}.`}
    </p>
  )
}
