import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { ArrowUpRight, Flag, Landmark, ListOrdered, Map as MapIcon, Users, Vote } from 'lucide-react'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HubInfoNote } from '@/features/private-companies/components/hub/hub-info-note'
import { HomeBand } from '@/features/procurement/components/home/home-section-nav'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import { lineStyle } from '../componente-fable/model'
import { useFormat } from '../shared/parts'
import { ANALYTICS_HREF } from './analize'
import { FrontDoorMaps } from './harta'
import { total, useBallotDays, useLocalMandates, type DaySummary, type ElectionEvent, type Vote as VoteRow } from './data'
import { PROTOTYPE_MARKER, PhasePair, SectionBar, StackBar, WayHome, lineLabel, type BarSection } from './parts'

/**
 * `/alegeri`, the elections front door (owner, 2026-11-28: like the legislation hub, the most relevant sections,
 * links to the analytics and details pages; the list of elections that is `/alegeri` today becomes a band). Every
 * figure is read live from the API; the shared hub parts as they are on dev (`HomeBand`, `HubSectionHead`
 * without a number, `HubFiguresBand` plain, `HubInfoNote`), the pinned bar a local copy of the national budget's
 * until the shared one gains icons. Ballot names only in the president's band (owner, 2026-11-28).
 */

const FAMILY: Readonly<Record<string, () => string>> = {
  parliamentary: () => t`Parlamentare`,
  presidential: () => t`Prezidențiale`,
  european: () => t`Europarlamentare`,
  local: () => t`Locale`,
}
const familyName = (family: string) => FAMILY[family]?.() ?? family
const eventHref = (eventKey: string) => `/alegeri/${encodeURIComponent(eventKey)}`
const SHORTCUT = 'inline-flex min-h-11 items-center text-sm font-medium text-foreground transition-colors hover:text-primary sm:min-h-0'
const MORE = 'inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline'

function sections(): readonly BarSection[] {
  return [
    { id: 'parlament', label: t`Parlament`, icon: Landmark },
    { id: 'primarii', label: t`Primării`, icon: Users },
    { id: 'presedinte', label: t`Președinte`, icon: Flag },
    { id: 'harta', label: t`Harta`, icon: MapIcon },
    { id: 'prezenta', label: t`Prezența`, icon: Vote },
    { id: 'toate', label: t`Toate alegerile`, icon: ListOrdered },
  ]
}

/** The day's name: „Prezidențiale 2025, turul 2". */
function dayName(day: Pick<DaySummary, 'family' | 'year' | 'round'>, rounds: number): string {
  const base = `${familyName(day.family)} ${day.year}`
  return rounds > 1 ? t`${base}, turul ${day.round.replace(/^r/, '')}` : base
}

function usePct() {
  const format = useFormat()
  const number = new Intl.NumberFormat(format.locale, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return (fraction: number) => number.format(fraction)
}

/** One summary per ballot day: the day's first office (the Chamber, local councils, the president, the European list). */
function daysOnce(days: readonly DaySummary[]): readonly DaySummary[] {
  const seen = new Set<string>()
  return days.filter((day) => (seen.has(day.occurrenceKey) ? false : (seen.add(day.occurrenceKey), true)))
}

/** Rounds are the president's alone: a local runoff or repeat day is a handful of races, not a round of the election. */
function roundsOf(events: readonly ElectionEvent[], eventKey: string) {
  const event = events.find((item) => item.eventKey === eventKey)
  return event?.family === 'presidential' ? event.occurrences.length : 1
}

// ───────────────────────────────────────────────────────────── the head ──

function LatestPanel({ events, days }: { readonly events: readonly ElectionEvent[]; readonly days: readonly DaySummary[] }) {
  const pct = usePct()
  const format = useFormat()
  // The newest day of each event, newest event first.
  const rows = events.slice(0, 5).flatMap((event) => {
    const day = daysOnce(days)
      .filter((item) => item.eventKey === event.eventKey && item.status !== 'annulled')
      .sort((a, b) => b.ballotDate.localeCompare(a.ballotDate))[0]
    return day ? [day] : []
  })
  return (
    <div className="border bg-background p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold tracking-tight">{t`Ultimele alegeri`}</h2>
      <ul className="mt-4 divide-y">
        {rows.slice(0, 4).map((day) => (
          <li key={day.occurrenceKey}>
            <a href={eventHref(day.eventKey)} className="group flex items-baseline justify-between gap-4 py-3 text-sm">
              <span className="min-w-0">
                <span className="block font-medium text-foreground group-hover:underline group-hover:underline-offset-4">{dayName(day, roundsOf(events, day.eventKey))}</span>
                <span className="block text-xs text-muted-foreground">{format.day(day.ballotDate)}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-semibold tabular-nums text-foreground">{day.turnout ? pct(day.turnout.value) : '—'}</span>
                <span className="block text-xs text-muted-foreground">{t`prezență`}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Head({ events, days }: { readonly events: readonly ElectionEvent[] | undefined; readonly days: readonly DaySummary[] | undefined }) {
  const format = useFormat()
  const local = events?.find((event) => event.eventKey === 'ro:local:2024')?.publication?.activatedAt
  return (
    <section className="relative border-b">
      <TwoLayerLattice idPrefix="alegeri-principal" />
      <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
        <CornerTicks />
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8 lg:pb-10">
          <div className="min-w-0 lg:col-span-7">
            <WayHome trail={[{ label: t`Alegeri` }]} />
            <h1 className="mt-5 text-[clamp(2.2rem,8vw+0.6rem,2.75rem)] font-extrabold leading-[0.96] tracking-[-0.04em] text-foreground [word-spacing:0.06em] sm:text-6xl lg:text-7xl">
              {t`Cum a votat`}
              <br />
              {t`România`}
            </h1>
            <p className="mt-5 max-w-[50ch] text-balance text-lg leading-relaxed tracking-normal text-muted-foreground sm:text-xl">
              {t`Voturile, mandatele și prezența la alegerile din 2020 încoace: pe partide, pe județe și pe localități.`}
            </p>
            {/* The place search lands with /alegeri/loc/<SIRUTA> (change 3); drawn here so its place in the head is seen. */}
            <div className="mt-6 flex h-11 max-w-xl items-center rounded-md border bg-background px-3 text-sm text-muted-foreground" aria-hidden="true">
              {t`Caută localitatea ta: Cluj-Napoca, Sectorul 3…`}
              <span className="ml-auto text-xs">{t`vine cu pagina localității`}</span>
            </div>
            <nav aria-label={t`Scurtături`} className="mt-4 flex flex-wrap items-baseline gap-x-4 sm:gap-x-5">
              <span className="basis-full text-sm text-muted-foreground sm:basis-auto">{t`Sau mergi direct la`}</span>
              <a href={ANALYTICS_HREF} className={SHORTCUT}>
                {t`Analize`}
              </a>
              <a href="#harta" className={SHORTCUT}>
                {t`Harta`}
              </a>
              <a href="#toate" className={SHORTCUT}>
                {t`Toate alegerile`}
              </a>
            </nav>
          </div>
          <div className="min-w-0 lg:col-span-5">{events && days ? <LatestPanel events={events} days={days} /> : <div className="h-72 animate-pulse border bg-muted/40" />}</div>
          <p className="min-w-0 text-sm text-muted-foreground lg:absolute lg:inset-x-8 lg:bottom-6">
            {local ? t`Surse: rezultatele oficiale ale alegerilor, publicate în platformă pe ${format.day(local)}.` : t`Surse: rezultatele oficiale ale alegerilor.`}
          </p>
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

// ───────────────────────────────────────────────────────────── figures ──

function Figures({ events, days }: { readonly events: readonly ElectionEvent[]; readonly days: readonly DaySummary[] }) {
  const format = useFormat()
  const mandates = useLocalMandates().data
  const ballotDays = events.reduce((sum, event) => sum + event.occurrences.length, 0)
  const years = events.map((event) => event.year)
  const runoff = days.filter((day) => day.family === 'presidential' && day.status !== 'annulled').sort((a, b) => b.ballotDate.localeCompare(a.ballotDate))[0]
  const chamber = days.filter((day) => day.office === 'chamber').sort((a, b) => b.ballotDate.localeCompare(a.ballotDate))[0]
  const first = chamber?.votes[0]
  const link = (hash: string) => (label: ReactNode, className: string) => (
    <a href={`#${hash}`} className={className}>
      {label}
    </a>
  )
  const facts: HubFact[] = [
    { key: 'zile', value: ballotDays, digits: 0, label: t`Zile de vot în date`, note: t`${events.length} alegeri, ${Math.min(...years)}–${Math.max(...years)}`, link: link('toate') },
    ...(runoff?.turnout
      ? [{ key: 'prezenta', value: runoff.turnout.value * 100, digits: 1, unit: '%', label: t`Prezență, ${dayName(runoff, roundsOf(events, runoff.eventKey))}`, note: t`au votat ÷ înscriși, cu străinătatea`, link: link('prezenta') }]
      : []),
    ...(mandates?.mayors ? [{ key: 'primari', value: total(mandates.mayors), digits: 0, label: t`Mandate de primar, 2024`, note: t`fără București, care nu e încă în date`, link: link('primarii') }] : []),
    ...(first?.percent != null && chamber
      ? [{ key: 'camera', value: first.percent, digits: 2, unit: '%', label: t`${lineLabel(first.line)}, cele mai multe voturi la Cameră`, note: t`parlamentare ${chamber.year}`, link: link('parlament') }]
      : []),
  ]
  return <HubFiguresBand facts={facts} locale={format.locale} plain arrow />
}

// ───────────────────────────────────────────────────────────── bands ──

/** Vote shares as bars: the threshold drawn, an earlier year's share as a short mark on the same line. */
function ShareBars({
  votes,
  before,
  top = 6,
  names = false,
}: {
  readonly votes: readonly VoteRow[]
  readonly before?: readonly VoteRow[]
  readonly top?: number
  /** The president's rows: ballot names need the room, and there is no 5% threshold to draw. */
  readonly names?: boolean
}) {
  const pct = usePct()
  const shown = votes.filter((vote) => vote.percent !== null).slice(0, top)
  const max = Math.max(...shown.map((vote) => vote.percent ?? 0), ...(before ?? []).map((vote) => vote.percent ?? 0), 5)
  const beforeOf = (vote: VoteRow) => (vote.line === 'other' ? undefined : before?.find((item) => item.line === vote.line)?.percent)
  return (
    <ol className="space-y-2.5">
      {shown.map((vote, index) => {
        const name = vote.line === 'other' || vote.line === 'ind' ? vote.label : lineLabel(vote.line)
        const was = beforeOf(vote)
        return (
          <li
            key={`${vote.label}-${index}`}
            className={cn('grid items-center gap-3 text-sm', names ? 'grid-cols-[minmax(0,14rem)_minmax(0,1fr)_3.75rem]' : 'grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_3.75rem]')}
          >
            <span className="truncate text-foreground" title={vote.label}>
              {name}
            </span>
            <span className="relative h-3 bg-muted/60">
              <span className={cn('absolute inset-y-0 left-0', lineStyle(vote.line).swatch)} style={{ width: `${(100 * (vote.percent ?? 0)) / max}%` }} />
              {was != null ? <span className="absolute -inset-y-1 w-0.5 bg-foreground/60" style={{ left: `${(100 * was) / max}%` }} title={t`2020: ${pct(was / 100)}`} /> : null}
              {names ? null : <span className="absolute -inset-y-1.5 w-px bg-foreground/40" style={{ left: `${500 / max}%` }} aria-hidden="true" />}
            </span>
            <span className="text-right tabular-nums text-foreground">{pct((vote.percent ?? 0) / 100)}</span>
          </li>
        )
      })}
    </ol>
  )
}

function BandMore({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return (
    <a href={href} className={MORE}>
      {children}
      <ArrowUpRight className="size-4" aria-hidden="true" />
    </a>
  )
}

function ParliamentBand({ days }: { readonly days: readonly DaySummary[] }) {
  const latest = (office: string) => days.filter((day) => day.office === office).sort((a, b) => b.ballotDate.localeCompare(a.ballotDate))
  const [chamber, chamberBefore] = latest('chamber')
  const [senate, senateBefore] = latest('senate')
  if (!chamber) return null
  return (
    <HomeBand id="parlament" labelledBy="alegeri-parlament-titlu">
      <HubSectionHead
        titleId="alegeri-parlament-titlu"
        title={t`Parlamentul votat în ${chamber.year}`}
        lede={
          <>
            {t`Voturile la Camera Deputaților și la Senat. Linia subțire e pragul de 5%; semnul scurt, ponderea din ${chamberBefore?.year ?? ''}.`}{' '}
            <HubInfoNote>{t`Ponderile sunt cele servite de rezultate. O alianță din 2020 și un partid din 2024 sunt aceeași linie doar când au aceeași cheie de partid; listele nu au încă membri în date.`}</HubInfoNote>
          </>
        }
        aside={<BandMore href={ANALYTICS_HREF}>{t`Partidele, 2020 → 2024`}</BandMore>}
      />
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <section aria-label={t`Camera Deputaților`}>
          <h3 className="mb-4 text-sm font-medium">{t`Camera Deputaților`}</h3>
          <ShareBars votes={chamber.votes} before={chamberBefore?.votes} />
          {chamber.seats ? <div className="mt-8"><StackBar rows={chamber.seats} label={t`Mandate la Cameră`} /></div> : null}
        </section>
        {senate ? (
          <section aria-label={t`Senatul`}>
            <h3 className="mb-4 text-sm font-medium">{t`Senatul`}</h3>
            <ShareBars votes={senate.votes} before={senateBefore?.votes} />
            {senate.seats ? <div className="mt-8"><StackBar rows={senate.seats} label={t`Mandate la Senat`} /></div> : null}
          </section>
        ) : null}
      </div>
    </HomeBand>
  )
}

function LocalBand() {
  const mandates = useLocalMandates()
  const data = mandates.data
  return (
    <HomeBand id="primarii" labelledBy="alegeri-primarii-titlu">
      <HubSectionHead
        titleId="alegeri-primarii-titlu"
        title={t`Primăriile și consiliile, 2024`}
        lede={
          <>
            {t`Mandatele pe partide, la localele din 9 iunie 2024. Consiliile județene au două repartizări, arătate alăturat.`}{' '}
            <HubInfoNote>{t`București nu e încă în date. Unele cifre ale PSD și PNL au un defect cunoscut (contestații anulate) și sunt marcate. Independenții sunt o singură linie, fără nume.`}</HubInfoNote>
          </>
        }
        aside={<BandMore href={ANALYTICS_HREF}>{t`Mandatele`}</BandMore>}
      />
      {data ? (
        <div className="mt-10 space-y-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            {data.mayors ? <StackBar rows={data.mayors} label={t`Primari`} /> : null}
            {data.councillors ? <StackBar rows={data.councillors} label={t`Consilieri locali`} /> : null}
          </div>
          <div>
            <h3 className="mb-4 text-sm font-medium">{t`Consilieri județeni`}</h3>
            <PhasePair first={data.countyCouncil.first} second={data.countyCouncil.second} />
          </div>
        </div>
      ) : (
        <div className="mt-10 h-48 animate-pulse bg-muted/30" />
      )}
    </HomeBand>
  )
}

function PresidentBand({ events, days }: { readonly events: readonly ElectionEvent[]; readonly days: readonly DaySummary[] }) {
  const pct = usePct()
  const format = useFormat()
  const event = events.find((item) => item.family === 'presidential' && item.occurrences.every((occurrence) => occurrence.status !== 'annulled'))
  if (!event) return null
  const rounds = days.filter((day) => day.eventKey === event.eventKey).sort((a, b) => a.ballotDate.localeCompare(b.ballotDate))
  const annulled = events.find((item) => item.family === 'presidential' && item !== event)
  return (
    <HomeBand id="presedinte" labelledBy="alegeri-presedinte-titlu">
      <HubSectionHead
        titleId="alegeri-presedinte-titlu"
        title={t`Președintele, ${event.year}`}
        lede={annulled ? t`Cele două tururi. Alegerile din ${annulled.year} au fost anulate; cifrele lor rămân în date, marcate ca anulate.` : t`Cele două tururi.`}
        aside={<BandMore href={eventHref(event.eventKey)}>{t`Pagina alegerii`}</BandMore>}
      />
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2">
        {rounds.map((day) => (
          <section key={day.occurrenceKey} aria-label={dayName(day, rounds.length)}>
            <div className="mb-4 flex items-baseline justify-between gap-4 text-sm">
              <h3 className="font-medium">{t`Turul ${day.round.replace(/^r/, '')} · ${format.day(day.ballotDate)}`}</h3>
              {day.turnout ? <span className="text-muted-foreground">{t`prezență ${pct(day.turnout.value)}`}</span> : null}
            </div>
            <ShareBars votes={day.votes} top={day.votes.length > 2 ? 5 : 2} names />
          </section>
        ))}
      </div>
    </HomeBand>
  )
}

/** The page's one map (owner, 2026-11-28): buttons switch the dataset, the map and the legend stay put. */
function MapBand({ days }: { readonly days: readonly DaySummary[] }) {
  const latest = (family: string) => days.filter((day) => day.family === family && day.status !== 'annulled').sort((a, b) => b.ballotDate.localeCompare(a.ballotDate))[0]
  return (
    <HomeBand id="harta" labelledBy="alegeri-harta-titlu">
      <HubSectionHead
        titleId="alegeri-harta-titlu"
        title={t`Harta, pe județe`}
        lede={t`Primăriile, președintele, prezența și europarlamentarele, județ cu județ. Treci cu mouse-ul peste un județ pentru cifrele lui.`}
        aside={<BandMore href={ANALYTICS_HREF}>{t`Harta, pe localități`}</BandMore>}
      />
      <div className="mt-10">
        <FrontDoorMaps runoff={latest('presidential')} european={latest('european')} />
      </div>
    </HomeBand>
  )
}

function TurnoutBand({ events, days }: { readonly events: readonly ElectionEvent[]; readonly days: readonly DaySummary[] }) {
  const pct = usePct()
  const rows = daysOnce(days)
    .filter((day) => day.turnout)
    .sort((a, b) => a.ballotDate.localeCompare(b.ballotDate))
  return (
    <HomeBand id="prezenta" labelledBy="alegeri-prezenta-titlu">
      <HubSectionHead
        titleId="alegeri-prezenta-titlu"
        title={t`Cât de mulți au votat`}
        lede={
          <>
            {t`Fiecare zi de vot din date, cu străinătatea acolo unde sursa o include.`}{' '}
            <HubInfoNote>{t`Rezultatele dau rata prezenței doar la locale și europarlamentare. La celelalte e calculată din cifrele servite: au votat împărțit la înscriși.`}</HubInfoNote>
          </>
        }
        aside={<BandMore href={ANALYTICS_HREF}>{t`Prezența pe județe și localități`}</BandMore>}
      />
      <ol className="mt-10 flex h-56 items-end gap-2 sm:gap-4">
        {rows.map((day) => {
          const value = day.turnout?.value ?? 0
          return (
            <li key={day.occurrenceKey} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5 text-center">
              <span className="text-xs font-semibold tabular-nums sm:text-sm">{pct(value)}</span>
              <span className={cn('block w-full bg-primary', day.status === 'annulled' && 'opacity-30')} style={{ height: `${value * 100}%` }} />
              <span className="line-clamp-2 text-[0.6875rem] leading-tight text-muted-foreground sm:text-xs">
                {dayName(day, roundsOf(events, day.eventKey))}
                {day.status === 'annulled' ? ` · ${t`anulate`}` : ''}
              </span>
            </li>
          )
        })}
      </ol>
    </HomeBand>
  )
}

function AllElectionsBand({ events }: { readonly events: readonly ElectionEvent[] }) {
  const format = useFormat()
  return (
    <HomeBand id="toate" labelledBy="alegeri-toate-titlu">
      <HubSectionHead titleId="alegeri-toate-titlu" title={t`Toate alegerile`} lede={t`Fiecare alegere din date, cu zilele ei de vot. Fiecare rând duce la pagina alegerii, cu toate cursele ei.`} />
      <ul className="mt-10 divide-y border-y">
        {events.map((event) => (
          <li key={event.eventKey}>
            <a href={eventHref(event.eventKey)} className="group grid grid-cols-1 gap-1 px-1 py-3.5 transition-colors hover:bg-muted/40 sm:grid-cols-[14rem_minmax(0,1fr)_auto] sm:items-baseline sm:gap-6">
              <span className="font-medium text-foreground">
                {familyName(event.family)} {event.year}
              </span>
              <span className="text-sm text-muted-foreground">
                {event.occurrences
                  .slice()
                  .sort((a, b) => a.ballotDate.localeCompare(b.ballotDate))
                  .map((occurrence) => `${format.day(occurrence.ballotDate)}${occurrence.status === 'annulled' ? ` (${t`anulate`})` : ''}`)
                  .join(' · ')}
              </span>
              <span className="hidden font-mono text-xs text-muted-foreground sm:inline">{event.eventKey}</span>
            </a>
          </li>
        ))}
      </ul>
    </HomeBand>
  )
}

function StartBand() {
  const cards = [
    { title: t`Cele mai strânse curse la primărie`, text: t`Diferența dintre primii doi, în fiecare localitate.` },
    { title: t`Partidele, 2020 → 2024`, text: t`Ce a câștigat și ce a pierdut fiecare partid la parlamentare.` },
    { title: t`Primăriile, pe județe`, text: t`Mandatele de primar și de consilier, județ cu județ.` },
    { title: t`Prezența, pe județe`, text: t`Cine a votat mai mult și cine mai puțin, la fiecare alegere.` },
    { title: t`Votul din străinătate`, text: t`Câți au votat în afara țării și cum, față de țară.` },
    { title: t`Ce nu e încă în date`, text: t`Alegerile dinainte de 2020, Bucureștiul la locale 2024, aleșii pe nume.` },
  ]
  return (
    <section aria-labelledby="alegeri-start-titlu" className="border-b">
      <RuledFrame className="py-14 sm:py-20">
        <HubSectionHead titleId="alegeri-start-titlu" title={t`De aici poți începe`} lede={t`Fiecare întrebare deschide pagina de analize, la vederea ei.`} />
        <ul className="mt-8 grid gap-px border bg-border/70 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <li key={card.title}>
              <a href={ANALYTICS_HREF} className="group relative block h-full bg-background p-5 transition-colors hover:bg-muted/40">
                <span className="block pr-6 text-base font-semibold tracking-tight text-foreground">{card.title}</span>
                <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">{card.text}</span>
                <ArrowUpRight aria-hidden="true" className="absolute right-4 top-5 size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
              </a>
            </li>
          ))}
        </ul>
      </RuledFrame>
    </section>
  )
}

// ───────────────────────────────────────────────────────────── the page ──

export function ElectionsFrontDoor() {
  const { events, days } = useBallotDays()
  const sorted = days.data ?? []
  return (
    <div className="relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']" data-dev-marker={PROTOTYPE_MARKER}>
      <Head events={events.data} days={days.data} />
      <SectionBar title={t`Alegeri`} sections={sections()} />
      <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
        <RuledFrame>{events.data && days.data ? <Figures events={events.data} days={sorted} /> : <div className="h-36 animate-pulse bg-muted/30" />}</RuledFrame>
      </section>
      {days.isError || events.isError ? (
        <RuledFrame className="py-10 text-sm text-muted-foreground">{t`Nu am putut citi rezultatele. Reîncearcă peste câteva secunde.`}</RuledFrame>
      ) : null}
      {events.data && days.data ? (
        <>
          <ParliamentBand days={sorted} />
          <LocalBand />
          <PresidentBand events={events.data} days={sorted} />
          <MapBand days={sorted} />
          <TurnoutBand events={events.data} days={sorted} />
          <AllElectionsBand events={events.data} />
        </>
      ) : null}
      <StartBand />
    </div>
  )
}

