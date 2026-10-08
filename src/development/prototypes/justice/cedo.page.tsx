import { useId, useRef, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ChevronRight } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { askedYear, ECHR_FIRST_WHOLE_YEAR, medianWaitByYear, referenceYear, yearSpan, yearState } from '@/features/justice/lib/echr-model'
import { ECHR_SNAPSHOT } from '@/features/justice/lib/echr-snapshot'
import type { EchrSnapshot } from '@/features/justice/lib/echr-snapshot-types'
import { countText, monthText } from '@/features/justice/lib/judicial-format'
import { cn } from '@/lib/utils'
import { EchrFigures, EchrHead, EchrJudgments, EchrJudgmentsTable, EchrSource, yearText, type ChooseYear } from './cedo.parts'
import { PROTOTYPE_MARKER } from './hub.parts'

/**
 * The ECHR page's two variants (design.md §17): `ani` answers with the
 * year's judgments and the years as a band below; `flux` answers under two
 * tabs, as the analysis page does — the years as a table of what reached
 * the Court's steps (communicated, decided, judged), and the chosen year's
 * judgments; a year's row opens its judgments. The year is the address's
 * `an`, the tab its `vedere`; the harness's own keys stay.
 */

const VIEWS = ['ani', 'hotarari'] as const
type View = (typeof VIEWS)[number]

function useQuestion(): { readonly year: number; readonly view: View; readonly move: (next: { readonly year?: number; readonly view?: View }) => void } {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const year = askedYear(ECHR_SNAPSHOT, search.an)
  const view = VIEWS.find((key) => key === search.vedere) ?? 'ani'
  const move = (next: { readonly year?: number; readonly view?: View }) => {
    const nextYear = next.year ?? year
    const nextView = next.view ?? view
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => ({
        ...previous,
        an: nextYear === referenceYear(ECHR_SNAPSHOT) ? undefined : nextYear,
        vedere: nextView === 'ani' ? undefined : nextView,
      }),
      resetScroll: false,
    })
  }
  return { year, view, move }
}

/** The judgments of every year as columns, the chosen one solid, the part-year dashed; a click takes a year. */
function YearsBand({ snapshot, year, onYear }: { readonly snapshot: EchrSnapshot; readonly year: number; readonly onYear: ChooseYear }) {
  const titleId = useId()
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...snapshot.years.map((entry) => entry.judgments))
  const columns = { gridTemplateColumns: `repeat(${snapshot.years.length}, minmax(0, 1fr))` }
  const waits = medianWaitByYear(snapshot)
  return (
    <section className="border-b" aria-labelledby={titleId}>
      <RuledFrame className="py-12 sm:py-16">
        <HubSectionHead titleId={titleId} index={yearSpan(snapshot)} title={t`Hotărâri, pe ani`} />
        <figure className="mt-8" aria-labelledby={titleId}>
          <ol className="grid h-48 items-end border-b border-foreground/20 sm:h-60" style={columns} onPointerLeave={() => setActive(null)}>
            {snapshot.years.map((entry, index) => {
              const chosen = entry.year === year
              const partial = yearState(snapshot, entry.year) !== 'whole'
              const wait = waits.get(entry.year) ?? null
              const lines = [`${yearText(snapshot, entry.year)}: ${countText(entry.judgments)} ${t`hotărâri`}`, t`${countText(entry.applications)} cereri soluționate`, wait !== null ? t`${wait} ani de la cerere (mediană)` : null].filter(
                (line): line is string => line !== null,
              )
              return (
                <li key={entry.year} className={cn('relative h-full min-w-0', active === entry.year && 'bg-muted/60')}>
                  <button
                    type="button"
                    aria-pressed={chosen}
                    aria-label={lines.join(', ')}
                    onPointerEnter={() => setActive(entry.year)}
                    onFocus={() => setActive(entry.year)}
                    onBlur={() => setActive(null)}
                    onClick={() => onYear(entry.year)}
                    className="flex h-full w-full flex-col items-center justify-end px-0.5 outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-2"
                  >
                    <span className={cn('mb-1.5 block text-[0.625rem] leading-none tabular-nums sm:text-xs', chosen ? 'font-semibold text-foreground' : 'text-muted-foreground')} aria-hidden="true">
                      {entry.judgments}
                    </span>
                    <span
                      className={cn('block w-full max-w-24', partial ? cn('border border-dashed border-primary', chosen ? 'bg-primary/55' : 'bg-primary/10') : chosen ? 'bg-primary' : 'bg-primary/25')}
                      style={{ height: `calc((100% - 1.25rem) * ${entry.judgments / max})`, minHeight: 2 }}
                    />
                  </button>
                  {active === entry.year ? (
                    <div
                      aria-hidden="true"
                      className={cn(
                        'pointer-events-none absolute top-0 z-20 w-max max-w-52 space-y-1 border bg-popover px-3 py-2 text-xs leading-snug text-popover-foreground shadow-md',
                        index < snapshot.years.length / 2 ? 'left-full ml-1.5' : 'right-full mr-1.5',
                      )}
                    >
                      {lines.map((line, position) => (
                        <p key={line} className={cn('tabular-nums', position === 0 ? 'font-semibold' : 'text-muted-foreground')}>
                          {line}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ol>
          <ol className="mt-2 grid" style={columns} aria-hidden="true">
            {snapshot.years.map((entry) => (
              <li key={entry.year} className="min-w-0 text-center">
                <MonoLabel className={cn('tabular-nums', entry.year === year ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                  <span className="sm:hidden">{`'${String(entry.year).slice(2)}`}</span>
                  <span className="hidden sm:inline">{entry.year}</span>
                </MonoLabel>
              </li>
            ))}
          </ol>
          <figcaption className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 border border-dashed border-primary bg-primary/10" aria-hidden="true" />
              {t`${ECHR_FIRST_WHOLE_YEAR - 1}: preluare parțială; ${referenceYear(snapshot) + 1}: până în ${monthText(snapshot.newest.slice(0, 7), 'long')}`}
            </span>
          </figcaption>
        </figure>
      </RuledFrame>
    </section>
  )
}

const FLOW_COLUMNS = ['communicated', 'decisions', 'judgments', 'applications'] as const
type FlowColumn = (typeof FLOW_COLUMNS)[number]

/** A column's head: in full from `sm`, a word on a phone (the full one stays the accessible name). */
function flowLabel(column: FlowColumn): { readonly full: string; readonly short: string } {
  switch (column) {
    case 'communicated':
      return { full: t`Comunicate Guvernului`, short: t`Comunic.` }
    case 'decisions':
      return { full: t`Decizii`, short: t`Decizii` }
    case 'judgments':
      return { full: t`Hotărâri`, short: t`Hotărâri` }
    case 'applications':
      return { full: t`Cereri soluționate prin hotărâri`, short: t`Cereri` }
  }
}

function ColumnHead({ full, short }: { readonly full: string; readonly short: string }) {
  return (
    <MonoLabel className="text-muted-foreground">
      <span className="hidden sm:inline">{full}</span>
      <span className="sm:hidden" aria-hidden="true">
        {short}
      </span>
      <span className="sr-only sm:hidden">{full}</span>
    </MonoLabel>
  )
}

/** The years as rows, newest first, with what reached each of the Court's steps; a row opens its year's judgments. */
function FlowTable({ snapshot, year, onYear }: { readonly snapshot: EchrSnapshot; readonly year: number; readonly onYear: ChooseYear }) {
  const waits = medianWaitByYear(snapshot)
  const max = Object.fromEntries(FLOW_COLUMNS.map((column) => [column, Math.max(1, ...snapshot.years.map((entry) => entry[column]))])) as Record<FlowColumn, number>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm sm:min-w-[40rem]">
        <thead>
          <tr className="border-b border-foreground/20 text-left">
            <th scope="col" className="py-2 pr-3 font-normal sm:pr-4">
              <MonoLabel className="text-muted-foreground">{t`Anul`}</MonoLabel>
            </th>
            {FLOW_COLUMNS.map((column) => (
              <th key={column} scope="col" className="py-2 pr-2 font-normal sm:pr-4">
                <ColumnHead {...flowLabel(column)} />
              </th>
            ))}
            <th scope="col" className="py-2 pr-2 text-right font-normal">
              <ColumnHead full={t`Ani de la cerere`} short={t`Ani`} />
            </th>
            <th scope="col" className="w-6 py-2">
              <span className="sr-only">{t`Hotărârile anului`}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {[...snapshot.years].reverse().map((entry) => {
            const chosen = entry.year === year
            const wait = waits.get(entry.year) ?? null
            return (
              <tr key={entry.year} className={cn('group relative border-b border-border/70 transition-colors hover:bg-muted/40', chosen && 'bg-primary/5')}>
                <th scope="row" className="py-2 pr-3 text-left font-normal sm:pr-4">
                  {/* The whole row answers the year's button: it stretches over the row. */}
                  <button
                    type="button"
                    onClick={() => onYear(entry.year)}
                    aria-label={t`${yearText(snapshot, entry.year)}: hotărârile anului`}
                    className={cn(
                      'tabular-nums underline-offset-4 after:absolute after:inset-0 after:content-[""] group-hover:underline focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring',
                      // A year the capture holds in part is dashed under its number, as its bar is elsewhere; the legend says why.
                      yearState(snapshot, entry.year) !== 'whole' && 'underline decoration-primary/60 decoration-dashed',
                      chosen && 'font-semibold',
                    )}
                  >
                    {entry.year}
                  </button>
                </th>
                {FLOW_COLUMNS.map((column) => (
                  <td key={column} className="py-2 pr-2 sm:pr-4">
                    <span className="flex items-center gap-2">
                      <span className="shrink-0 tabular-nums sm:w-10 sm:text-right">{countText(entry[column])}</span>
                      <span className="hidden h-2 bg-primary/35 sm:block" style={{ width: `${(entry[column] / max[column]) * 6}rem` }} aria-hidden="true" />
                    </span>
                  </td>
                ))}
                <td className="py-2 pr-2 text-right tabular-nums text-muted-foreground">{wait === null ? '—' : wait}</td>
                <td className="py-2 text-right text-muted-foreground group-hover:text-foreground" aria-hidden="true">
                  <ChevronRight className="ml-auto size-4" />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="w-4 border-b border-dashed border-primary/60" aria-hidden="true" />
        {t`${ECHR_FIRST_WHOLE_YEAR - 1}: preluare parțială; ${referenceYear(snapshot) + 1}: până în ${monthText(snapshot.newest.slice(0, 7), 'long')}`}
      </p>
    </div>
  )
}

const TAB = cn(
  '-mb-px min-h-11 rounded-none border-b-2 border-transparent px-0.5 pb-2 pt-0 text-sm font-normal text-muted-foreground shadow-none hover:text-foreground sm:min-h-0',
  'data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none',
)

/**
 * The answer under two tabs, as the analysis page's groupings: the years
 * (a row opens its judgments) and the chosen year's judgments. The tabs are
 * the address's: the arrows move between them, Enter or Space takes one.
 */
function FlowAnswer({ snapshot, year, view, move }: { readonly snapshot: EchrSnapshot; readonly year: number; readonly view: View; readonly move: ReturnType<typeof useQuestion>['move'] }) {
  const tabs = useRef<HTMLDivElement>(null)
  const judgmentsTab = useRef<HTMLButtonElement>(null)
  // A row swaps the panel under the pointer: bring the tabs back into view and give the focus to the tab now chosen.
  const openYear = (next: number) => {
    move({ year: next, view: 'hotarari' })
    judgmentsTab.current?.focus({ preventScroll: true })
    if ((tabs.current?.getBoundingClientRect().top ?? 0) < 0) tabs.current?.scrollIntoView({ block: 'start' })
  }
  return (
    <section className="border-b" aria-label={t`Răspunsul`}>
      <RuledFrame className="py-12 sm:py-16">
        <Tabs value={view} onValueChange={(next) => move({ view: next as View })} activationMode="manual">
          <TabsList ref={tabs} aria-label={t`Ce arată`} className="h-auto scroll-mt-20 flex-wrap justify-start gap-x-4 gap-y-1 rounded-none border-b bg-transparent p-0">
            <TabsTrigger value="ani" className={TAB}>
              {t`Pe ani, ${yearSpan(snapshot)}`}
            </TabsTrigger>
            <TabsTrigger ref={judgmentsTab} value="hotarari" className={TAB}>
              {t`Hotărârile din ${year}`}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ani" className="mt-6">
            <FlowTable snapshot={snapshot} year={year} onYear={openYear} />
          </TabsContent>
          <TabsContent value="hotarari" className="mt-6">
            <EchrJudgmentsTable snapshot={snapshot} year={year} />
          </TabsContent>
        </Tabs>
      </RuledFrame>
    </section>
  )
}

export function EchrByYear() {
  const { year, move } = useQuestion()
  const onYear: ChooseYear = (next) => move({ year: next })
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="relative w-full overflow-x-clip bg-background">
      <EchrHead snapshot={ECHR_SNAPSHOT} year={year} onYear={onYear} />
      <EchrFigures snapshot={ECHR_SNAPSHOT} year={year} />
      <EchrJudgments snapshot={ECHR_SNAPSHOT} year={year} />
      <YearsBand snapshot={ECHR_SNAPSHOT} year={year} onYear={onYear} />
      <EchrSource snapshot={ECHR_SNAPSHOT} year={year} />
    </div>
  )
}

export function EchrFlow() {
  const { year, view, move } = useQuestion()
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="relative w-full overflow-x-clip bg-background">
      <EchrHead snapshot={ECHR_SNAPSHOT} year={year} onYear={(next) => move({ year: next })} />
      <EchrFigures snapshot={ECHR_SNAPSHOT} year={year} />
      <FlowAnswer snapshot={ECHR_SNAPSHOT} year={year} view={view} move={move} />
      <EchrSource snapshot={ECHR_SNAPSHOT} year={year} />
    </div>
  )
}
