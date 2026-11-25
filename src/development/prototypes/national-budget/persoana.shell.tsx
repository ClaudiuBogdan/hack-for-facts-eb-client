import { createContext, Suspense, use, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown } from 'lucide-react'

import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { BandRead } from '@/features/national-budget/analytics/components/analytics-parts'
import { useNationalCatalog } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { defaultYear, type YearView } from '@/features/national-budget/home/lib/home-data'
import { cn } from '@/lib/utils'
import { populationText, usePersonYears } from './persoana.data'

/**
 * The frame the per-person versions share: one year for the page (picked in
 * the head, kept in the bar that sticks while scrolling), the sections in
 * the site's ruled column, each reading and failing on its own.
 */

type PersonYear = { readonly view: YearView; readonly views: readonly YearView[]; readonly setYear: (year: number) => void }

const YearContext = createContext<PersonYear | null>(null)

export function usePersonYear(): PersonYear {
  const value = use(YearContext)
  if (!value) throw new Error('usePersonYear outside PersonPage')
  return value
}

export function YearProvider({ children }: { readonly children: ReactNode }) {
  const catalog = useNationalCatalog()
  const views = usePersonYears()
  const [year, setYear] = useState(() => defaultYear(catalog))
  const view = views.find((entry) => entry.year === year) ?? views[0]!
  return <YearContext value={{ view, views, setYear }}>{children}</YearContext>
}

/** A year as the menu names it: „2025", „2026, până în septembrie". */
export function yearLabel(view: YearView): string {
  return view.partial ? `${view.year}, ${view.text.replace(/ \d{4}$/u, '')}` : String(view.year)
}

export function YearSelect({ className }: { readonly className?: string }) {
  const { view, views, setYear } = usePersonYear()
  return (
    <span className={cn('relative inline-flex', className)}>
      <select
        aria-label="Anul"
        value={view.year}
        onChange={(event) => setYear(Number(event.target.value))}
        className="h-10 w-full cursor-pointer appearance-none rounded-md border bg-background py-1 pl-3 pr-9 text-base font-medium tabular-nums shadow-xs outline-none transition-colors hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
      >
        {views.map((entry) => (
          <option key={entry.year} value={entry.year}>
            {yearLabel(entry)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    </span>
  )
}

/**
 * The year as the hero sets it (owner, 25 November 2026: compact, in the same
 * place, no side arrows, a polished menu): „Anul [2025 ▾]" as one button the
 * width of its year; the menu leads with the year in progress, then every
 * full year in a grid of four, newest first, the chosen one marked.
 */
export function YearPicker({ className, label = true }: { readonly className?: string; readonly label?: boolean }) {
  const { view, views, setYear } = usePersonYear()
  const running = views.filter((entry) => entry.partial)
  const full = views.filter((entry) => !entry.partial)
  const item = 'relative flex cursor-pointer select-none items-center justify-center rounded-md text-sm tabular-nums outline-none transition-colors data-[highlighted]:bg-muted data-[state=checked]:bg-primary data-[state=checked]:font-semibold data-[state=checked]:text-primary-foreground'
  return (
    <DropdownMenu.Root modal={false}>
      <div className={cn('inline-flex items-center gap-2.5', className)}>
        {label ? <span className="text-sm text-muted-foreground">Anul</span> : null}
        <DropdownMenu.Trigger
          aria-label={`Anul: ${yearLabel(view)}`}
          className="group inline-flex h-10 items-center gap-2 rounded-lg border border-border/80 bg-background pl-3.5 pr-2.5 text-base font-semibold tabular-nums shadow-xs outline-none transition-colors hover:border-foreground/25 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/30 data-[state=open]:border-foreground/30 data-[state=open]:bg-muted/40"
        >
          {view.year}
          {view.partial ? <span className="text-sm font-normal text-muted-foreground">până în {monthName(view.month)}</span> : null}
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
        </DropdownMenu.Trigger>
      </div>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={label ? 'start' : 'end'}
          sideOffset={6}
          className="z-50 w-72 rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[side=bottom]:slide-in-from-top-1"
        >
          <DropdownMenu.RadioGroup value={String(view.year)} onValueChange={(value) => setYear(Number(value))}>
            {running.map((entry) => (
              <DropdownMenu.RadioItem key={entry.year} value={String(entry.year)} className={cn(item, 'h-10 justify-between px-3')}>
                <span>{entry.year}</span>
                <span className="text-xs font-normal opacity-80">în curs, până în {monthName(entry.month)}</span>
              </DropdownMenu.RadioItem>
            ))}
            {running.length ? <DropdownMenu.Separator className="my-2 h-px bg-border" /> : null}
            <DropdownMenu.Label className="px-1 pb-1.5 text-xs text-muted-foreground">Ani încheiați</DropdownMenu.Label>
            <div className="grid grid-cols-4 gap-1">
              {full.map((entry) => (
                <DropdownMenu.RadioItem key={entry.year} value={String(entry.year)} className={cn(item, 'h-9')}>
                  {entry.year}
                </DropdownMenu.RadioItem>
              ))}
            </div>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export type SectionEntry = { readonly id: string; readonly nav: string }

/** The bar under the head: the page's name, its sections, the year. Sticks while the page scrolls. */
function PageBar({ sections, head }: { readonly sections: readonly SectionEntry[]; readonly head: RefObject<HTMLElement | null> }) {
  const headVisible = useInView(head)
  return (
    <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <RuledFrame className="flex h-14 items-center gap-6">
        <span className="shrink-0 text-sm font-semibold">Bugetul național</span>
        <nav aria-label="Secțiuni" className="hidden min-w-0 flex-1 gap-5 overflow-x-auto md:flex">
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground">
              {section.nav}
            </a>
          ))}
        </nav>
        <BandRead fallback={<span className="ml-auto h-10 w-28 animate-pulse rounded-md bg-muted" />} quiet={null}>
          {/* One year menu on screen at a time: the head's, then this one once the head has scrolled away. */}
          <YearSelect className={cn('ml-auto w-auto shrink-0 transition-opacity', headVisible && 'pointer-events-none invisible opacity-0')} />
        </BandRead>
      </RuledFrame>
    </div>
  )
}

/** The page: its head, the bar, its sections. Everything under the head waits for the catalog. */
export function PersonPage({ head, sections, children }: { readonly head: ReactNode; readonly sections: readonly SectionEntry[]; readonly children: ReactNode }) {
  const headRef = useRef<HTMLElement>(null)
  return (
    <div className="relative w-full overflow-x-clip bg-background">
      <Suspense fallback={<PagePending />}>
        <YearProvider>
          <header ref={headRef} className="border-b">
            {head}
          </header>
          <PageBar sections={sections} head={headRef} />
          {children}
        </YearProvider>
      </Suspense>
    </div>
  )
}

/** Whether an element is on screen; true until the browser says otherwise. */
export function useInView(ref: RefObject<HTMLElement | null>): boolean {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? true), { rootMargin: '-56px 0px 0px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])
  return visible
}

function PagePending() {
  return (
    <RuledFrame className="py-16">
      <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-6 h-14 w-full max-w-2xl animate-pulse rounded bg-muted" />
      <div className="mt-4 h-14 w-full max-w-xl animate-pulse rounded bg-muted" />
    </RuledFrame>
  )
}

/** One section: an anchor, a title and a sentence, then what reads its data. */
export function Section({
  id,
  title,
  lede,
  children,
  tone = 'plain',
}: {
  readonly id: string
  readonly title: string
  readonly lede?: ReactNode
  readonly children: ReactNode
  readonly tone?: 'plain' | 'muted'
}) {
  const { view } = usePersonYear()
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn('scroll-mt-16 border-b', tone === 'muted' && 'bg-muted/30')}>
      <RuledFrame className="py-14 sm:py-16">
        <h2 id={`${id}-title`} className="max-w-[28ch] text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {title}
        </h2>
        {lede ? <div className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">{lede}</div> : null}
        <div className="mt-8">
          <BandRead key={view.label} fallback={<SectionPending />}>
            {children}
          </BandRead>
        </div>
      </RuledFrame>
    </section>
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

const SOURCE_LINK = 'font-medium text-foreground underline-offset-4 hover:underline'

/** The head's few words of sources: the bulletins, ANAF, the population. */
export function SourcesLine({ className }: { readonly className?: string }) {
  const { view } = usePersonYear()
  const catalog = useNationalCatalog()
  const newest = catalog.execution.coverage.lastMonth
  const people = populationText(view.year)
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      Surse:{' '}
      <a href="https://mfinante.gov.ro/domenii/bugetul-de-stat/informatii-executie-bugetara" target="_blank" rel="noreferrer" className={SOURCE_LINK}>
        Ministerul Finanțelor
      </a>
      ,{' '}
      <a href="https://mfinante.gov.ro/transparenta-bugetara" target="_blank" rel="noreferrer" className={SOURCE_LINK}>
        ANAF
      </a>
      ,{' '}
      <a href="http://statistici.insse.ro:8077/tempo-online/#/pages/tables/insse-table" target="_blank" rel="noreferrer" className={SOURCE_LINK}>
        INS
      </a>
      {people ? ` (${people} locuitori la 1 ianuarie ${view.year})` : null}. Date până în {monthName(newest)} {newest.slice(0, 4)}.
    </p>
  )
}

const MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie']

export function monthName(month: string): string {
  return MONTHS[Number(month.slice(5, 7)) - 1] ?? month
}

/** A small source note under a section's figure. */
export function Note({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return <p className={cn('mt-6 max-w-[80ch] text-xs leading-relaxed text-muted-foreground', className)}>{children}</p>
}
