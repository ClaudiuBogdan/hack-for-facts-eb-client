import { useId, useRef } from 'react'
import { t } from '@lingui/core/macro'
import { ChevronRight } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { EchrQuestion, EchrView } from '../../lib/echr-address'
import { ECHR_FIRST_WHOLE_YEAR, hudocUrl, judgmentsIn, medianWaitByYear, referenceYear, waitYears, yearSpan, yearState } from '../../lib/echr-model'
import type { EchrJudgment, EchrSnapshot } from '../../lib/echr-snapshot-types'
import { countryName, ECHR_FLOW_COLUMNS, flowLabel, lastMonthText, medianWaitText, moreApplicationsText, yearsCount, yearText } from '../../lib/echr-text'
import { countText, dayText } from '../../lib/judicial-format'

/**
 * The ECHR page's answer (design.md §17–18) under two tabs, as the analysis
 * page's groupings: the years — what reached each of the Court's steps — and
 * the year's judgments. The tabs are the address's (`vedere`): the arrows
 * move between them, Enter or Space takes one; a year's row opens its
 * judgments.
 */

/** A change of question; the route's resolves once the address holds it. */
type Change = (question: EchrQuestion) => void | Promise<void>

const TAB = cn(
  '-mb-px min-h-11 rounded-none border-b-2 border-transparent px-0.5 pb-2 pt-0 text-sm font-normal text-muted-foreground shadow-none hover:text-foreground sm:min-h-0',
  'data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none',
)

export function EchrAnswer({ snapshot, question, onChange }: { readonly snapshot: EchrSnapshot; readonly question: EchrQuestion; readonly onChange: Change }) {
  const { year } = question
  const span = yearSpan(snapshot)
  const tabs = useRef<HTMLDivElement>(null)
  const judgmentsTab = useRef<HTMLButtonElement>(null)
  // A row swaps the panel under the pointer: once the address holds the year, bring the tabs back into view and give the
  // focus to the tab now chosen, so it is announced with its new year.
  const openYear = (next: number) =>
    void Promise.resolve(onChange({ year: next, view: 'hotarari' })).then(() => {
      judgmentsTab.current?.focus({ preventScroll: true })
      if ((tabs.current?.getBoundingClientRect().top ?? 0) < 0) tabs.current?.scrollIntoView({ block: 'start' })
    })
  return (
    <section className="border-b" aria-label={t`Răspunsul`}>
      <RuledFrame className="py-12 sm:py-16">
        <Tabs value={question.view} onValueChange={(view) => onChange({ ...question, view: view as EchrView })} activationMode="manual">
          <TabsList ref={tabs} aria-label={t`Ce arată`} className="h-auto scroll-mt-20 flex-wrap justify-start gap-x-4 gap-y-1 rounded-none border-b bg-transparent p-0">
            <TabsTrigger value="ani" className={TAB}>
              {t`Pe ani, ${span}`}
            </TabsTrigger>
            <TabsTrigger ref={judgmentsTab} value="hotarari" className={TAB}>
              {t`Hotărârile din ${year}`}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ani" className="mt-6">
            <EchrYearsTable snapshot={snapshot} year={year} onYear={openYear} />
          </TabsContent>
          <TabsContent value="hotarari" className="mt-6">
            <EchrJudgmentsTable snapshot={snapshot} year={year} />
          </TabsContent>
        </Tabs>
      </RuledFrame>
    </section>
  )
}

/** A column's head: in full from `sm`, a word on a phone; the full one is always the accessible name. */
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

/**
 * The years as rows, newest first: the cases communicated, the decisions,
 * the judgments, the applications they decide (each with a bar of its
 * column's largest from `sm`) and the median wait. A click anywhere on a
 * row opens its year (the row's handler: WebKit never made a table row the
 * containing block a stretched overlay needs); the year's button is the
 * keyboard's. A year the capture holds in part is dashed under its number,
 * as its bar is elsewhere, and the legend says why.
 */
function EchrYearsTable({ snapshot, year, onYear }: { readonly snapshot: EchrSnapshot; readonly year: number; readonly onYear: (year: number) => void }) {
  const waits = medianWaitByYear(snapshot)
  const partialYear = ECHR_FIRST_WHOLE_YEAR - 1
  const runningYear = referenceYear(snapshot) + 1
  const lastMonth = lastMonthText(snapshot)
  const max = Object.fromEntries(ECHR_FLOW_COLUMNS.map((column) => [column, Math.max(1, ...snapshot.years.map((entry) => entry[column]))])) as Record<(typeof ECHR_FLOW_COLUMNS)[number], number>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm sm:min-w-[40rem]">
        <thead>
          <tr className="border-b border-foreground/20 text-left">
            <th scope="col" className="py-2 pr-3 font-normal sm:pr-4">
              <MonoLabel className="text-muted-foreground">{t`Anul`}</MonoLabel>
            </th>
            {ECHR_FLOW_COLUMNS.map((column) => (
              <th key={column} scope="col" className="py-2 pr-2 font-normal sm:pr-4">
                <ColumnHead {...flowLabel(column)} />
              </th>
            ))}
            <th scope="col" className="py-2 pr-2 text-right font-normal">
              <ColumnHead full={t`Ani de la cerere (mediană)`} short={t`Ani`} />
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
            const name = yearText(snapshot, entry.year)
            return (
              <tr
                key={entry.year}
                className={cn('group cursor-pointer border-b border-border/70 transition-colors hover:bg-muted/40', chosen && 'bg-primary/5')}
                onClick={() => onYear(entry.year)}
              >
                <th scope="row" className="py-2 pr-3 text-left font-normal sm:pr-4">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onYear(entry.year)
                    }}
                    aria-label={t`${name}: hotărârile anului`}
                    aria-current={chosen ? 'true' : undefined}
                    className={cn(
                      'tabular-nums underline-offset-4 group-hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      yearState(snapshot, entry.year) !== 'whole' && 'underline decoration-primary/60 decoration-dashed',
                      chosen && 'font-semibold',
                    )}
                  >
                    {entry.year}
                  </button>
                </th>
                {ECHR_FLOW_COLUMNS.map((column) => (
                  <td key={column} className="py-2 pr-2 sm:pr-4">
                    <span className="flex items-center gap-2">
                      <span className="shrink-0 tabular-nums sm:w-10 sm:text-right">{countText(entry[column])}</span>
                      <span className="hidden h-2 bg-primary/35 sm:block" style={{ width: `${(entry[column] / max[column]) * 6}rem` }} aria-hidden="true" />
                    </span>
                  </td>
                ))}
                <td className="py-2 pr-2 text-right tabular-nums text-muted-foreground">{wait === null ? '—' : medianWaitText(wait)}</td>
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
        {t`${partialYear}: preluare parțială; ${runningYear}: până în ${lastMonth}`}
      </p>
    </div>
  )
}

/** A judgment's applications: the first, then the count of the rest, which a popover lists. */
function Applications({ judgment, firstId }: { readonly judgment: EchrJudgment; readonly firstId: string }) {
  const captionId = useId()
  const [first, ...rest] = judgment.applications
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <span id={firstId} className="font-mono text-sm tabular-nums">
        {first ?? '—'}
      </span>
      {rest.length > 0 ? (
        <Popover>
          <PopoverTrigger className="text-xs text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground">{moreApplicationsText(rest.length)}</PopoverTrigger>
          <PopoverContent align="start" className="max-h-[min(70vh,var(--radix-popover-content-available-height))] w-72 overflow-y-auto text-sm" aria-labelledby={captionId}>
            <MonoLabel id={captionId} className="block text-muted-foreground">
              {t`Cererile reunite în hotărâre`}
            </MonoLabel>
            <ul className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 font-mono text-xs tabular-nums">
              {judgment.applications.map((application) => (
                <li key={application}>{application}</li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      ) : null}
      {judgment.alsoAgainst ? <span className="text-xs text-muted-foreground">{t`și contra: ${judgment.alsoAgainst.map(countryName).join(', ')}`}</span> : null}
      {judgment.followUp ? <span className="text-xs text-muted-foreground">{t`hotărâre ulterioară, într-o cauză judecată`}</span> : null}
    </span>
  )
}

/** The year's judgments, newest first: the date, the applications, the wait and the document on HUDOC. */
export function EchrJudgmentsTable({ snapshot, year, className }: { readonly snapshot: EchrSnapshot; readonly year: number; readonly className?: string }) {
  const judgments = judgmentsIn(snapshot, year)
  return (
    <table className={cn('w-full text-sm', className)}>
      <thead>
        <tr className="border-b border-foreground/20 text-left">
          <th scope="col" className="py-2 pr-4 font-normal">
            <MonoLabel className="text-muted-foreground">{t({ message: 'Data', context: 'a table column: the day a judgment was given' })}</MonoLabel>
          </th>
          <th scope="col" className="py-2 pr-4 font-normal">
            <MonoLabel className="text-muted-foreground">{t`Cererea`}</MonoLabel>
          </th>
          <th scope="col" className="hidden py-2 pr-4 text-right font-normal sm:table-cell">
            <MonoLabel className="text-muted-foreground">{t`De la cerere`}</MonoLabel>
          </th>
          <th scope="col" className="py-2 text-right font-normal">
            <MonoLabel className="text-muted-foreground">{t`Textul pe HUDOC`}</MonoLabel>
          </th>
        </tr>
      </thead>
      <tbody>
        {judgments.map((judgment) => (
          <JudgmentRow key={judgment.ecli} judgment={judgment} />
        ))}
      </tbody>
    </table>
  )
}

/**
 * One judgment. A HUDOC link is named by its visible language and the
 * judgment's date in text (never an `aria-label`: error reporting records a
 * clicked element's), and described by the row's first application through
 * `aria-describedby`, as several judgments share a day — so an application
 * number stays out of telemetry.
 */
function JudgmentRow({ judgment }: { readonly judgment: EchrJudgment }) {
  const firstId = useId()
  const wait = waitYears(judgment)
  const date = dayText(judgment.date)
  return (
    <tr className="border-b border-border/70 align-baseline">
      <td className="whitespace-nowrap py-3 pr-4 tabular-nums">{date}</td>
      <td className="py-3 pr-4">
        <Applications judgment={judgment} firstId={firstId} />
      </td>
      <td className="hidden py-3 pr-4 text-right tabular-nums text-muted-foreground sm:table-cell">{wait === null ? '—' : yearsCount(wait)}</td>
      <td className="whitespace-nowrap py-3 text-right">
        {judgment.versions.map((version) => (
          <a
            key={version.item}
            href={hudocUrl(version)}
            target="_blank"
            rel="noreferrer"
            className="ml-3 font-medium underline-offset-4 hover:underline"
            aria-describedby={firstId}
          >
            {version.language === 'fr' ? 'FR' : 'EN'}
            <span className="sr-only">{t`, hotărârea din ${date} pe HUDOC (se deschide într-o filă nouă)`}</span>
            <span aria-hidden="true"> ↗</span>
          </a>
        ))}
      </td>
    </tr>
  )
}
