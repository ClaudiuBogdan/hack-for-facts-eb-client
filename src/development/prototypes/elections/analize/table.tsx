import { useId, useMemo, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowUpRight } from 'lucide-react'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { placeKind } from '../shared/labels'
import { electionKeyOf, isDisputedEvent } from '../shared/model'
import { placeName, usePlaces, type Place } from '../shared/places'
import { PROTOTYPE_HREF, useFormat } from '../shared/parts'
import {
  drilled,
  groupsOf,
  MEASURES,
  measureValue,
  partitioned,
  referenceEdition,
  ROUND_UNREPORTED,
  TIME_AXES,
  UNLISTED,
  withFilter,
  yearPoints,
  type Answer,
  type Axis,
  type Catalog,
  type Measure,
  type Query,
} from './model'
import { groupLabel, measureLabel } from './text'

/** The answer: the axis's groups in a table (G8), the localities from the place index, the years in a band of their own. */

const TOP = 25
const MORE = 100

function MeasureHead({ measure, active, hidden }: { readonly measure: Measure; readonly active: boolean; readonly hidden?: boolean }) {
  return (
    <TableHead className={cn('text-right', hidden && 'hidden sm:table-cell')} aria-sort={active ? 'descending' : 'none'}>
      <span className={cn(active && 'font-semibold text-foreground')}>{measureLabel(measure)}</span>
    </TableHead>
  )
}

/** A share as text, never a false zero: under the shown precision a positive share is a floor („<0,1%"), as `usePct` in the component kit does. */
function shareText(share: number, format: ReturnType<typeof useFormat>): string {
  const percent = share * 100
  const shown = percent < 10 ? Math.round(percent * 10) / 10 : Math.round(percent)
  if (percent > 0 && shown === 0) return `<${format.n(0.1)}%`
  return `${format.n(shown)}%`
}

function Share({ share, widest, muted }: { readonly share: number; readonly widest: number; readonly muted?: boolean }) {
  const format = useFormat()
  return (
    <span className="flex items-center justify-end gap-2">
      <span className="block h-1.5 w-20 bg-muted/70">
        <span
          className={cn('block h-1.5', muted ? 'bg-muted-foreground/35' : 'bg-primary/75')}
          style={{ width: `${Math.max(Math.min((share / widest) * 100, 100), 1).toFixed(1)}%` }}
        />
      </span>
      <span className="w-12 text-right text-xs tabular-nums">{shareText(share, format)}</span>
    </span>
  )
}

/** The way to a group's own page, where one exists: an election, an edition. */
function recordHref(axis: Axis, key: string, cat: Catalog): string | null {
  if (axis === 'alegeri') return PROTOTYPE_HREF.election(key)
  if (axis === 'editii') {
    const event = cat.eventOf.get(key)
    return event ? PROTOTYPE_HREF.election(event.key, key) : null
  }
  return null
}

/**
 * The axis's groups: the name, the three measures (the chosen one bold and
 * ranked by), the share where the axis partitions the measure, „Restul" for
 * the groups past the first 25, „Arată primele 100". The editions axis shows
 * each edition's own rows (never a sum of them) and marks the reference.
 */
export function AnswerTable({
  query,
  cat,
  answer,
  onChange,
  className,
}: {
  readonly query: Query
  readonly cat: Catalog
  readonly answer: Answer
  readonly onChange: (query: Query) => void
  readonly className?: string
}) {
  const format = useFormat()
  const [expanded, setExpanded] = useState<string | null>(null)
  if (query.dupa === 'localitati' || query.dupa === 'randuri') return null
  const axis: Axis = query.dupa
  const groups = groupsOf(cat, query, axis)
  const measure = query.masura
  const editions = axis === 'editii'
  const parts = partitioned(axis, measure)
  const valueOf = (group: (typeof groups)[number]) => (editions && measure === 'randuri' ? group.own : group.totals[measure])
  // Counties hold only the rows reported per locality: their shares are of those rows (the county groups' sum), so they add up to 100%.
  const counties = axis === 'judete'
  const total = counties ? groups.reduce((sum, group) => sum + valueOf(group), 0) : answer.totals[measure]
  const withoutCounty = counties && measure === 'randuri' ? answer.totals.randuri - total : 0
  /** Why a cell is a dash: the „2014" local event counted with 2016, or rows only in editions that are not the reference. */
  const dashTitle = (group: (typeof groups)[number], item: Measure) =>
    axis === 'alegeri' && answer.folded.has(group.key)
      ? t`Date din 2016 (E1): alegerea și rândurile ei sunt numărate la alegerile locale din 2016`
      : item === 'randuri'
        ? t`${format.n(group.own)} rânduri doar în ediții care nu sunt de referință; nu se adună`
        : t`Numărată cu altă grupare`
  const key = JSON.stringify({ query })
  const limit = expanded === key ? MORE : TOP
  const shown = groups.slice(0, limit)
  const rest = groups.slice(limit)
  const restValue = rest.reduce((sum, group) => sum + valueOf(group), 0)
  // „Restul" made only of dashes (rows in other editions, E1) is a dash too, never a 0 with a 0% share.
  const restDash = !editions && restValue === 0 && rest.some((group) => measureValue(group.totals, measure) === null)
  const widest = Math.max(1, ...shown.map(valueOf))
  const references = new Set(answer.references.map((edition) => edition.key))
  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 text-right">#</TableHead>
            <TableHead />
            {editions ? (
              <MeasureHead measure="randuri" active />
            ) : (
              MEASURES.map((item) => <MeasureHead key={item} measure={item} active={item === measure} hidden={item !== measure} />)
            )}
            <TableHead className="hidden w-36 text-right sm:table-cell">{parts ? t`Cota` : ''}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((group, index) => {
            const label = groupLabel(axis, group.key, cat)
            const href = recordHref(axis, group.key, cat)
            const drillable = group.key !== UNLISTED
            const value = valueOf(group)
            const counted = editions ? value : measureValue(group.totals, measure)
            const reference = editions && references.has(group.key)
            const disputed = axis === 'alegeri' && isDisputedEvent({ key: group.key })
            return (
              <TableRow key={group.key} className={cn(drillable && 'cursor-pointer')} onClick={drillable ? () => onChange(drilled(query, axis, group.key, cat)) : undefined}>
                <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="max-w-[12rem] sm:max-w-md">
                  <span className="flex items-center gap-1.5">
                    {drillable ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onChange(drilled(query, axis, group.key, cat))
                        }}
                        className={cn(
                          'min-w-0 truncate text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          label.mono && 'font-mono text-xs',
                        )}
                        title={[label.label, label.meta].filter(Boolean).join(' · ')}
                      >
                        {label.label}
                      </button>
                    ) : (
                      <span className={cn('truncate', label.mono && 'font-mono text-xs')}>{label.label}</span>
                    )}
                    {reference ? (
                      <span className="shrink-0 text-xs text-primary" title={t`Ediția de referință: rândurile alegerii se numără aici`}>
                        ✱
                      </span>
                    ) : null}
                    {disputed ? (
                      <span className="shrink-0 text-xs text-amber-700 dark:text-amber-400" title={t`Etichetată 2014; după auditul datelor, date din 2016 — nu o alegere în plus`}>
                        ✱
                      </span>
                    ) : null}
                    {label.meta ? <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{label.meta}</span> : null}
                    {href ? (
                      <a
                        href={href}
                        onClick={(event) => event.stopPropagation()}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label={t`Pagina ${label.label}`}
                      >
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </a>
                    ) : null}
                  </span>
                </TableCell>
                {editions ? (
                  <TableCell className="text-right font-semibold tabular-nums">{format.n(group.own)}</TableCell>
                ) : (
                  MEASURES.map((item) => {
                    // Rows only in editions that are not the reference, or an election counted under 2016 (E1): a dash with why, never a zero that reads as "none".
                    const shown = measureValue(group.totals, item)
                    return (
                      <TableCell key={item} className={cn('text-right tabular-nums', item === measure ? 'font-semibold' : 'hidden text-muted-foreground sm:table-cell')}>
                        {shown === null ? (
                          <span className="text-muted-foreground" title={dashTitle(group, item)}>
                            —
                          </span>
                        ) : (
                          format.n(shown)
                        )}
                      </TableCell>
                    )
                  })
                )}
                <TableCell className="hidden sm:table-cell">{parts && total > 0 && counted !== null ? <Share share={value / total} widest={widest / total} /> : null}</TableCell>
              </TableRow>
            )
          })}
          {parts && rest.length > 0 ? (
            <TableRow className="text-muted-foreground">
              <TableCell />
              <TableCell>{t`Restul (${format.n(rest.length)})`}</TableCell>
              {editions ? (
                <TableCell className="text-right tabular-nums">{format.n(restValue)}</TableCell>
              ) : (
                MEASURES.map((item) => (
                  <TableCell key={item} className={cn('text-right tabular-nums', item !== measure && 'hidden sm:table-cell')}>
                    {item !== measure ? '' : restDash ? <span title={t`Rânduri doar în ediții care nu sunt de referință; nu se adună`}>—</span> : format.n(restValue)}
                  </TableCell>
                ))
              )}
              <TableCell className="hidden sm:table-cell">{total > 0 && !restDash ? <Share share={restValue / total} widest={widest / total} muted /> : null}</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {groups.length > shown.length ? t`primele ${format.n(shown.length)} din ${format.n(groups.length)}` : t`${format.n(groups.length)} rânduri`}
          {editions && measure === 'randuri' ? ` · ${t`rândurile fiecărei ediții, nu se adună; ✱ ediția de referință`}` : ''}
          {!parts && !editions
            ? ` · ${measure === 'alegeri' ? t`o alegere poate apărea pe mai multe rânduri: coloana nu se adună` : measure === 'editii' ? t`o ediție poate apărea pe mai multe rânduri: coloana nu se adună` : ''}`
            : ''}
          {editions && measure !== 'randuri' ? ` · ${t`fiecare ediție e una și aparține unei singure alegeri`}` : ''}
          {counties && parts
            ? ` · ${t`cota e din rândurile raportate pe localități (${format.n(total)})`}${withoutCounty > 0 ? `; ${t`${format.n(withoutCounty)} rânduri raportate la alte niveluri nu au județ`}` : ''}`
            : ''}
        </span>
        {expanded !== key && groups.length > TOP ? (
          <button type="button" onClick={() => setExpanded(key)} className="font-medium text-foreground underline-offset-4 hover:underline">
            {t`Arată primele 100`}
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────── the places ──

interface PlaceRow {
  readonly place: Place
  readonly randuri: number
  readonly editii: number
  readonly alegeri: number
}

/**
 * The localities, from the place index (read in the browser): each SIRUTA
 * code the selection's editions report, with the rows on the reference
 * editions and the editions and elections that report it. A county filter
 * keeps the county's places (by the INS county of the code).
 */
export function PlacesTable({ query, cat, answer, className }: { readonly query: Query; readonly cat: Catalog; readonly answer: Answer; readonly className?: string }) {
  const format = useFormat()
  const places = usePlaces()
  const [expanded, setExpanded] = useState<string | null>(null)
  const rows = useMemo((): readonly PlaceRow[] | null => {
    const index = places.data
    if (!index) return null
    const editionsIn = new Set(answer.cells.map((cell) => cell.edition.key))
    // The question's reference editions; the „2014" local event's are not among them when 2016 is in the question (E1).
    const references = new Set(answer.references.map((edition) => edition.key))
    const out: PlaceRow[] = []
    for (const place of index.places.values()) {
      if (query.judet && place.ins?.countyCode !== query.judet) continue
      let randuri = 0
      const editions = new Set<string>()
      const elections = new Set<string>()
      for (const [e, o, r] of place.rows) {
        const edition = index.editions[e]!
        if (!editionsIn.has(edition)) continue
        if (query.functie !== null && index.offices[o] !== query.functie) continue
        const round = index.rounds[r] ?? null
        if (query.tur !== null && (query.tur === ROUND_UNREPORTED ? round !== null : round !== query.tur)) continue
        editions.add(edition)
        const event = cat.eventOf.get(edition)
        if (event) elections.add(electionKeyOf(event.key))
        if (references.has(edition)) randuri += 1
      }
      if (editions.size === 0) continue
      out.push({ place, randuri, editii: editions.size, alegeri: elections.size })
    }
    const measure = query.masura
    return out.sort((a, b) => b[measure] - a[measure] || placeName(a.place).localeCompare(placeName(b.place), 'ro'))
  }, [answer, cat, places.data, query])
  // The index holds the rows reported per locality only: under another level there is no locality to list.
  if (query.nivel !== null && query.nivel !== 'siruta')
    return <p className={cn('py-6 text-sm text-muted-foreground', className)}>{t`Localitățile au doar rândurile raportate pe localitate; nivelul ales nu are localități.`}</p>
  if (!rows)
    return (
      <p className={cn('py-6 text-sm text-muted-foreground', className)}>{places.isError ? t`Indexul localităților nu s-a putut citi.` : t`Se citește indexul localităților…`}</p>
    )
  const key = JSON.stringify(query)
  const limit = expanded === key ? MORE : TOP
  const shown = rows.slice(0, limit)
  const measure = query.masura
  const widest = Math.max(1, ...shown.map((row) => row[measure]))
  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 text-right">#</TableHead>
            <TableHead />
            {MEASURES.map((item) => (
              <MeasureHead key={item} measure={item} active={item === measure} hidden={item !== measure} />
            ))}
            <TableHead className="hidden w-28 sm:table-cell" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((row, index) => {
            const name = placeName(row.place)
            const meta = [placeKind(row.place.ins?.kind), row.place.ins?.county].filter(Boolean).join(', ') || t`nu e în lista INS de azi`
            return (
              <TableRow key={row.place.siruta}>
                <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="max-w-[12rem] sm:max-w-md">
                  <a href={PROTOTYPE_HREF.place(row.place.siruta)} className="flex min-w-0 items-baseline gap-2 hover:underline">
                    <span className="truncate">{name}</span>
                    <span className="hidden truncate text-xs text-muted-foreground sm:inline">{meta}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{row.place.siruta}</span>
                  </a>
                </TableCell>
                {MEASURES.map((item) => (
                  <TableCell key={item} className={cn('text-right tabular-nums', item === measure ? 'font-semibold' : 'hidden text-muted-foreground sm:table-cell')}>
                    {/* A place reported only by editions that are not the reference: a dash, never 0 rows. */}
                    {item === 'randuri' && row.randuri === 0 ? (
                      <span className="text-muted-foreground" title={t`Rânduri aici doar în ediții care nu sunt de referință; nu se adună`}>
                        —
                      </span>
                    ) : (
                      format.n(row[item])
                    )}
                  </TableCell>
                ))}
                <TableCell className="hidden sm:table-cell">
                  <span className="block h-1.5 w-20 bg-muted/70">
                    <span className="block h-1.5 bg-primary/75" style={{ width: `${Math.max((row[measure] / widest) * 100, 1).toFixed(1)}%` }} />
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {rows.length > shown.length ? t`primele ${format.n(shown.length)} din ${format.n(rows.length)} localități raportate` : t`${format.n(rows.length)} localități raportate`}
          {` · ${t`locuri de raportare, nu curse; rândurile pe edițiile de referință`}`}
        </span>
        {expanded !== key && rows.length > TOP ? (
          <button type="button" onClick={() => setExpanded(key)} className="font-medium text-foreground underline-offset-4 hover:underline">
            {t`Arată primele 100`}
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────── the years ──

/**
 * 1990–2025 in a band of its own: a bar a year with the measure on it, the
 * question's year solid; a year the calendar expects and the data lacks
 * drawn as a dashed empty slot („nu e în date", never zero). A click makes
 * the year the question's. Not shown when the answer is itself in time.
 */
export function YearsBand({ query, cat, onChange }: { readonly query: Query; readonly cat: Catalog; readonly onChange: (query: Query) => void }) {
  const titleId = useId()
  const format = useFormat()
  const [active, setActive] = useState<number | null>(null)
  if (query.dupa === 'timp') return null
  const points = yearPoints(cat, query)
  const measure = query.masura
  const max = Math.max(1, ...points.map((point) => point.totals[measure]))
  const columns = { gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }
  return (
    <section id="ani" className="border-b" aria-labelledby={titleId}>
      <RuledFrame className="py-12 sm:py-16">
        <HubSectionHead
          titleId={titleId}
          index={`${points[0]?.year ?? ''}–${points[points.length - 1]?.year ?? ''}`}
          title={t`Pe ani`}
          aside={
            <IndicatorToggle<Measure>
              label={t`Măsura`}
              value={measure}
              onChange={(masura) => onChange({ ...query, masura })}
              options={MEASURES.map((key) => ({ key, label: measureLabel(key) }))}
            />
          }
        />
        <figure className="mt-8" aria-labelledby={titleId}>
          <MonoLabel className="block text-muted-foreground">{measureLabel(measure)}</MonoLabel>
          <ol className="mt-3 grid h-48 items-end border-b border-foreground/20 sm:h-60" style={columns} onPointerLeave={() => setActive(null)}>
            {points.map((point, index) => {
              const value = point.totals[measure]
              // Rows (or an election) the question holds but does not count here: a hollow mark, never an empty slot that reads as zero.
              const uncounted = measureValue(point.totals, measure) === null
              const missing = point.missing > 0
              // The catalog has the year's elections, the question's filters leave none of their rows: „nu e în această selecție", not absent.
              const outside = value === 0 && !uncounted && point.inCatalog > 0
              const empty = value === 0 && !uncounted
              const chosen = query.an === point.year
              const isActive = active === point.year
              const label =
                value > 0
                  ? t`${point.year}: ${format.n(value)} ${measureLabel(measure).toLocaleLowerCase('ro-RO')}`
                  : uncounted
                    ? t`${point.year}: rânduri doar în ediții care nu sunt de referință`
                    : missing
                      ? t`${point.year}: nu e în date`
                      : outside
                        ? t`${point.year}: nu e în această selecție`
                        : t`${point.year}: nicio alegere în date sau în calendar`
              return (
                <li key={point.year} className={cn('relative h-full min-w-0', isActive && 'bg-muted/60')}>
                  <button
                    type="button"
                    disabled={empty}
                    aria-pressed={chosen}
                    aria-label={label}
                    onPointerEnter={() => setActive(point.year)}
                    onFocus={() => setActive(point.year)}
                    onBlur={() => setActive(null)}
                    onClick={() => onChange(value > 0 || uncounted ? withFilter(query, 'an', point.year, cat) : query)}
                    className="flex h-full w-full flex-col items-center justify-end px-px outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-default sm:px-0.5"
                  >
                    {value > 0 ? (
                      <span
                        className={cn('block w-full transition-colors', chosen ? 'bg-primary' : isActive ? 'bg-primary/55' : 'bg-primary/35')}
                        style={{ height: `calc((100% - 0.5rem) * ${value / max})`, minHeight: 2 }}
                      />
                    ) : uncounted ? (
                      <span className="block h-3 w-full border border-primary/50" />
                    ) : missing ? (
                      <span className="block h-3 w-full border border-dashed border-amber-600/70" />
                    ) : null}
                  </button>
                  {isActive ? (
                    <div
                      aria-hidden="true"
                      className={cn(
                        'pointer-events-none absolute top-0 z-20 w-max max-w-52 space-y-1 border bg-popover px-3 py-2 text-xs leading-snug text-popover-foreground shadow-md',
                        index < points.length / 2 ? 'left-full ml-1' : 'right-full mr-1',
                      )}
                    >
                      <p className="font-semibold tabular-nums">{point.year}</p>
                      {value > 0 || uncounted ? (
                        <>
                          <p className="tabular-nums">{t`${format.n(point.totals.alegeri)} alegeri · ${format.n(point.totals.editii)} ediții`}</p>
                          <p className="tabular-nums">
                            {measureValue(point.totals, 'randuri') === null
                              ? t`rânduri doar în ediții care nu sunt de referință`
                              : t`${format.n(point.totals.randuri)} rânduri de scrutin`}
                          </p>
                        </>
                      ) : outside ? (
                        <p className="text-muted-foreground">{t`nu e în această selecție`}</p>
                      ) : null}
                      {missing ? (
                        <p className="text-amber-700 dark:text-amber-400">
                          {point.missing === 1 ? t`o alegere din calendar nu e în date` : t`${point.missing} alegeri din calendar nu sunt în date`}
                        </p>
                      ) : null}
                      {value > 0 || uncounted ? <p className="border-t pt-1 text-muted-foreground">{chosen ? t`Anul ales` : t`Clic: doar ${point.year}`}</p> : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ol>
          <ol className="mt-2 grid" style={columns} aria-hidden="true">
            {points.map((point) => (
              <li key={point.year} className="min-w-0 text-center">
                {point.year % 5 === 0 ? (
                  <MonoLabel
                    className={cn('tabular-nums', query.an === point.year ? 'font-semibold text-foreground' : 'text-muted-foreground')}
                  >{`'${String(point.year).slice(2)}`}</MonoLabel>
                ) : null}
              </li>
            ))}
          </ol>
          <figcaption className="mt-3 text-xs text-muted-foreground">
            <Trans>
              Căsuța punctată: o alegere din calendarul Transparenta.eu care nu e în date (oricare ar fi filtrele). Căsuța plină: rânduri doar în ediții care nu sunt de referință.
              Rândurile sunt numărate pe ediția de referință a fiecărei alegeri; un an fără nimic nu e în această selecție sau nu are alegeri.
            </Trans>
          </figcaption>
        </figure>
      </RuledFrame>
    </section>
  )
}

/** The time axes read newest first; said once above a table that is not ranked by its measure. */
export function orderNote(axis: Axis): string | null {
  return TIME_AXES.includes(axis) ? t`cele mai noi primele` : null
}

export { referenceEdition }
