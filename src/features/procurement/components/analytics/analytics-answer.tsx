import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowDown, ArrowUpRight, Check, ChevronLeft, ChevronRight, Info, Link2, TriangleAlert } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { dayText, monthText } from '@/features/procurement/lib/home-format'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { bucketStart, clippedBucket, drilled, POPULATIONS, type Query } from '../../lib/analytics-model'
import { firmPlaceGate, recordsProblem, type Point, type Ranking, type RecordRow } from '../../api/procurement-analytics-api'
import { COUNTY_POPULATION, countyPopulationNote, useRecords, type Answer } from '../../hooks/use-procurement-analytics'
import { useSearchStrings } from '../../hooks/use-procurement-analytics'
import { MethodBody } from './analytics-controls'
import { countText, listTotalText, moneyText, percentText, periodGloss, populationGloss, recordsCount, type Namer } from '../../lib/analytics-text'
import { bucketLabel, clippedText, profileLink, readoutNotes, rowsOf, shareUrl, type Row } from './analytics-view'

/**
 * The answer, with the words cut: the table of every measure (or the chart in
 * time), the years, the source line; the caveats behind one marker, amber
 * when there is something to beware of; how it was counted behind the source
 * line.
 */

const ICON = 'inline-flex size-9 shrink-0 items-center justify-center border text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground'

// ─────────────────────────────────────────────────────────── controls ──

export function ShareIcon({ query, answer, className }: { readonly query: Query; readonly answer: Answer; readonly className?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () =>
    void navigator.clipboard?.writeText(shareUrl(query, answer)).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  return (
    <button type="button" onClick={copy} className={className ?? ICON} aria-label={copied ? t`Copiat` : t`Copiază legătura`} title={copied ? t`Copiat` : t`Copiază legătura`}>
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────── head ──

/** One marker for all a reader should know before the numbers: amber with a count when something is off, an „i" otherwise. */
export function NotesMarker({ query, answer }: { readonly query: Query; readonly answer: Answer }) {
  const notes = readoutNotes(query, answer, useSearchStrings())
  const alerts = [...(notes.unread ? [notes.unread] : []), ...notes.warnings]
  const gloss = answer.period ? periodGloss(answer.period, query, answer.cutoff?.failed ?? false) : null
  return (
    <Popover>
      <PopoverTrigger
        className={cn('inline-flex h-6 items-center gap-1 px-1 text-xs tabular-nums', alerts.length > 0 ? 'text-amber-700 hover:text-amber-800 dark:text-amber-400' : 'text-muted-foreground hover:text-foreground')}
        aria-label={alerts.length > 0 ? t`${alerts.length} atenționări` : t`Despre aceste cifre`}
      >
        {alerts.length > 0 ? <TriangleAlert className="size-3.5" aria-hidden="true" /> : <Info className="size-3.5" aria-hidden="true" />}
        {alerts.length > 0 ? alerts.length : null}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,26rem)] space-y-2 text-sm">
        {alerts.map((alert) => (
          <p key={alert} className="border-l-2 border-amber-600/60 pl-3 text-foreground">
            {alert}
          </p>
        ))}
        {notes.trap ? <p className="border-l-2 border-amber-600/60 pl-3 text-foreground">{notes.trap}</p> : null}
        <p className="text-muted-foreground">{populationGloss(query.tip)}</p>
        {gloss ? <p className="text-muted-foreground">{gloss}</p> : null}
      </PopoverContent>
    </Popover>
  )
}

// ────────────────────────────────────────────────────────────── rows ──

function Pending({ rows, className }: { readonly rows: number; readonly className?: string }) {
  return (
    <div className={cn('space-y-3 py-2', className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-5 animate-pulse bg-muted/40" style={{ width: `${95 - index * 6}%` }} />
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────── time ──

function shortBucket(bucket: string): string {
  if (/^\d{4}$/u.test(bucket)) return bucket
  if (/^\d{4}-Q[1-4]$/u.test(bucket)) return `T${bucket.slice(-1)} '${bucket.slice(2, 4)}`
  return monthText(bucket).split(' ')[0] ?? bucket
}

/** The answer in time: bars, a bucket the window cuts or the sources mix drawn dashed; the hovered bucket's figures above. */
export function AnswerTime({ query, answer, onChange, className }: { readonly query: Query; readonly answer: Answer; readonly onChange: (query: Query) => void; readonly className?: string }) {
  const [active, setActive] = useState<string | null>(null)
  if (query.dupa.axis !== 'timp') return null
  if (answer.series.isError) return (
      <div className={className}>
        <HubLoadError onRetry={answer.series.retry} />
      </div>
    )
  const points = answer.series.data
  if (!points) return <div className={cn('h-56 animate-pulse bg-muted/40', className)} aria-hidden="true" />
  const population = POPULATIONS[query.tip]
  const byValue = query.masura !== 'numar' && population.money !== 'none'
  const figure = (point: Point) => (byValue ? point.money : point.count) ?? 0
  const max = Math.max(1, ...points.map(figure))
  const shown = points.find((point) => point.bucket === active) ?? points[points.length - 1]
  const group = query.dupa
  const split = population.kindSplitUntil
  const dashed = (bucket: string) => (answer.period !== null && clippedBucket(bucket, answer.period) !== null) || (split !== undefined && bucketStart(bucket) > split)
  const labelled = points.length <= 16
  return (
    <figure className={className}>
      <p className="min-h-6 text-sm tabular-nums text-muted-foreground">
        {shown ? (
          <>
            <span className="font-semibold text-foreground">
              {bucketLabel(shown.bucket)}
              {clippedText(shown.bucket, answer.period) ? ` ${clippedText(shown.bucket, answer.period)}` : ''}
            </span>{' '}
            · {recordsCount(query.tip, shown.count ?? 0)}
            {shown.money !== null && (population.money === 'clean' || byValue) ? ` · ${moneyText(shown.money)}${population.money === 'provisional' ? ` ${t`(provizoriu)`}` : ''}` : ''}
          </>
        ) : null}
      </p>
      <ol className="mt-3 flex h-56 items-end gap-1" onPointerLeave={() => setActive(null)}>
        {points.map((point) => (
          <li key={point.bucket} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            <button
              type="button"
              onPointerEnter={() => setActive(point.bucket)}
              onFocus={() => setActive(point.bucket)}
              onClick={() => onChange(drilled(query, group, point.bucket))}
              className="flex h-full w-full flex-col justify-end"
              aria-label={`${bucketLabel(point.bucket)}: ${byValue ? moneyText(point.money ?? 0) : countText(point.count ?? 0)}`}
            >
              <span
                className={cn('block w-full', active === point.bucket ? 'bg-primary' : 'bg-primary/70', dashed(point.bucket) && 'bg-primary/30 outline-dashed outline-1 -outline-offset-1 outline-primary/70')}
                style={{ height: `${Math.max((figure(point) / max) * 100, 0.5)}%` }}
              />
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-1.5 flex gap-1 text-xs tabular-nums text-muted-foreground" aria-hidden="true">
        {labelled ? (
          points.map((point) => (
            <span key={point.bucket} className="min-w-0 flex-1 truncate text-center">
              {shortBucket(point.bucket)}
            </span>
          ))
        ) : (
          <>
            <span className="flex-1">{bucketLabel(points[0]!.bucket)}</span>
            <span>{bucketLabel(points[points.length - 1]!.bucket)}</span>
          </>
        )}
      </div>
    </figure>
  )
}

// ───────────────────────────────────────────────────────────── table ──

function SortHead({ label, active, onClick, className }: { readonly label: string; readonly active: boolean; readonly onClick: (() => void) | null; readonly className?: string }) {
  return (
    <TableHead className={cn('text-right', className)} aria-sort={active ? 'descending' : 'none'}>
      {onClick ? (
        <button type="button" onClick={onClick} className={cn('inline-flex items-center gap-1 hover:text-foreground', active && 'font-semibold text-foreground')}>
          {label}
          {active ? <ArrowDown className="size-3" aria-hidden="true" /> : null}
        </button>
      ) : (
        <span className={cn(active && 'font-semibold text-foreground')}>{label}</span>
      )}
    </TableHead>
  )
}

/**
 * The ranked answer as a table, every number at once: records, lei, the
 * average, the share — a header ranks by its column (the server ranks; the
 * top 25 by lei is not the top 25 by count). In time, the chart answers.
 */
export function AnswerTable({
  query,
  answer,
  namer,
  onChange,
  expanded,
  onExpand,
  className,
}: {
  readonly query: Query
  readonly answer: Answer
  readonly namer: Namer
  readonly onChange: (query: Query) => void
  readonly expanded: boolean
  readonly onExpand: (expanded: boolean) => void
  readonly className?: string
}) {
  const population = POPULATIONS[query.tip]
  const money = population.money !== 'none'
  const moneyLabel = population.money === 'provisional' ? t`Lei, provizoriu` : t`Lei`
  const rank = (masura: Query['masura']) => (query.masura === masura ? null : () => onChange({ ...query, masura }))
  if (query.dupa.axis === 'timp' || query.dupa.axis === 'inregistrari') return null
  if (answer.ranking.isError) return (
      <div className={className}>
        <HubLoadError onRetry={answer.ranking.retry} />
      </div>
    )
  const ranking: Ranking | undefined = answer.ranking.data
  if (!ranking) return <Pending rows={12} className={className} />
  const group = query.dupa
  const { rows } = rowsOf(query, ranking, namer)
  const perResident = query.masura === 'locuitor'
  const byValue = ranking.rankedBy === 'value'
  const bucketOf = (row: Row) => (row.kind === 'withheld' ? null : (ranking.buckets.find((bucket) => bucket.kind === row.kind && bucket.key === row.key) ?? null))
  const topCount = ranking.buckets.filter((bucket) => bucket.kind === 'top').length
  // The bars against the largest row's share, as in the list: shares under 1% would draw nothing against 100%.
  const widest = Math.max(0.0001, ...rows.filter((row) => row.kind === 'top' || row.kind === 'withheld').map((row) => row.share ?? 0))
  return (
    <div className={cn(className, answer.ranking.isFetching && 'opacity-70 transition-opacity')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 text-right">#</TableHead>
            <TableHead />
            <SortHead label={t`Înregistrări`} active={!byValue && !perResident} onClick={money ? rank('numar') : null} className={cn((byValue || perResident) && 'hidden sm:table-cell')} />
            {money ? <SortHead label={moneyLabel} active={byValue && !perResident} onClick={rank('lei')} className={cn((!byValue || perResident) && 'hidden sm:table-cell')} /> : null}
            {perResident ? <SortHead label={population.money === 'clean' ? t`Lei / locuitor` : t`La 100.000 loc.`} active onClick={null} /> : null}
            {population.money === 'clean' && !perResident ? <TableHead className="hidden text-right md:table-cell">{t`Medie`}</TableHead> : null}
            <TableHead className="hidden w-36 text-right sm:table-cell">{t`Cota`}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const bucket = bucketOf(row)
            const top = row.kind === 'top' && row.key !== null
            const link = top ? profileLink(group.axis, row.key!) : null
            const count = bucket?.count ?? null
            const lei = row.kind === 'withheld' ? row.figure : (bucket?.money ?? null)
            const residents = perResident && row.key ? (COUNTY_POPULATION.get(row.key) ?? null) : null
            return (
              <TableRow key={`${row.kind}-${row.key ?? index}`} className={cn(!top && 'text-muted-foreground', top && 'cursor-pointer')} onClick={top ? () => onChange(drilled(query, group, row.key!)) : undefined}>
                <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">{top ? index + 1 : ''}</TableCell>
                <TableCell className="max-w-[12rem] sm:max-w-md">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate" title={[row.label, row.sub].filter(Boolean).join(' · ')}>
                      {row.label}
                    </span>
                    {link ? (
                      <Link to={link.to} params={link.params} onClick={(event) => event.stopPropagation()} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label={t`Pagina ${row.label}`}>
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className={cn('text-right tabular-nums', (byValue || perResident) && 'hidden sm:table-cell')}>{count !== null ? countText(count) : '—'}</TableCell>
                {money ? <TableCell className={cn('text-right tabular-nums', (!byValue || perResident) && 'hidden sm:table-cell')}>{lei !== null ? moneyText(lei) : '—'}</TableCell> : null}
                {perResident ? <TableCell className="text-right font-semibold tabular-nums" title={residents ? t`${countText(residents)} de locuitori` : undefined}>{row.figureText}</TableCell> : null}
                {population.money === 'clean' && !perResident ? <TableCell className="hidden text-right tabular-nums md:table-cell">{bucket?.valued && lei !== null ? moneyText(lei / bucket.valued) : '—'}</TableCell> : null}
                <TableCell className="hidden sm:table-cell">
                  {row.share !== null ? (
                    <span className="flex items-center justify-end gap-2">
                      <span className="block h-1.5 w-20 bg-muted/70">
                        <span className={cn('block h-1.5', top ? 'bg-primary/75' : 'bg-muted-foreground/35')} style={{ width: `${Math.max(Math.min((row.share / widest) * 100, 100), 1).toFixed(1)}%` }} />
                      </span>
                      <span className="w-12 text-right text-xs tabular-nums">{percentText(row.share, row.share < 0.1 ? 1 : 0)}</span>
                    </span>
                  ) : null}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
        {perResident ? <span>{t`Populația: ${countyPopulationNote()}`}</span> : <span />}
        {!expanded && topCount >= 25 && !perResident ? (
          <button type="button" onClick={() => onExpand(true)} className="font-medium text-foreground underline-offset-4 hover:underline">
            {t`Primele 100`}
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────── records ──

/** Several rows of one contract (a consortium's members, each at the whole value) as one. */
function groupedRows(rows: readonly RecordRow[]): readonly (RecordRow & { readonly suppliers: readonly string[] })[] {
  const groups = new Map<string, RecordRow & { suppliers: string[] }>()
  for (const row of rows) {
    const key = row.contractNo ? `${row.authority.cui}|${row.contractNo}|${row.value}` : row.id
    const found = groups.get(key)
    const name = row.supplier.name ?? '—'
    if (found) found.suppliers.push(name)
    else groups.set(key, { ...row, suppliers: [name] })
  }
  return [...groups.values()]
}

const PAGE = 25

/**
 * The records themselves, the answer's first tab: every record of the
 * selection — a title's words included — 25 at a time, the largest or the
 * newest first (a header orders them), each opening its own page. The list is
 * its own read, with its own count (never the analysis count), and says when
 * the API cannot list a selection rather than showing a wider one.
 */
export function AnswerRecords({ query, answer, onChange, className }: { readonly query: Query; readonly answer: Answer; readonly onChange: (query: Query) => void; readonly className?: string }) {
  // A framework has no value to order by (a ceiling at most): its records come newest first, with no choice.
  const valued = POPULATIONS[query.tip].money !== 'none'
  const [sort, setSort] = useState<'value_desc' | 'date_desc'>(valued ? 'value_desc' : 'date_desc')
  const [page, setPage] = useState(1)
  const problem = recordsProblem(query, answer.period)
  const gate = firmPlaceGate(query, answer.figures)
  const records = useRecords(query, answer.period, sort, page, problem === null && gate === 'list')
  const party = Boolean(query.filters.cumparator || query.filters.furnizor)
  const order = (next: 'value_desc' | 'date_desc') => () => {
    setSort(next)
    setPage(1)
  }
  if (problem === 'supplier-place') return (
      <p className={cn('py-6 text-sm text-muted-foreground', className)}>
        {t`Lista nu se poate filtra încă după locul firmei. Alege o firmă pentru înregistrările ei.`}{' '}
        <button type="button" onClick={() => onChange({ ...query, dupa: { axis: 'furnizor', level: 'cui' } })} className="font-medium text-foreground underline underline-offset-4">
          {t`Vezi firmele`}
        </button>
      </p>
    )
  if (problem) return (
      <p className={cn('py-6 text-sm text-muted-foreground', className)}>
        {problem === 'procedure'
          ? t`Lista nu se poate filtra încă după procedură: ar arăta și contracte din alte proceduri.`
          : t`Pentru achiziții directe, lista cere o instituție, o firmă sau cel mult 12 luni.`}
      </p>
    )
  if (gate === 'outside') return <p className={cn('py-6 text-sm text-muted-foreground', className)}>{t`Nicio înregistrare în această selecție.`}</p>
  if (gate === 'failed' || gate === 'unknown') return (
      <p className={cn('py-6 text-sm text-muted-foreground', className)}>
        {t`Lista nu s-a putut citi acum.`}
        {gate === 'failed' ? (
          <>
            {' '}
            <button type="button" onClick={answer.figures.retry} className="font-medium text-foreground underline underline-offset-4">
              {t`Încearcă din nou`}
            </button>
          </>
        ) : null}
      </p>
    )
  if (gate === 'counting') return <Pending rows={10} className={className} />
  if (records.isError) return (
      <p className={cn('py-6 text-sm text-muted-foreground', className)}>
        {party ? t`Lista nu s-a putut citi acum.` : t`Lista nu s-a putut citi pentru o selecție atât de largă. Restrânge la o instituție, o firmă sau o lună și încearcă din nou.`}{' '}
        <button type="button" onClick={() => void records.refetch()} className="font-medium text-foreground underline underline-offset-4">
          {t`Încearcă din nou`}
        </button>
      </p>
    )
  if (!records.data) return <Pending rows={10} className={className} />
  const rows = query.tip === 'directe' ? records.data.rows.map((row) => ({ ...row, suppliers: [row.supplier.name ?? '—'] })) : groupedRows(records.data.rows)
  const total = records.data.total
  const first = (page - 1) * PAGE + 1
  const more = records.data.rows.length === PAGE && page * PAGE < (total ?? 10_000)
  if (rows.length === 0) return <p className={cn('py-6 text-sm text-muted-foreground', className)}>{t`Nicio înregistrare în această selecție.`}</p>
  return (
    <div className={cn(className, records.isFetching && 'opacity-70 transition-opacity')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="hidden w-8 text-right sm:table-cell">#</TableHead>
            <TableHead />
            <SortHead label={t({ message: 'Data', context: 'day' })} active={sort === 'date_desc'} onClick={sort === 'date_desc' ? null : order('date_desc')} className="hidden sm:table-cell" />
            <SortHead label={t`Valoare`} active={sort === 'value_desc'} onClick={!valued || sort === 'value_desc' ? null : order('value_desc')} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.id}>
              <TableCell className="hidden align-top font-mono text-xs tabular-nums text-muted-foreground sm:table-cell">{first + index}</TableCell>
              <TableCell className="max-w-[12.5rem] sm:max-w-xl">
                <a href={row.href} className="block truncate font-medium text-foreground hover:underline" title={row.title ?? undefined}>
                  {row.title ?? t`Fără titlu în SEAP`}
                </a>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {row.authority.name ?? '—'} → {row.suppliers.join(', ')}
                  <span className="sm:hidden">{row.date ? ` · ${dayText(row.date)} ${row.date.slice(0, 4)}` : ''}</span>
                </span>
              </TableCell>
              <TableCell className="hidden whitespace-nowrap text-right align-top tabular-nums text-muted-foreground sm:table-cell">{row.date ? `${dayText(row.date)} ${row.date.slice(0, 4)}` : '—'}</TableCell>
              <TableCell className={cn('whitespace-nowrap text-right align-top tabular-nums', row.checked ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{row.value !== null ? moneyText(row.value) : '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {total === null ? t`${first}–${first + records.data.rows.length - 1} din peste 10.000` : page === 1 && !more ? listTotalText(total) : t`${first}–${first + records.data.rows.length - 1} din ${countText(total)}`}
          {query.tip !== 'directe' ? ` · ${t`rândurile unei asocieri, într-unul`}` : ''}
        </span>
        {page > 1 || more ? (
          <span className="flex items-center gap-1">
            <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="inline-flex size-8 items-center justify-center border hover:bg-muted disabled:opacity-40" aria-label={t`Pagina anterioară`}>
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button type="button" disabled={!more} onClick={() => setPage(page + 1)} className="inline-flex size-8 items-center justify-center border hover:bg-muted disabled:opacity-40" aria-label={t`Pagina următoare`}>
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </span>
        ) : null}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────── source ──

/** One line at the foot: the source, how far it is complete, and how it was counted behind a click. */
export function SourceLine({ query, answer, className }: { readonly query: Query; readonly answer: Answer; readonly className?: string }) {
  const cutoff = answer.cutoff?.[POPULATIONS[query.tip].cutoff] ?? null
  return (
    <footer className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground', className)}>
      <span>{cutoff ? t`Sursa: SEAP, complet până în ${monthText(cutoff)}` : t`Sursa: SEAP`}</span>
      <span aria-hidden="true">·</span>
      <Popover>
        <PopoverTrigger className="underline-offset-4 hover:text-foreground hover:underline">{t`Cum am calculat`}</PopoverTrigger>
        <PopoverContent align="start" className="w-[min(92vw,32rem)] text-sm text-muted-foreground">
          <MethodBody query={query} answer={answer} />
        </PopoverContent>
      </Popover>
    </footer>
  )
}
