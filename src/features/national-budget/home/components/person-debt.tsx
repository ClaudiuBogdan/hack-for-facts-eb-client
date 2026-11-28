import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
 * The cash deficit over time (owner: the evolution matters most; against
 * GDP, with a switch to the amounts): one bar a year, the deficit as a share
 * of GDP or in lei; a bar picks its year for the whole page. Under the chart,
 * the chosen year's deficit and the debt interest, with interest per resident
 * since 2006. No 3% line (owner, 28 November 2026): the EU's reference value
 * applies to the ESA 2010 deficit, not to the cash one; „Cum am calculat"
 * says why.
 */

const SOURCE_LINK = 'font-medium text-foreground underline underline-offset-4'

/** Cash against ESA 2010: what the chart counts, and why the EU's 3% is not drawn on it. */
function CashMethod() {
  return (
    <Popover>
      <PopoverTrigger className="min-h-11 text-xs text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground sm:min-h-0">{t`Cum am calculat`}</PopoverTrigger>
      <PopoverContent
        align="start"
        aria-label={t`Cum am calculat`}
        className="max-h-[var(--radix-popover-content-available-height)] w-[min(92vw,32rem)] space-y-2 overflow-y-auto text-sm text-muted-foreground"
      >
        <p>{t`Graficul arată deficitul cash al bugetului general consolidat, din buletinele de execuție ale Ministerului Finanțelor: cât au depășit plățile încasările, fiecare socotită în luna în care banii ies din conturile statului sau intră în ele.`}</p>
        <p>
          {t`Uniunea Europeană evaluează deficitul după altă metodă, ESA 2010, și doar acestuia i se aplică valoarea de referință de 3% din PIB. ESA socotește veniturile și cheltuielile când are loc faptul economic (o taxă datorată, o lucrare făcută), nu când se mută banii, și cuprinde unitățile pe care regulile ei le clasifică în administrația publică, un perimetru stabilit altfel decât bugetele din buletin. De aceea graficul nu arată pragul de 3%.`}
        </p>
        <p>{t`Unde buletinul tipărește ponderea în PIB, ministerul o calculează față de PIB-ul estimat atunci; Eurostat împarte la PIB-ul din notificare, publicat mai târziu, deci și numitorul poate diferi.`}</p>
        <p>{t`Pentru 2025, cifrele cash sunt cele din buletinul pe decembrie 2025, publicat de minister în ianuarie 2026. Deficitul după ESA 2010, publicat de Eurostat pe 21 octombrie 2026 (a doua notificare din 2026), e 7,8% din PIB.`}</p>
        <ul className="space-y-1 pt-1">
          <li>
            <a href="https://mfinante.gov.ro/domenii/bugetul-de-stat/informatii-executie-bugetara" target="_blank" rel="noreferrer" className={SOURCE_LINK}>
              {t`Buletinele de execuție bugetară, Ministerul Finanțelor`}
            </a>
          </li>
          <li>
            <a href="https://agerpres.ro/comunicate/2026/01/27/comunicat-de-presa---ministerul-finantelor--1522459" target="_blank" rel="noreferrer" className={SOURCE_LINK}>
              {t`Comunicatul ministerului pentru 2025 (27 ianuarie 2026)`}
            </a>
          </li>
          <li>
            <a href="https://ec.europa.eu/eurostat/web/government-finance-statistics/excessive-deficit-procedure" target="_blank" rel="noreferrer" className={SOURCE_LINK}>
              {t`Metoda Eurostat: procedura de deficit excesiv`}
            </a>
          </li>
          <li>
            <a href="https://ec.europa.eu/eurostat/web/products-euro-indicators/w/2-21102026-ap" target="_blank" rel="noreferrer" className={SOURCE_LINK}>
              {t`Eurostat: deficitul pe 2025, a doua notificare (21 octombrie 2026)`}
            </a>
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  )
}

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
        <span className="flex flex-wrap items-center gap-x-3">
          <span className="text-sm font-semibold">{t`Deficit bugetar (cash), an de an`}</span>
          <CashMethod />
        </span>
        <IndicatorToggle label={t`Deficitul, măsurat în`} options={measures()} value={measure} onChange={onMeasure} />
      </figcaption>
      <div className="relative mt-5 flex h-64 items-end gap-[3px] border-b">
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

/**
 * Why a year has no interest (scrapper decision 2026-10-07, „execution-gap corrections"): 2008's annual table is loaded
 * for its three totals only; the 2011 and 2013 December bulletins give the year as an estimate, kept out of the
 * executed series. Any other missing year is said plainly.
 */
function interestGapsText(years: readonly number[]): string | null {
  if (!years.length) return null
  const totalsOnly: readonly number[] = years.filter((year) => year === 2008)
  const estimates: readonly number[] = years.filter((year) => year === 2011 || year === 2013)
  const other = years.filter((year) => !totalsOnly.includes(year) && !estimates.includes(year))
  return [
    totalsOnly.length ? t`Pentru ${spansText(totalsOnly)} lipsesc dobânzile: din raportul anual sunt încărcate doar totalurile.` : null,
    estimates.length ? t`Pentru ${spansText(estimates)} lipsesc dobânzile: buletinul de decembrie dă anul ca estimare, nu ca execuție.` : null,
    other.length ? t`Pentru ${spansText(other)} lipsesc dobânzile.` : null,
  ]
    .filter(Boolean)
    .join(' ')
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
  const gaps = interestGapsText(points.filter((point) => point.lei === null).map((point) => point.year))
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
      {gaps ? <p className="mt-2 text-xs text-muted-foreground">{gaps}</p> : null}
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
              year.lei !== null ? ofHundred(year.lei, t`din fiecare 100 cheltuiți, peste încasări`) : null,
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
        {measure === 'lei' ? `${t`Sumele sunt în lei curenți, neajustați cu inflația.`} ` : ''}
        {measure === 'pib' && running ? `${t`Pentru ${running.year}, deficitul de până în ${monthName(running.month)} e împărțit la PIB-ul estimat pentru tot anul.`} ` : ''}
        {computed
          ? t`Ponderea în PIB e cea tipărită în buletinul anului; pentru ${computed}, unde datele încărcate nu au ponderea tipărită, e deficitul împărțit la PIB-ul anual publicat de INS (Tempo CON111B; 2025, provizoriu), deci poate diferi de cea publicată de minister.`
          : t`Ponderea în PIB e cea tipărită în buletinul fiecărui an.`}
      </Note>
    </div>
  )
}

export function DebtSection() {
  return (
    <Section
      id="imprumut"
      title={t`Deficitul, an de an`}
      lede={t`Cât a plătit statul peste ce a încasat, an de an. Diferența se acoperă din împrumuturi sau din banii pe care statul îi avea deja în conturi; dobânzile la datorie se plătesc din bugetele anilor următori.`}
    >
      <Debt />
    </Section>
  )
}
