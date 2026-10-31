import { useId, useMemo, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Info, Search } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HUB_SHORTCUT_LINK_CLASS } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import { eventTitle, placeKind } from './labels'
import { catalogFacts, type ElectionEvent, type HubData } from './model'
import { fold, matchPlaces, placeName, usePlaces, type Place } from './places'

/** A band's head beside its body, from a wide screen (the hubs' grid). */
export const BAND_GRID = 'grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8'

/**
 * The prototypes' addresses for each other, so every page links the others
 * the same way (each prototype reads its own parameter with
 * `useSearch({ strict: false })`). An election opens the live page, which
 * answers „not in the data" for an event the API does not serve; the
 * election, contest and analytics prototypes were retired on 2026-10-31.
 */
export const PROTOTYPE_HREF = {
  hub: () => '/development/elections/hub',
  /** One election (a platform event) on the live `/alegeri` page. */
  election: (eventKey: string) => `/alegeri/${encodeURIComponent(eventKey)}`,
  place: (siruta: string) => `/development/elections/localitate?loc=${encodeURIComponent(siruta)}`,
} as const

export const placeHref = PROTOTYPE_HREF.place

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/u

export function useFormat() {
  const { i18n } = useLingui()
  const locale = i18n.locale
  return useMemo(() => {
    const number = new Intl.NumberFormat(locale)
    // A date-only value is a calendar day: read and written in UTC, so no time zone moves it a day back.
    const calendarDay = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    // A moment (a read time) is dated in Romania's zone, the same on the server and in any browser.
    const momentDay = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' })
    return {
      locale: locale === 'en' ? ('en' as const) : ('ro' as const),
      n: (value: number) => number.format(value),
      day: (iso: string) => (DATE_ONLY.test(iso) ? calendarDay.format(new Date(`${iso}T00:00:00Z`)) : momentDay.format(new Date(iso))),
    }
  }, [locale])
}

// ───────────────────────────────────────────────────── the hero ──

/**
 * The front door's head in the hubs' language (Guidelines G1): the lattice,
 * the kicker, a two-line headline, the computed lede, the search, the
 * shortcuts, a panel beside them and the one source line at the foot.
 */
export function ElectionsHero({
  idPrefix,
  headline,
  lede,
  search,
  shortcuts,
  panel,
  source,
}: {
  readonly idPrefix: string
  readonly headline: ReactNode
  readonly lede: ReactNode
  readonly search: ReactNode
  readonly shortcuts: readonly { readonly key: string; readonly label: ReactNode; readonly href: string }[]
  readonly panel: ReactNode
  readonly source: ReactNode
}) {
  return (
    <section className="relative border-b">
      <TwoLayerLattice idPrefix={idPrefix} />
      <RuledFrame marker="hero" className="py-12 sm:py-16 lg:pb-24 lg:pt-20">
        <CornerTicks />
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7">
            <MonoLabel className="text-muted-foreground">
              <Trans>Alegeri / Catalogul surselor electorale</Trans>
            </MonoLabel>
            <h1 className="mt-5 text-[clamp(2.2rem,8vw+0.6rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">{headline}</h1>
            <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">{lede}</p>
            <div className="mt-6 sm:mt-7">{search}</div>
            <nav aria-label={t`Scurtături`} className="mt-4">
              <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">
                <Trans>Sau mergi direct la</Trans>
              </MonoLabel>
              <span className="flex flex-wrap gap-x-4 sm:ml-4 sm:inline-flex sm:gap-y-1.5 sm:align-middle">
                {shortcuts.map((shortcut) => (
                  <a key={shortcut.key} href={shortcut.href} className={HUB_SHORTCUT_LINK_CLASS}>
                    {shortcut.label}
                  </a>
                ))}
              </span>
            </nav>
          </div>
          <div className="min-w-0 lg:col-span-5">{panel}</div>
          <div className="min-w-0 lg:absolute lg:inset-x-8 lg:bottom-6">{source}</div>
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

/** The panel beside the headline: a framed list with its caption and, at most, one toggle. */
export function HeroPanel({
  titleId,
  title,
  aside,
  footer,
  children,
}: {
  readonly titleId: string
  readonly title: ReactNode
  readonly aside?: ReactNode
  readonly footer?: ReactNode
  readonly children: ReactNode
}) {
  return (
    <section className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby={titleId}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <MonoLabel id={titleId} className="text-primary">
          {title}
        </MonoLabel>
        {aside}
      </div>
      {children}
      {footer ? <p className="mt-3 text-xs text-muted-foreground">{footer}</p> : null}
    </section>
  )
}

// ───────────────────────────────────────────── the source line ──

/** The notes every elections page carries (§12.3); a page adds its own after them. */
export function commonNotes(): readonly ReactNode[] {
  return [
    <Trans key="edition">
      O alegere apare în una sau mai multe ediții de date, de la surse diferite. Edițiile se suprapun: nu se adună, iar două ediții nu înseamnă două alegeri.
    </Trans>,
    <Trans key="labels">
      Gruparea pe alegeri, anul, tipul, funcția, locul și turul sunt etichetele sursei. Niciuna nu e încă verificată; turul „final" e o etichetă, nu un rezultat definitiv.
    </Trans>,
    <Trans key="rows">
      Un rând de scrutin e o funcție la un loc raportat de sursă. Aceeași cursă poate avea mai multe rânduri (localitatea, numerotarea sursei, județul, țara), deci rândurile nu
      numără curse.
    </Trans>,
    <Trans key="results">Voturile, prezența, candidații și mandatele nu sunt încă publicate. Nicio cifră de pe pagină nu e un rezultat.</Trans>,
    <Trans key="e1">
      Edițiile etichetate „locale 2014" conțin, după auditul datelor, rezultatele din 2016. Sunt arătate cu eticheta sursei, nu ca alegeri din 2014, și sunt numărate cu alegerile
      din 2016, nu ca o alegere în plus.
    </Trans>,
    <Trans key="family">Cinci ediții europarlamentare și două parlamentare au alt tip în eticheta sursei; pagina le grupează după alegerea căreia îi aparțin.</Trans>,
  ]
}

/** The page's one source line, with its caveats behind one amber marker (Guidelines G4, G5). */
export function ElectionsSourceLine({ readAt, notes, className }: { readonly readAt: string; readonly notes: readonly ReactNode[]; readonly className?: string }) {
  const format = useFormat()
  return (
    <p className={cn('flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground', className)}>
      <span>
        <Trans>Sursa: BEC, AEP și ROAEP, prin API-ul Transparenta.eu, citit pe {format.day(readAt)}</Trans>
      </span>
      {notes.length > 0 ? <CaveatsMarker notes={notes} /> : null}
    </p>
  )
}

export function CaveatsMarker({ notes }: { readonly notes: readonly ReactNode[] }) {
  const captionId = useId()
  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex min-h-8 min-w-8 items-center justify-center gap-0.5 rounded-sm px-1 text-xs font-semibold tabular-nums text-amber-700 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-amber-400"
        aria-label={t`Ce trebuie știut despre aceste date (${notes.length} note)`}
      >
        <Info className="size-4" aria-hidden="true" />
        {notes.length}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(28rem,calc(100vw-2rem))] text-sm leading-relaxed" aria-labelledby={captionId}>
        <MonoLabel id={captionId} className="block text-muted-foreground">
          <Trans>Ce trebuie știut despre aceste date</Trans>
        </MonoLabel>
        <ul className="mt-3 list-disc space-y-2 pl-4 text-foreground">
          {notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

// ───────────────────────────────────────────────── the figures ──

function bandLink(hash: string) {
  return function BandLink(label: ReactNode, className: string) {
    return (
      <a href={`#${hash}`} className={className}>
        {label}
      </a>
    )
  }
}

/** The four figures every variant leads with: elections, editions, rows and places — each in the unit it counts (G3). */
export function CatalogFigures({
  data,
  links,
}: {
  readonly data: HubData
  readonly links: { readonly events: string; readonly editions: string; readonly rows: string; readonly places: string }
}) {
  const format = useFormat()
  const facts = catalogFacts(data)
  const items: readonly HubFact[] = [
    {
      key: 'events',
      value: facts.events,
      digits: 0,
      label: <Trans>Alegeri în date</Trans>,
      note:
        facts.folded > 0 ? (
          <Trans>
            din {facts.firstYear} până în {facts.lastYear}; „locale 2014” numărate cu 2016
          </Trans>
        ) : (
          <Trans>
            din {facts.firstYear} până în {facts.lastYear}, grupate de platformă
          </Trans>
        ),
      link: bandLink(links.events),
    },
    {
      key: 'editions',
      value: facts.editions,
      digits: 0,
      label: <Trans>Ediții de date</Trans>,
      note: <Trans>{facts.multiEdition} alegeri au mai multe; nu se adună</Trans>,
      link: bandLink(links.editions),
    },
    {
      key: 'rows',
      value: facts.rows,
      digits: 0,
      label: <Trans>Rânduri de scrutin</Trans>,
      note: <Trans>pe ediția de referință a fiecărei alegeri; nu curse</Trans>,
      link: bandLink(links.rows),
    },
    {
      key: 'places',
      value: data.places.siruta,
      digits: 0,
      label: <Trans>Localități raportate</Trans>,
      note: <Trans>coduri SIRUTA; {format.n(data.places.named)} în lista INS de azi</Trans>,
      link: bandLink(links.places),
    },
  ]
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <HubFiguresBand facts={items} locale={format.locale} />
      </RuledFrame>
    </section>
  )
}

// ──────────────────────────────────────────────────── the rows ──

export interface Row {
  readonly key: string
  readonly label: ReactNode
  readonly meta?: ReactNode
  readonly value: ReactNode
  /** The bar's length as a share of the longest; none draws no bar. */
  readonly fraction?: number
  /** A muted value: something the data does not hold (a gap), never a zero. */
  readonly muted?: boolean
  /** Wraps the row in its link; none for a row with nowhere to go. */
  readonly link?: (body: ReactNode, className: string) => ReactNode
}

const LIST = 'divide-y divide-border/70 border-y border-border/70'
const ROW = 'group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 px-1 py-2.5'
const ROW_LINK = 'transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none'

/** The hubs' ranked rows: a name with a share bar and a quiet line under it, the value alone at the right. */
export function Rows({ rows, numbered = false, className }: { readonly rows: readonly Row[]; readonly numbered?: boolean; readonly className?: string }) {
  return (
    <ol className={cn(LIST, className)}>
      {rows.map((row, index) => {
        const body = (
          <>
            <span className={cn('grid min-w-0 gap-x-2', numbered ? 'grid-cols-[1.75rem_minmax(0,1fr)]' : 'grid-cols-1')}>
              {numbered ? <MonoLabel className="pt-0.5 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel> : null}
              <span className="min-w-0">
                <span className="block truncate text-sm text-foreground">{row.label}</span>
                {row.fraction !== undefined ? <ShareBar fraction={row.fraction} /> : null}
                {row.meta ? <span className="mt-1 block truncate text-xs tabular-nums text-muted-foreground">{row.meta}</span> : null}
              </span>
            </span>
            <span className={cn('whitespace-nowrap text-right text-sm tabular-nums', row.muted ? 'text-muted-foreground' : 'font-semibold text-foreground')}>{row.value}</span>
          </>
        )
        return <li key={row.key}>{row.link ? row.link(body, cn(ROW, ROW_LINK)) : <div className={ROW}>{body}</div>}</li>
      })}
    </ol>
  )
}

export function ShareBar({ fraction, className }: { readonly fraction: number; readonly className?: string }) {
  return (
    <span className={cn('mt-1 block h-1 bg-muted', className)} aria-hidden="true">
      <span className="block h-1 bg-primary/70 transition-colors group-hover:bg-primary" style={{ width: `${Math.min(Math.max(fraction * 100, 0.8), 100).toFixed(1)}%` }} />
    </span>
  )
}

/** A link to an edition's live catalog page. */
export function editionLink(electionKey: string) {
  return function EditionLink(body: ReactNode, className: string) {
    return (
      <Link to="/alegeri/$electionKey" params={{ electionKey }} className={className}>
        {body}
      </Link>
    )
  }
}

// ──────────────────────────────────────────────────── the search ──

type Hit = { readonly kind: 'event'; readonly event: ElectionEvent; readonly title: string } | { readonly kind: 'place'; readonly place: Place }

/**
 * One search over the elections and the places the sources report. An
 * election opens the election prototype, a place the locality prototype (or
 * `onPlace`, when the page picks places itself). The typed text never
 * reaches the address.
 */
export function ElectionsSearch({
  events,
  scope = 'all',
  onPlace,
  placeholder,
}: {
  readonly events: readonly ElectionEvent[]
  readonly scope?: 'all' | 'places'
  readonly onPlace?: (siruta: string) => void
  readonly placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  // The list shows while the field has focus; a click on a hit keeps the focus (the list's mousedown is cancelled).
  const [focused, setFocused] = useState(false)
  const [touched, setTouched] = useState(scope === 'places')
  const places = usePlaces(touched)
  const listId = useId()
  const format = useFormat()
  const hits = useMemo((): readonly Hit[] => {
    const words = fold(query).split(' ').filter(Boolean)
    if (words.length === 0) return []
    const eventHits: Hit[] =
      scope === 'all'
        ? events
            .map((event) => ({ kind: 'event' as const, event, title: eventTitle(event) }))
            .filter((hit) => {
              const tokens = fold(`${hit.title} ${String(hit.event.year)}`).split(' ')
              return words.every((word) => tokens.some((token) => token.startsWith(word)))
            })
            .slice(0, 4)
        : []
    const placeHits: Hit[] = places.data ? matchPlaces(places.data, query, scope === 'all' ? 6 : 10).map((place) => ({ kind: 'place' as const, place })) : []
    return [...eventHits, ...placeHits]
  }, [events, places.data, query, scope])
  const optionId = (index: number) => `${listId}-${String(index)}`
  const expanded = focused && hits.length > 0

  const open = (hit: Hit) => {
    if (hit.kind === 'place' && onPlace) {
      onPlace(hit.place.siruta)
      setQuery('')
      return
    }
    window.location.assign(hitHref(hit))
  }

  return (
    <div className="relative max-w-xl">
      <label className="flex h-12 items-center gap-3 border bg-card px-3 shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">{scope === 'places' ? <Trans>Caută o localitate</Trans> : <Trans>Caută o alegere sau o localitate</Trans>}</span>
        <input
          type="search"
          value={query}
          onFocus={() => {
            setTouched(true)
            setFocused(true)
          }}
          onBlur={() => setFocused(false)}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
            setFocused(true)
          }}
          onKeyDown={(event) => {
            if (!expanded) return
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActive((active + 1) % hits.length)
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((active - 1 + hits.length) % hits.length)
            } else if (event.key === 'Enter') {
              const hit = hits[active]
              if (!hit) return
              event.preventDefault()
              open(hit)
            } else if (event.key === 'Escape') {
              setQuery('')
              setFocused(false)
            }
          }}
          placeholder={placeholder ?? t`Caută: locale 2024, Cluj-Napoca, Sectorul 3…`}
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded ? optionId(active) : undefined}
          autoComplete="off"
        />
      </label>
      {expanded ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t`Rezultate`}
          className="absolute inset-x-0 top-full z-30 mt-1 divide-y border bg-popover shadow-md"
          onMouseDown={(event) => event.preventDefault()}
        >
          {hits.map((hit, index) => (
            <li key={hit.kind === 'event' ? hit.event.key : hit.place.siruta} id={optionId(index)} role="option" aria-selected={index === active}>
              <a
                href={hitHref(hit)}
                tabIndex={-1}
                onClick={(event) => {
                  if (hit.kind === 'place' && onPlace) {
                    event.preventDefault()
                    open(hit)
                  }
                }}
                className={cn('flex items-baseline justify-between gap-4 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50', index === active && 'bg-muted/50')}
              >
                {hit.kind === 'event' ? (
                  <>
                    <span className="min-w-0 truncate text-foreground">{hit.title}</span>
                    <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                      <Trans>{hit.event.editions.length} ediții</Trans>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="min-w-0">
                      <span className="block truncate text-foreground">{placeName(hit.place)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[placeKind(hit.place.ins?.kind), hit.place.ins?.county].filter(Boolean).join(', ') || t`nu e în lista INS de azi`}
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                      <Trans>{format.n(hit.place.rows.length)} rânduri</Trans>
                    </span>
                  </>
                )}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function hitHref(hit: Hit): string {
  return hit.kind === 'place' ? PROTOTYPE_HREF.place(hit.place.siruta) : PROTOTYPE_HREF.election(hit.event.key)
}

// ───────────────────────────────────────────────── mock marking ──

/**
 * The mark on every band that shows sample data (DESIGN.md §Mock-First
 * Contract): said in words, in the band's head, never by colour alone.
 */
export function MockBadge({ className }: { readonly className?: string }) {
  return (
    <MonoLabel className={cn('inline-flex items-center gap-1.5 border border-dashed border-foreground/40 bg-background px-1.5 py-0.5 text-foreground', className)}>
      <Trans>Date de probă, nu rezultate</Trans>
    </MonoLabel>
  )
}

/** „01 / Pe ani": a band's index from its place in the page's sections. */
export function sectionIndex(sections: readonly { readonly id: string; readonly label: string }[], id: string): string {
  const position = sections.findIndex((section) => section.id === id)
  return `${String(position + 1).padStart(2, '0')} / ${sections[position]?.label ?? ''}`
}
