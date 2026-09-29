import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowDown, ArrowUpRight, Check, Info, Link2, TriangleAlert } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { monthText } from '@/features/procurement/lib/home-format'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { POPULATIONS, bucketStart, clippedBucket, drilled, type Query } from './analytics.model'
import { COUNTY_POPULATION, countyPopulationNote, type Answer, type Point, type Ranking } from './analytics.data'
import {
  AddFilter,
  FilterChips,
  MethodBody,
  PeriodMenu,
  PopulationToggle,
  QuestionsMenu,
  bucketLabel,
  clippedText,
  profileLink,
  readoutNotes,
  rowsOf,
  shareUrl,
  useSearchStrings,
  type Row,
} from './analytics.parts'
import { FiltersButton } from './analytics.filters'
import { changeText, countText, headline, monthsText, moneyText, percentText, periodGloss, periodText, populationGloss, recordsCount, type Namer } from './analytics.text'

/**
 * The answer with the words cut: the question as its headline, the months,
 * four numbers, one ranked list or one chart. Everything the numbers need
 * said — the population's rules, the gaps the API reports, the question's
 * trap — sits behind one marker by the months, amber when there is
 * something to beware of; how it was counted, behind the source line.
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

/** The quick row: what, when, a new filter, the filters on — and, at the end, the whole panel, the ready questions, the link. */
export function CleanControls({
  query,
  answer,
  namer,
  onChange,
  onFilters,
  className,
}: {
  readonly query: Query
  readonly answer: Answer
  readonly namer: Namer
  readonly onChange: (query: Query) => void
  readonly onFilters: () => void
  readonly className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-auto">
          <PopulationToggle query={query} onChange={onChange} />
        </div>
        <PeriodMenu query={query} answer={answer} onChange={onChange} />
        <AddFilter query={query} namer={namer} onChange={onChange} />
        <span className="ml-auto flex items-center gap-2">
          <FiltersButton query={query} onClick={onFilters} />
          <QuestionsMenu onChange={onChange} />
          <ShareIcon query={query} answer={answer} />
        </span>
      </div>
      {Object.keys(query.filters).length > 0 || query.titlu || query.valoare ? (
        <div className="flex flex-wrap items-center gap-2">
          <FilterChips query={query} namer={namer} onChange={onChange} />
        </div>
      ) : null}
    </div>
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

export function CleanHead({ query, answer, namer, className }: { readonly query: Query; readonly answer: Answer; readonly namer: Namer; readonly className?: string }) {
  return (
    <div className={className}>
      <h1 className="max-w-4xl text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-[2rem]">{headline(query, namer)}</h1>
      <p className="mt-2 flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
        {answer.period ? periodText(answer.period, query) : '…'}
        <NotesMarker query={query} answer={answer} />
      </p>
    </div>
  )
}

// ──────────────────────────────────────────────────────────── figures ──

export interface Figure {
  /** Which number it is: its trend reads the years' counts or money. */
  readonly key: 'records' | 'money' | 'firms' | 'top5'
  readonly label: string
  readonly value: string
  readonly change: string | null
  readonly muted?: boolean
}

export function figuresOf(query: Query, answer: Answer): readonly Figure[] | null {
  const now = answer.figures.data?.now ?? null
  if (!now) return null
  const before = answer.figures.data?.before ?? null
  const population = POPULATIONS[query.tip]
  const concentration = answer.concentration.data
  const byValue = query.masura !== 'numar' && population.money !== 'none'
  const figures: Figure[] = [
    {
      key: 'records',
      label: population.id === 'directe' ? t`Achiziții` : population.id === 'contracte' ? t`Contracte` : t`Acorduri-cadru`,
      value: countText(now.records),
      change: changeText(now.records, before?.records ?? null),
    },
  ]
  if (population.money === 'clean') figures.push({ key: 'money', label: t`Lei, fără TVA`, value: now.money !== null ? moneyText(now.money) : '—', change: changeText(now.money, before?.money ?? null) })
  if (population.money === 'provisional') figures.push({ key: 'money', label: t`Lei, provizoriu`, value: now.money !== null ? moneyText(now.money) : '—', change: null, muted: true })
  if (!query.filters.furnizor) {
    figures.push({ key: 'firms', label: t`Firme`, value: concentration?.firms != null ? countText(concentration.firms) : '…', change: null })
    figures.push({ key: 'top5', label: byValue ? t`Top 5 firme, din lei` : t`Top 5 firme`, value: concentration?.top5 != null ? percentText(concentration.top5, 0) : '…', change: null })
  }
  return figures
}

/** The numbers, bare: a label, a value, its change where the population compares (the months compared in its title). */
export function CleanFigures({ query, answer, className }: { readonly query: Query; readonly answer: Answer; readonly className?: string }) {
  if (answer.figures.isError) return (
      <div className={className}>
        <HubLoadError onRetry={answer.figures.retry} />
      </div>
    )
  const figures = figuresOf(query, answer)
  const compared = answer.figures.data?.before && answer.period ? t`față de ${monthsText(answer.period.previous)}` : undefined
  if (!figures) return <div className={cn('h-20 animate-pulse bg-muted/40', className)} aria-hidden="true" />
  return (
    <dl className={cn('grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4', className)}>
      {figures.map((figure) => (
        <div key={figure.label} className="min-w-0">
          <dt>
            <MonoLabel className="block text-muted-foreground">{figure.label}</MonoLabel>
          </dt>
          <dd className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
            <span className={cn('text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl', figure.muted ? 'text-muted-foreground' : 'text-foreground')}>{figure.value}</span>
            {figure.change ? (
              <span className="text-xs tabular-nums text-muted-foreground" title={compared}>
                {figure.change}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
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
export function CleanTime({ query, answer, onChange, className }: { readonly query: Query; readonly answer: Answer; readonly onChange: (query: Query) => void; readonly className?: string }) {
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

/** The selection's years since 2019, small, the window's marked; a click takes the year. */
export function CleanYears({ query, answer, onChange, className }: { readonly query: Query; readonly answer: Answer; readonly onChange: (query: Query) => void; readonly className?: string }) {
  const points = answer.years.data
  if (!points || points.length === 0 || (query.dupa.axis === 'timp' && query.dupa.bucket === 'year')) return null
  const population = POPULATIONS[query.tip]
  const byValue = query.masura !== 'numar' && population.money !== 'none'
  const figure = (point: Point) => (byValue ? point.money : point.count) ?? 0
  const max = Math.max(1, ...points.map(figure))
  const cutoff = answer.cutoff?.[population.cutoff] ?? null
  const split = population.kindSplitUntil
  const inWindow = (year: string) => answer.period !== null && answer.period.from.slice(0, 4) <= year && answer.period.to.slice(0, 4) >= year
  return (
    <figure className={cn('max-w-xl', className)}>
      <ol className="flex h-14 items-end gap-1.5">
        {points.map((point) => {
          const dashed = (cutoff !== null && point.bucket === cutoff.slice(0, 4) && !cutoff.endsWith('-12')) || (split !== undefined && bucketStart(point.bucket) > split)
          return (
            <li key={point.bucket} className="flex h-full min-w-0 flex-1 flex-col justify-end">
              <button
                type="button"
                onClick={() => onChange({ ...query, period: { kind: 'year', year: Number(point.bucket) } })}
                className="flex h-full w-full flex-col justify-end"
                aria-label={`${point.bucket}: ${byValue ? moneyText(point.money ?? 0) : countText(point.count ?? 0)}`}
                title={`${point.bucket}: ${byValue ? moneyText(point.money ?? 0) : countText(point.count ?? 0)}`}
              >
                <span
                  className={cn('block w-full', inWindow(point.bucket) ? 'bg-primary/80' : 'bg-primary/25', dashed && 'outline-dashed outline-1 -outline-offset-1 outline-primary/70')}
                  style={{ height: `${Math.max((figure(point) / max) * 100, 3)}%` }}
                />
              </button>
            </li>
          )
        })}
      </ol>
      <div className="mt-1 flex gap-1.5" aria-hidden="true">
        {points.map((point) => (
          <span key={point.bucket} className="min-w-0 flex-1 text-center font-mono text-[0.65rem] tabular-nums text-muted-foreground">{`'${point.bucket.slice(2)}`}</span>
        ))}
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
export function CleanTable({
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
  if (query.dupa.axis === 'timp') return null
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
                {population.money === 'clean' && !perResident ? <TableCell className="hidden text-right tabular-nums md:table-cell">{count && lei !== null ? moneyText(lei / count) : '—'}</TableCell> : null}
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
