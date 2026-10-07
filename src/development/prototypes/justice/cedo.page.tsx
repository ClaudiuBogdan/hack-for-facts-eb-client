import { useId, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { askedYear, ECHR_FIRST_WHOLE_YEAR, medianWaitByYear, referenceYear, yearSpan, yearState } from '@/features/justice/lib/echr-model'
import { ECHR_SNAPSHOT } from '@/features/justice/lib/echr-snapshot'
import type { EchrSnapshot } from '@/features/justice/lib/echr-snapshot-types'
import { countText, monthText } from '@/features/justice/lib/judicial-format'
import { cn } from '@/lib/utils'
import { EchrFigures, EchrHead, EchrJudgments, EchrSource, yearText, type ChooseYear } from './cedo.parts'
import { PROTOTYPE_MARKER } from './hub.parts'

/**
 * The ECHR page's two variants (design.md §17): `ani` answers with the
 * year's judgments and the years as a band below; `flux` puts the years
 * first, as a table of what reached the Court's three steps (communicated,
 * decided, judged), and the chosen year's judgments under it. The year is
 * the address's `an`; the harness's own keys stay.
 */

function useYear(): { readonly year: number; readonly onYear: ChooseYear } {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const year = askedYear(ECHR_SNAPSHOT, search.an)
  const onYear: ChooseYear = (next) =>
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => ({ ...previous, an: next === referenceYear(ECHR_SNAPSHOT) ? undefined : next }),
      resetScroll: false,
    })
  return { year, onYear }
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
              const lines = [
                `${yearText(snapshot, entry.year)}: ${countText(entry.judgments)} ${t`hotărâri`}`,
                t`${countText(entry.applications)} cereri soluționate`,
                wait !== null ? t`${wait} ani de la cerere (mediană)` : null,
              ].filter((line): line is string => line !== null)
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

function flowLabel(column: FlowColumn): string {
  switch (column) {
    case 'communicated':
      return t`Comunicate Guvernului`
    case 'decisions':
      return t`Decizii`
    case 'judgments':
      return t`Hotărâri`
    case 'applications':
      return t`Cereri soluționate prin hotărâri`
  }
}

/** The years as rows, newest first, with what reached each of the Court's steps; a row takes its year. */
function FlowTable({ snapshot, year, onYear }: { readonly snapshot: EchrSnapshot; readonly year: number; readonly onYear: ChooseYear }) {
  const titleId = useId()
  const waits = medianWaitByYear(snapshot)
  const max = Object.fromEntries(FLOW_COLUMNS.map((column) => [column, Math.max(1, ...snapshot.years.map((entry) => entry[column]))])) as Record<FlowColumn, number>
  return (
    <section className="border-b" aria-labelledby={titleId}>
      <RuledFrame className="py-12 sm:py-16">
        <HubSectionHead titleId={titleId} index={yearSpan(snapshot)} title={t`De la cerere la hotărâre, pe ani`} />
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-foreground/20 text-left">
                <th scope="col" className="py-2 pr-4 font-normal">
                  <MonoLabel className="text-muted-foreground">{t`Anul`}</MonoLabel>
                </th>
                {FLOW_COLUMNS.map((column) => (
                  <th key={column} scope="col" className="py-2 pr-4 font-normal">
                    <MonoLabel className="text-muted-foreground">{flowLabel(column)}</MonoLabel>
                  </th>
                ))}
                <th scope="col" className="py-2 text-right font-normal">
                  <MonoLabel className="text-muted-foreground">{t`Ani de la cerere`}</MonoLabel>
                </th>
              </tr>
            </thead>
            <tbody>
              {[...snapshot.years].reverse().map((entry) => {
                const chosen = entry.year === year
                const wait = waits.get(entry.year) ?? null
                return (
                  <tr key={entry.year} className={cn('border-b border-border/70', chosen && 'bg-primary/5')}>
                    <th scope="row" className="py-2 pr-4 text-left font-normal">
                      <button type="button" aria-pressed={chosen} onClick={() => onYear(entry.year)} className={cn('tabular-nums underline-offset-4 hover:underline', chosen && 'font-semibold')}>
                        {entry.year}
                        {yearState(snapshot, entry.year) !== 'whole' ? <span className="ml-1 text-xs font-normal text-muted-foreground">{yearText(snapshot, entry.year).slice(5)}</span> : null}
                      </button>
                    </th>
                    {FLOW_COLUMNS.map((column) => (
                      <td key={column} className="py-2 pr-4">
                        <span className="flex items-center gap-2">
                          <span className="w-10 shrink-0 text-right tabular-nums">{countText(entry[column])}</span>
                          <span className="h-2 bg-primary/35" style={{ width: `${(entry[column] / max[column]) * 6}rem` }} aria-hidden="true" />
                        </span>
                      </td>
                    ))}
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{wait === null ? '—' : wait}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </RuledFrame>
    </section>
  )
}

export function EchrByYear() {
  const { year, onYear } = useYear()
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
  const { year, onYear } = useYear()
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="relative w-full overflow-x-clip bg-background">
      <EchrHead snapshot={ECHR_SNAPSHOT} year={year} onYear={onYear} />
      <EchrFigures snapshot={ECHR_SNAPSHOT} year={year} />
      <FlowTable snapshot={ECHR_SNAPSHOT} year={year} onYear={onYear} />
      <EchrJudgments snapshot={ECHR_SNAPSHOT} year={year} />
      <EchrSource snapshot={ECHR_SNAPSHOT} year={year} />
    </div>
  )
}
