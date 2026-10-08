import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowDown, ArrowUp } from 'lucide-react'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import type { PublicEnterprisePortfolioSort } from '@/schemas/public-enterprises'
import { cn } from '@/lib/utils'
import {
  figureOf,
  flagsOf,
  listTallyKey,
  LIST_TALLY_TONE,
  missingFigure,
  type Count,
  type Disagreement,
  type DownLanes,
  type FigureMeasure,
  type ListTallyKey,
  type PortfolioRow,
  type Segment,
  type Tone,
} from '../../lib/authority-portfolio-model'
import { activityLabel, disagreementSource, figureText, flagText, listNoneText, listTallyLabel, missingText } from '../../lib/authority-portfolio-text'
import { hasPortfolio } from '../../lib/authority-portfolio-links'
import { displayName, formatCount } from '../../lib/hub-format'
import { TEXT_LINK } from '../enterprise/enterprise-links'
import { RankedRows, ShowMore, type RankedRow } from '../hub/hub-parts'

/**
 * The portfolio page's parts: the sources' panel, the enterprises' table, the
 * sources' disagreements and the counts by activity and seat. Every status
 * keeps its source; a missing figure says why, never a zero.
 */

const LIST = 'divide-y divide-border/70 border-y border-border/70'
/** The table's rows before „all": two dozen keep a large portfolio's page short (the rest are in the document, hidden). */
const TABLE_ROWS = 24

// ──────────────────────────────────────────────────────────── links ──

/** An enterprise's own page; a nameless one (or one whose only name is its CUI) is said by its CUI, muted. */
function EnterpriseLink({ cui, name, className }: { readonly cui: string; readonly name: string | null; readonly className?: string }) {
  const named = name !== null && name.trim() !== '' && name.trim() !== cui
  return (
    <Link to="/public-enterprises/$cui" params={{ cui }} preload="intent" className={cn(TEXT_LINK, '[overflow-wrap:anywhere]', className)}>
      {named ? displayName(name) : <span className="text-muted-foreground">{t`Întreprinderea cu CUI ${cui}`}</span>}
    </Link>
  )
}

/** Another authority, in its source's spelling: its own portfolio when the snapshot holds one. */
function AuthorityLink({ cui, name }: { readonly cui: string; readonly name: string | null }) {
  const label = name ? displayName(name) : t`CUI ${cui}`
  if (!hasPortfolio(cui)) return <>{label}</>
  return (
    <Link to="/public-enterprises/authorities/$cui" params={{ cui }} preload="intent" className={cn(TEXT_LINK, 'text-foreground underline decoration-border')}>
      {label}
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

/** ANAF's list's word on one row, as the panel says it, with its dot. */
function ListWord({ listKey }: { readonly listKey: ListTallyKey }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Dot tone={LIST_TALLY_TONE[listKey]} />
      {listTallyLabel(listKey)}
    </span>
  )
}

// ──────────────────────────────────────────────────────── the panel ──

export type PanelSource = { readonly key: string; readonly title: string; readonly segments: readonly Segment[]; readonly label: (key: string) => string }

/**
 * Each source's word on the page's enterprises, one row each: a bar of its
 * parts, then the parts in words. Never one stacked status: a source's parts
 * add up to the page's enterprises on their own.
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
              {total > 0 ? (
                <span className="mt-1.5 flex h-1.5 gap-px overflow-hidden bg-muted" aria-hidden="true">
                  {source.segments.map((segment) => (
                    <span key={segment.key} className={TONE_CLASS[segment.tone]} style={{ width: `${((segment.count / total) * 100).toFixed(2)}%` }} />
                  ))}
                </span>
              ) : null}
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {source.segments.map((segment) => (
                  <li key={segment.key} className="inline-flex max-w-full items-center gap-1.5">
                    <Dot tone={segment.tone} />
                    <span className="[overflow-wrap:anywhere]">{source.label(segment.key)}</span>
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
  return [enterprise.caen ? activityLabel(enterprise.caen.slice(0, 2)) : null, enterprise.county ? displayName(enterprise.county) : null, enterprise.legalForm]
    .filter((part): part is string => Boolean(part))
    .join(' · ')
}

/** The other sources' words that are not „in business". Where the list has the enterprise is the list's column's to say. */
function RowMarks({ row }: { readonly row: PortfolioRow }) {
  const flags = flagsOf(row.enterprise)
  if (flags.length === 0) return null
  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {flags.map((flag) => (
        <li key={flag.kind} className="inline-flex max-w-full items-center gap-1 border px-1.5 py-0.5 text-[11px] leading-tight text-foreground">
          <Dot tone={flag.kind === 'registry' && flag.state === 'struck-off' ? 'struck-off' : 'warning'} />
          <span className="[overflow-wrap:anywhere]">{flagText(flag)}</span>
        </li>
      ))}
    </ul>
  )
}

function NameCell({ row, listKey }: { readonly row: PortfolioRow; readonly listKey: ListTallyKey }) {
  const caption = captionOf(row)
  return (
    <div className="min-w-0">
      <EnterpriseLink cui={row.enterprise.cui} name={row.enterprise.name} className="text-sm font-medium text-foreground" />
      <MonoLabel className="mt-1 block normal-case tracking-normal text-muted-foreground">
        {/* The list's word has a column from `md` up; on a phone it rides with the caption. */}
        <span className="md:hidden">
          <ListWord listKey={listKey} />
          {caption ? ' · ' : null}
        </span>
        {caption}
      </MonoLabel>
      <RowMarks row={row} />
    </div>
  )
}

/**
 * The year's admitted figure, or why there is none, in words: never a zero
 * for a missing value. A row with no statement for the year says so once, in
 * its turnover cell (the one a phone shows); its other cells are a dash that
 * reads the same to a screen reader.
 */
function Figure({ row, measure, locale }: { readonly row: PortfolioRow; readonly measure: FigureMeasure; readonly locale: string }) {
  const value = figureOf(row.enterprise, measure)
  if (value !== null) {
    const loss = measure === 'net' && Number(value) < 0
    return <span className={cn('whitespace-nowrap font-semibold tabular-nums', loss ? 'text-destructive' : 'text-foreground')}>{figureText(value, measure, locale)}</span>
  }
  const implausible = measure === 'employees' ? row.enterprise.financials.implausibleEmployees : null
  if (implausible) return <span className="whitespace-nowrap text-xs text-muted-foreground">{t`neplauzibil (${implausible})`}</span>
  const missing = missingFigure(row.enterprise, measure)
  const text = missingText(missing, measure)
  if (measure !== 'turnover' && (missing.kind === 'never' || missing.kind === 'last')) {
    return (
      <span className="text-xs text-muted-foreground">
        <span aria-hidden="true">—</span>
        <span className="sr-only">{text}</span>
      </span>
    )
  }
  return <span className="whitespace-nowrap text-xs text-muted-foreground">{text}</span>
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
  readonly sort: PublicEnterprisePortfolioSort
  readonly current: PublicEnterprisePortfolioSort
  readonly onSort: (sort: PublicEnterprisePortfolioSort) => void
  readonly align?: 'left' | 'right'
  readonly className?: string
  readonly children: ReactNode
}) {
  const active = sort === current
  const ascending = sort === 'nume' || sort === 'rezultat'
  const Icon = ascending ? ArrowUp : ArrowDown
  return (
    <th scope="col" aria-sort={active ? (ascending ? 'ascending' : 'descending') : undefined} className={cn('py-2 align-bottom font-normal', align === 'right' ? 'text-right' : 'text-left', className)}>
      <button
        type="button"
        onClick={() => onSort(sort)}
        className={cn(
          'inline-flex min-h-11 items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0',
          active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
          align === 'right' && 'flex-row-reverse text-right',
        )}
      >
        <MonoLabel className="sm:whitespace-nowrap">{children}</MonoLabel>
        <Icon className={cn('size-3 shrink-0', active ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
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
  authorityCui,
  down,
  caption,
  locale,
}: {
  readonly rows: readonly PortfolioRow[]
  readonly sort: PublicEnterprisePortfolioSort
  readonly onSort: (sort: PublicEnterprisePortfolioSort) => void
  readonly year: number
  readonly authorityCui: string
  readonly down: DownLanes
  readonly caption: string
  readonly locale: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border/70">
            <th scope="col" className="hidden w-10 py-2 text-left align-bottom font-normal sm:table-cell">
              <MonoLabel className="text-muted-foreground">#</MonoLabel>
            </th>
            <SortHeader sort="nume" current={sort} onSort={onSort}>
              {t`Întreprinderea`}
            </SortHeader>
            <th scope="col" className="hidden py-2 pl-4 text-left align-bottom font-normal md:table-cell">
              <MonoLabel className="whitespace-nowrap text-muted-foreground">{t`Lista ANAF`}</MonoLabel>
            </th>
            <SortHeader sort="cifra" current={sort} onSort={onSort} align="right" className="pl-4">
              {t`Cifra de afaceri ${year}`}
            </SortHeader>
            <SortHeader sort="salariati" current={sort} onSort={onSort} align="right" className="hidden pl-4 sm:table-cell">
              {t`Salariați`}
            </SortHeader>
            <SortHeader sort="rezultat" current={sort} onSort={onSort} align="right" className="hidden pl-4 lg:table-cell">
              {t`Rezultat net`}
            </SortHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {/* Every row is in the document, so the server's HTML carries them all; past two dozen they wait hidden for „all". */}
          {rows.map((row, index) => (
            <tr key={row.enterprise.cui} className={cn('align-top transition-colors hover:bg-muted/30', !open && index >= TABLE_ROWS && 'hidden')}>
              <td className="hidden py-3 pr-2 sm:table-cell">
                <MonoLabel className="tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
              </td>
              <td className="py-3">
                <NameCell row={row} listKey={listTallyKey(row, authorityCui, down)} />
              </td>
              <td className="hidden py-3 pl-4 text-sm text-foreground md:table-cell">
                <ListWord listKey={listTallyKey(row, authorityCui, down)} />
              </td>
              <td className="py-3 pl-4 text-right">
                <Figure row={row} measure="turnover" locale={locale} />
              </td>
              <td className="hidden py-3 pl-4 text-right sm:table-cell">
                <Figure row={row} measure="employees" locale={locale} />
              </td>
              <td className="hidden py-3 pl-4 text-right lg:table-cell">
                <Figure row={row} measure="net" locale={locale} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > TABLE_ROWS ? <ShowMore open={open} onToggle={() => setOpen(!open)} all={t`Toate cele ${formatCount(rows.length, locale)}`} /> : null}
    </>
  )
}

// ───────────────────────────────────────────────────── disagreements ──

/** One row per enterprise where the sources part: what the other source says, in its spelling, the other authority linked to its own page. */
export function DisagreementList({ parts }: { readonly parts: readonly Disagreement[] }) {
  return (
    <ul className={LIST}>
      {parts.map((part) => (
        <li key={part.row.enterprise.cui} className="px-1 py-3">
          <EnterpriseLink cui={part.row.enterprise.cui} name={part.row.enterprise.name} className="text-sm font-medium text-foreground" />
          <p className="mt-1 text-sm text-muted-foreground">
            <MonoLabel className="mr-2 text-muted-foreground">{disagreementSource(part)}</MonoLabel>
            {part.kind === 'list-none'
              ? listNoneText(part)
              : part.others.map((other, index) => (
                  <span key={other.cui}>
                    {index > 0 ? ', ' : null}
                    <AuthorityLink cui={other.cui} name={other.name} />
                  </span>
                ))}
          </p>
        </li>
      ))}
    </ul>
  )
}

// ───────────────────────────────────────────────── what and where ──

/** Counts with bars against the largest; the row for „none on record" draws no bar. */
export function CountRows({ counts, label, locale }: { readonly counts: readonly Count[]; readonly label: (key: string | null) => string; readonly locale: string }) {
  const [open, setOpen] = useState(false)
  const top = counts.find((count) => count.key !== null)?.count ?? 0
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
