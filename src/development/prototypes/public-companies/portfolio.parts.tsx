import { useState, type ReactNode } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowDown, ArrowUp, ArrowUpRight } from 'lucide-react'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { BandNote, RankedRows, ShowMore, type RankedRow } from '@/features/public-enterprises/components/hub/hub-parts'
import { displayName, formatCount } from '@/features/public-enterprises/lib/hub-format'
import { cn } from '@/lib/utils'
import { DEFAULT_AUTHORITY, PORTFOLIO, SAMPLES } from './portfolio.data'
import {
  figureOf,
  flagsOf,
  listState,
  LIST_TONE,
  measureValue,
  missingFigure,
  sortRows,
  type Count,
  type Disagreement,
  type ListState,
  type PortfolioRow,
  type Segment,
  type SizeMeasure,
  type StatusGroup,
  type TableSort,
  type Tone,
} from './portfolio.model'
import { activityLabel, disagreementText, figureText, flagText, listGroupTitle, listStateLabel, measureLabel, membershipMark, missingText } from './portfolio.text'

/**
 * The authority portfolio prototype's parts: the picker, the per-source
 * status panel, the enterprise rows in three forms (a table, groups by the
 * list's word, a ranking), the sources' disagreements and the counts by
 * activity and county. Every status keeps its source.
 */

export const LIST = 'divide-y divide-border/70 border-y border-border/70'
const TEXT_LINK = 'underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const ROWS_SHOWN = 12

// ──────────────────────────────────────────────────────────── links ──

export function usePortfolioCui(): string {
  const search = useSearch({ strict: false }) as { readonly cui?: unknown }
  const cui = typeof search.cui === 'string' || typeof search.cui === 'number' ? String(search.cui).trim() : ''
  return /^\d{2,10}$/u.test(cui) ? cui : DEFAULT_AUTHORITY
}

const SAMPLED = new Set(PORTFOLIO.authorities.map((authority) => authority.cui))

/** Another authority: in the prototype, its own portfolio when it is sampled; else its name alone. */
export function AuthorityName({ cui, children }: { readonly cui: string; readonly children: ReactNode }) {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  if (!SAMPLED.has(cui)) return <>{children}</>
  return (
    <Link to="." search={{ ...search, cui }} hash="" className={cn(TEXT_LINK, 'underline decoration-border')}>
      {children}
    </Link>
  )
}

/** A dev-only row to switch the authority, above each variant. */
export function SamplePicker() {
  const current = usePortfolioCui()
  const search = useSearch({ strict: false }) as Record<string, unknown>
  return (
    <div className="flex flex-wrap gap-1.5 border-b bg-muted/30 px-4 py-2 text-xs">
      {SAMPLES.map((sample) => (
        <Link
          key={sample.cui}
          to="."
          search={{ ...search, cui: sample.cui }}
          hash=""
          className={cn('rounded-sm border px-2 py-0.5', sample.cui === current ? 'border-foreground bg-foreground text-background' : 'bg-background')}
        >
          <span title={sample.note}>{sample.label}</span>
        </Link>
      ))}
    </div>
  )
}

/** The enterprise's own page, in production. */
function EnterpriseLink({ cui, className, children }: { readonly cui: string; readonly className?: string; readonly children: ReactNode }) {
  return (
    <Link to="/public-enterprises/$cui" params={{ cui }} preload="intent" className={cn(TEXT_LINK, className)}>
      {children}
    </Link>
  )
}

/** The authority's budget page. */
export function BudgetLink({ cui }: { readonly cui: string }) {
  return (
    <Link to="/entities/$cui" params={{ cui }} preload="intent" className={cn(TEXT_LINK, 'inline-flex min-h-11 items-center gap-1 text-sm font-medium text-foreground sm:min-h-0')}>
      {t`Bugetul autorității`}
      <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
    </Link>
  )
}

// ──────────────────────────────────────────────────────────── tones ──

const TONE_CLASS: Readonly<Record<Tone, string>> = {
  active: 'bg-emerald-500',
  warning: 'bg-amber-500',
  'struck-off': 'bg-destructive',
  unknown: 'bg-muted-foreground/40',
}

function Dot({ tone }: { readonly tone: Tone }) {
  return <span className={cn('inline-block size-1.5 shrink-0 rounded-full', TONE_CLASS[tone])} aria-hidden="true" />
}

/** ANAF's list's word for one row, with its dot. */
export function ListWord({ state }: { readonly state: ListState }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Dot tone={LIST_TONE[state]} />
      {listStateLabel(state)}
    </span>
  )
}

// ──────────────────────────────────────────────────────── the panel ──

export type PanelSource = { readonly key: string; readonly title: string; readonly segments: readonly Segment[]; readonly label: (key: string) => string }

/**
 * Each source's word on the page's enterprises, one row each: a bar of its
 * parts and the parts in words. The bars are never stacked into one: a
 * source's parts add up to the page's enterprises on their own.
 */
export function StatusPanel({ title, sources, locale }: { readonly title: string; readonly sources: readonly PanelSource[]; readonly locale: string }) {
  return (
    <section className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby="portfolio-panel-title">
      <MonoLabel id="portfolio-panel-title" className="block text-muted-foreground">
        {title}
      </MonoLabel>
      <ul className="mt-4 space-y-5">
        {sources.map((source) => {
          const total = source.segments.reduce((sum, segment) => sum + segment.count, 0)
          return (
            <li key={source.key}>
              <p className="text-sm font-medium text-foreground">{source.title}</p>
              <span className="mt-1.5 flex h-1.5 gap-px overflow-hidden bg-muted" aria-hidden="true">
                {source.segments.map((segment) => (
                  <span key={segment.key} className={TONE_CLASS[segment.tone]} style={{ width: `${((segment.count / total) * 100).toFixed(2)}%` }} />
                ))}
              </span>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {source.segments.map((segment) => (
                  <li key={segment.key} className="inline-flex max-w-full items-center gap-1.5">
                    <Dot tone={segment.tone} />
                    <span className="truncate" title={source.label(segment.key)}>
                      {source.label(segment.key)}
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">{formatCount(segment.count, locale)}</span>
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ──────────────────────────────────────────────────────────── rows ──

/** What it does, where, and its legal form, in one mono line. */
function captionOf(row: PortfolioRow): string {
  const { enterprise } = row
  return [enterprise.caen ? activityLabel(enterprise.caen.slice(0, 2)) : null, enterprise.county ? displayName(enterprise.county) : null, enterprise.legalForm].filter(Boolean).join(' · ')
}

/** The other sources' words that are not „in business", and where the row's link to this authority comes from. */
function RowMarks({ row, elsewhere }: { readonly row: PortfolioRow; readonly elsewhere: ReadonlySet<string> }) {
  const flags = flagsOf(row.enterprise)
  const mark = membershipMark(row, elsewhere.has(row.enterprise.cui))
  if (flags.length === 0 && !mark) return null
  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {mark ? <li className="border border-dashed px-1.5 py-0.5 text-[11px] leading-tight text-muted-foreground">{mark}</li> : null}
      {flags.map((flag) => (
        <li key={flag.kind} className="inline-flex max-w-full items-center gap-1 border px-1.5 py-0.5 text-[11px] leading-tight text-foreground">
          <Dot tone={flag.kind === 'registry' && flag.state === 'struck-off' ? 'struck-off' : 'warning'} />
          <span className="[overflow-wrap:anywhere]">{flagText(flag)}</span>
        </li>
      ))}
    </ul>
  )
}

function NameCell({ row, elsewhere, showList = false }: { readonly row: PortfolioRow; readonly elsewhere: ReadonlySet<string>; readonly showList?: boolean }) {
  const caption = captionOf(row)
  return (
    <div className="min-w-0">
      <EnterpriseLink cui={row.enterprise.cui} className="text-sm font-medium text-foreground [overflow-wrap:anywhere]">
        {displayName(row.enterprise.name)}
      </EnterpriseLink>
      {caption || showList ? (
        <MonoLabel className="mt-1 block normal-case tracking-normal text-muted-foreground">
          {showList ? (
            <span className="md:hidden">
              <ListWord state={listState(row.enterprise)} />
              {caption ? ' · ' : null}
            </span>
          ) : null}
          {caption}
        </MonoLabel>
      ) : null}
      <RowMarks row={row} elsewhere={elsewhere} />
    </div>
  )
}

/** The year's admitted figure, or why there is none, in words: never a zero for a missing value. */
function Figure({ row, measure, year, locale }: { readonly row: PortfolioRow; readonly measure: SizeMeasure; readonly year: number; readonly locale: string }) {
  const value = figureOf(row.enterprise, measure)
  if (value !== null) {
    const loss = measure === 'pierdere' && Number(value) < 0
    return <span className={cn('whitespace-nowrap font-semibold tabular-nums', loss ? 'text-destructive' : 'text-foreground')}>{figureText(value, measure, locale)}</span>
  }
  const employees = measure === 'salariati' ? row.enterprise.financials.implausibleEmployees : null
  return <span className="whitespace-nowrap text-xs text-muted-foreground">{employees ? t`neplauzibil (${employees})` : missingText(missingFigure(row.enterprise, measure, year), measure)}</span>
}

// ──────────────────────────────────────────────────────────── table ──

function SortHeader({
  sort,
  current,
  onSort,
  align = 'left',
  className,
  children,
}: {
  readonly sort: TableSort
  readonly current: TableSort
  readonly onSort: (sort: TableSort) => void
  readonly align?: 'left' | 'right'
  readonly className?: string
  readonly children: ReactNode
}) {
  const active = sort === current
  const ascending = sort === 'nume' || sort === 'pierdere'
  const Icon = ascending ? ArrowUp : ArrowDown
  return (
    <th scope="col" aria-sort={active ? (ascending ? 'ascending' : 'descending') : undefined} className={cn('py-2 font-normal', align === 'right' ? 'text-right' : 'text-left', className)}>
      <button
        type="button"
        onClick={() => onSort(sort)}
        className={cn('inline-flex min-h-11 items-center gap-1 sm:min-h-0', active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground', align === 'right' ? 'flex-row-reverse' : '')}
      >
        <MonoLabel className="sm:whitespace-nowrap">{children}</MonoLabel>
        <Icon className={cn('size-3', active ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
      </button>
    </th>
  )
}

/** Every enterprise in one table: the list's word, then the year's admitted figures; sortable, the rest one tap away. */
export function PortfolioTable({
  rows,
  sort,
  onSort,
  year,
  elsewhere,
  caption,
  locale,
}: {
  readonly rows: readonly PortfolioRow[]
  readonly sort: TableSort
  readonly onSort: (sort: TableSort) => void
  readonly year: number
  readonly elsewhere: ReadonlySet<string>
  readonly caption: string
  readonly locale: string
}) {
  const [open, setOpen] = useState(false)
  const sorted = sortRows(rows, sort)
  const shown = open ? sorted : sorted.slice(0, ROWS_SHOWN * 2)
  return (
    <>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border/70">
            <th scope="col" className="hidden w-10 py-2 text-left font-normal sm:table-cell">
              <MonoLabel className="text-muted-foreground">#</MonoLabel>
            </th>
            <SortHeader sort="nume" current={sort} onSort={onSort}>
              {t`Întreprinderea`}
            </SortHeader>
            <th scope="col" className="hidden py-2 pl-4 text-left font-normal md:table-cell">
              <MonoLabel className="whitespace-nowrap text-muted-foreground">{t`Lista ANAF`}</MonoLabel>
            </th>
            <SortHeader sort="cifra" current={sort} onSort={onSort} align="right" className="pl-4">
              {measureLabel('cifra', year)}
            </SortHeader>
            <SortHeader sort="salariati" current={sort} onSort={onSort} align="right" className="hidden pl-4 sm:table-cell">
              {t`Salariați`}
            </SortHeader>
            <SortHeader sort="pierdere" current={sort} onSort={onSort} align="right" className="hidden pl-4 lg:table-cell">
              {t`Rezultat net`}
            </SortHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {shown.map((row, index) => (
            <tr key={row.enterprise.cui} className="align-top transition-colors hover:bg-muted/30">
              <td className="hidden py-3 pr-2 sm:table-cell">
                <MonoLabel className="tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
              </td>
              <td className="py-3">
                <NameCell row={row} elsewhere={elsewhere} showList />
              </td>
              <td className="hidden py-3 pl-4 text-sm text-foreground md:table-cell">
                <ListWord state={listState(row.enterprise)} />
              </td>
              <td className="py-3 pl-4 text-right">
                <Figure row={row} measure="cifra" year={year} locale={locale} />
              </td>
              <td className="hidden py-3 pl-4 text-right sm:table-cell">
                <Figure row={row} measure="salariati" year={year} locale={locale} />
              </td>
              <td className="hidden py-3 pl-4 text-right lg:table-cell">
                <Figure row={row} measure="pierdere" year={year} locale={locale} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length > ROWS_SHOWN * 2 ? <ShowMore open={open} onToggle={() => setOpen(!open)} all={t`Toate cele ${formatCount(sorted.length, locale)}`} /> : null}
    </>
  )
}

// ──────────────────────────────────────────────────────── by status ──

function CompactRows({ rows, year, elsewhere, locale }: { readonly rows: readonly PortfolioRow[]; readonly year: number; readonly elsewhere: ReadonlySet<string>; readonly locale: string }) {
  return (
    <ul className={LIST}>
      {rows.map((row) => (
        <li key={row.enterprise.cui} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 px-1 py-2.5">
          <NameCell row={row} elsewhere={elsewhere} />
          <span className="pt-0.5 text-right text-sm">
            <Figure row={row} measure="cifra" year={year} locale={locale} />
          </span>
        </li>
      ))}
    </ul>
  )
}

/** One group per word of ANAF's list, each with its count; the rows carry the other sources' words. */
export function StatusGroups({ groups, year, elsewhere, locale }: { readonly groups: readonly StatusGroup[]; readonly year: number; readonly elsewhere: ReadonlySet<string>; readonly locale: string }) {
  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <StatusGroupList key={group.state} group={group} year={year} elsewhere={elsewhere} locale={locale} />
      ))}
    </div>
  )
}

function StatusGroupList({ group, year, elsewhere, locale }: { readonly group: StatusGroup; readonly year: number; readonly elsewhere: ReadonlySet<string>; readonly locale: string }) {
  const [open, setOpen] = useState(false)
  const rows = open ? group.rows : group.rows.slice(0, ROWS_SHOWN)
  return (
    <section aria-label={listGroupTitle(group.state)}>
      <div className="flex items-baseline justify-between gap-4 pb-2">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <Dot tone={LIST_TONE[group.state]} />
          {listGroupTitle(group.state)}
        </p>
        <MonoLabel className="tabular-nums text-muted-foreground">{formatCount(group.rows.length, locale)}</MonoLabel>
      </div>
      <CompactRows rows={rows} year={year} elsewhere={elsewhere} locale={locale} />
      {group.rows.length > ROWS_SHOWN ? <ShowMore open={open} onToggle={() => setOpen(!open)} all={t`Toate cele ${formatCount(group.rows.length, locale)}`} /> : null}
    </section>
  )
}

// ──────────────────────────────────────────────────────────── size ──

/** Ranked rows with bars: a share of the top row; the list's word and the activity under each. */
export function sizeRows(rows: readonly PortfolioRow[], measure: SizeMeasure, locale: string): readonly RankedRow[] {
  const top = Number(rows[0] ? measureValue(rows[0].enterprise, measure) : 0)
  return rows.map((row) => {
    const value = measureValue(row.enterprise, measure)!
    const activity = row.enterprise.caen ? activityLabel(row.enterprise.caen.slice(0, 2)) : null
    return {
      key: row.enterprise.cui,
      label: displayName(row.enterprise.name),
      caption: [listStateLabel(listState(row.enterprise)), activity].filter(Boolean).join(' · '),
      value: figureText(value, measure, locale),
      fraction: top > 0 ? Number(value) / top : null,
      link: { page: 'enterprise', cui: row.enterprise.cui },
    }
  })
}

export function SizeRanking({ ranked, measure, locale }: { readonly ranked: readonly PortfolioRow[]; readonly measure: SizeMeasure; readonly locale: string }) {
  const [open, setOpen] = useState(false)
  const rows = sizeRows(open ? ranked : ranked.slice(0, ROWS_SHOWN), measure, locale)
  return (
    <>
      <RankedRows rows={rows} numbered />
      {ranked.length > ROWS_SHOWN ? <ShowMore open={open} onToggle={() => setOpen(!open)} all={t`Toate cele ${formatCount(ranked.length, locale)}`} /> : null}
    </>
  )
}

/** The rows a ranking leaves out, each with why: no statement, an older one, a value not admitted. */
export function WithoutFigure({ title, rows, year, measure, locale }: { readonly title: string; readonly rows: readonly PortfolioRow[]; readonly year: number; readonly measure: SizeMeasure; readonly locale: string }) {
  const [open, setOpen] = useState(false)
  if (rows.length === 0) return null
  const shown = open ? rows : rows.slice(0, ROWS_SHOWN)
  return (
    <section className="mt-10" aria-label={title}>
      <div className="flex items-baseline justify-between gap-4 pb-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <MonoLabel className="tabular-nums text-muted-foreground">{formatCount(rows.length, locale)}</MonoLabel>
      </div>
      <ul className={LIST}>
        {shown.map((row) => (
          <li key={row.enterprise.cui} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 px-1 py-2">
            <span className="min-w-0 text-sm">
              <EnterpriseLink cui={row.enterprise.cui} className="text-foreground [overflow-wrap:anywhere]">
                {displayName(row.enterprise.name)}
              </EnterpriseLink>
              <span className="ml-2 whitespace-nowrap text-xs text-muted-foreground">{listStateLabel(listState(row.enterprise))}</span>
            </span>
            <Figure row={row} measure={measure} year={year} locale={locale} />
          </li>
        ))}
      </ul>
      {rows.length > ROWS_SHOWN ? <ShowMore open={open} onToggle={() => setOpen(!open)} all={t`Toate cele ${formatCount(rows.length, locale)}`} /> : null}
    </section>
  )
}

// ───────────────────────────────────────────────────── disagreements ──

export function DisagreementList({ parts }: { readonly parts: readonly Disagreement[] }) {
  return (
    <ul className={LIST}>
      {parts.map((part) => {
        const { source, says } = disagreementText(part)
        const others = part.kind === 'list-none' ? [] : part.others
        return (
          <li key={part.row.enterprise.cui} className="px-1 py-3">
            <EnterpriseLink cui={part.row.enterprise.cui} className="text-sm font-medium text-foreground">
              {displayName(part.row.enterprise.name)}
            </EnterpriseLink>
            <p className="mt-1 text-sm text-muted-foreground">
              <MonoLabel className="mr-2 text-muted-foreground">{source}</MonoLabel>
              {others.length > 0
                ? others.map((other, index) => (
                    <span key={other.cui}>
                      {index > 0 ? ', ' : null}
                      <AuthorityName cui={other.cui}>{other.name ? displayName(other.name) : t`CUI ${other.cui}`}</AuthorityName>
                    </span>
                  ))
                : says}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

// ───────────────────────────────────────────────── what and where ──

export function CountRows({ counts, label, locale }: { readonly counts: readonly Count[]; readonly label: (key: string | null) => string; readonly locale: string }) {
  const [open, setOpen] = useState(false)
  const top = counts[0]?.count ?? 0
  const rows: RankedRow[] = (open ? counts : counts.slice(0, 8)).map((count) => ({
    key: count.key ?? '#none',
    label: label(count.key),
    value: formatCount(count.count, locale),
    fraction: count.key === null || top === 0 ? null : count.count / top,
  }))
  return (
    <>
      <RankedRows rows={rows} dense />
      {counts.length > 8 ? <ShowMore open={open} onToggle={() => setOpen(!open)} /> : null}
    </>
  )
}

export { BandNote }
