import { useLayoutEffect, useRef, useState } from 'react'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { useExecutionGrid, useNationalCatalog } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { cellsOf } from '@/features/national-budget/analytics/lib/analytics-data'
import { lastCompleteYear } from '@/features/national-budget/analytics/lib/analytics-view'
import { gdpSizeText, moneyText } from '@/features/national-budget/home/lib/home-format'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { cn } from '@/lib/utils'
import { leiText, leiWord, perPerson, populationOf, useBorrowedYears, useHundred, type BorrowedYear } from './persoana.data'
import { Mark, Note, Section, Stat, monthName, usePersonYear } from './persoana.shell'

/**
 * The working version's third section: borrowing over time (owner: the
 * evolution matters most; measure it against GDP, with a switch to the
 * amounts). One bar a year, the deficit as a share of GDP or in lei; a bar
 * picks its year for the whole page. Under the chart, the chosen year's
 * deficit and the debt interest, with lei of 100 and per resident as notes.
 */

export type Measure = 'pib' | 'lei'

export const MEASURES: readonly { readonly key: Measure; readonly label: string }[] = [
  { key: 'pib', label: '% din PIB' },
  { key: 'lei', label: 'mld. lei' },
]

/** A year's deficit in the chart's measure: percent of GDP, or billions of lei; null where the bulletin has no answer. */
function valueOf(row: BorrowedYear, measure: Measure): number | null {
  if (measure === 'pib') return row.gdpShare === null ? null : Number(row.gdpShare) * 100
  if (row.lei === null) return null
  return row.deficit ? Number(row.deficit) / 1e9 : 0
}

/** Years as spans: „2006–2018, 2023"; empty for none. */
function spansText(years: readonly number[]): string {
  const spans: [number, number][] = []
  for (const year of years) {
    const last = spans[spans.length - 1]
    if (last && year === last[1] + 1) last[1] = year
    else spans.push([year, year])
  }
  return spans.map(([from, to]) => (from === to ? String(from) : `${from}–${to}`)).join(', ')
}

/** One bar a year; the chosen year filled, the others faint until the pointer is on them. */
function Chart({
  years,
  chosen,
  onPick,
  measure,
  onMeasure,
}: {
  readonly years: readonly BorrowedYear[]
  readonly chosen: number
  readonly onPick: (year: number) => void
  readonly measure: Measure
  readonly onMeasure: (measure: Measure) => void
}) {
  const { views } = usePersonYear()
  // The year in progress, as the year menu names it.
  const running = years.some((row) => row.partial) ? (views.find((entry) => entry.partial) ?? null) : null
  // Room above the tallest bar for its figure.
  const ceiling = Math.max(...years.map((row) => valueOf(row, measure) ?? 0), 1) * 1.14
  const unit = measure === 'pib' ? '% din PIB' : 'mld. lei'
  return (
    <figure>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <span className="text-sm font-semibold">Deficitul bugetar, an de an</span>
        <IndicatorToggle label="Deficitul, măsurat în" options={MEASURES} value={measure} onChange={onMeasure} />
      </figcaption>
      <div className="relative mt-5 flex h-64 items-end gap-[3px] border-b">
        {/* The EU's reference value for a deficit (owner's pick, 25 November 2026): a dashed line, in the share view only. */}
        {measure === 'pib' && ceiling > 3 ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-foreground/55"
            style={{ bottom: `${(3 / ceiling) * 100}%` }}
          >
            <span className="absolute bottom-0.5 left-0 rounded-[2px] bg-background/85 px-1 text-[0.6875rem] text-muted-foreground">pragul UE: 3% din PIB</span>
          </span>
        ) : null}
        {years.map((row) => {
          const picked = row.year === chosen
          const value = valueOf(row, measure)
          const text = value === null ? '–' : formatHubNumber(value, { digits: measure === 'pib' ? 1 : 0 })
          return (
            <button
              type="button"
              key={row.year}
              disabled={row.lei === null}
              aria-pressed={picked}
              aria-label={value === null ? `${row.year}: fără date` : `${row.year}: ${text} ${unit}${measure === 'pib' && row.gdpShareFrom === 'computed' ? ', calculat' : ''}`}
              onClick={() => onPick(row.year)}
              className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end rounded-t-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <span
                className={cn(
                  'mb-1 whitespace-nowrap text-[0.6875rem] leading-none tabular-nums',
                  picked ? 'font-semibold text-foreground' : 'hidden text-muted-foreground sm:block',
                )}
              >
                {text}
              </span>
              <span
                className={cn(
                  'block w-full rounded-t-sm transition-[height,background-color] duration-300 motion-reduce:transition-none',
                  picked ? 'bg-primary' : 'bg-primary/25 group-hover:bg-primary/50',
                )}
                style={{ height: `${value === null ? 0 : Math.max((value / ceiling) * 100, 0.8)}%` }}
              />
            </button>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-[3px] text-[0.6875rem] tabular-nums" aria-hidden="true">
        {years.map((row) => {
          const picked = row.year === chosen
          return (
            <span
              key={row.year}
              className={cn(
                'min-w-0 flex-1 whitespace-nowrap text-center',
                picked ? 'font-semibold text-foreground' : cn('text-muted-foreground', row.year % 5 !== 0 && 'invisible sm:visible'),
              )}
            >
              {String(row.year).slice(2)}
              {row.partial ? <span className="ml-px inline-block size-1 rounded-full bg-current align-middle opacity-70" /> : null}
            </span>
          )
        })}
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {running ? (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground/70" />
            {running.year}: anul în curs, până în {monthName(running.month)}
          </span>
        ) : null}
        <span>Apasă un an ca să-l alegi pentru toată pagina.</span>
      </p>
    </figure>
  )
}

/** Interest on the debt per resident, every full year since 2006: what past borrowing costs each year. */
function InterestTrend({ chosen }: { readonly chosen: number }) {
  const catalog = useNationalCatalog()
  const complete = lastCompleteYear(catalog.execution.coverage)
  const grid = useExecutionGrid({ itemIds: ['mfin.bgc.expenditure.interest'], basis: 'FULL_YEAR', period: { type: 'YEAR', interval: { start: '2006', end: String(complete) } } })
  const cells = cellsOf(grid.results[0])
  const points = Array.from({ length: complete - 2005 }, (_, index) => {
    const year = 2006 + index
    const exact = cells.get(String(year))?.exact
    const people = populationOf(year)
    return { year, lei: exact && people ? Number(exact) / people : null }
  })
  const top = Math.max(...points.map((point) => point.lei ?? 0), 1)
  const first = points.find((point) => point.lei !== null)
  const last = [...points].reverse().find((point) => point.lei !== null)
  return (
    <div className="mt-5">
      <p className="text-xs text-muted-foreground">
        Dobânzi pe locuitor: <Mark>{leiText(first?.lei ?? null)}</Mark> în {first?.year}, <Mark>{leiText(last?.lei ?? null)}</Mark> în {last?.year}
      </p>
      <div
        className="mt-2 flex h-12 items-end gap-[2px]"
        role="img"
        aria-label={points.map((point) => `${point.year}: ${point.lei === null ? 'fără date' : leiText(point.lei)}`).join('; ')}
      >
        {points.map((point) => (
          <span
            key={point.year}
            title={`${point.year}: ${point.lei === null ? 'fără date' : `${leiText(point.lei)} pe locuitor`}`}
            className={cn('min-w-0 flex-1 rounded-t-[2px]', point.year === chosen ? 'bg-primary' : 'bg-primary/30')}
            style={{ height: `${point.lei === null ? 0 : Math.max(4, (point.lei / top) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function Debt() {
  const { view, picked, setYear } = usePersonYear()
  const [measure, setMeasure] = useState<Measure>('pib')
  const years = useBorrowedYears()
  const spending = useHundred(view, 'spending')
  const year = years.find((row) => row.year === view.year) ?? null
  const interest = spending.lines.find((line) => line.key === 'mfin.bgc.expenditure.interest') ?? null
  const previous = view.partial ? `aceleași luni din ${view.year - 1}` : String(view.year - 1)
  const period = view.partial ? view.text : String(view.year)
  const share = gdpSizeText(year?.gdpShare ?? null, 2)
  // A year picked here can change the height of the sections above (no ANAF lists before 2016). The chart is held
  // where it was pressed: its place in the window is noted on the press and restored when the year's figures land.
  const chartRef = useRef<HTMLDivElement>(null)
  const heldAt = useRef<number | null>(null)
  const pick = (next: number) => {
    heldAt.current = chartRef.current?.getBoundingClientRect().top ?? null
    setYear(next)
  }
  useLayoutEffect(() => {
    if (heldAt.current === null || !chartRef.current) return
    window.scrollBy(0, chartRef.current.getBoundingClientRect().top - heldAt.current)
    heldAt.current = null
  }, [view.year])
  const ofHundred = (lei: number, words: string) => (
    <>
      <Mark>
        {lei} {leiWord(lei)}
      </Mark>{' '}
      {words}
    </>
  )
  const amount = year?.deficit ? moneyText(year.deficit) : null
  const computed = spansText(years.filter((row) => row.gdpShareFrom === 'computed').map((row) => row.year))
  // The deficit's headline follows the chart's measure; the other measure is its first note.
  const byShare = measure === 'pib' && share !== null
  return (
    <div>
      <div ref={chartRef}>
        {/* The chart marks the year as picked, at once; the figures under it follow when they are read. */}
        <Chart years={years} chosen={picked.year} onPick={pick} measure={measure} onMeasure={setMeasure} />
      </div>
      <div className="mt-10 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-2">
        {year?.deficit && amount ? (
          <Stat
            value={byShare ? share.replace('%', '') : amount.replace(/\s*mld\. lei$/u, '')}
            unit={byShare ? '% din PIB' : amount.endsWith('mld. lei') ? 'mld. lei' : ''}
            label={`deficit bugetar (cash) în ${period}`}
            notes={[
              byShare ? (
                <Mark>{amount}</Mark>
              ) : share ? (
                <>
                  <Mark>{share}</Mark> din PIB
                </>
              ) : null,
              year.lei !== null ? ofHundred(year.lei, 'din fiecare 100 cheltuiți, împrumutați') : null,
              <>
                <Mark>{leiText(perPerson(year.deficit, view))}</Mark> pe locuitor
              </>,
            ]}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{year?.lei === 0 ? `${period} s-a încheiat fără deficit.` : `Buletinul nu are deficitul pentru ${period}.`}</p>
        )}
        {interest ? (
          <div>
            <Stat
              value={moneyText(interest.exact).replace(/\s*mld\. lei$/u, '')}
              unit={moneyText(interest.exact).endsWith('mld. lei') ? 'mld. lei' : ''}
              label={`dobânzi la datorie în ${period}`}
              notes={[
                ofHundred(interest.lei, 'din fiecare 100 cheltuiți'),
                interest.change ? (
                  <>
                    <Mark>{interest.change}</Mark> față de {previous}
                  </>
                ) : null,
                <>
                  <Mark>{leiText(perPerson(interest.exact, view))}</Mark> pe locuitor
                </>,
              ]}
            />
            <InterestTrend chosen={view.year} />
          </div>
        ) : null}
      </div>
      <Note>
        Deficitul bugetului general consolidat (cash).{' '}
        {measure === 'pib'
          ? 'Linia punctată e valoarea de referință din tratatele UE, 3% din PIB; UE o aplică deficitului calculat după metoda ei (ESA), puțin diferit de cel cash. '
          : ''}
        {measure === 'lei'
          ? 'Sumele sunt în lei curenți, neajustați cu inflația.'
          : computed
            ? `Ponderea în PIB e cea tipărită în buletinul anului; pentru ${computed}, unde buletinul nu o tipărește, e deficitul împărțit la PIB-ul anual publicat de INS.`
            : 'Ponderea în PIB e cea tipărită în buletinul fiecărui an.'}
      </Note>
    </div>
  )
}

export function DebtSection() {
  return (
    <Section
      id="imprumut"
      title="Cât se împrumută, an de an"
      lede="Ce cheltuie statul peste încasări se acoperă din împrumuturi, care se dau înapoi cu dobândă din bugetele anilor următori."
    >
      <Debt />
    </Section>
  )
}
