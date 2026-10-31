import { type ReactNode } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ExternalLink, MapPin } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { HomeBand, HomeSectionNav, SHOW_MORE_CLASS } from '@/features/procurement/components/home/home-chrome'
import { HUB_BESIDE_TITLE_CLASS, HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { officeLabel, placeKind, roundLabel } from '../shared/labels'
import { countElections, type ElectionEvent } from '../shared/model'
import { BAND_GRID, CatalogFigures, ElectionsHero, ElectionsSearch, ElectionsSourceLine, HeroPanel, PROTOTYPE_HREF, Rows, sectionIndex, useFormat, type Row } from '../shared/parts'
import { placeName, usePlaces, type Place, type PlaceIndex } from '../shared/places'
import { DATA, PLACE_COVERAGE, placeCoverageRows } from './model'
import { EventTitle, EventsBand, HubShell, Lede, hrefLink, hubNotes, shortcuts } from './parts'

/**
 * `localitate` — the front door led by a place search: pick a locality and
 * see what the sources list for it across the years, then open its page.
 * Before a pick, the door is not empty: the largest places the sources report
 * (by INS 2021 population) and how many of today's INS UATs each edition
 * reports. The place index (1.2 MB) loads only in the browser; on the server
 * those parts render their placeholders.
 */

const PANEL_ROWS = 6
const OWN_PATH = '/development/elections/hub?v=localitate'

function placeNotes(): readonly ReactNode[] {
  return [
    <Trans key="place">
      O localitate e un cod SIRUTA la care a raportat sursa („loc de raportare"), nu un teritoriu: președintele consiliului județean sau un mandat parlamentar raportat pe
      localitate nu e cursa localității.
    </Trans>,
    <Trans key="denominator">
      Acoperirea e numărată față de lista INS a unităților administrative de azi ({PLACE_COVERAGE.insUats}), nu față de lista din anul alegerii; mărimea localităților e populația
      INS din {PLACE_COVERAGE.populationYear}.
    </Trans>,
  ]
}

/** The place the address names, and the way to name another. */
function useChosenPlace() {
  const search = useSearch({ strict: false }) as { readonly loc?: unknown }
  const navigate = useNavigate()
  const siruta = typeof search.loc === 'string' && /^\d{1,6}$/u.test(search.loc) ? search.loc : typeof search.loc === 'number' ? String(search.loc) : null
  const choose = (next: string) => void navigate({ to: '.', search: (previous: Record<string, unknown>) => ({ ...previous, loc: next }), resetScroll: false })
  return { siruta, choose }
}

const ownHref = (siruta: string) => `${OWN_PATH}&loc=${encodeURIComponent(siruta)}`

function kindAndCounty(place: Place): string {
  return [placeKind(place.ins?.kind), place.ins?.county].filter(Boolean).join(', ') || t`nu e în lista INS de azi`
}

/** A place's rows grouped by the election they belong to, newest first. */
function placeEvents(index: PlaceIndex, place: Place) {
  const eventOf = new Map(DATA.events.flatMap((event) => event.editions.map((edition) => [edition.key, event] as const)))
  const byEdition = new Map<string, { readonly offices: Set<string>; readonly rounds: Set<string | null>; rows: number }>()
  for (const [editionIndex, officeIndex, roundIndex] of place.rows) {
    const key = index.editions[editionIndex] ?? ''
    const entry = byEdition.get(key) ?? { offices: new Set<string>(), rounds: new Set<string | null>(), rows: 0 }
    entry.offices.add(index.offices[officeIndex] ?? '')
    entry.rounds.add(index.rounds[roundIndex] ?? null)
    entry.rows += 1
    byEdition.set(key, entry)
  }
  const byEvent = new Map<
    string,
    {
      readonly event: ElectionEvent
      readonly editions: { readonly key: string; readonly offices: readonly string[]; readonly rounds: readonly (string | null)[]; readonly rows: number }[]
    }
  >()
  for (const [key, entry] of byEdition) {
    const event = eventOf.get(key)
    if (!event) continue
    const group = byEvent.get(event.key) ?? { event, editions: [] }
    group.editions.push({ key, offices: [...entry.offices].sort(), rounds: [...entry.rounds], rows: entry.rows })
    byEvent.set(event.key, group)
  }
  return [...byEvent.values()].sort((a, b) => b.event.year - a.event.year)
}

function OfficeWords({ offices }: { readonly offices: readonly string[] }) {
  const known = offices.map(officeLabel).filter((label): label is string => label !== null)
  const shapes = offices.filter((office) => officeLabel(office) === null)
  return (
    <>
      {known.join(', ')}
      {shapes.length > 0 ? (
        <span className="block text-xs text-muted-foreground">
          <span className="font-mono">{shapes.join(', ')}</span> <Trans>(etichetă din sursă)</Trans>
        </span>
      ) : null}
    </>
  )
}

function IconAction({ href, label, children }: { readonly href: string; readonly label: string; readonly children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={href}
          aria-label={label}
          className="inline-flex size-8 items-center justify-center rounded-sm border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {children}
        </a>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Beside the headline once a place is chosen: the place, its years, and the two ways out. */
function PlacePanel({ index, place }: { readonly index: PlaceIndex; readonly place: Place }) {
  const groups = placeEvents(index, place)
  const years = groups.map((group) => group.event.year)
  const editions = new Set(place.rows.map((row) => row[0])).size
  const elections = countElections(groups.map((group) => group.event))
  return (
    <HeroPanel
      titleId="elections-hub-place-title"
      title={<Trans>Localitatea selectată</Trans>}
      aside={
        <TooltipProvider>
          <span className="flex gap-1.5">
            <IconAction href={PROTOTYPE_HREF.place(place.siruta)} label={t`Pagina localității`}>
              <MapPin className="size-4" aria-hidden="true" />
            </IconAction>
            {/* INS has a page only for the codes on today's UAT list; an old or source-only code gets none. */}
            {place.ins ? (
              <IconAction href={`/ins/teritorii/${place.siruta}`} label={t`Locul de raportare pe pagina INS`}>
                <ExternalLink className="size-4" aria-hidden="true" />
              </IconAction>
            ) : null}
          </span>
        </TooltipProvider>
      }
      footer={
        <Trans>
          {editions} ediții de date raportează aici, pentru {elections} alegeri; un rând e o funcție raportată aici, nu o cursă, iar edițiile nu se adună.
        </Trans>
      }
    >
      <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground">{placeName(place)}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {kindAndCounty(place)} · <span className="font-mono text-xs tabular-nums">SIRUTA {place.siruta}</span>
      </p>
      <Rows
        className="mt-4"
        rows={groups.slice(0, PANEL_ROWS).map((group): Row => ({
          key: group.event.key,
          label: <EventTitle event={group.event} />,
          value: group.editions.length === 1 ? t`1 ediție` : t`${group.editions.length} ediții`,
          link: hrefLink(PROTOTYPE_HREF.election(group.event.key)),
        }))}
      />
      {groups.length > PANEL_ROWS ? (
        <a href="#loc" className={SHOW_MORE_CLASS}>
          <Trans>
            Toate cele {elections} alegeri, din {Math.min(...years)} până în {Math.max(...years)}
          </Trans>
        </a>
      ) : null}
    </HeroPanel>
  )
}

/** Beside the headline before a pick: the largest places the sources report, each a start. */
function LargestPanel() {
  const format = useFormat()
  const top = PLACE_COVERAGE.largest[0]?.population ?? 1
  return (
    <HeroPanel
      titleId="elections-hub-largest-title"
      title={<Trans>Cele mai mari localități raportate</Trans>}
      footer={<Trans>După populația INS din {PLACE_COVERAGE.populationYear}; o localitate deschide ce au raportat sursele pentru ea.</Trans>}
    >
      <Rows
        className="mt-4"
        rows={PLACE_COVERAGE.largest.slice(0, PANEL_ROWS).map((place): Row => ({
          key: place.siruta,
          label: place.name,
          meta: `${[placeKind(place.kind), place.county].filter(Boolean).join(', ')} · ${format.n(place.population)} ${t`locuitori`}`,
          value: t`${format.n(place.editions)} ediții`,
          fraction: place.population / top,
          link: hrefLink(ownHref(place.siruta)),
        }))}
      />
      <a href="#loc" className={SHOW_MORE_CLASS}>
        <Trans>Toate cele {PLACE_COVERAGE.largest.length}</Trans>
      </a>
    </HeroPanel>
  )
}

function PlaceBand({ index, siruta }: { readonly index: string; readonly siruta: string | null }) {
  const format = useFormat()
  const places = usePlaces(siruta !== null)
  const place = siruta && places.data ? (places.data.places.get(siruta) ?? null) : null
  const groups = place && places.data ? placeEvents(places.data, place) : []
  const years = groups.map((group) => group.event.year)
  const editions = place ? new Set(place.rows.map((row) => row[0])).size : 0
  const elections = countElections(groups.map((group) => group.event))
  return (
    <HomeBand id="loc" labelledBy="elections-hub-loc-title">
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="elections-hub-loc-title"
            index={index}
            title={place ? placeName(place) : siruta ? <Trans>Localitatea</Trans> : <Trans>Alege o localitate</Trans>}
            lede={
              place ? (
                <Trans>
                  {kindAndCounty(place)}, cod SIRUTA {place.siruta}: {format.n(editions)} ediții de date raportează aici, pentru {elections} alegeri, din {Math.min(...years)} până
                  în {Math.max(...years)}, așa cum le-au raportat sursele. Edițiile unei alegeri stau una lângă alta, nu se adună.
                </Trans>
              ) : siruta && places.data ? (
                <Trans>Codul SIRUTA {siruta} nu apare în nicio ediție de date. Nu înseamnă că localitatea nu a avut alegeri.</Trans>
              ) : siruta ? null : (
                <Trans>
                  Caută localitatea mai sus sau pornește de la cele mai mari {PLACE_COVERAGE.largest.length} localități raportate. Pagina arată ce listează sursele pentru ea, an de
                  an.
                </Trans>
              )
            }
          />
          {place ? (
            <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
              <a href={PROTOTYPE_HREF.place(place.siruta)} className={cn(SHOW_MORE_CLASS, 'mt-0')}>
                <Trans>Pagina localității</Trans>
                <span aria-hidden="true">&nbsp;→</span>
              </a>
              {place.ins ? (
                <a href={`/ins/teritorii/${place.siruta}`} className={cn(SHOW_MORE_CLASS, 'mt-0 text-muted-foreground')}>
                  <Trans>Loc de raportare, pe pagina INS</Trans>
                  <span aria-hidden="true">&nbsp;→</span>
                </a>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          {siruta && !places.data ? (
            <HubPending rows={8} />
          ) : place ? (
            <ol className="divide-y divide-border/70 border-y border-border/70">
              {groups.map((group) => (
                <li key={group.event.key} className="py-2.5">
                  <a href={PROTOTYPE_HREF.election(group.event.key)} className="flex items-baseline justify-between gap-4 px-1 text-sm hover:underline">
                    <span className="font-semibold text-foreground">
                      <EventTitle event={group.event} />
                    </span>
                    <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                      {group.editions.length === 1 ? <Trans>1 ediție</Trans> : <Trans>{group.editions.length} ediții</Trans>}
                    </span>
                  </a>
                  <ul className="mt-1">
                    {group.editions.map((edition) => (
                      <li key={edition.key} className="grid grid-cols-1 gap-x-4 gap-y-0.5 px-1 py-1 text-sm sm:grid-cols-[10.5rem_minmax(0,1fr)_7rem_5rem]">
                        <span className="min-w-0 break-all font-mono text-xs text-muted-foreground">{edition.key}</span>
                        <span className="min-w-0 text-foreground">
                          <OfficeWords offices={edition.offices} />
                        </span>
                        <span className="text-muted-foreground">{edition.rounds.map(roundLabel).join(', ')}</span>
                        <span className="tabular-nums text-muted-foreground sm:text-right">{t`${format.n(edition.rows)} rânduri`}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : siruta ? null : (
            <Rows
              rows={PLACE_COVERAGE.largest.map((large): Row => ({
                key: large.siruta,
                label: large.name,
                meta: `${[placeKind(large.kind), large.county].filter(Boolean).join(', ')} · ${format.n(large.population)} ${t`locuitori`} · SIRUTA ${large.siruta}`,
                value: t`${format.n(large.editions)} ediții`,
                link: hrefLink(ownHref(large.siruta)),
              }))}
            />
          )}
        </div>
      </div>
    </HomeBand>
  )
}

function CoverageBand({ index }: { readonly index: string }) {
  const format = useFormat()
  const rows = placeCoverageRows(DATA)
  const full = rows.filter((row) => row.named === PLACE_COVERAGE.insUats).length
  return (
    <HomeBand id="acoperire" labelledBy="elections-hub-coverage-title">
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="elections-hub-coverage-title"
            index={index}
            title={<Trans>Câte localități raportează fiecare ediție</Trans>}
            lede={
              <Trans>
                {rows.length} din cele {DATA.editions.length} de ediții de date raportează la nivel de localitate; {full} dintre ele numesc toate cele{' '}
                {format.n(PLACE_COVERAGE.insUats)} de unități din lista INS de azi. Numitorul e lista de azi, nu cea din anul alegerii.
              </Trans>
            }
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <MonoLabel className="block text-muted-foreground">
            <Trans>Localități din lista INS de azi, pe ediție</Trans>
          </MonoLabel>
          <Rows
            className="mt-3"
            rows={rows.map((row): Row => ({
              key: row.key,
              label: row.event ? <EventTitle event={row.event} /> : row.key,
              meta: (
                <>
                  <span className="font-mono">{row.key}</span>
                  {row.siruta > row.named ? ` · ${t`${format.n(row.siruta - row.named)} coduri în afara listei INS`}` : null}
                </>
              ),
              value: t`${format.n(row.named)} din ${format.n(PLACE_COVERAGE.insUats)}`,
              fraction: row.named / PLACE_COVERAGE.insUats,
              link: row.event ? hrefLink(PROTOTYPE_HREF.election(row.event.key)) : undefined,
            }))}
          />
        </div>
      </div>
    </HomeBand>
  )
}

export function HubLocalitate() {
  const { siruta, choose } = useChosenPlace()
  const places = usePlaces(siruta !== null)
  const place = siruta && places.data ? (places.data.places.get(siruta) ?? null) : null
  const sections = [
    { id: 'loc', label: t`Localitatea` },
    { id: 'acoperire', label: t`Acoperirea` },
    { id: 'alegeri', label: t`Pe alegeri` },
  ]
  return (
    <HubShell>
      <ElectionsHero
        idPrefix="elections-hub-localitate"
        headline={
          <Trans>
            Alegerile din
            <br />
            localitatea ta
          </Trans>
        }
        lede={<Lede after={<Trans>Caută localitatea și vezi ce au raportat sursele pentru ea, an de an.</Trans>} />}
        search={<ElectionsSearch events={DATA.events} scope="places" onPlace={choose} placeholder={t`Caută localitatea: Cluj-Napoca, Sectorul 3, Vama…`} />}
        shortcuts={shortcuts([{ key: 'place', label: <Trans>Localitatea</Trans>, href: '#loc' }])}
        panel={
          place && places.data ? (
            <PlacePanel index={places.data} place={place} />
          ) : siruta && !places.data ? (
            <HeroPanel titleId="elections-hub-place-title" title={<Trans>Localitatea selectată</Trans>}>
              <HubPending className="mt-4" />
            </HeroPanel>
          ) : (
            <LargestPanel />
          )
        }
        source={<ElectionsSourceLine readAt={DATA.readAt} notes={hubNotes(placeNotes())} />}
      />
      <HomeSectionNav title={t`Alegeri`} sections={sections} />
      <CatalogFigures data={DATA} links={{ events: 'alegeri', editions: 'acoperire', rows: 'loc', places: 'acoperire' }} />
      <PlaceBand index={sectionIndex(sections, 'loc')} siruta={siruta} />
      <CoverageBand index={sectionIndex(sections, 'acoperire')} />
      <EventsBand id="alegeri" index={sectionIndex(sections, 'alegeri')} titleId="elections-hub-events-title" />
    </HubShell>
  )
}
