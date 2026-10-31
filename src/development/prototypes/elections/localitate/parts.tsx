import { useState, type ReactNode } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft, FileQuestion, MapPin } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { Bone, SHOW_MORE_CLASS } from '@/features/procurement/components/home/home-chrome'
import { HomeBand, HomeSectionNav } from '@/features/procurement/components/home/home-section-nav'
import { HUB_BESIDE_TITLE_CLASS, HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import { eventShort, eventTitle, familyPlural, officeLabel, roundLabel, scopeLabel } from '../shared/labels'

import { countElections, FAMILIES, hubData, type ElectionEvent, type HubData } from '../shared/model'
import { usePlaces, type PlaceIndex } from '../shared/places'
import { BAND_GRID, ElectionsSearch, ElectionsSourceLine, PROTOTYPE_HREF, Rows, commonNotes, sectionIndex, useFormat, type Row } from '../shared/parts'
import { countyPlaces, isDisputedYear, isSector, namedPlace, placeSheet, placesPerEvent, type KindLetter, type NamedPlace, type OfficeRole, type PlaceSheet } from './model'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
export const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

const DEFAULT_LOC = '54975'
const SIRUTA_SHAPE = /^\d{1,6}$/u

// ──────────────────────────────────────────────────── URL state ──

/** `?loc=<siruta>`: the router JSON-parses search values, so a code arrives as a number. */
export function useLoc(): { readonly siruta: string; readonly setLoc: (siruta: string) => void } {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const raw = search.loc
  const text = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : ''
  const siruta = SIRUTA_SHAPE.test(text) ? text : DEFAULT_LOC
  // Written as a number: the router would quote a numeric-looking string (`loc=%2255008%22`).
  const setLoc = (next: string) =>
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => ({ ...previous, loc: Number(next) }),
      resetScroll: true,
    })
  return { siruta, setLoc }
}

// ──────────────────────────────────────────────────────── words ──

export const electionsCount = (n: number) => plural(n, { one: 'o alegere', few: '# alegeri', other: '# de alegeri' })
export const editionsCount = (n: number) => plural(n, { one: 'o ediție de date', few: '# ediții de date', other: '# de ediții de date' })
export const rowsCount = (n: number) => plural(n, { one: 'un rând de scrutin', few: '# rânduri de scrutin', other: '# de rânduri de scrutin' })
export const placesCount = (n: number) => plural(n, { one: 'o localitate', few: '# localități', other: '# de localități' })

export function kindWord(kind: KindLetter): string | null {
  switch (kind) {
    case 'R':
      return t`municipiu reședință de județ`
    case 'M':
      return t`municipiu`
    case 'O':
      return t`oraș`
    case 'C':
      return t`comună`
    case 'S':
      return t`sector`
    default:
      return null
  }
}

/** What the place is, in the words the sentence starts with. */
function whatItIs(named: NamedPlace): string {
  const county = named.county ?? ''
  switch (named.kind) {
    case 'R':
      return t`Municipiu reședință de județ, în județul ${county}.`
    case 'M':
      return t`Municipiu în județul ${county}.`
    case 'O':
      return t`Oraș în județul ${county}.`
    case 'C':
      return t`Comună în județul ${county}.`
    case 'S':
      return t`Sector al municipiului București.`
    default:
      return t`Cod SIRUTA pe care sursele îl numesc „${named.name}”; nu e în lista INS de azi.`
  }
}

/** The head sentence, computed: what the place is, then what the sources report here (the years and editions once the index lands). */
export function headSentence(named: NamedPlace, sheet: PlaceSheet | undefined): string {
  const what = whatItIs(named)
  if (!sheet) return `${what} ${t`Sursele raportează aici ${electionsCount(named.events)}.`}`
  // Elections, not platform groupings: the „2014" local editions count with 2016 (E1).
  const n = sheet.elections
  const editions = editionsCount(sheet.editions)
  if (n === 1) {
    const year = sheet.firstYear
    return `${what} ${t`Sursele raportează aici o alegere, cea din ${year}, în ${editions}.`}`
  }
  return `${what} ${t`Sursele raportează aici ${electionsCount(n)}, din ${sheet.firstYear} până în ${sheet.lastYear}, în ${editions}.`}`
}

/** The reported office's word, or the source's label verbatim in mono, said to be the source's. */
export function OfficeName({ office, className }: { readonly office: string; readonly className?: string }) {
  const label = officeLabel(office)
  if (label) return <span className={className}>{label}</span>
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-1.5', className)}>
      <span className="font-mono text-[0.8em] text-foreground">{office}</span>
      <span className="text-xs text-muted-foreground">
        <Trans>(etichetă din sursă)</Trans>
      </span>
    </span>
  )
}

export function roleLabel(role: OfficeRole): string {
  switch (role) {
    case 'own':
      return t`Funcțiile localității`
    case 'wider':
      return t`Raportate aici, pentru o cursă mai largă`
    case 'source':
      return t`Etichete din sursă, fără funcție spusă`
  }
}

/** A round as a short chip, the full label for assistive technology; a missing round is a dash, never „turul 1". */
export function roundShort(round: string | null): string {
  switch (round) {
    case 'tur1':
      return 'T1'
    case 'tur2':
      return 'T2'
    case 'tur3':
      return 'T3'
    case null:
      return '—'
    default:
      return round
  }
}

const CHIP = 'inline-flex h-6 min-w-8 items-center justify-center rounded-sm border px-1.5 text-xs tabular-nums text-foreground'

/** One contest row, shown as its round; the edition in the tooltip, so two editions' chips can be told apart. */
export function ContestChip({ round, editionKey, label }: { readonly round: string | null; readonly editionKey: string; readonly label?: string }) {
  const full = label ? `${label}, ${roundLabel(round)}` : roundLabel(round)
  return (
    <span className={cn(CHIP, round === null && 'text-muted-foreground')} title={`${editionKey} · ${full}`}>
      <span aria-hidden="true">{label ? `${label} ${roundShort(round)}` : roundShort(round)}</span>
      <span className="sr-only">
        {full}, {editionKey}
      </span>
    </span>
  )
}

/** The event's short name, the disputed „2014" in quotes with its mark (E1). */
export function EventName({ event, long = false }: { readonly event: ElectionEvent; readonly long?: boolean }) {
  const disputed = isDisputedYear(event)
  const text = long ? eventTitle(event) : eventShort(event)
  if (!disputed) return <>{text}</>
  return (
    <>
      {text.replace(String(event.year), `„${String(event.year)}”`)}
      <span className="ml-0.5 text-status-partial-fg" aria-hidden="true">
        ✱
      </span>
      <span className="sr-only"> {t`(an disputat: date din 2016)`}</span>
    </>
  )
}

// ───────────────────────────────────────────────────────── head ──

const HEADING = {
  short: 'text-4xl sm:text-6xl lg:text-7xl',
  medium: 'text-3xl sm:text-5xl lg:text-6xl',
  long: 'text-2xl sm:text-4xl lg:text-5xl',
} as const

function headingSize(name: string): keyof typeof HEADING {
  return name.length <= 22 ? 'short' : name.length <= 44 ? 'medium' : 'long'
}

function Kicker({ named }: { readonly named: NamedPlace | null }) {
  return (
    <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground">
      <a href={PROTOTYPE_HREF.hub()} className="group inline-flex items-center gap-1.5 hover:text-foreground">
        <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        <span>
          <Trans>Alegeri</Trans>
        </span>
      </a>
      <span className="hidden items-center gap-2 sm:flex">
        <span aria-hidden="true">/</span>
        <span>
          <Trans>Localitate</Trans>
        </span>
        {named?.county ? (
          <>
            <span aria-hidden="true">/</span>
            <span>{named.county}</span>
          </>
        ) : null}
      </span>
    </MonoLabel>
  )
}

/** The INS page of the same code, as where the source reported — a 32px icon with its tooltip. */
function InsAction({ siruta }: { readonly siruta: string }) {
  const label = t`Pagina INS a localității (loc de raportare)`
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={`/ins/teritorii/${siruta}`}
            aria-label={label}
            className="inline-flex size-8 items-center justify-center rounded-sm border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MapPin className="size-4" aria-hidden="true" />
          </a>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/** Each family's years reported here, newest first, as links to the election; the index's shape before it lands. */
function ReportedIn({ sheet }: { readonly sheet: PlaceSheet | undefined }) {
  const families = FAMILIES.map((family) => ({
    family,
    events: sheet ? sheet.events.filter((entry) => entry.event.family === family) : [],
  })).filter((row) => row.events.length > 0)
  return (
    <div>
      <MonoLabel className="block text-muted-foreground">
        <Trans>Raportată în</Trans>
      </MonoLabel>
      {sheet ? (
        <dl className="mt-3 space-y-2 text-sm">
          {families.map((row) => (
            <div key={row.family} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3">
              <dt className="text-muted-foreground">{familyPlural(row.family)}</dt>
              <dd className="flex flex-wrap gap-x-3 gap-y-1 tabular-nums">
                {row.events.map((entry) => (
                  <a key={entry.event.key} href={PROTOTYPE_HREF.election(entry.event.key)} className="text-foreground underline-offset-4 hover:underline">
                    {isDisputedYear(entry.event) ? (
                      <>
                        „{entry.event.year}”
                        <span className="text-status-partial-fg" aria-hidden="true">
                          ✱
                        </span>
                      </>
                    ) : (
                      entry.event.year
                    )}
                    {entry.editions.length > 1 ? <span className="ml-0.5 text-xs text-muted-foreground">×{entry.editions.length}</span> : null}
                  </a>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="mt-3 space-y-2" aria-hidden="true">
          <Bone className="w-2/3" />
          <Bone className="w-1/2" />
        </div>
      )}
    </div>
  )
}

export function PlaceHead({ named, sheet, onPlace }: { readonly named: NamedPlace; readonly sheet: PlaceSheet | undefined; readonly onPlace: (siruta: string) => void }) {
  return (
    <section className="relative border-b" aria-labelledby="elections-place-title" aria-busy={sheet ? undefined : true}>
      <TwoLayerLattice idPrefix="elections-place" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="flex items-center justify-between gap-4">
          <Kicker named={named} />
          {named.inInsList ? <InsAction siruta={named.siruta} /> : null}
        </div>
        <div className="mt-4 grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7">
            <h1 id="elections-place-title" className={cn('font-extrabold leading-[0.95] tracking-tighter text-foreground', HEADING[headingSize(named.name)])}>
              {named.name}
            </h1>
            <MonoLabel className="mt-3 block tabular-nums text-muted-foreground">
              SIRUTA {named.siruta}
              {named.inInsList ? null : (
                <>
                  {' · '}
                  <Trans>nu e în lista INS de azi</Trans>
                </>
              )}
            </MonoLabel>
            <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg">{headSentence(named, sheet)}</p>
            <div className="mt-6">
              <ElectionsSearch events={[]} scope="places" onPlace={onPlace} placeholder={t`Altă localitate: Dej, Sectorul 3, Cuzdrioara…`} />
            </div>
          </div>
          <div className="min-w-0 lg:col-span-5 lg:border-l lg:pl-8">
            <ReportedIn sheet={sheet} />
          </div>
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

/** A code the sources never report: said as absence, never as „no election". */
export function PlaceMissing({ siruta, onPlace }: { readonly siruta: string; readonly onPlace: (siruta: string) => void }) {
  return (
    <div className="bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <section className="relative border-b" aria-labelledby="elections-place-title">
        <TwoLayerLattice idPrefix="elections-place" />
        <RuledFrame className="py-10 sm:py-12 lg:py-14">
          <CornerTicks />
          <Kicker named={null} />
          <h1 id="elections-place-title" className={cn('mt-4 font-extrabold leading-[0.95] tracking-tighter text-foreground', HEADING.short)}>
            SIRUTA {siruta}
          </h1>
          <div role="status" className="mt-8 max-w-[60ch]">
            <FileQuestion className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-lg font-semibold text-foreground">
              <Trans>Niciun rând la acest cod</Trans>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t`Sursele nu raportează niciun rând de scrutin la codul SIRUTA ${siruta}. Lipsa unui rând nu înseamnă că nu au fost alegeri acolo.`}</p>
          </div>
          <div className="mt-6">
            <ElectionsSearch events={[]} scope="places" onPlace={onPlace} placeholder={t`Caută o localitate: Dej, Sectorul 3, Cuzdrioara…`} />
          </div>
        </RuledFrame>
      </section>
    </div>
  )
}

// ────────────────────────────────────────────────────── figures ──

function bandLink(hash: string) {
  return function BandLink(label: ReactNode, className: string) {
    return (
      <a href={`#${hash}`} className={className}>
        {label}
      </a>
    )
  }
}

/** Four facts in the units they count (G3): events, editions, rows, and the catalog's events with no row here. */
export function PlaceFigures({ sheet, links }: { readonly sheet: PlaceSheet | undefined; readonly links: { readonly spine: string; readonly absent: string } }) {
  const format = useFormat()
  if (!sheet) {
    return (
      <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`} aria-busy="true">
        <RuledFrame>
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className={cn('px-5 py-6 sm:py-7', index % 2 === 1 && 'border-l', index >= 2 && 'border-t lg:border-t-0', index >= 1 && 'lg:border-l')}>
                <Bone className="h-8 w-16" />
                <Bone className="mt-3 w-2/3" />
              </div>
            ))}
          </div>
        </RuledFrame>
      </section>
    )
  }
  const multi = sheet.multiEdition
  const elsewhere = countElections(sheet.absent.filter((entry) => entry.reason === 'elsewhere').map((entry) => entry.event))
  const wider = countElections(sheet.absent.filter((entry) => entry.reason === 'wider').map((entry) => entry.event))
  const folded = sheet.elections < sheet.events.length
  const facts: readonly HubFact[] = [
    {
      key: 'events',
      value: sheet.elections,
      digits: 0,
      label: <Trans>Alegeri raportate aici</Trans>,
      note: folded ? (
        <Trans>
          din {sheet.firstYear} până în {sheet.lastYear}; „locale 2014” numărate cu 2016
        </Trans>
      ) : sheet.elections > 1 ? (
        <Trans>
          din {sheet.firstYear} până în {sheet.lastYear}, grupate de platformă
        </Trans>
      ) : (
        <Trans>în {sheet.firstYear}, grupată de platformă</Trans>
      ),
      link: bandLink(links.spine),
    },
    {
      key: 'editions',
      value: sheet.editions,
      digits: 0,
      label: <Trans>Ediții de date</Trans>,
      note:
        multi === 1 ? (
          <Trans>o alegere are mai multe; nu se adună</Trans>
        ) : multi > 1 ? (
          <Trans>{electionsCount(multi)} au mai multe; nu se adună</Trans>
        ) : (
          <Trans>câte una pe alegere</Trans>
        ),
      link: bandLink(links.spine),
    },
    {
      key: 'rows',
      value: sheet.referenceRows,
      digits: 0,
      label: <Trans>Rânduri de scrutin</Trans>,
      note: <Trans>pe ediția cu cele mai multe rânduri aici, din fiecare alegere; nu curse</Trans>,
      link: bandLink(links.spine),
    },
    {
      key: 'absent',
      value: elsewhere + wider,
      digits: 0,
      label: <Trans>Alegeri din date fără rând aici</Trans>,
      note: (
        <Trans>
          {format.n(elsewhere)} pe localități în altă parte, {format.n(wider)} doar mai larg
        </Trans>
      ),
      link: bandLink(links.absent),
    },
  ]
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <HubFiguresBand facts={facts} locale={format.locale} />
      </RuledFrame>
    </section>
  )
}

// ──────────────────────────────────────────────────────── bands ──

export interface Section {
  readonly id: string
  readonly label: string
}

/** A band with its head at the left and its rows at the right (lists), or its head above a full-width table. */
export function Band({
  id,
  index,
  title,
  lede,
  aside,
  full = false,
  children,
}: {
  readonly id: string
  readonly index: string
  readonly title: ReactNode
  readonly lede?: ReactNode
  readonly aside?: ReactNode
  readonly full?: boolean
  readonly children: ReactNode
}) {
  const titleId = `elections-place-${id}-title`
  if (full) {
    return (
      <HomeBand id={id} labelledBy={titleId}>
        <HubSectionHead titleId={titleId} index={index} title={title} lede={lede} aside={aside} />
        <div className="mt-8">{children}</div>
      </HomeBand>
    )
  }
  return (
    <HomeBand id={id} labelledBy={titleId}>
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead titleId={titleId} index={index} title={title} lede={lede} aside={aside} />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)}>{children}</div>
      </div>
    </HomeBand>
  )
}

function href(address: string) {
  return function Href(body: ReactNode, className: string) {
    return (
      <a href={address} className={className}>
        {body}
      </a>
    )
  }
}

/** A list capped at `limit`, with the control that opens the rest and the line that says how many of how many. */
function CappedRows({ rows, limit, numbered = false }: { readonly rows: readonly Row[]; readonly limit: number; readonly numbered?: boolean }) {
  const [open, setOpen] = useState(false)
  const format = useFormat()
  const shown = open ? rows : rows.slice(0, limit)
  return (
    <>
      <Rows rows={shown} numbered={numbered} />
      {rows.length > limit ? (
        <p className="flex flex-wrap items-baseline gap-x-4 text-xs text-muted-foreground">
          <button type="button" onClick={() => setOpen(!open)} className={SHOW_MORE_CLASS} aria-expanded={open}>
            {open ? t`Arată mai puține` : t`Arată toate (${format.n(rows.length)})`}
          </button>
          {open ? null : (
            <Trans>
              primele {format.n(shown.length)} din {format.n(rows.length)}
            </Trans>
          )}
        </p>
      ) : null}
    </>
  )
}

/** The catalog's events with no row at this code, in three lists: reported per locality elsewhere, reported only wider, not in the data at all. */
export function AbsentBand({
  sheet,
  index,
  places,
  hub,
  id = 'lipsuri',
}: {
  readonly sheet: PlaceSheet | undefined
  readonly index: string
  readonly places: PlaceIndex | undefined
  readonly hub: HubData
  readonly id?: string
}) {
  const format = useFormat()
  const per = places ? placesPerEvent(places, hub) : undefined
  const elsewhere = sheet?.absent.filter((entry) => entry.reason === 'elsewhere') ?? []
  const wider = sheet?.absent.filter((entry) => entry.reason === 'wider') ?? []
  const calendar = sheet?.calendarMissing ?? []
  return (
    <Band
      id={id}
      index={index}
      title={<Trans>Fără rând aici</Trans>}
      lede={<Trans>Alegerile din date pe care sursele nu le raportează la acest cod SIRUTA. Lipsa unui rând nu spune că nu au fost alegeri aici.</Trans>}
    >
      {sheet ? (
        <div className="space-y-10">
          {elsewhere.length > 0 ? (
            <div>
              <MonoLabel className="block text-muted-foreground">
                <Trans>Raportate pe localități, dar nu la acest cod</Trans>
              </MonoLabel>
              <CappedRows
                limit={8}
                rows={elsewhere.map((entry) => ({
                  key: entry.event.key,
                  label: <EventName event={entry.event} long />,
                  meta: entry.scopes.map((scope) => scopeLabel(scope)).join(' · '),
                  value: per?.get(entry.event.key) ? placesCount(per.get(entry.event.key) ?? 0) : '—',
                  link: href(PROTOTYPE_HREF.election(entry.event.key)),
                }))}
              />
            </div>
          ) : null}
          {wider.length > 0 ? (
            <div>
              <MonoLabel className="block text-muted-foreground">
                <Trans>Raportate doar mai larg: pe județ, pe numerotarea sursei, în străinătate sau pe țară</Trans>
              </MonoLabel>
              <CappedRows
                limit={8}
                rows={wider.map((entry) => ({
                  key: entry.event.key,
                  label: <EventName event={entry.event} long />,
                  meta: editionsCount(entry.event.editions.length),
                  value: entry.scopes.map((scope) => scopeLabel(scope)).join(' · '),
                  muted: true,
                  link: href(PROTOTYPE_HREF.election(entry.event.key)),
                }))}
              />
            </div>
          ) : null}
          {calendar.length > 0 ? (
            <div>
              <MonoLabel className="block text-muted-foreground">
                <Trans>Nu sunt în date, după calendarul Transparenta.eu (de confirmat)</Trans>
              </MonoLabel>
              <Rows
                rows={calendar.map((entry) => ({
                  key: `${entry.family}-${String(entry.year)}-${entry.instance ?? ''}`,
                  label: eventTitle({ family: entry.family, year: entry.year, instance: null }),
                  meta:
                    entry.instance === 'annulled'
                      ? t`anulate`
                      : entry.instance === 'rerun'
                        ? t`reluate`
                        : entry.loaded > 0
                          ? t`una din ${format.n(entry.count ?? 1)} e în date`
                          : undefined,
                  value: '—',
                  muted: true,
                }))}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <HubPending rows={8} />
      )}
    </Band>
  )
}

/** The other places of the same INS county, the largest first, the page's own marked; nothing for a code the INS list lacks. */
export function NeighboursBand({ named, index, id = 'vecini' }: { readonly named: NamedPlace; readonly index: string; readonly id?: string }) {
  const format = useFormat()
  const rows = named.countyCode ? countyPlaces(named.countyCode) : []
  const county = named.county ?? ''
  return (
    <Band
      id={id}
      index={index}
      title={<Trans>Alte localități din județ</Trans>}
      lede={
        named.countyCode ? (
          <Trans>
            Localitățile din județul {county} după lista INS, cu alegerile raportate la codul fiecăreia; {format.n(rows.length)} în total.
          </Trans>
        ) : (
          <Trans>Codul nu e în lista INS de azi, așa că nu are un județ aici. Caută localitatea după nume, mai sus.</Trans>
        )
      }
    >
      {rows.length > 0 ? (
        <CappedRows
          limit={12}
          rows={rows.map((place) => ({
            key: place.siruta,
            label:
              place.siruta === named.siruta ? (
                <>
                  <span className="font-semibold">{place.name}</span>
                  <MonoLabel className="ml-2 text-primary">
                    <Trans>aceasta</Trans>
                  </MonoLabel>
                </>
              ) : (
                place.name
              ),
            meta: kindWord(place.kind) ?? undefined,
            value: electionsCount(place.events),
            link: href(PROTOTYPE_HREF.place(place.siruta)),
          }))}
        />
      ) : null}
    </Band>
  )
}

// ───────────────────────────────────────────────── source line ──

/** The page's notes after the common ones: scope, source-numbered rows, the INS list, E2 for a sector. */
export function placeNotes(named: NamedPlace, sheet: PlaceSheet | undefined): readonly ReactNode[] {
  const notes: ReactNode[] = [
    ...commonNotes(),
    <Trans key="scope">
      Un rând la această localitate spune că sursa a raportat aici, nu că funcția s-a ales doar aici: președintele și consiliul județean, Consiliul General, Camera și Senatul sunt
      curse mai largi, raportate pe localități.
    </Trans>,
    <Trans key="numbered">
      Rândurile pe care sursele le numerotează singure, fără cod SIRUTA (localele din 2000, 2008 și 2012, parlamentarele din 2008 și 2024), nu pot fi legate de o localitate fără o
      potrivire pe nume, așa că nu apar aici.
    </Trans>,
  ]
  if (named.inInsList) {
    notes.push(<Trans key="ins">Pagina INS e legată după codul SIRUTA raportat de sursă, ca loc de raportare.</Trans>)
  } else {
    notes.push(
      <Trans key="unnamed">
        Codul {named.siruta} nu e în lista INS de azi; numele e cel dat de sursă. Poate fi un cod vechi al unei localități de azi, dar fără o potrivire pe nume nu se leagă.
      </Trans>,
    )
  }
  if (isSector(named) && sheet?.rows.some((row) => row.office === 'local_election')) {
    notes.push(
      <Trans key="e2">
        La sectoare, rândul „local_election” din edițiile locale poate fi cel al primarului general, înregistrat sub sector (auditul datelor, E2); API-ul nu spune.
      </Trans>,
    )
  }
  return notes
}

export function PlaceSourceLine({ named, sheet, readAt }: { readonly named: NamedPlace; readonly sheet: PlaceSheet | undefined; readonly readAt: string }) {
  return (
    <section className="border-b">
      <RuledFrame className="py-8">
        <ElectionsSourceLine readAt={readAt} notes={placeNotes(named, sheet)} />
      </RuledFrame>
    </section>
  )
}

// ───────────────────────────────────────────────────── the page ──

export interface Spine {
  readonly id: string
  readonly label: string
  readonly title: ReactNode
  readonly lede: (sheet: PlaceSheet) => ReactNode
  readonly full?: boolean
  readonly render: (sheet: PlaceSheet, context: { readonly named: NamedPlace; readonly places: PlaceIndex; readonly hub: HubData }) => ReactNode
  /** The spine also lists the catalog's events with no row here, so the page has no separate band for them. */
  readonly coversAbsent?: boolean
}

/**
 * The page every variant shares: the head (rendered on the server from the
 * name map), the pinned nav, the figures, the variant's spine, the events
 * with no row here, the county's other places, and the one source line.
 */
export function PlacePage({ spine }: { readonly spine: Spine }) {
  const { siruta, setLoc } = useLoc()
  const named = namedPlace(siruta)
  const hub = hubData()
  const places = usePlaces()
  const sheet = places.data && named ? (placeSheet(places.data, hub, siruta) ?? undefined) : undefined
  if (!named) return <PlaceMissing siruta={siruta} onPlace={setLoc} />
  const sections: readonly Section[] = [
    { id: spine.id, label: spine.label },
    ...(spine.coversAbsent ? [] : [{ id: 'lipsuri', label: t`Fără rând aici` }]),
    { id: 'vecini', label: t`În județ` },
  ]
  return (
    <div className="relative w-full overflow-x-clip bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <PlaceHead named={named} sheet={sheet} onPlace={setLoc} />
      <HomeSectionNav title={named.name} sections={sections} />
      <PlaceFigures sheet={sheet} links={{ spine: spine.id, absent: spine.coversAbsent ? spine.id : 'lipsuri' }} />
      <Band id={spine.id} index={sectionIndex(sections, spine.id)} title={spine.title} lede={sheet ? spine.lede(sheet) : undefined} full={spine.full}>
        {sheet && places.data ? spine.render(sheet, { named, places: places.data, hub }) : <HubPending rows={8} />}
      </Band>
      {spine.coversAbsent ? null : <AbsentBand sheet={sheet} index={sectionIndex(sections, 'lipsuri')} places={places.data} hub={hub} />}
      <NeighboursBand named={named} index={sectionIndex(sections, 'vecini')} />
      <PlaceSourceLine named={named} sheet={sheet} readAt={hub.readAt} />
    </div>
  )
}
