import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft, ArrowUpRight, FileQuestion } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HomeBand } from '@/features/procurement/components/home/home-chrome'
import { HUB_BESIDE_TITLE_CLASS, HubLoadError, HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { eventShort, eventTitle, officeLabel, placeKind, roundLabel, scopeLabel } from '../shared/labels'
import type { Edition, ScopeType } from '../shared/model'
import { BAND_GRID, commonNotes, ElectionsSourceLine, PROTOTYPE_HREF, useFormat } from '../shared/parts'
import {
  headSentence,
  isDisputedYear,
  placeWord,
  publisherOf,
  READ_AT,
  rowNature,
  type LineageEvent,
  type ParsedContestKey,
  type PlaceRow,
  type RowIdentity,
  type ScopeRollup,
} from './model'

/**
 * The contest page's parts, in the procurement profiles' and the justice
 * court page's shape (Guidelines G1, G2, G8): a compact head with one
 * sentence, a figures band, numbered bands with full-width tables, one
 * source line. Every variant composes these; none invents a figure.
 */

export const OUT_LINK = 'inline-flex min-h-11 items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0'
const CODE = 'font-mono text-xs tabular-nums text-muted-foreground'

/** The office in a word; a label the table does not know is shown verbatim, marked as the source's (G10). */
export function OfficeWord({ office, className }: { readonly office: string | null; readonly className?: string }) {
  if (office === null) return <Trans>Rând de scrutin</Trans>
  const label = officeLabel(office)
  if (label !== null) return <>{label}</>
  return (
    <span className={className}>
      <span className="font-mono">{office}</span> <span className="text-muted-foreground">{t`(etichetă din sursă)`}</span>
    </span>
  )
}

/** The edition named by the publisher its key hints at, the key in mono beside it. */
export function EditionWord({ edition, editionKey }: { readonly edition: Edition | null; readonly editionKey: string }) {
  const publisher = publisherOf(editionKey)
  return (
    <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-2">
      {publisher ? <span>{publisher}</span> : null}
      <span className={cn(CODE, '[overflow-wrap:anywhere]')}>{editionKey}</span>
      {edition && isDisputedYear(edition) ? (
        <span className="text-amber-700 dark:text-amber-400" title={t`Etichetată 2014; după auditul datelor, rezultate din 2016`}>
          ✱
        </span>
      ) : null}
    </span>
  )
}

// ───────────────────────────────────────────────────────────── the head ──

const HEADING = {
  short: 'text-4xl sm:text-6xl lg:text-7xl',
  medium: 'text-3xl sm:text-5xl lg:text-6xl',
  long: 'text-2xl sm:text-4xl lg:text-5xl',
} as const

function headingSize(length: number): keyof typeof HEADING {
  return length <= 22 ? 'short' : length <= 44 ? 'medium' : 'long'
}

function Kicker({ identity }: { readonly identity: RowIdentity | null }) {
  return (
    <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground">
      <a href={PROTOTYPE_HREF.hub()} className="group inline-flex items-center gap-1.5 hover:text-foreground">
        <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        <span>
          <Trans>Alegeri</Trans>
        </span>
      </a>
      {identity?.event ? (
        <span className="hidden items-center gap-2 sm:flex">
          <span aria-hidden="true">/</span>
          <a href={PROTOTYPE_HREF.election(identity.event.key, identity.parsed.editionKey)} className="hover:text-foreground">
            {eventShort(identity.event)}
          </a>
          <span aria-hidden="true">/</span>
          <span>
            <Trans>Rând de scrutin</Trans>
          </span>
        </span>
      ) : (
        <span className="hidden items-center gap-2 sm:flex">
          <span aria-hidden="true">/</span>
          <span>
            <Trans>Rând de scrutin</Trans>
          </span>
        </span>
      )}
    </MonoLabel>
  )
}

/** „Primar · Cluj-Napoca": the office, then the place as a reader names it (the code in mono until a name is known). */
function HeadTitle({ identity }: { readonly identity: RowIdentity }) {
  const place = placeWord(identity)
  const office = identity.office
  const officeText = office === null ? t`Rând de scrutin` : (officeLabel(office) ?? office)
  const size = HEADING[headingSize(officeText.length + place.text.length + 3)]
  return (
    <h1 id="scrutin-title" className={cn('font-extrabold leading-[0.95] tracking-tighter text-foreground [overflow-wrap:anywhere]', size)}>
      <span className={cn(office !== null && officeLabel(office) === null && 'font-mono font-semibold tracking-tight')}>{officeText}</span>
      <span className="text-muted-foreground/60"> · </span>
      <span className={cn(place.code && 'font-mono font-semibold tracking-tight text-muted-foreground', place.asReported && 'font-semibold')}>{place.text}</span>
    </h1>
  )
}

/** Where the row sits: the election, the edition, the place (as a reporting location) and its INS page — each a link, each in one phrase. */
function HeadLinks({ identity }: { readonly identity: RowIdentity }) {
  const siruta = identity.scopeType === 'siruta' ? identity.scopeKey : null
  const place = placeWord(identity)
  return (
    <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {identity.event ? (
        <a href={PROTOTYPE_HREF.election(identity.event.key, identity.parsed.editionKey)} className={OUT_LINK}>
          <Trans>Ediția, în {eventTitle(identity.event).toLowerCase()}</Trans>
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </a>
      ) : null}
      {siruta ? (
        <a href={PROTOTYPE_HREF.place(siruta)} className={OUT_LINK}>
          <Trans>Locul de raportare: {place.text}</Trans>
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </a>
      ) : null}
      {siruta && identity.ins ? (
        <Link to="/ins/teritorii/$siruta" params={{ siruta }} className={OUT_LINK}>
          <Trans>La INS</Trans>
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      ) : null}
    </p>
  )
}

export function ContestHead({
  identity,
  pending,
  topRight,
  aside,
  children,
}: {
  readonly identity: RowIdentity
  /** The live row has not landed: the sentence is computed from the key and the fixture, the round still unknown. */
  readonly pending: boolean
  readonly topRight?: ReactNode
  readonly aside?: ReactNode
  readonly children?: ReactNode
}) {
  return (
    <section className="relative border-b" aria-labelledby="scrutin-title" aria-busy={pending || undefined}>
      <TwoLayerLattice idPrefix="elections-scrutin" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="flex items-center justify-between gap-4">
          <Kicker identity={identity} />
          {topRight}
        </div>
        <div className={cn('mt-4 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8', aside ? 'items-start' : '')}>
          <div className={cn('min-w-0', aside ? 'lg:col-span-7' : 'lg:col-span-9')}>
            <HeadTitle identity={identity} />
            <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg">{headSentence(identity)}</p>
            <HeadLinks identity={identity} />
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

/** The round as reported, at the top right (G1's edition/round slot). */
export function RoundTag({ identity }: { readonly identity: RowIdentity }) {
  if (!identity.live) return <MonoLabel className="text-muted-foreground">…</MonoLabel>
  return (
    <MonoLabel className="whitespace-nowrap border px-2 py-1.5 text-foreground">
      {roundLabel(identity.round)}
      <span className="text-muted-foreground"> · {t`eticheta sursei`}</span>
    </MonoLabel>
  )
}

/** The API answered and has no such row — distinct from a failed read, which says nothing about the row. */
export function ContestMissing({
  contestKey,
  parsed,
  failed,
  onRetry,
}: {
  readonly contestKey: string
  readonly parsed: ParsedContestKey | null
  readonly failed: boolean
  readonly onRetry: () => void
}) {
  return (
    <div className="bg-background">
      <section className="relative border-b" aria-labelledby="scrutin-title">
        <TwoLayerLattice idPrefix="elections-scrutin" />
        <RuledFrame className="py-10 sm:py-12 lg:py-14">
          <CornerTicks />
          <Kicker identity={null} />
          <h1 id="scrutin-title" className={cn('mt-4 font-extrabold leading-[0.95] tracking-tighter text-foreground', HEADING.medium)}>
            <Trans>Rând de scrutin</Trans>
          </h1>
          <div role="status" className="mt-8 max-w-[60ch]">
            <FileQuestion className="size-6 text-muted-foreground" aria-hidden="true" />
            {failed ? (
              <div className="mt-3">
                <HubLoadError onRetry={onRetry} />
              </div>
            ) : (
              <>
                <p className="mt-3 text-lg font-semibold text-foreground">{parsed ? <Trans>Rândul nu e în date</Trans> : <Trans>Aceasta nu e o cheie de rând de scrutin</Trans>}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {parsed ? (
                    <Trans>API-ul nu are un rând de scrutin cu această cheie. Absența lui nu înseamnă că nu au fost alegeri acolo.</Trans>
                  ) : (
                    <Trans>O cheie arată ca „contest:ediție:funcție:tip-de-loc:loc”.</Trans>
                  )}
                </p>
                <p className={cn('mt-3 [overflow-wrap:anywhere]', CODE)}>{contestKey}</p>
                {parsed ? (
                  <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
                    <a href={PROTOTYPE_HREF.hub()} className={OUT_LINK}>
                      <Trans>Toate alegerile</Trans>
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </a>
                    {parsed.scopeType === 'siruta' ? (
                      <a href={PROTOTYPE_HREF.place(parsed.scopeKey)} className={OUT_LINK}>
                        <Trans>Locul de raportare {parsed.scopeKey}</Trans>
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </a>
                    ) : null}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </RuledFrame>
      </section>
    </div>
  )
}

// ────────────────────────────────────────────────────────── the figures ──

export interface Figure {
  readonly key: string
  /** A number; `null` for a value the data does not hold (drawn as a dash with its note, never 0). */
  readonly value: number | null
  /** The value is not known yet (the index or the read is pending): a bone, not a dash. */
  readonly pending?: boolean
  readonly label: ReactNode
  readonly note: ReactNode
  readonly href?: string
}

const FIGURE_COLUMNS: Readonly<Record<number, string>> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-2 lg:grid-cols-3' }

/**
 * The figures band in the hubs' shape, with what `HubFiguresBand` has no
 * cell for: a dash for a value the data does not hold and a bone while an
 * index loads. Copied from `hub-figures.tsx`; at promotion `HubFact` would
 * take `value: number | null` instead (see RATIONALE.md).
 */
export function ContestFigures({ figures }: { readonly figures: readonly Figure[] }) {
  const format = useFormat()
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <dl className={cn('grid', FIGURE_COLUMNS[figures.length] ?? 'grid-cols-2 lg:grid-cols-4')}>
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
                {figure.href ? (
                  <a
                    href={figure.href}
                    className='after:absolute after:inset-0 after:content-[""] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring'
                  >
                    <MonoLabel className="block leading-relaxed text-foreground">{figure.label}</MonoLabel>
                  </a>
                ) : (
                  <MonoLabel className="block leading-relaxed text-foreground">{figure.label}</MonoLabel>
                )}
                <MonoLabel className="mt-auto block pt-3 leading-relaxed text-muted-foreground">{figure.note}</MonoLabel>
              </dt>
              <dd className="order-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
                {figure.pending ? (
                  <span className="inline-block h-8 w-16 animate-pulse rounded-sm bg-muted/70 align-middle sm:h-10" aria-label={t`se încarcă`} />
                ) : figure.value === null ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  format.n(figure.value)
                )}
              </dd>
            </div>
          ))}
        </dl>
      </RuledFrame>
    </section>
  )
}

// ──────────────────────────────────────────────────────────── the bands ──

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
  /** The body under the head, full width (a table), instead of beside it. */
  readonly wide?: boolean
  readonly children: ReactNode
}) {
  const titleId = `scrutin-${id}-title`
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

export const EMPTY = 'border-y py-4 text-sm text-muted-foreground'

/** A full-width table whose rows are links, whole (G8): the first cell's link covers the row. */
export function RowTable({
  head,
  rows,
  caption,
  className,
}: {
  readonly head: readonly ReactNode[]
  readonly rows: readonly { readonly key: string; readonly href?: string; readonly current?: boolean; readonly cells: readonly ReactNode[] }[]
  readonly caption?: ReactNode
  readonly className?: string
}) {
  return (
    <div className={className}>
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {head.map((cell, index) => (
              <TableHead key={index} className={cn('h-9 px-2 first:pl-1', index === head.length - 1 && 'text-right')}>
                <MonoLabel className="text-muted-foreground">{cell}</MonoLabel>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key} className={cn('relative', row.current && 'bg-muted/30', row.href && 'cursor-pointer')}>
              {row.cells.map((cell, index) => (
                <TableCell key={index} className={cn('px-2 py-2 align-top first:pl-1', index === row.cells.length - 1 && 'text-right')}>
                  {index === 0 && row.href ? (
                    <a
                      href={row.href}
                      className='after:absolute after:inset-0 after:content-[""] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring'
                    >
                      {cell}
                    </a>
                  ) : (
                    cell
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {caption ? <p className="mt-3 text-xs text-muted-foreground">{caption}</p> : null}
    </div>
  )
}

export function CurrentMark() {
  return (
    <MonoLabel className="ml-2 text-primary">
      <Trans>această pagină</Trans>
    </MonoLabel>
  )
}

/** The lineage as a table: the election, the edition, the round — one row per edition's row, grouped by election, the current one marked. */
export function LineageTable({ lineage, currentKey, office }: { readonly lineage: readonly LineageEvent[]; readonly currentKey: string; readonly office: string | null }) {
  const rows = lineage.flatMap((entry) =>
    entry.editions.flatMap((item) =>
      item.rows.map((row, index) => ({
        key: row.key,
        href: row.key === currentKey ? undefined : PROTOTYPE_HREF.contest(row.key),
        current: row.key === currentKey,
        cells: [
          <span key="event" className={cn(index === 0 && item === entry.editions[0] ? 'font-medium text-foreground' : 'text-muted-foreground')}>
            {index === 0 && item === entry.editions[0] ? eventTitle(entry.event) : '〃'}
            {row.key === currentKey ? <CurrentMark /> : null}
          </span>,
          <EditionWord key="edition" edition={item.edition} editionKey={item.edition.key} />,
          <span key="round" className="whitespace-nowrap tabular-nums">
            {roundLabel(row.round)}
          </span>,
        ],
      })),
    ),
  )
  const editions = lineage.reduce((sum, entry) => sum + entry.editions.length, 0)
  const label = office === null ? t`această funcție` : (officeLabel(office) ?? office)
  return (
    <RowTable
      head={[<Trans key="e">Alegerea</Trans>, <Trans key="d">Ediția de date</Trans>, <Trans key="r">Tur raportat</Trans>]}
      rows={rows}
      caption={
        <Trans>
          „{label}”: un rând de tabel pe ediție și tur, în {editions} ediții de date și {lineage.length} grupări de alegeri ale platformei. Edițiile aceleiași alegeri stau una
          lângă alta; nu se adună. ✱ = etichetată 2014, date din 2016: nu e o altă alegere față de 2016.
        </Trans>
      }
    />
  )
}

/** The rows reported at the place in one edition, by office and round; this row marked. */
export function PlaceRowsTable({ rows, currentKey }: { readonly rows: readonly PlaceRow[]; readonly currentKey: string }) {
  if (rows.length === 0)
    return (
      <p className={EMPTY}>
        <Trans>Indexul locurilor nu are alte rânduri la acest loc în această ediție.</Trans>
      </p>
    )
  return (
    <RowTable
      head={[<Trans key="o">Funcție raportată</Trans>, <Trans key="n">Ce e rândul</Trans>, <Trans key="r">Tur raportat</Trans>]}
      rows={rows.map((row) => ({
        key: row.key,
        href: row.key === currentKey ? undefined : PROTOTYPE_HREF.contest(row.key),
        current: row.key === currentKey,
        cells: [
          <span key="o" className="text-foreground">
            <OfficeWord office={row.office} />
            {row.key === currentKey ? <CurrentMark /> : null}
          </span>,
          <span key="n" className="text-muted-foreground">
            <NatureWord nature={rowNature(row.office, 'siruta')} />
          </span>,
          <span key="r" className="whitespace-nowrap tabular-nums">
            {roundLabel(row.round)}
          </span>,
        ],
      }))}
    />
  )
}

export function NatureWord({ nature }: { readonly nature: ReturnType<typeof rowNature> }) {
  switch (nature) {
    case 'race-candidate':
      return <Trans>funcția locului, după eticheta sursei</Trans>
    case 'reporting-location':
      return <Trans>funcție mai largă, raportată aici: loc de raportare, nu cursa locului</Trans>
    case 'roll-up':
      return <Trans>rând-centralizator; nu e suma rândurilor de sub el</Trans>
    case 'source-shape':
      return <Trans>formă de tabel din sursă, nu o funcție</Trans>
    case 'source-numbering':
      return <Trans>numerotarea sursei; nu se leagă de alte ediții</Trans>
    case 'abroad':
      return <Trans>raportat din străinătate, pe țară</Trans>
  }
}

/** The same office's rows at each level of the edition: counts from the fixture, the one national row linked, the county rows listed as served. */
export function LevelsList({
  rollups,
  identity,
  countyRows,
}: {
  readonly rollups: readonly ScopeRollup[]
  readonly identity: RowIdentity
  readonly countyRows:
    | {
        readonly items: readonly { readonly contestKey: string; readonly scopeLabel: string | null; readonly sourceScopeKey: string; readonly reportedRound: string | null }[]
        readonly total: number
      }
    | null
    | undefined
}) {
  const format = useFormat()
  const levelHref = (scopeType: ScopeType) => {
    const office = identity.office
    return office === null ? undefined : `/alegeri/${encodeURIComponent(identity.parsed.editionKey)}?functie=${encodeURIComponent(office)}&arie=${scopeType}`
  }
  return (
    <div>
      <RowTable
        head={[<Trans key="l">Nivelul raportat</Trans>, <Trans key="r">Tururi raportate</Trans>, <Trans key="n">Rânduri</Trans>]}
        rows={rollups.map((level) => ({
          key: level.scopeType,
          current: level.scopeType === identity.scopeType,
          href: level.singleKey && level.singleKey !== identity.key ? PROTOTYPE_HREF.contest(level.singleKey) : levelHref(level.scopeType),
          cells: [
            <span key="l" className="text-foreground">
              {scopeLabel(level.scopeType)}
              {level.scopeType === identity.scopeType ? <CurrentMark /> : null}
            </span>,
            <span key="r" className="text-muted-foreground">
              {level.rounds.map((round) => roundLabel(round)).join(', ')}
            </span>,
            <span key="n" className="tabular-nums">
              {format.n(level.rows)}
            </span>,
          ],
        }))}
        caption={<Trans>Rândurile unui nivel nu sunt suma celor de sub el, iar un nivel nu numără curse. Un nivel se deschide în catalogul ediției.</Trans>}
      />
      {countyRows === undefined ? (
        <HubPending rows={3} className="mt-6" />
      ) : countyRows && countyRows.items.length > 0 ? (
        <div className="mt-6">
          <MonoLabel className="block text-muted-foreground">
            <Trans>
              Rândurile pe județ, cu eticheta sursei ({countyRows.items.length} din {countyRows.total})
            </Trans>
          </MonoLabel>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {[...countyRows.items]
              .sort((a, b) => (a.scopeLabel ?? a.sourceScopeKey).localeCompare(b.scopeLabel ?? b.sourceScopeKey, 'ro'))
              .map((row) => (
                <li key={row.contestKey}>
                  <a href={PROTOTYPE_HREF.contest(row.contestKey)} className="inline-flex min-h-8 items-center gap-1.5 text-foreground underline-offset-4 hover:underline">
                    {row.scopeLabel ? (
                      <>
                        {row.scopeLabel}
                        <span className={CODE}>{row.sourceScopeKey}</span>
                      </>
                    ) : (
                      <span className={CODE}>{row.sourceScopeKey}</span>
                    )}
                  </a>
                </li>
              ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            <Trans>Codul județului e numerotarea acestei ediții, nu un cod comun; pagina nu alege județul locului în locul cititorului.</Trans>
          </p>
        </div>
      ) : null}
    </div>
  )
}

/** The results band when nothing is served: what will appear and that it is not published; never a zero. */
export function ResultsEmpty({ className }: { readonly className?: string }) {
  return (
    <div className={className}>
      <p className="text-base font-semibold text-foreground">
        <Trans>Rezultatele nu sunt publicate încă.</Trans>
      </p>
      <ol className="mt-4 divide-y divide-border/70 border-y border-border/70">
        {[
          { key: 'votes', label: t`Voturi valabile, pe competitor`, note: t`cu statutul fiecărei cifre` },
          { key: 'turnout', label: t`Prezența la vot`, note: t`cu starea de calitate a cifrei (verificată, neverificată, suspectă)` },
          { key: 'competitors', label: t`Competitorii`, note: t`candidați și liste, așa cum i-a raportat sursa; niciodată „aleși”` },
          { key: 'seats', label: t`Mandate pe liste`, note: t`alocarea pe liste, nu persoane` },
        ].map((item) => (
          <li key={item.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 px-1 py-2.5">
            <span className="min-w-0">
              <span className="block text-sm text-foreground">{item.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{item.note}</span>
            </span>
            <span className="text-sm tabular-nums text-muted-foreground">—</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** The identity as served: a facts list, each field as reported, codes in mono. */
export function IdentityFacts({ identity, className }: { readonly identity: RowIdentity; readonly className?: string }) {
  const place = placeWord(identity)
  const facts: readonly { readonly key: string; readonly label: ReactNode; readonly value: ReactNode }[] = [
    {
      key: 'office',
      label: <Trans>Funcție raportată</Trans>,
      value: identity.office === null ? <span className={CODE}>{identity.parsed.officeSlug}</span> : <span className="font-mono text-sm">{identity.office}</span>,
    },
    { key: 'scope', label: <Trans>Tip de loc</Trans>, value: scopeLabel(identity.scopeType) },
    { key: 'key', label: <Trans>Cheia locului, din sursă</Trans>, value: <span className={CODE}>{identity.scopeKey}</span> },
    {
      key: 'label',
      label: <Trans>Eticheta locului, din sursă</Trans>,
      value: identity.live ? (
        (identity.scopeLabel ?? <span className="text-muted-foreground">{t`neraportată în acest rând`}</span>)
      ) : (
        <span className="text-muted-foreground">…</span>
      ),
    },
    // The place index's label is another edition's, looked up by the code: shown apart, with where it comes from, never as this row's.
    ...(identity.lookupLabel !== null && identity.lookupLabel !== identity.scopeLabel
      ? [
          {
            key: 'lookup',
            label: <Trans>Eticheta din indexul locurilor</Trans>,
            value: (
              <span>
                {identity.lookupLabel} <span className="text-muted-foreground">{t`(prima dată codului de o sursă, poate în altă ediție; nu a acestui rând)`}</span>
              </span>
            ),
          },
        ]
      : []),
    {
      key: 'ins',
      label: <Trans>În lista INS de azi</Trans>,
      value:
        identity.scopeType !== 'siruta' ? (
          <span className="text-muted-foreground">{t`nu e un cod SIRUTA`}</span>
        ) : identity.ins ? (
          [identity.ins.name, placeKind(identity.ins.kind), identity.ins.county].filter(Boolean).join(', ')
        ) : (
          <span className="text-muted-foreground">{place.code ? t`se caută…` : t`nu e în lista INS de azi`}</span>
        ),
    },
    { key: 'round', label: <Trans>Tur raportat</Trans>, value: identity.live ? roundLabel(identity.round) : <span className="text-muted-foreground">…</span> },
    { key: 'edition', label: <Trans>Ediția de date</Trans>, value: <EditionWord edition={identity.edition} editionKey={identity.parsed.editionKey} /> },
    {
      key: 'event',
      label: <Trans>Gruparea platformei</Trans>,
      value: identity.event ? (
        <span>
          {eventTitle(identity.event)} <span className={CODE}>{identity.event.key}</span>
        </span>
      ) : (
        <span className="text-muted-foreground">{t`negrupată`}</span>
      ),
    },
    { key: 'contest', label: <Trans>Cheia rândului</Trans>, value: <span className={cn(CODE, '[overflow-wrap:anywhere]')}>{identity.key}</span> },
  ]
  return (
    <dl className={cn('divide-y divide-border/70 border-y border-border/70', className)}>
      {facts.map((fact) => (
        <div key={fact.key} className="grid grid-cols-1 gap-x-6 gap-y-0.5 px-1 py-2 sm:grid-cols-[14rem_minmax(0,1fr)]">
          <dt className="text-xs text-muted-foreground sm:pt-0.5">{fact.label}</dt>
          <dd className="min-w-0 text-sm text-foreground">{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}

// ──────────────────────────────────────────────────────── the source line ──

/** The page's notes after the common ones: what this row is, in its own terms (G5). */
export function contestNotes(identity: RowIdentity): readonly ReactNode[] {
  const notes: ReactNode[] = [...commonNotes()]
  const nature = identity.office === null ? null : rowNature(identity.office, identity.scopeType)
  if (identity.scopeType === 'siruta')
    notes.push(
      <Trans key="scope">Codul SIRUTA e locul unde sursa a raportat rândul, nu un teritoriu electoral verificat. Numele, felul și județul vin din lista INS de azi.</Trans>,
    )
  if (nature === 'reporting-location')
    notes.push(<Trans key="wider">Funcția acestui rând e mai largă decât locul la care e raportat: rândul e un loc de raportare, nu cursa locului.</Trans>)
  if (nature === 'roll-up')
    notes.push(
      <Trans key="rollup">
        Un rând pe județ sau pe țară al unei funcții ținute mai jos (primar, consiliu local) e un centralizator al sursei; nu e suma rândurilor de sub el, iar codul județului e al
        ediției.
      </Trans>,
    )
  else if (identity.scopeType === 'county')
    notes.push(<Trans key="county">Codul județului e numerotarea acestei ediții, nu un cod comun: rândul nu se leagă de alte ediții prin el.</Trans>)
  if (placeWord(identity).fromIndex)
    notes.push(<Trans key="lookup">Numele locului vine din indexul locurilor (eticheta dată codului de o sursă, poate în altă ediție); rândul nu are etichetă proprie.</Trans>)
  if (nature === 'source-shape') notes.push(<Trans key="shape">Eticheta funcției e forma unui tabel din sursă, nu o funcție; pagina nu ghicește ce conține.</Trans>)
  if (nature === 'source-numbering')
    notes.push(<Trans key="numbering">Locul e numerotarea proprie a sursei; nu se leagă de alte ediții și nu se potrivește după nume cu o localitate.</Trans>)
  if (nature === 'abroad') notes.push(<Trans key="abroad">Rândul e raportat din străinătate, pe țară; cheia e numele țării, deci nu se leagă de alte ediții.</Trans>)
  notes.push(<Trans key="publisher">Publicatorul (BEC, AEP, ROAEP) e dedus din prefixul cheii ediției; API-ul nu îl servește.</Trans>)
  return notes
}

export function ContestSourceLine({ identity, className }: { readonly identity: RowIdentity; readonly className?: string }) {
  return <ElectionsSourceLine readAt={READ_AT} notes={contestNotes(identity)} className={className} />
}
