import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'

import { nextSearch, type AdvancedState } from '@/features/national-budget/analytics/lib/analytics-state'
import { siteKeys } from '@/features/national-budget/home/lib/home-data'
import { cn } from '@/lib/utils'
import {
  changeOf,
  leiNumber,
  leiText,
  monthsOf,
  type PersonEntry,
  type PersonLine,
  type Unit,
  useNewestView,
  usePersonDomains,
  usePersonHistory,
  usePersonMinistries,
  usePersonRevenue,
  usePersonSpending,
  usePersonTotals,
} from './persoana.data'
import { Note, Section, monthName, usePersonYear } from './persoana.shell'

/**
 * The sections the per-person versions share, under their own heads and
 * opening figures: where the money came from, the domains, the ministries,
 * the borrowing year by year, the year in progress, and where to go next.
 * Each says its amounts per resident, a year or a month as the version asks.
 */

/** A way into the analysis page (the live page's link, kept here when the live bands were replaced, 25 November 2026). */
function AnalyticsLink({ patch, children, className }: { readonly patch: Partial<AdvancedState>; readonly children: ReactNode; readonly className?: string }) {
  return (
    <Link
      to="/national-budget/analytics"
      search={((previous: Record<string, unknown>) => nextSearch(siteKeys(previous), patch)) as never}
      className={cn('inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline sm:min-h-0', className)}
    >
      {children}
      <ArrowUpRight className="size-3.5" aria-hidden="true" />
    </Link>
  )
}

// ──────────────────────────────────────────────────────────────── tones ──

export const REST_FILL = 'bg-[repeating-linear-gradient(135deg,hsl(var(--muted-foreground)/0.3)_0_1.5px,transparent_1.5px_7px)] bg-muted/70'
export const BORROWED_FILL = 'bg-[repeating-linear-gradient(135deg,hsl(var(--primary))_0_2px,transparent_2px_6px)] bg-primary/15'

/** One navy family, darkest for the largest; text that reads on it. */
export function toneOf(rank: number, count: number): { readonly style: CSSProperties; readonly ink: string } {
  const at = count <= 1 ? 0 : Math.min(rank / (count - 1), 1)
  const mix = Math.round(at <= 0.42 ? 100 - (at / 0.42) * 30 : 46 - ((at - 0.42) / 0.58) * 34)
  return {
    style: { backgroundColor: `color-mix(in oklab, hsl(var(--choropleth-5)) ${mix}%, hsl(var(--choropleth-1)))` },
    ink: mix >= 70 ? 'text-background' : 'text-foreground',
  }
}

export function unitWord(unit: Unit): string {
  return unit === 'month' ? 'pe lună' : 'pe an'
}

/** „în 2025" or „în ianuarie–septembrie 2026". */
export function inPeriod(text: string): string {
  return `în ${text}`
}

// ─────────────────────────────────────────────────────────── a ranked row ──

/** A name, its lei per person, and a bar against the largest; the change beside. */
function RankRow({ entry, max, rank, count, href }: { readonly entry: PersonEntry | PersonLine; readonly max: number; readonly rank: number; readonly count: number; readonly href?: { readonly cui: string } }) {
  const rest = entry.key === 'rest'
  const tone = toneOf(rank, count)
  const label = href ? (
    <Link to="/entities/$cui" params={{ cui: href.cui }} search={((previous: Record<string, unknown>) => siteKeys(previous)) as never} className="underline-offset-4 hover:underline">
      {entry.label}
    </Link>
  ) : (
    entry.label
  )
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 py-2.5">
      <span className="min-w-0 text-sm leading-snug">{label}</span>
      <span className="text-right text-sm font-semibold tabular-nums">
        {leiText(entry.lei)}
        {entry.change ? <span className="ml-2 inline-block w-12 text-xs font-normal text-muted-foreground">{entry.change}</span> : <span className="ml-2 inline-block w-12" />}
      </span>
      <span className="col-span-2 mt-1.5 block h-2 rounded-full bg-muted">
        <span className={cn('block h-full rounded-full', rest && REST_FILL)} style={{ width: `${Math.max(0.8, (entry.lei / max) * 100)}%`, ...(rest ? {} : tone.style) }} />
      </span>
    </li>
  )
}

function RankList({ entries, cuis = false }: { readonly entries: readonly (PersonEntry | PersonLine)[]; readonly cuis?: boolean }) {
  const max = Math.max(...entries.map((entry) => entry.lei), 1)
  const named = entries.filter((entry) => entry.key !== 'rest').length
  return (
    <ul className="divide-y">
      {entries.map((entry, rank) => (
        <RankRow key={entry.key} entry={entry} max={max} rank={rank} count={named} href={cuis && entry.key !== 'rest' ? { cui: entry.key } : undefined} />
      ))}
    </ul>
  )
}

// ────────────────────────────────────────────────────── where it came from ──

/** One bar of a person's revenue, then what was borrowed on top, hatched: together they make what was spent. */
export function SourcesBar({ lines, borrowed, className }: { readonly lines: readonly PersonLine[]; readonly borrowed: number | null; readonly className?: string }) {
  const total = lines.reduce((sum, line) => sum + line.lei, 0) + (borrowed ?? 0)
  const named = lines.filter((line) => !line.rest).length
  return (
    <div className={cn('flex h-12 w-full overflow-hidden rounded-md', className)} role="img" aria-label="De unde au venit banii, per locuitor">
      {lines.map((line, rank) => (
        <span
          key={line.key}
          title={`${line.label}: ${leiText(line.lei)}`}
          className={cn('h-full border-r border-background last:border-r-0', line.rest && REST_FILL)}
          style={{ width: `${(line.lei / total) * 100}%`, ...(line.rest ? {} : toneOf(rank, named).style) }}
        />
      ))}
      {borrowed ? <span title={`Împrumutat: ${leiText(borrowed)}`} className={cn('h-full', BORROWED_FILL)} style={{ width: `${(borrowed / total) * 100}%` }} /> : null}
    </div>
  )
}

export function RevenueSection({ unit, id = 'venituri' }: { readonly unit: Unit; readonly id?: string }) {
  const { view } = usePersonYear()
  return (
    <Section id={id} title="De unde au venit banii" lede={`Ce a încasat statul ${inPeriod(view.text)}, împărțit la fiecare locuitor, și cât s-a împrumutat pe deasupra.`}>
      <Revenue unit={unit} />
    </Section>
  )
}

function Revenue({ unit }: { readonly unit: Unit }) {
  const { view } = usePersonYear()
  const { whole, lines } = usePersonRevenue(view, unit)
  const totals = usePersonTotals(view, unit)
  const borrowed = totals.balance !== null && totals.balance < 0 ? -totals.balance : null
  if (whole === null) return <p className="text-sm text-muted-foreground">Buletinul acestui an nu are veniturile.</p>
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-5">
        <p className="text-4xl font-semibold tracking-tight tabular-nums">{leiText(whole)}</p>
        <p className="mt-1 text-sm text-muted-foreground">încasați {unitWord(unit)} pentru fiecare locuitor</p>
        {borrowed ? (
          <p className="mt-6 text-base leading-relaxed">
            Plus <strong className="font-semibold tabular-nums">{leiText(borrowed)}</strong> împrumutați, ca să se acopere cheltuielile de {leiText(totals.spending)}. Banii împrumutați se dau înapoi, cu dobândă, din bugetele anilor
            următori.
          </p>
        ) : null}
        <SourcesBar lines={lines} borrowed={borrowed} className="mt-6" />
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={toneOf(0, 2).style} /> taxe, contribuții, fonduri UE
          </span>
          {borrowed ? (
            <span className="inline-flex items-center gap-1.5">
              <span className={cn('size-2.5 rounded-sm', BORROWED_FILL)} /> împrumutat
            </span>
          ) : null}
        </div>
      </div>
      <div className="lg:col-span-6 lg:col-start-7">
        <RankList entries={lines} />
        <div className="mt-4 flex flex-wrap gap-x-5">
          <AnalyticsLink patch={{ tip: 'venituri', perioada: view.label }}>Toate veniturile, pe rânduri</AnalyticsLink>
        </div>
        <Note>Încasările bugetului general consolidat (toate bugetele publice, fără transferurile dintre ele), din buletinele de execuție ale Ministerului Finanțelor, împărțite la populația rezidentă de la 1 ianuarie. Variația: față de aceeași perioadă a anului trecut, per locuitor, în lei curenți.</Note>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────── domains ──

export function DomainsSection({ unit }: { readonly unit: Unit }) {
  const { view } = usePersonYear()
  return (
    <Section id="domenii" title="Pe ce domenii" lede={`Bugetul de stat ${inPeriod(view.text)}, pe domenii, pentru fiecare locuitor. Pensiile și spitalele se plătesc în mare parte din bugete separate, așa că apar aici doar cu partea lor din bugetul de stat.`}>
      <Domains unit={unit} />
    </Section>
  )
}

function Domains({ unit }: { readonly unit: Unit }) {
  const { view } = usePersonYear()
  const { whole, entries } = usePersonDomains(view, unit)
  if (view.year < 2016) return <p className="text-sm text-muted-foreground">Rapoartele ANAF pe domenii încep în 2016. Alege un an din 2016 încoace.</p>
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-4">
        <p className="text-4xl font-semibold tracking-tight tabular-nums">{leiText(whole)}</p>
        <p className="mt-1 text-sm text-muted-foreground">din bugetul de stat, {unitWord(unit)}, pentru fiecare locuitor</p>
        <AnalyticsLink className="mt-6" patch={{ tip: 'lege', dupa: 'capitole', an: view.year }}>
          Ce a aprobat legea, pe capitole
        </AnalyticsLink>
      </div>
      <div className="lg:col-span-7 lg:col-start-6">
        <RankList entries={entries} />
        <Note>Plățile din bugetul de stat raportate la ANAF, pe capitolele clasificației funcționale, împărțite la populația rezidentă de la 1 ianuarie. Variația: față de aceleași luni ale anului anterior, per locuitor.</Note>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────── ministries ──

export function MinistriesSection({ unit }: { readonly unit: Unit }) {
  const { view } = usePersonYear()
  return (
    <Section id="ministere" title="Cine îi cheltuie" lede={`Ministerele și instituțiile centrale care au plătit cel mai mult din bugetul de stat ${inPeriod(view.text)}, pentru fiecare locuitor.`}>
      <Ministries unit={unit} />
    </Section>
  )
}

function Ministries({ unit }: { readonly unit: Unit }) {
  const { view } = usePersonYear()
  const { entries, count } = usePersonMinistries(view, unit)
  const [all, setAll] = useState(false)
  if (view.year < 2016) return <p className="text-sm text-muted-foreground">Rapoartele ANAF pe ministere încep în 2016. Alege un an din 2016 încoace.</p>
  const shown = all ? entries : entries.slice(0, 8)
  return (
    <div className="max-w-3xl">
      <RankList entries={shown} cuis />
      {count > 8 ? (
        <button type="button" onClick={() => setAll((open) => !open)} className="mt-4 inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline sm:min-h-0">
          {all ? 'Doar primele 8' : `Toate cele ${count}`}
        </button>
      ) : null}
      <Note>Plățile ordonatorilor principali de credite din bugetul de stat, raportate la ANAF. Fiecare nume deschide pagina instituției.</Note>
    </div>
  )
}

// ─────────────────────────────────────────────────────── borrowing, years ──

export function BorrowingSection({ unit }: { readonly unit: Unit }) {
  return (
    <Section id="imprumut" title="Cât se împrumută, an de an" lede="Diferența dintre ce cheltuie și ce încasează statul se acoperă din împrumuturi. Pentru fiecare locuitor, în lei ai fiecărui an.">
      <Borrowing unit={unit} />
    </Section>
  )
}

function Borrowing({ unit }: { readonly unit: Unit }) {
  const { view, setYear } = usePersonYear()
  const history = usePersonHistory(unit)
  const spending = usePersonSpending(view, unit)
  const interest = spending.lines.find((line) => line.key === 'mfin.bgc.expenditure.interest') ?? null
  const max = Math.max(...history.map((row) => row.borrowed ?? 0), 1)
  const peak = history.reduce<(typeof history)[number] | null>((best, row) => ((row.borrowed ?? 0) > (best?.borrowed ?? 0) ? row : best), null)
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-4">
        {interest ? (
          <>
            <p className="text-4xl font-semibold tracking-tight tabular-nums">{leiText(interest.lei)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              dobânzi la datorie {unitWord(unit)}, pentru fiecare locuitor, {inPeriod(view.text)}
              {interest.change ? `: ${interest.change} față de anul trecut` : ''}
            </p>
          </>
        ) : null}
        {peak ? (
          <p className="mt-6 text-base leading-relaxed">
            Cel mai mult s-a împrumutat în {peak.year}: {leiText(peak.borrowed)} {unitWord(unit)} pentru fiecare locuitor.
          </p>
        ) : null}
        <AnalyticsLink className="mt-6" patch={{ tip: 'sold', dupa: 'timp' }}>
          Deficitul, an de an
        </AnalyticsLink>
      </div>
      <div className="lg:col-span-7 lg:col-start-6">
        <div className="flex h-56 items-end gap-[3px]" role="img" aria-label="Împrumutul pe locuitor, an de an">
          {history.map((row) => {
            const chosen = row.year === view.year
            return (
              <button
                type="button"
                key={row.year}
                onClick={() => setYear(row.year)}
                title={`${row.year}: ${leiText(row.borrowed)}`}
                className="group relative flex h-full flex-1 flex-col justify-end"
                aria-label={`${row.year}: ${leiText(row.borrowed)} împrumutați pe locuitor`}
              >
                <span className={cn('block w-full rounded-t-sm transition-colors', chosen ? 'bg-primary' : 'bg-primary/30 group-hover:bg-primary/55')} style={{ height: `${((row.borrowed ?? 0) / max) * 100}%` }} />
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex justify-between text-xs tabular-nums text-muted-foreground">
          <span>{history[0]?.year}</span>
          <span>{history[history.length - 1]?.year}</span>
        </div>
        <Note>Deficitul bugetului general consolidat (cash), din buletinele de decembrie ale Ministerului Finanțelor, împărțit la populația rezidentă de la 1 ianuarie a fiecărui an. Lei curenți, neajustați cu inflația. Apasă un an ca să-l alegi pentru toată pagina.</Note>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────── this year ──

export function NowSection({ unit }: { readonly unit: Unit }) {
  return (
    <Section id="anul" title="Cum merge anul acesta" tone="muted">
      <Now unit={unit} />
    </Section>
  )
}

function Now({ unit }: { readonly unit: Unit }) {
  const view = useNewestView()
  const totals = usePersonTotals(view, unit)
  const months = monthsOf(view)
  const rows = [
    { key: 'spending', label: 'Cheltuit', now: totals.spending, before: totals.spendingBefore },
    { key: 'revenue', label: 'Încasat', now: totals.revenue, before: totals.revenueBefore },
    { key: 'borrowed', label: 'Împrumutat', now: totals.balance === null ? null : -totals.balance, before: totals.balanceBefore === null ? null : -totals.balanceBefore },
  ]
  const max = Math.max(...rows.flatMap((row) => [row.now ?? 0, row.before ?? 0]), 1)
  const period = `ianuarie–${monthName(view.month)}`
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <p className="text-base leading-relaxed lg:col-span-4">
        {view.partial ? (
          <>
            În {period} {view.year}, statul a cheltuit <strong className="font-semibold tabular-nums">{leiText(totals.spending)}</strong> {unit === 'month' ? 'pe lună ' : ''}pentru fiecare locuitor, {changeOf(totals.spending, totals.spendingBefore) ?? ''} față de aceleași{' '}
            {months} luni din {view.year - 1}.
          </>
        ) : (
          <>Anul {view.year} e încheiat; nu e niciun an în curs în buletine.</>
        )}
      </p>
      <dl className="space-y-5 lg:col-span-7 lg:col-start-6">
        {rows.map((row) => (
          <div key={row.key}>
            <dt className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{row.label}</span>
              <span className="tabular-nums">
                <strong className="font-semibold">{leiText(row.now)}</strong>
                <span className="ml-2 text-muted-foreground">
                  {view.year - 1}: {leiNumber(row.before)}
                </span>
              </span>
            </dt>
            <dd className="mt-2 space-y-1">
              <span className="block h-3 rounded-full bg-primary" style={{ width: `${((row.now ?? 0) / max) * 100}%` }} />
              <span className="block h-3 rounded-full bg-primary/25" style={{ width: `${((row.before ?? 0) / max) * 100}%` }} />
            </dd>
          </div>
        ))}
        <Note className="mt-2">
          Bugetul general consolidat, {period} {view.year} față de {period} {view.year - 1}, per locuitor{unit === 'month' ? ', pe lună' : ''}. Lei curenți.
        </Note>
      </dl>
    </div>
  )
}

// ────────────────────────────────────────────────────────────── further ──

export function FurtherSection() {
  const { view } = usePersonYear()
  const links = [
    { title: 'Prin ce bugete trec banii', body: 'Bugetul de stat, bugetele locale, pensiile, sănătatea și transferurile dintre ele.', patch: { tip: 'cheltuieli', dupa: 'bugete', perioada: view.label } as const },
    { title: 'Ce a aprobat Parlamentul', body: 'Legea bugetului de stat, pe fonduri, capitole și ani.', patch: { tip: 'lege', an: view.year } as const },
    { title: 'Lună de lună', body: 'Cheltuielile, veniturile și deficitul pe luni.', patch: { tip: 'cheltuieli', dupa: 'timp', pas: 'luna' } as const },
    { title: 'Fiecare rând al cheltuielilor', body: 'Toate liniile buletinului, din 2006.', patch: { tip: 'cheltuieli', perioada: view.label } as const },
  ]
  return (
    <section id="mai-departe" className="scroll-mt-16 border-b">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <h2 className="text-2xl font-semibold tracking-tight">Mai departe</h2>
        <ul className="mt-6 grid grid-cols-1 border-t sm:grid-cols-2">
          {links.map((link) => (
            <li key={link.title} className="border-b sm:odd:border-r">
              <AnalyticsLink patch={link.patch} className="flex h-full min-h-0 items-start justify-between gap-4 p-5 hover:bg-muted/40 hover:no-underline sm:min-h-0">
                <span className="flex flex-col gap-1">
                  <span className="text-base font-semibold">{link.title}</span>
                  <span className="text-sm font-normal text-muted-foreground">{link.body}</span>
                </span>
              </AnalyticsLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

