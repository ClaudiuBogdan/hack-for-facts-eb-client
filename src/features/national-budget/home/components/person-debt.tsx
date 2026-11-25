import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { plotOf } from '@/features/national-budget/analytics/lib/exact'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { cn } from '@/lib/utils'
import { useBorrowedYears, useHundred, useInterestTrend, type BorrowedYear } from '../hooks/use-person-data'
import { moneyText } from '../lib/home-format'
import { perResident } from '../lib/per-resident'
import { leiText, leiWord, moneyParts, percentText, perResidentWords, spansText, previousText } from '../lib/person-format'
import { Mark, Note, Section, Stat } from './person-shell'
import { usePageYear } from '../hooks/use-page-year'
import { monthName } from '../lib/person-format'

/**
 * Borrowing over time (owner: the evolution matters most; against GDP,
 * with a switch to the amounts): one bar a year, the deficit as a share of
 * GDP or in lei, the EU's 3% as a dashed line; a bar picks its year for the
 * whole page. Under the chart, the chosen year's deficit and the debt
 * interest, with interest per resident since 2006.
 */

export type Measure = 'pib' | 'lei'

function measures(): readonly { readonly key: Measure; readonly label: string }[] {
  return [
    { key: 'pib', label: t`% din PIB` },
    { key: 'lei', label: t`mld. lei` },
  ]
}

/** A year's deficit in the chart's measure: percent of GDP, or billions of lei; null where the bulletin has no answer. */
function valueOf(row: BorrowedYear, measure: Measure): number | null {
  if (measure === 'pib') return row.gdpShare
  if (row.lei === null) return null
  return row.deficit ? (plotOf(row.deficit) ?? 0) / 1e9 : 0
}

/** One bar a year; the chosen year filled, the others faint until the pointer is on them. */
function Chart({ years, chosen, onPick, measure, onMeasure }: { readonly years: readonly BorrowedYear[]; readonly chosen: number; readonly onPick: (year: number) => void; readonly measure: Measure; readonly onMeasure: (measure: Measure) => void }) {
  const { views } = usePageYear()
  const running = years.some((row) => row.partial) ? (views.find((entry) => entry.partial) ?? null) : null
  // Room above the tallest bar for its figure.
  const ceiling = Math.max(...years.map((row) => valueOf(row, measure) ?? 0), 1) * 1.14
  const unit = measure === 'pib' ? t`% din PIB` : t`mld. lei`
  return (
    <figure>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <span className="text-sm font-semibold">{t`Deficitul bugetar, an de an`}</span>
        <IndicatorToggle label={t`Deficitul, măsurat în`} options={measures()} value={measure} onChange={onMeasure} />
      </figcaption>
      <div className="relative mt-5 flex h-64 items-end gap-[3px] border-b">
        {measure === 'pib' && ceiling > 3 ? (
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-foreground/55" style={{ bottom: `${(3 / ceiling) * 100}%` }}>
            <span className="absolute bottom-0.5 left-0 rounded-[2px] bg-background/85 px-1 text-[0.6875rem] text-muted-foreground">{t`pragul UE: 3% din PIB`}</span>
          </span>
        ) : null}
        {years.map((row) => {
          const picked = row.year === chosen
          const value = valueOf(row, measure)
          const text = value === null ? '–' : formatHubNumber(value, { digits: measure === 'pib' ? 1 : 0 })
          const label = value === null ? t`${row.year}: fără date` : measure === 'pib' && row.gdpShareFrom === 'computed' ? t`${row.year}: ${text} ${unit}, calculat` : t`${row.year}: ${text} ${unit}`
          return (
            <button
              type="button"
              key={row.year}
              disabled={row.lei === null}
              aria-pressed={picked}
              aria-label={label}
              onClick={() => onPick(row.year)}
              className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end rounded-t-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <span className={cn('mb-1 whitespace-nowrap text-[0.6875rem] leading-none tabular-nums', picked ? 'font-semibold text-foreground' : 'hidden text-muted-foreground sm:block')}>{text}</span>
              <span
                className={cn('block w-full rounded-t-sm transition-[height,background-color] duration-300 motion-reduce:transition-none', picked ? 'bg-primary' : 'bg-primary/25 group-hover:bg-primary/50')}
                style={{ height: `${value === null ? 0 : Math.max((value / ceiling) * 100, 0.8)}%` }}
              />
            </button>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-[3px] text-[0.6875rem] tabular-nums" aria-hidden="true">
        {years.map((row) => (
          <span key={row.year} className={cn('min-w-0 flex-1 whitespace-nowrap text-center', row.year === chosen ? 'font-semibold text-foreground' : cn('text-muted-foreground', row.year % 5 !== 0 && 'invisible sm:visible'))}>
            {String(row.year).slice(2)}
            {row.partial ? <span className="ml-px inline-block size-1 rounded-full bg-current align-middle opacity-70" /> : null}
          </span>
        ))}
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {running ? (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground/70" />
            {t`${running.year}: anul în curs, până în ${monthName(running.month)}`}
          </span>
        ) : null}
        <span>{t`Apasă un an ca să-l alegi pentru toată pagina.`}</span>
      </p>
    </figure>
  )
}

/** Interest on the debt per resident, every full year since 2006: what past borrowing costs each year. */
function InterestTrend({ chosen }: { readonly chosen: number }) {
  const points = useInterestTrend().map((point) => ({ year: point.year, lei: perResident(point.exact, point.year) }))
  const top = Math.max(...points.map((point) => point.lei ?? 0), 1)
  const first = points.find((point) => point.lei !== null)
  const last = [...points].reverse().find((point) => point.lei !== null)
  const labelOf = (point: { readonly year: number; readonly lei: number | null }) => (point.lei === null ? t`${point.year}: fără date` : t`${point.year}: ${leiText(point.lei)} pe locuitor`)
  if (!first || !last) return null
  const from = leiText(first.lei)
  const to = leiText(last.lei)
  return (
    <div className="mt-5">
      <p className="text-xs text-muted-foreground">{t`Dobânzi pe locuitor: ${from} în ${first.year}, ${to} în ${last.year}`}</p>
      <div className="mt-2 flex h-12 items-end gap-[2px]" role="img" aria-label={points.map(labelOf).join('; ')}>
        {points.map((point) => (
          <span
            key={point.year}
            title={labelOf(point)}
            className={cn('min-w-0 flex-1 rounded-t-[2px]', point.year === chosen ? 'bg-primary' : 'bg-primary/30')}
            style={{ height: `${point.lei === null ? 0 : Math.max(4, (point.lei / top) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function Debt() {
  const { view, picked, setYear, views } = usePageYear()
  const [measure, setMeasure] = useState<Measure>('pib')
  const years = useBorrowedYears()
  const running = years.some((row) => row.partial) ? (views.find((entry) => entry.partial) ?? null) : null
  const spending = useHundred(view, 'spending')
  const year = years.find((row) => row.year === view.year) ?? null
  const interest = spending.lines.find((line) => line.key === 'mfin.bgc.expenditure.interest') ?? null
  const previous = previousText(view)
  const period = view.partial ? view.text : String(view.year)
  const share = year?.gdpShare === null || year?.gdpShare === undefined ? null : percentText(year.gdpShare, 2)
  // A year picked here can change the height of the sections above (no ANAF lists before 2016). The chart is held
  // where it was pressed: its place in the window is noted on the press and restored when the year's figures land.
  const chartRef = useRef<HTMLDivElement>(null)
  const heldAt = useRef<number | null>(null)
  const pick = (next: number) => {
    // The year already shown changes nothing: no hold to restore.
    if (next === picked.year) return
    heldAt.current = chartRef.current?.getBoundingClientRect().top ?? null
    setYear(next)
  }
  useLayoutEffect(() => {
    if (heldAt.current === null || !chartRef.current) return
    window.scrollBy(0, chartRef.current.getBoundingClientRect().top - heldAt.current)
    heldAt.current = null
  }, [view.year])
  const ofHundred = (lei: number, words: string): ReactNode => (
    <>
      <Mark>
        {lei} {leiWord(lei)}
      </Mark>{' '}
      {words}
    </>
  )
  const computed = spansText(years.filter((row) => row.gdpShareFrom === 'computed').map((row) => row.year))
  // The deficit's headline follows the chart's measure; the other measure is its first note.
  const byShare = measure === 'pib' && share !== null
  const deficit = year?.deficit ? moneyParts(year.deficit) : null
  const interestParts = interest ? moneyParts(interest.exact) : null
  return (
    <div>
      <div ref={chartRef}>
        {/* The chart marks the year as picked, at once; the figures under it follow when they are read. */}
        <Chart years={years} chosen={picked.year} onPick={pick} measure={measure} onMeasure={setMeasure} />
      </div>
      <div className="mt-10 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-2">
        {year?.deficit && deficit ? (
          <Stat
            value={byShare ? share.replace('%', '') : deficit.value}
            unit={byShare ? t`% din PIB` : deficit.unit}
            label={t`deficit bugetar (cash) în ${period}`}
            notes={[
              byShare ? (
                <Mark>{moneyText(year.deficit)}</Mark>
              ) : share ? (
                <>
                  <Mark>{share}</Mark> {t`din PIB`}
                </>
              ) : null,
              year.lei !== null ? ofHundred(year.lei, t`din fiecare 100 cheltuiți, împrumutați`) : null,
              <>
                <Mark>{leiText(perResident(year.deficit, view.year))}</Mark> {perResidentWords()}
              </>,
            ]}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{year?.lei !== 0 ? t`Buletinul nu are deficitul pentru ${period}.` : view.partial ? t`Fără deficit în ${period}.` : t`${period} s-a încheiat fără deficit.`}</p>
        )}
        {interest && interestParts ? (
          <div>
            <Stat
              value={interestParts.value}
              unit={interestParts.unit}
              label={t`dobânzi la datorie în ${period}`}
              notes={[
                ofHundred(interest.lei, t`din fiecare 100 cheltuiți`),
                interest.change ? (
                  <>
                    <Mark>{interest.change}</Mark> {t`față de ${previous}`}
                  </>
                ) : null,
                <>
                  <Mark>{leiText(perResident(interest.exact, view.year))}</Mark> {perResidentWords()}
                </>,
              ]}
            />
            <InterestTrend chosen={view.year} />
          </div>
        ) : null}
      </div>
      <Note>
        {t`Deficitul bugetului general consolidat (cash).`}{' '}
        {measure === 'pib' ? `${t`Linia punctată e valoarea de referință din tratatele UE, 3% din PIB; UE o aplică deficitului calculat după metoda ei (ESA), puțin diferit de cel cash.`} ` : ''}
        {measure === 'lei' ? `${t`Sumele sunt în lei curenți, neajustați cu inflația.`} ` : ''}
        {measure === 'pib' && running ? `${t`Pentru ${running.year}, deficitul de până în ${monthName(running.month)} e împărțit la PIB-ul estimat pentru tot anul.`} ` : ''}
        {computed
          ? t`Ponderea în PIB e cea tipărită în buletinul anului; pentru ${computed}, unde buletinul nu o tipărește, e deficitul împărțit la PIB-ul anual publicat de INS (Tempo CON111B; 2025, provizoriu).`
          : t`Ponderea în PIB e cea tipărită în buletinul fiecărui an.`}
      </Note>
    </div>
  )
}

export function DebtSection() {
  return (
    <Section id="imprumut" title={t`Cât se împrumută, an de an`} lede={t`Ce cheltuie statul peste încasări se acoperă din împrumuturi, care se dau înapoi cu dobândă din bugetele anilor următori.`}>
      <Debt />
    </Section>
  )
}
