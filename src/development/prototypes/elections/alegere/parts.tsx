import { Fragment, useState, type ReactNode } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft, ArrowRight, ArrowUpRight, ExternalLink, MapPin, X } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CountUpValue } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { ChoiceSelect } from '@/features/private-companies/components/analytics/analytics-choices'
import { HomeBand, HomeSectionNav } from '@/features/procurement/components/home/home-section-nav'
import { RULED_NOTE_CLASS, SHOW_MORE_CLASS } from '@/features/procurement/components/home/home-chrome'
import { HUB_BESIDE_TITLE_CLASS, HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { cn } from '@/lib/utils'
import { ELECTIONS_PAGE_SIZE, parseElectionContestsSearch, useElectionContests, type ElectionContest } from '../shared/legacy-catalog'
import { eventShort, eventTitle, familyPlural, officeLabel, placeKind, roundLabel, scopeLabel } from '../shared/labels'
import { hubData, isDisputedEvent, SCOPE_TYPES, type Edition, type ElectionEvent, type HubData, type ScopeType } from '../shared/model'
import { BAND_GRID, commonNotes, editionLink, ElectionsSearch, ElectionsSourceLine, PROTOTYPE_HREF, Rows, useFormat, type Row } from '../shared/parts'
import { placeName, usePlaces } from '../shared/places'
import {
  auditNotesOf,
  cellKey,
  contestKeyOf,
  DEFAULT_EVENT_KEY,
  editionMatrix,
  familyRun,
  findEvent,
  officeUnion,
  pageParam,
  pickEdition,
  publishersOf,
  scopeUnion,
  summaries,
  textParam,
  type EditionSummary,
  type FamilyRun,
  type MatrixCell,
  type SearchKey,
} from './model'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
export const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

const PROTOTYPE_ID = 'elections/alegere'
const OUT_LINK = 'inline-flex min-h-11 items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0'
const ICON_ACTION =
  'inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const CELL_HEAD = 'h-9 px-2 align-bottom text-left'

// ───────────────────────────────────────────────── the address ──

export interface PageSearch {
  readonly eventKey: string
  readonly editionKey: string | undefined
  readonly office: string | undefined
  readonly scope: ScopeType | undefined
  readonly round: string | undefined
  readonly page: number
  readonly place: string | undefined
}

type Patch = Partial<Record<SearchKey, string | number | undefined>>

/** The page's address: its own Romanian keys read with `?? default`; the harness's `v` and `layout` kept on every move (G7). */
export function usePageSearch(): { readonly search: PageSearch; readonly move: (patch: Patch) => void; readonly href: (patch: Patch) => string } {
  const raw = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const scope = textParam(raw.arie)
  const search: PageSearch = {
    eventKey: textParam(raw.alegere) ?? DEFAULT_EVENT_KEY,
    editionKey: textParam(raw.editie),
    office: textParam(raw.functie),
    scope: scope && (SCOPE_TYPES as readonly string[]).includes(scope) ? (scope as ScopeType) : undefined,
    round: textParam(raw.tur),
    page: pageParam(raw.pagina),
    place: textParam(raw.loc),
  }
  const next = (previous: Record<string, unknown>, patch: Patch) => {
    const out: Record<string, unknown> = { ...previous }
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === '' || (key === 'pagina' && value === 1)) delete out[key]
      else out[key] = value
    }
    return out
  }
  const move = (patch: Patch) => void navigate({ to: '.', search: (previous: Record<string, unknown>) => next(previous, patch), resetScroll: false })
  const href = (patch: Patch) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(next(raw, patch))) if (typeof value === 'string' || typeof value === 'number') params.set(key, String(value))
    return `/development/${PROTOTYPE_ID}?${params.toString()}`
  }
  return { search, move, href }
}

/** A link that changes part of the page's address and keeps the rest. */
export function SearchLink({
  patch,
  className,
  children,
  ...rest
}: {
  readonly patch: Patch
  readonly className?: string
  readonly children: ReactNode
  readonly 'aria-current'?: 'page' | 'true'
}) {
  const { href } = usePageSearch()
  return (
    <a href={href(patch)} className={className} {...rest}>
      {children}
    </a>
  )
}

/** The keys a change of edition clears: the list's filters and page belong to the edition. */
export const EDITION_PATCH = (editionKey: string | undefined): Patch => ({ editie: editionKey, functie: undefined, arie: undefined, tur: undefined, pagina: undefined })

/** The address's `editie` for an edition of the event: none for the default (the largest, what the page opens on), its key for any other (G7). */
export function editionParam(event: ElectionEvent, editionKey: string): string | undefined {
  return editionKey === event.editions[0]?.key ? undefined : editionKey
}

// ─────────────────────────────────────────────── the page's data ──

export interface ElectionPage {
  readonly data: HubData
  readonly event: ElectionEvent
  readonly summaries: readonly EditionSummary[]
  /** The edition the address names, else the event's largest. */
  readonly edition: EditionSummary
  readonly run: FamilyRun
  readonly search: PageSearch
}

/** The page's model from the address, or null when no event has the key (the page then says so). */
export function useElectionPage(): ElectionPage | null {
  const { search } = usePageSearch()
  const data = hubData()
  const event = findEvent(data.events, search.eventKey)
  useClientDocumentTitle(event ? `${eventTitle(event)} · Transparenta.eu` : null)
  if (!event) return null
  const list = summaries(event)
  const picked = pickEdition(event, search.editionKey)
  const edition = list.find((summary) => summary.edition.key === picked.key) ?? list[0]
  if (!edition) return null
  return { data, event, summaries: list, edition, run: familyRun(data.events, event), search }
}

/** The API has no event under this key: distinct from a failed read; the way back is the front door. */
export function ElectionMissing({ eventKey }: { readonly eventKey: string }) {
  return (
    <section className="border-b" data-dev-marker={PROTOTYPE_MARKER}>
      <RuledFrame className="py-14">
        <div role="status" className="max-w-[60ch]">
          <h1 className="text-lg font-semibold text-foreground">
            <Trans>Alegerea nu e în date</Trans>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t`Nicio ediție de date nu e grupată sub cheia ${eventKey}. Lipsa din date nu înseamnă că nu au fost alegeri.`}</p>
          <a href={PROTOTYPE_HREF.hub()} className={cn(OUT_LINK, 'mt-4')}>
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <Trans>Toate alegerile</Trans>
          </a>
        </div>
      </RuledFrame>
    </section>
  )
}

// ───────────────────────────────────────────────────── words ──

/** Source labels that share a Romanian word with another label (`consiliu-judetean` and `county_council`): the key is shown beside the word so two rows never read as one. */
const ALIASED_OFFICES: ReadonlySet<string> = new Set(['consiliu-judetean', 'consiliu-general', 'bucharest_general_mayor'])

/** The office's word, or the source's label verbatim with a mark (G10). */
export function OfficeName({ office, className }: { readonly office: string; readonly className?: string }) {
  const label = officeLabel(office)
  if (label)
    return (
      <span className={className}>
        {label}
        {ALIASED_OFFICES.has(office) ? <span className="ml-1.5 font-mono text-xs text-muted-foreground">{office}</span> : null}
      </span>
    )
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-1.5', className)}>
      <span className="font-mono text-xs">{office}</span>
      <span className="text-xs text-muted-foreground">
        <Trans>(etichetă din sursă)</Trans>
      </span>
    </span>
  )
}

export function rowsText(n: number): string {
  return plural(n, { one: 'un rând de scrutin', few: '# rânduri de scrutin', other: '# de rânduri de scrutin' })
}

export function editionsText(n: number): string {
  return plural(n, { one: 'o ediție de date', few: '# ediții de date', other: '# de ediții de date' })
}

function joinRo(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} ${t`și`} ${items[items.length - 1] ?? ''}`
}

/** A level's word in the sentence, lower case, in the plural („localități", „județe"). */
function levelWord(scope: ScopeType): string {
  switch (scope) {
    case 'siruta':
      return t`localități`
    case 'source_constituency':
      return t`numerotarea sursei`
    case 'county':
      return t`județe`
    case 'diaspora':
      return t`secții din străinătate`
    case 'national':
      return t`țară`
    case 'chamber':
      return t`camere`
  }
}

/**
 * One plain sentence computed from the editions (G2): how many editions,
 * from whom, the rows of each (listed, never added), the offices the data
 * knows, the levels, and that no result is published.
 */
export function headSentence(event: ElectionEvent, list: readonly EditionSummary[]): string {
  const format = (n: number) => new Intl.NumberFormat('ro').format(n)
  const publishers = publishersOf(event)
  const rows = list.map((summary) => format(summary.edition.contests))
  const offices = officeUnion(event)
    .map((office) => officeLabel(office))
    .filter((label): label is string => label !== null)
    .map((label) => label.toLowerCase())
  const unknown = officeUnion(event).length - offices.length
  const levels = scopeUnion(event).map(levelWord)
  const who = publishers.length > 0 ? t`, de la ${joinRo(publishers)},` : ','
  const count =
    list.length === 1
      ? t`Descrisă de o ediție de date${who} cu ${rowsText(list[0]?.edition.contests ?? 0)}`
      : t`Descrisă de ${editionsText(list.length)}${who} cu ${joinRo(rows)} rânduri de scrutin, care nu se adună`
  const what =
    offices.length > 0
      ? unknown > 0
        ? t`pentru ${joinRo(offices.slice(0, 4))} și ${plural(unknown, { one: 'o etichetă', few: '# etichete', other: '# de etichete' })} din sursă fără funcție cunoscută`
        : t`pentru ${joinRo(offices.slice(0, 4))}`
      : t`sub ${plural(unknown, { one: 'o etichetă', few: '# etichete', other: '# de etichete' })} din sursă fără funcție cunoscută`
  const where = t`raportate pe ${joinRo(levels)}`
  return `${count}, ${what}, ${where}. ${t`Rezultatele nu sunt publicate încă.`}`
}

// ────────────────────────────────────────────────────── the head ──

function Kicker({ event }: { readonly event: ElectionEvent }) {
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
        <span>{familyPlural(event.family)}</span>
        <span aria-hidden="true">/</span>
        <span className="tabular-nums">{event.year}</span>
      </span>
    </MonoLabel>
  )
}

/** The neighbours in the family, as the procurement profile links its ways out. */
function FamilyLinks({ run, event }: { readonly run: FamilyRun; readonly event: ElectionEvent }) {
  return (
    <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {run.previous ? (
        <a href={PROTOTYPE_HREF.election(run.previous.key)} className={OUT_LINK}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {eventShort(run.previous)}
        </a>
      ) : null}
      {run.next ? (
        <a href={PROTOTYPE_HREF.election(run.next.key)} className={OUT_LINK}>
          {eventShort(run.next)}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </a>
      ) : null}
      <a href={PROTOTYPE_HREF.analytics()} className={OUT_LINK}>
        <Trans>Analize: {familyPlural(event.family).toLowerCase()}</Trans>
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </a>
    </p>
  )
}

/**
 * What the audit knows and the API does not say, where the reader cannot
 * miss it (§12.3 rule 4): a ruled note under the sentence, only on the
 * events that carry one. Everything else stays behind the caveats marker.
 */
function AuditNote({ page }: { readonly page: ElectionPage }) {
  const notes = auditNotesOf(page.event.key)
  if (notes.length === 0) return null
  return (
    <p className={RULED_NOTE_CLASS} role="note">
      {notes.map((note) => (
        <Fragment key={note}>
          {note === 'e1-2016-data' ? (
            <Trans>
              După auditul datelor, edițiile etichetate „locale 2014" conțin rezultatele alegerilor locale din 2016; API-ul nu semnalează asta. Pagina le arată cu eticheta sursei
              și nu le compară cu 2016 ca pe două alegeri.
            </Trans>
          ) : note === 'candidate-list-only' ? (
            <Trans>Singura ediție e o listă de candidați pentru Camera Deputaților, pe județe (numerotarea sursei); Senatul și rezultatele nu sunt în date.</Trans>
          ) : (
            <Trans>Alegerea parțială din 1998 e în date doar ca primarul general al Bucureștiului, cu turul etichetat „tur3" de sursă.</Trans>
          )}
        </Fragment>
      ))}
    </p>
  )
}

const HEADING = {
  short: 'text-4xl sm:text-6xl lg:text-7xl',
  medium: 'text-3xl sm:text-5xl lg:text-6xl',
  long: 'text-2xl sm:text-4xl lg:text-5xl',
} as const

/** The compact head (G1): the way back, the top-right control, the title, the sentence, the ways out; an aside beside them on a desktop. */
export function ElectionHead({
  page,
  topRight,
  aside,
  children,
}: {
  readonly page: ElectionPage
  readonly topRight?: ReactNode
  readonly aside?: ReactNode
  readonly children?: ReactNode
}) {
  const title = eventTitle(page.event)
  const size = title.length <= 22 ? 'short' : title.length <= 44 ? 'medium' : 'long'
  return (
    <section className="relative border-b" aria-labelledby="election-title" data-dev-marker={PROTOTYPE_MARKER}>
      <TwoLayerLattice idPrefix="election" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="flex items-start justify-between gap-4">
          <span className="shrink-0 pt-1.5">
            <Kicker event={page.event} />
          </span>
          {topRight ? <div className="min-w-0 max-w-[72%]">{topRight}</div> : null}
        </div>
        <div className={cn('mt-4 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8', aside ? 'items-center' : '')}>
          <div className={cn('min-w-0', aside ? 'lg:col-span-7' : 'lg:col-span-9')}>
            <h1 id="election-title" className={cn('font-extrabold leading-[0.95] tracking-tighter text-foreground', HEADING[size])}>
              {title}
            </h1>
            <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg">{headSentence(page.event, page.summaries)}</p>
            <AuditNote page={page} />
            <FamilyLinks run={page.run} event={page.event} />
            {children}
          </div>
          {aside ? <div className="min-w-0 lg:col-span-5 lg:border-l lg:pl-8">{aside}</div> : null}
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

/** The editions as a short list at the top right: a letter, the key, the rows; the page's edition marked. A single edition is said, not chosen. */
export function EditionSwitch({ page, className, sayOne = false }: { readonly page: ElectionPage; readonly className?: string; readonly sayOne?: boolean }) {
  const format = useFormat()
  if (page.summaries.length === 1) {
    const only = page.summaries[0]
    if (!sayOne) return null
    return (
      <MonoLabel className={cn('text-muted-foreground', className)}>
        <Trans>O ediție de date: {only?.edition.key}</Trans>
      </MonoLabel>
    )
  }
  return (
    <nav aria-label={t`Ediția de date`} className={cn('flex flex-wrap gap-1', className)}>
      {page.summaries.map((summary) => {
        const current = summary.edition.key === page.edition.edition.key
        return (
          <SearchLink
            key={summary.edition.key}
            // Each chip opens its own edition (the current one stays put); the default edition needs no address.
            patch={EDITION_PATCH(editionParam(page.event, summary.edition.key))}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-8 items-center gap-2 rounded-sm border px-2 text-xs tabular-nums transition-colors',
              current ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <MonoLabel>{summary.mark}</MonoLabel>
            <span className="font-mono">{summary.edition.key}</span>
            <span>{format.n(summary.edition.contests)}</span>
          </SearchLink>
        )
      })}
    </nav>
  )
}

/** A calendar year the data lacks, in a list: „2009", or „una din cele 2 din 2007" when the data holds the year's other election. */
function missingYear(entry: FamilyRun['missing'][number]): string {
  const expected = entry.count ?? 1
  if (entry.loaded === 0) return String(entry.year)
  return expected - entry.loaded === 1 ? t`una din cele ${expected} din ${entry.year}` : t`${expected - entry.loaded} din cele ${expected} din ${entry.year}`
}

/** The family's elections as the head's aside: the years in a row, this one marked, the calendar's gaps said as such. */
export function FamilyAside({ page }: { readonly page: ElectionPage }) {
  const format = useFormat()
  const { run, event } = page
  return (
    <div>
      <MonoLabel className="block text-muted-foreground">
        <Trans>{familyPlural(event.family)} în date, pe ani</Trans>
      </MonoLabel>
      <ol className="mt-4 flex flex-wrap gap-1.5">
        {run.events.map((member) => {
          const current = member.key === event.key
          return (
            <li key={member.key}>
              <a
                href={PROTOTYPE_HREF.election(member.key)}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-8 items-center gap-1.5 rounded-sm border px-2 text-sm tabular-nums transition-colors',
                  current ? 'border-foreground bg-foreground text-background' : 'text-foreground hover:bg-muted',
                )}
              >
                {isDisputedEvent(member) ? (
                  <>
                    {`„${String(member.year)}”`}
                    <span className={current ? 'text-background/70' : 'text-amber-700 dark:text-amber-400'} title={t`Etichetată 2014; după auditul datelor, date din 2016`}>
                      ✱
                    </span>
                  </>
                ) : (
                  member.year
                )}
                {member.instance ? <MonoLabel className={current ? 'text-background/70' : 'text-muted-foreground'}>{member.instance}</MonoLabel> : null}
                <MonoLabel className={current ? 'text-background/70' : 'text-muted-foreground'}>{format.n(member.editions.length)}</MonoLabel>
              </a>
            </li>
          )
        })}
      </ol>
      {run.missing.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          <Trans>Nu sunt în date: {joinRo(run.missing.map((entry) => missingYear(entry)))} (după calendarul Transparenta.eu, nu după API).</Trans>
        </p>
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────── the figures ──

interface Figure {
  readonly key: string
  /** A null value draws a dash: a thing the data does not hold, never 0. */
  readonly value: number | null
  readonly label: ReactNode
  readonly note: ReactNode
  readonly hash?: string
}

/** The figures band in `HubFiguresBand`'s shape, with a dash for what is not published (G3); copied here for the nullable value. */
export function ElectionFigures({ figures }: { readonly figures: readonly Figure[] }) {
  const format = useFormat()
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          {figures.map((figure, index) => (
            <div
              key={figure.key}
              className={cn(
                'group relative flex flex-col px-5 py-6 transition-colors hover:bg-muted/40 sm:py-7',
                index % 2 === 1 && 'border-l',
                index >= 2 && 'border-t lg:border-t-0',
                index >= 1 && 'lg:border-l',
              )}
            >
              <dt className="order-2 mt-2.5 flex flex-1 flex-col">
                {figure.hash ? (
                  <a
                    href={`#${figure.hash}`}
                    className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                  >
                    <MonoLabel className="block leading-relaxed text-foreground">{figure.label}</MonoLabel>
                  </a>
                ) : (
                  <MonoLabel className="block leading-relaxed text-foreground">{figure.label}</MonoLabel>
                )}
                <MonoLabel className="mt-auto block pt-3 leading-relaxed text-muted-foreground">{figure.note}</MonoLabel>
              </dt>
              <dd className={cn('order-1 text-2xl font-semibold tabular-nums tracking-tight sm:text-4xl', figure.value === null ? 'text-muted-foreground' : 'text-foreground')}>
                {figure.value === null ? '—' : <CountUpValue value={figure.value} digits={0} locale={format.locale} />}
              </dd>
            </div>
          ))}
        </dl>
      </RuledFrame>
    </section>
  )
}

/** The four figures every variant leads with: editions, the page's edition's rows, its reporting places, and the results that are not there. */
export function standardFigures(page: ElectionPage, links: { readonly editions: string; readonly rows: string; readonly places: string }): readonly Figure[] {
  const format = (n: number) => new Intl.NumberFormat('ro').format(n)
  const { edition } = page
  const publishers = publishersOf(page.event)
  const siruta = edition.places?.siruta
  return [
    {
      key: 'editions',
      value: page.summaries.length,
      label: <Trans>Ediții de date</Trans>,
      note: publishers.length > 0 ? <Trans>de la {joinRo(publishers)}; nu se adună</Trans> : <Trans>publicator necunoscut; nu se adună</Trans>,
      hash: links.editions,
    },
    {
      key: 'rows',
      value: edition.edition.contests,
      label: page.summaries.length > 1 ? <Trans>Rânduri de scrutin, ediția {edition.mark}</Trans> : <Trans>Rânduri de scrutin</Trans>,
      note: <Trans>funcție × loc raportat, nu curse</Trans>,
      hash: links.rows,
    },
    {
      key: 'places',
      value: siruta && siruta.distinct > 0 ? siruta.distinct : null,
      label: page.summaries.length > 1 ? <Trans>Localități raportate, ediția {edition.mark}</Trans> : <Trans>Localități raportate</Trans>,
      note: siruta && siruta.distinct > 0 ? <Trans>coduri SIRUTA distincte; {format(siruta.named)} în lista INS de azi</Trans> : <Trans>ediția nu raportează pe localități</Trans>,
      hash: links.places,
    },
    {
      key: 'results',
      value: null,
      label: <Trans>Rezultate</Trans>,
      note: <Trans>voturi, prezență, candidați, mandate: nepublicate</Trans>,
    },
  ]
}

// ──────────────────────────────────────────────────────── bands ──

export interface Section {
  readonly id: string
  readonly label: string
}

export function indexOf(sections: readonly Section[], id: string): string {
  const position = sections.findIndex((section) => section.id === id)
  return `${String(position + 1).padStart(2, '0')} / ${sections[position]?.label ?? ''}`
}

/** A band: head left and rows right on a desktop, or, for a table, the head over the full width (G8). */
export function Band({
  id,
  index,
  title,
  lede,
  aside,
  wide = false,
  children,
}: {
  readonly id: string
  readonly index: string
  readonly title: ReactNode
  readonly lede?: ReactNode
  readonly aside?: ReactNode
  readonly wide?: boolean
  readonly children: ReactNode
}) {
  const titleId = `election-${id}-title`
  if (wide) {
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

export function SectionNav({ page, sections }: { readonly page: ElectionPage; readonly sections: readonly Section[] }) {
  return <HomeSectionNav title={eventTitle(page.event)} sections={sections} />
}

// ───────────────────────────────────────────────── the editions ──

function FamilyLabel({ summary, event }: { readonly summary: EditionSummary; readonly event: ElectionEvent }) {
  return (
    <span className={cn('inline-flex items-baseline gap-1.5', summary.familyConflict && 'text-foreground')}>
      <span className="font-mono text-xs">{summary.edition.family}</span>
      {summary.familyConflict ? (
        <span className="text-xs text-muted-foreground">
          <Trans>≠ {familyPlural(event.family).toLowerCase()}</Trans>
        </span>
      ) : null}
    </span>
  )
}

/** The icon that opens the edition's live catalog page, 32px with its tooltip (owner's taste). */
function EditionOpen({ editionKey }: { readonly editionKey: string }) {
  const link = editionLink(editionKey)
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{link(<ExternalLink className="size-4" aria-hidden="true" />, cn(ICON_ACTION, 'relative z-10'))}</TooltipTrigger>
        <TooltipContent>
          <Trans>Ediția în catalogul surselor</Trans>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * The editions side by side: one column each, the facts as rows, no total
 * column anywhere (§12.3 rule 1). The page's edition is marked; a column's
 * head sets it.
 */
export function EditionsTable({ page }: { readonly page: ElectionPage }) {
  const format = useFormat()
  const { summaries: list, event, edition: current } = page
  const facts: readonly { readonly key: string; readonly label: ReactNode; readonly cell: (summary: EditionSummary) => ReactNode }[] = [
    {
      key: 'publisher',
      label: <Trans>Publicator, după prefixul cheii</Trans>,
      cell: (summary) => summary.publisher ?? <span className="text-muted-foreground">—</span>,
    },
    { key: 'family', label: <Trans>Tip raportat</Trans>, cell: (summary) => <FamilyLabel summary={summary} event={event} /> },
    {
      key: 'year',
      label: <Trans>An raportat</Trans>,
      cell: (summary) =>
        summary.edition.year === null ? <Trans>neraportat</Trans> : <span className={cn(summary.edition.year !== event.year && 'text-foreground')}>{summary.edition.year}</span>,
    },
    { key: 'round', label: <Trans>Tur raportat, la nivel de ediție</Trans>, cell: (summary) => roundLabel(summary.edition.round) },
    {
      key: 'date',
      label: <Trans>Data raportată</Trans>,
      cell: (summary) => (summary.edition.date === null ? <span className="text-muted-foreground">{t`dată neraportată`}</span> : format.day(summary.edition.date)),
    },
    { key: 'rows', label: <Trans>Rânduri de scrutin</Trans>, cell: (summary) => <span className="font-semibold text-foreground">{format.n(summary.edition.contests)}</span> },
    {
      key: 'offices',
      label: <Trans>Funcții raportate</Trans>,
      cell: (summary) => (
        <ul className="space-y-0.5">
          {summary.offices.map(([office, rows]) => (
            <li key={office} className="flex items-baseline justify-between gap-3">
              <OfficeName office={office} className="min-w-0" />
              <span className="shrink-0 tabular-nums text-muted-foreground">{format.n(rows)}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: 'levels',
      label: <Trans>Niveluri raportate</Trans>,
      cell: (summary) => (
        <ul className="space-y-0.5">
          {summary.scopes.map((scope) => {
            const rows = summary.edition.counts.filter(([, s]) => s === scope).reduce((sum, [, , , n]) => sum + n, 0)
            return (
              <li key={scope} className="flex items-baseline justify-between gap-3">
                <span>{scopeLabel(scope)}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{format.n(rows)}</span>
              </li>
            )
          })}
        </ul>
      ),
    },
    { key: 'rounds', label: <Trans>Tururi pe rânduri</Trans>, cell: (summary) => joinRo(summary.rounds.map(roundLabel)) },
    {
      key: 'places',
      label: <Trans>Localități raportate (SIRUTA)</Trans>,
      cell: (summary) =>
        summary.places && summary.places.siruta.distinct > 0 ? (
          <>
            <span className="font-semibold text-foreground">{format.n(summary.places.siruta.distinct)}</span>{' '}
            <span className="text-muted-foreground">
              <Trans>({format.n(summary.places.siruta.named)} în lista INS)</Trans>
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">
            <Trans>nu raportează pe localități</Trans>
          </span>
        ),
    },
    {
      key: 'labels',
      label: <Trans>Rânduri fără etichetă de loc</Trans>,
      cell: (summary) =>
        summary.places ? summary.places.nullLabels === 0 ? <span className="text-muted-foreground">{t`niciunul`}</span> : format.n(summary.places.nullLabels) : '—',
    },
  ]
  return (
    <Table containerClassName="border-y border-border/70">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={cn(CELL_HEAD, 'w-44 min-w-36')}>
            <MonoLabel className="text-muted-foreground">
              <Trans>Ediția</Trans>
            </MonoLabel>
          </TableHead>
          {list.map((summary) => {
            const selected = summary.edition.key === current.edition.key
            return (
              <TableHead key={summary.edition.key} className={cn(CELL_HEAD, 'min-w-44', selected && 'bg-muted/40')}>
                <div className="flex items-start justify-between gap-2">
                  <SearchLink patch={EDITION_PATCH(editionParam(event, summary.edition.key))} className="group min-w-0" aria-current={selected ? 'page' : undefined}>
                    <MonoLabel className={cn('block', selected ? 'text-primary' : 'text-muted-foreground')}>
                      {list.length > 1 ? <Trans>Ediția {summary.mark}</Trans> : <Trans>Ediția</Trans>}
                      {selected ? <> · {t`pe pagină`}</> : null}
                    </MonoLabel>
                    <span className="mt-1 block break-all font-mono text-xs normal-case tracking-normal text-foreground group-hover:underline">{summary.edition.key}</span>
                  </SearchLink>
                  <EditionOpen editionKey={summary.edition.key} />
                </div>
              </TableHead>
            )
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {facts.map((fact) => (
          <TableRow key={fact.key} className="hover:bg-muted/30">
            <TableCell className="py-2 align-top text-xs text-muted-foreground">{fact.label}</TableCell>
            {list.map((summary) => (
              <TableCell key={summary.edition.key} className={cn('py-2 align-top text-sm tabular-nums', summary.edition.key === current.edition.key && 'bg-muted/40')}>
                {fact.cell(summary)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** The editions as compact ranked rows: the key, the publisher and family label under it, the rows at the right; the row sets the page's edition. */
export function EditionRows({ page, className }: { readonly page: ElectionPage; readonly className?: string }) {
  const format = useFormat()
  const { href } = usePageSearch()
  const top = Math.max(...page.summaries.map((summary) => summary.edition.contests), 1)
  const rows: readonly Row[] = page.summaries.map((summary) => {
    const selected = summary.edition.key === page.edition.edition.key
    return {
      key: summary.edition.key,
      label: (
        <span className="inline-flex items-baseline gap-2">
          <MonoLabel className={selected ? 'text-primary' : 'text-muted-foreground'}>{summary.mark}</MonoLabel>
          <span className="font-mono text-xs">{summary.edition.key}</span>
          {selected ? <MonoLabel className="text-primary">{t`pe pagină`}</MonoLabel> : null}
        </span>
      ),
      meta: [
        summary.publisher,
        summary.familyConflict ? t`tip raportat: ${summary.edition.family}` : null,
        roundLabel(summary.edition.round),
        summary.places && summary.places.siruta.distinct > 0 ? t`${format.n(summary.places.siruta.distinct)} localități` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      value: format.n(summary.edition.contests),
      fraction: summary.edition.contests / top,
      link: (body, className) => (
        <a href={href(EDITION_PATCH(editionParam(page.event, summary.edition.key)))} className={className} aria-current={selected ? 'page' : undefined}>
          {body}
        </a>
      ),
    }
  })
  return <Rows rows={rows} className={className} />
}

// ─────────────────────────────────────────────────── the matrix ──

function CellRounds({ cell }: { readonly cell: MatrixCell }) {
  const format = useFormat()
  if (cell.rounds.length === 1) {
    const [round] = cell.rounds[0] ?? [null, 0]
    return <span className="block text-xs text-muted-foreground">{roundLabel(round)}</span>
  }
  return (
    <span className="block text-xs text-muted-foreground">
      {cell.rounds.map(([round, n], index) => (
        <Fragment key={String(round)}>
          {index > 0 ? ' · ' : null}
          {roundLabel(round)} {format.n(n)}
        </Fragment>
      ))}
    </span>
  )
}

/**
 * Offices × levels, full width: a row per reported office, a column per
 * level the event reports. In `one` mode the cells are the page's edition's;
 * in `all` mode each cell stacks the editions, each marked by its letter,
 * never added. A cell opens the contest list filtered to it.
 */
export function OfficeMatrix({ page, mode }: { readonly page: ElectionPage; readonly mode: 'one' | 'all' }) {
  const format = useFormat()
  const { href } = usePageSearch()
  const shown = mode === 'one' ? [page.edition] : page.summaries
  const offices = mode === 'one' ? page.edition.offices.map(([office]) => office) : officeUnion(page.event)
  const scopes = mode === 'one' ? page.edition.scopes : scopeUnion(page.event)
  const matrices = new Map(shown.map((summary) => [summary.edition.key, editionMatrix(summary.edition)]))
  const unknown = offices.filter((office) => officeLabel(office) === null)
  const cellLink = (summary: EditionSummary, office: string, scope: ScopeType, cell: MatrixCell) => (
    <a
      href={`${href({ editie: editionParam(page.event, summary.edition.key), functie: office, arie: scope, tur: undefined, pagina: undefined })}#scrutine`}
      className="group/cell block rounded-sm px-1 py-0.5 -mx-1 hover:bg-muted"
      aria-label={t`Rândurile pentru ${officeLabel(office) ?? office}, ${scopeLabel(scope).toLowerCase()}, ediția ${summary.mark}`}
    >
      <span className="block tabular-nums text-foreground group-hover/cell:underline">
        {mode === 'all' ? <MonoLabel className="mr-1.5 text-muted-foreground">{summary.mark}</MonoLabel> : null}
        {format.n(cell.rows)}
      </span>
      <CellRounds cell={cell} />
    </a>
  )
  return (
    <div>
      <Table containerClassName="border-y border-border/70">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(CELL_HEAD, 'min-w-44')}>
              <MonoLabel className="text-muted-foreground">
                <Trans>Funcția raportată</Trans>
              </MonoLabel>
            </TableHead>
            {scopes.map((scope) => (
              <TableHead key={scope} className={cn(CELL_HEAD, 'min-w-28')}>
                <MonoLabel className="text-muted-foreground">{scopeLabel(scope)}</MonoLabel>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {offices.map((office) => (
            <TableRow key={office} className="hover:bg-muted/30">
              <TableCell className="py-2 align-top text-sm">
                <OfficeName office={office} />
              </TableCell>
              {scopes.map((scope) => (
                <TableCell key={scope} className="py-2 align-top text-sm">
                  <div className="space-y-1">
                    {shown.map((summary) => {
                      const cell = matrices.get(summary.edition.key)?.get(cellKey(office, scope))
                      return cell ? <Fragment key={summary.edition.key}>{cellLink(summary, office, scope, cell)}</Fragment> : null
                    })}
                    {shown.every((summary) => !matrices.get(summary.edition.key)?.has(cellKey(office, scope))) ? <span className="block text-muted-foreground">—</span> : null}
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-3 text-xs text-muted-foreground">
        {mode === 'all' ? (
          <Trans>Fiecare celulă ține edițiile separate (litera ediției înaintea cifrei); nimic nu e adunat. O liniuță e un nivel pe care ediția nu îl raportează.</Trans>
        ) : (
          <Trans>Rânduri de scrutin ale ediției {page.edition.mark}, cu turul etichetat de sursă. O liniuță e un nivel pe care ediția nu îl raportează.</Trans>
        )}
        {unknown.length > 0 ? (
          <>
            {' '}
            <Trans>Etichetele din sursă sunt forme de tabel ale sursei, nu funcții; sunt arătate ca atare.</Trans>
          </>
        ) : null}
      </p>
    </div>
  )
}

// ───────────────────────────────────────────────── the contests ──

function ContestFilters({ page }: { readonly page: ElectionPage }) {
  const format = useFormat()
  const { search, move } = usePageSearch()
  const { edition } = page
  const rows = (pick: (count: Edition['counts'][number]) => boolean) => edition.edition.counts.filter(pick).reduce((sum, [, , , n]) => sum + n, 0)
  const offices = edition.offices.map(([office, n]) => ({ value: office, label: `${officeLabel(office) ?? office} · ${format.n(n)}` }))
  const scopes = edition.scopes.map((scope) => ({ value: scope, label: `${scopeLabel(scope)} · ${format.n(rows(([, s]) => s === scope))}` }))
  const rounds = edition.rounds.map((round) => ({ value: round ?? 'null', label: `${roundLabel(round)} · ${format.n(rows(([, , r]) => r === round))}` }))
  const any = search.office !== undefined || search.scope !== undefined || search.round !== undefined
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ChoiceSelect
        value={search.office ?? ''}
        groups={[{ options: [{ value: '', label: t`Toate funcțiile` }, ...offices] }]}
        onChange={(value) => move({ functie: value || undefined, pagina: undefined })}
        label={t`Funcția raportată`}
        triggerClassName="h-9 w-auto max-w-64 text-sm"
      />
      {scopes.length > 1 ? (
        <ChoiceSelect
          value={search.scope ?? ''}
          groups={[{ options: [{ value: '', label: t`Toate nivelurile` }, ...scopes] }]}
          onChange={(value) => move({ arie: value || undefined, pagina: undefined })}
          label={t`Nivelul raportat`}
          triggerClassName="h-9 w-auto max-w-64 text-sm"
        />
      ) : null}
      {rounds.length > 1 ? (
        <ChoiceSelect
          value={search.round ?? ''}
          groups={[{ options: [{ value: '', label: t`Toate tururile` }, ...rounds] }]}
          onChange={(value) => move({ tur: value || undefined, pagina: undefined })}
          label={t`Turul raportat`}
          triggerClassName="h-9 w-auto max-w-64 text-sm"
        />
      ) : null}
      {any ? (
        <SearchLink patch={{ functie: undefined, arie: undefined, tur: undefined, pagina: undefined }} className={cn(OUT_LINK, 'gap-1.5 text-muted-foreground')}>
          <X className="size-3.5" aria-hidden="true" />
          <Trans>Fără filtre</Trans>
        </SearchLink>
      ) : null}
    </div>
  )
}

const CONTEST_ROW = 'group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-1 py-2 transition-colors hover:bg-muted/40'

/** One contest row: the place as the source spells it (else its key), the office, level and round under it; the row opens the contest, the pin the place. */
function ContestRow({ contest }: { readonly contest: ElectionContest }) {
  const office = officeLabel(contest.reportedOffice)
  return (
    <li className={CONTEST_ROW}>
      <a
        href={PROTOTYPE_HREF.contest(contest.contestKey)}
        className="min-w-0 after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
      >
        <span className="block truncate text-sm text-foreground">
          {contest.scopeLabel ?? (
            <>
              <span className="font-mono text-xs">{contest.sourceScopeKey}</span>{' '}
              <span className="text-xs text-muted-foreground">
                <Trans>(fără etichetă în sursă)</Trans>
              </span>
            </>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {office ?? <span className="font-mono">{contest.reportedOffice}</span>} · {scopeLabel(contest.scopeType).toLowerCase()} · {roundLabel(contest.reportedRound)}
        </span>
      </a>
      <span className="flex items-center gap-1">
        {contest.scopeLabel !== null ? <span className="hidden font-mono text-xs tabular-nums text-muted-foreground sm:inline">{contest.sourceScopeKey}</span> : null}
        {contest.scopeType === 'siruta' ? (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={PROTOTYPE_HREF.place(contest.sourceScopeKey)} className={cn(ICON_ACTION, 'relative z-10')} aria-label={t`Locul de raportare ${contest.sourceScopeKey}`}>
                  <MapPin className="size-4" aria-hidden="true" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <Trans>Locul de raportare: toate alegerile lui</Trans>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </span>
    </li>
  )
}

/**
 * The page's edition's contest rows, live from the API in its order, filtered
 * by what the edition reports (G6), a page of twenty at a time with the API's
 * exact total. The server renders the band pending; the list lands in the
 * browser.
 */
export function ContestList({ page }: { readonly page: ElectionPage }) {
  const format = useFormat()
  const { search, move } = usePageSearch()
  const editionKey = page.edition.edition.key
  const contestSearch = parseElectionContestsSearch({
    functie: search.office,
    arie: search.scope,
    tur: search.round === 'null' ? undefined : search.round,
    pagina: search.page > 1 ? search.page : undefined,
  })
  const query = useElectionContests(editionKey, contestSearch)
  const data = query.data
  const first = (search.page - 1) * ELECTIONS_PAGE_SIZE + 1
  return (
    <div>
      <ContestFilters page={page} />
      {search.round === 'null' ? (
        <p className="mt-3 text-xs text-muted-foreground">
          <Trans>API-ul nu filtrează după un tur neraportat (null); lista de mai jos arată toate tururile ediției.</Trans>
        </p>
      ) : null}
      <div className="mt-4 flex items-baseline justify-between gap-4 border-b border-border/70 pb-1.5">
        <MonoLabel className="text-muted-foreground">
          <Trans>Loc raportat · funcție · nivel · tur</Trans>
        </MonoLabel>
        <MonoLabel className="text-right tabular-nums text-muted-foreground" aria-live="polite">
          {data && !query.isPlaceholderData ? (
            data.total === 0 ? (
              <Trans>niciun rând</Trans>
            ) : (
              <Trans>
                rândurile {format.n(first)}–{format.n(Math.min(first + data.items.length - 1, data.total))} din {format.n(data.total)}
              </Trans>
            )
          ) : (
            <Trans>se numără…</Trans>
          )}
        </MonoLabel>
      </div>
      {!data ? (
        query.isError ? (
          <p role="alert" className="py-4 text-sm text-muted-foreground">
            <Trans>Lista rândurilor nu s-a încărcat.</Trans>{' '}
            <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => void query.refetch()}>
              <Trans>Încearcă din nou</Trans>
            </button>
          </p>
        ) : (
          <HubPending rows={8} className="mt-3" />
        )
      ) : data.items.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          {data.total > 0 ? <Trans>Pagina aceasta nu are rânduri.</Trans> : <Trans>Niciun rând al ediției nu are aceste etichete.</Trans>}
        </p>
      ) : (
        <ul
          className={cn('divide-y divide-border/70 border-b border-border/70 transition-opacity', query.isPlaceholderData && 'opacity-60')}
          aria-busy={query.isPlaceholderData || undefined}
        >
          {data.items.map((contest) => (
            <ContestRow key={contest.contestKey} contest={contest} />
          ))}
        </ul>
      )}
      {data && data.total > ELECTIONS_PAGE_SIZE ? (
        <Pagination
          currentPage={search.page}
          pageSize={ELECTIONS_PAGE_SIZE}
          totalCount={data.total}
          onPageChange={(next) => {
            move({ pagina: next })
            document.getElementById('scrutine')?.scrollIntoView({ block: 'start' })
          }}
          className="mt-4 rounded-none border-0 bg-transparent p-0 shadow-none md:p-0"
        />
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────── a place's rows ──

/** The place finder: a name typed opens its rows in this election (the index is read in the browser only). */
export function PlaceFinder({ page }: { readonly page: ElectionPage }) {
  const { move } = usePageSearch()
  return (
    <ElectionsSearch
      events={page.data.events}
      scope="places"
      onPlace={(siruta) => {
        move({ loc: siruta })
      }}
      placeholder={t`Găsește o localitate: Cluj-Napoca, Sectorul 3, Vama…`}
    />
  )
}

/**
 * A place's rows in this election, from the places index: per edition, the
 * office and round the source reported there; each opens its contest. A
 * row says where the source reported, never that the office is the place's.
 */
export function PlaceInElection({ page, siruta }: { readonly page: ElectionPage; readonly siruta: string }) {
  const places = usePlaces()
  const index = places.data
  if (!index) {
    return places.isError ? (
      <p role="alert" className="text-sm text-muted-foreground">
        <Trans>Indexul localităților nu s-a încărcat.</Trans>
      </p>
    ) : (
      <HubPending rows={3} />
    )
  }
  const place = index.places.get(siruta)
  const close = (
    <SearchLink patch={{ loc: undefined }} className={cn(OUT_LINK, 'gap-1.5 text-muted-foreground')}>
      <X className="size-3.5" aria-hidden="true" />
      <Trans>Închide</Trans>
    </SearchLink>
  )
  if (!place) {
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t`Nicio sursă nu raportează pe codul SIRUTA ${siruta}.`}</p>
        {close}
      </div>
    )
  }
  const editions = new Map(page.summaries.map((summary) => [summary.edition.key, summary]))
  const rows = place.rows
    .map(([e, o, r]) => ({ edition: editions.get(index.editions[e] ?? ''), office: index.offices[o] ?? '', round: index.rounds[r] ?? null }))
    .filter((row): row is { edition: EditionSummary; office: string; round: string | null } => row.edition !== undefined)
    .sort((a, b) => a.edition.mark.localeCompare(b.edition.mark) || a.office.localeCompare(b.office) || String(a.round).localeCompare(String(b.round)))
  const kind = [placeKind(place.ins?.kind), place.ins?.county].filter(Boolean).join(', ')
  return (
    <div className="border-y border-border/70 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="min-w-0 text-sm">
          <span className="font-semibold text-foreground">{placeName(place)}</span> <span className="text-muted-foreground">{kind || t`nu e în lista INS de azi`}</span>{' '}
          <span className="font-mono text-xs text-muted-foreground">{place.siruta}</span>
        </p>
        <span className="flex flex-wrap items-center gap-x-4">
          <a href={PROTOTYPE_HREF.place(place.siruta)} className={OUT_LINK}>
            <Trans>Toate alegerile locului</Trans>
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
          {close}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          <Trans>Nicio ediție a acestei alegeri nu raportează pe acest loc.</Trans>
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border/70">
          {rows.map((row) => (
            <li key={`${row.edition.edition.key}|${row.office}|${String(row.round)}`}>
              <a
                href={PROTOTYPE_HREF.contest(contestKeyOf(row.edition.edition.key, row.office, 'siruta', place.siruta))}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 px-1 py-1.5 text-sm transition-colors hover:bg-muted/40"
              >
                <span className="min-w-0 truncate">
                  <OfficeName office={row.office} />
                  <span className="text-muted-foreground"> · {roundLabel(row.round)}</span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {page.summaries.length > 1 ? `${row.edition.mark} · ` : ''}
                  {row.edition.edition.key}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        <Trans>Locul e unde a raportat sursa: un rând pentru președintele consiliului județean sau pentru parlament nu e cursa localității.</Trans>
      </p>
    </div>
  )
}

// ──────────────────────────────────────────────── the counties ──

/** Whether any edition of the event reports on localities or abroad: without one, the counties band has nothing to say and is left out. */
export function hasPlaces(page: ElectionPage): boolean {
  return page.summaries.some((summary) => (summary.places?.siruta.distinct ?? 0) > 0 || (summary.places?.distinct.diaspora ?? 0) > 0)
}

/** The page's edition's SIRUTA rows by INS county: reporting places, never races (§12.3 rule 5); the rows beside them. */
export function CountyRows({ page }: { readonly page: ElectionPage }) {
  const format = useFormat()
  const [all, setAll] = useState(false)
  const { edition } = page
  const places = edition.places
  if (!places || places.siruta.distinct === 0) {
    const diaspora = places?.distinct.diaspora ?? 0
    return (
      <p className="border-y py-4 text-sm text-muted-foreground">
        {diaspora > 0 ? (
          <Trans>
            Ediția {edition.mark} nu raportează pe localități; raportează pe {format.n(diaspora)} locuri din străinătate și pe nivelurile din tabel.
          </Trans>
        ) : (
          <Trans>Ediția {edition.mark} nu raportează pe localități.</Trans>
        )}
      </p>
    )
  }
  const counties = places.siruta.byCounty.filter(([mn]) => mn !== null)
  const unlisted = places.siruta.byCounty.find(([mn]) => mn === null)
  const limit = 10
  const shown = all ? counties : counties.slice(0, limit)
  const top = Math.max(...counties.map(([, , n]) => n), 1)
  const rows: readonly Row[] = [
    ...shown.map(([mn, county, n, r]) => ({
      key: String(mn),
      label: county ?? String(mn),
      meta: t`${rowsText(r)}`,
      value: format.n(n),
      fraction: n / top,
    })),
    ...(unlisted
      ? [
          {
            key: 'unlisted',
            label: t`Coduri SIRUTA pe care lista INS de azi nu le are`,
            meta: t`${rowsText(unlisted[3])}`,
            value: format.n(unlisted[2]),
            muted: true,
          },
        ]
      : []),
  ]
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 pb-1.5">
        <MonoLabel className="text-muted-foreground">
          <Trans>Județ (după lista INS, pe cod)</Trans>
        </MonoLabel>
        <MonoLabel className="text-muted-foreground">
          <Trans>Locuri de raportare</Trans>
        </MonoLabel>
      </div>
      <Rows rows={rows} />
      {counties.length > limit ? (
        <button type="button" className={SHOW_MORE_CLASS} onClick={() => setAll((value) => !value)}>
          {all ? <Trans>Doar primele {limit}</Trans> : <Trans>Toate cele {counties.length} de județe</Trans>}
        </button>
      ) : null}
      {places.distinct.diaspora > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          <Trans>Pe lângă localități, ediția raportează pe {format.n(places.distinct.diaspora)} locuri din străinătate.</Trans>
        </p>
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────── the family ──

/** The family's elections in the data, newest first, the page's own marked; the calendar's gaps as muted rows that say „nu e în date". */
export function FamilyRows({ page }: { readonly page: ElectionPage }) {
  const format = useFormat()
  const { run, event } = page
  const top = Math.max(...run.events.map((member) => member.editions[0]?.contests ?? 0), 1)
  const listed: readonly { readonly year: number; readonly row: Row }[] = [
    ...run.events.map((member) => {
      const current = member.key === event.key
      const largest = member.editions[0]?.contests ?? 0
      return {
        year: member.year,
        row: {
          key: member.key,
          label: (
            <span className={cn(current && 'font-semibold')}>
              {isDisputedEvent(member) ? (
                <>
                  {eventShort(member).replace(String(member.year), `„${String(member.year)}”`)}
                  <span className="ml-0.5 text-amber-700 dark:text-amber-400" aria-hidden="true">
                    ✱
                  </span>
                </>
              ) : (
                eventShort(member)
              )}
              {current ? <MonoLabel className="ml-2 text-primary">{t`această pagină`}</MonoLabel> : null}
            </span>
          ),
          meta: isDisputedEvent(member)
            ? t`date din 2016, după auditul datelor; nu o alegere în plus · ${editionsText(member.editions.length)}`
            : t`${editionsText(member.editions.length)}; cea mai mare: ${rowsText(largest)}`,
          value: format.n(member.editions.length),
          fraction: largest / top,
          link: (body: ReactNode, className: string) => (
            <a href={PROTOTYPE_HREF.election(member.key)} className={className} aria-current={current ? 'page' : undefined}>
              {body}
            </a>
          ),
        },
      }
    }),
    ...run.missing.map((entry) => ({
      year: entry.year,
      row: {
        key: `missing-${entry.year}`,
        label: eventShort({ family: entry.family, year: entry.year, instance: null }),
        // 2007 holds two referendums and the data one of them: the row says which part is missing, not that the year is.
        meta:
          entry.loaded > 0
            ? t`${(entry.count ?? 1) - entry.loaded} din ${entry.count ?? 1} nu e în date; cealaltă e în listă (calendarul Transparenta.eu)`
            : t`nu e în date (calendarul Transparenta.eu)`,
        value: '—',
        muted: true,
      },
    })),
  ]
  const rows = [...listed].sort((a, b) => b.year - a.year).map((entry) => entry.row)
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 pb-1.5">
        <MonoLabel className="text-muted-foreground">
          <Trans>Alegerea</Trans>
        </MonoLabel>
        <MonoLabel className="text-muted-foreground">
          <Trans>Ediții de date</Trans>
        </MonoLabel>
      </div>
      <Rows rows={rows} />
    </div>
  )
}

/** The page's edition's offices as the head's aside: each a quick filter of the contest list (the finder variant). */
export function OfficeAside({ page }: { readonly page: ElectionPage }) {
  const format = useFormat()
  const { href, search } = usePageSearch()
  const { edition } = page
  const top = Math.max(...edition.offices.map(([, n]) => n), 1)
  const rows: readonly Row[] = edition.offices.map(([office, n]) => ({
    key: office,
    label: <OfficeName office={office} />,
    value: format.n(n),
    fraction: n / top,
    link: (body, className) => (
      <a
        href={`${href({ functie: search.office === office ? undefined : office, pagina: undefined })}#scrutine`}
        className={cn(className, search.office === office && 'bg-muted/40')}
        aria-current={search.office === office ? 'true' : undefined}
      >
        {body}
      </a>
    ),
  }))
  return (
    <div>
      <MonoLabel className="block text-muted-foreground">
        {page.summaries.length > 1 ? <Trans>Rânduri de scrutin pe funcții, ediția {edition.mark}</Trans> : <Trans>Rânduri de scrutin pe funcții</Trans>}
      </MonoLabel>
      <Rows rows={rows} className="mt-4" />
    </div>
  )
}

// ──────────────────────────────────────────── notes and source ──

/** The common notes, then the page's own: what the audit knows of this election and what its editions carry. */
export function electionNotes(page: ElectionPage): readonly ReactNode[] {
  const notes: ReactNode[] = [...commonNotes()]
  for (const note of auditNotesOf(page.event.key)) {
    if (note === 'e1-2016-data')
      notes.push(
        <Trans key="e1-this">
          Această pagină: toate cele cinci ediții de sub „locale 2014" au, după auditul datelor, rezultatele alegerilor locale din 2016 (localitățile lor se suprapun cu ediția BEC
          din 2016 pe 3.186 din 3.187 coduri). API-ul nu semnalează asta.
        </Trans>,
      )
    if (note === 'candidate-list-only')
      notes.push(
        <Trans key="candidates">
          Această pagină: singura ediție e o listă de candidați pentru Camera Deputaților, pe 43 de circumscripții numerotate de sursă; Senatul și rezultatele nu sunt în date.
        </Trans>,
      )
    if (note === 'bucharest-general-mayor-only')
      notes.push(<Trans key="partial">Această pagină: alegerea parțială din 1998 e în date doar ca primarul general al Bucureștiului, cu turul etichetat „tur3".</Trans>)
  }
  const conflicts = page.summaries.filter((summary) => summary.familyConflict)
  if (conflicts.length > 0)
    notes.push(
      <Trans key="conflict-this">
        Această pagină: {joinRo(conflicts.map((summary) => summary.edition.key))} au tipul raportat „{conflicts[0]?.edition.family}"; cheia alegerii le pune la{' '}
        {familyPlural(page.event.family).toLowerCase()}.
      </Trans>,
    )
  const nullLabels = page.summaries.filter((summary) => (summary.places?.nullLabels ?? 0) > 0)
  if (nullLabels.length > 0)
    notes.push(
      <Trans key="labels-this">
        Această pagină: {joinRo(nullLabels.map((summary) => summary.edition.key))} au rânduri fără etichetă de loc; pagina arată atunci cheia sursei.
      </Trans>,
    )
  if (page.summaries.some((summary) => summary.scopes.includes('county')))
    notes.push(<Trans key="county">Codurile de județ sunt ale fiecărei ediții; județele din lista „pe județe" vin din lista INS, pe codul SIRUTA, nu din codul ediției.</Trans>)
  notes.push(<Trans key="publisher">Publicatorul (BEC, AEP, ROAEP) e dedus din prefixul cheii ediției; API-ul raportează aceeași autoritate pe toate edițiile.</Trans>)
  return notes
}

export function ElectionSourceLine({ page, className }: { readonly page: ElectionPage; readonly className?: string }) {
  return <ElectionsSourceLine readAt={page.data.readAt} notes={electionNotes(page)} className={className} />
}

export function SourceBand({ page }: { readonly page: ElectionPage }) {
  return (
    <div className="border-b">
      <RuledFrame className="py-6">
        <ElectionSourceLine page={page} />
      </RuledFrame>
    </div>
  )
}
