import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import type { CategoryFigure } from '../../lib/home-categories'
import { countText, dayText, firmsCount, moneyText, percentText, unitCount } from '../../lib/home-format'
import type { HomeGrain, RankedRow, Ranking, RecentRecord } from '../../lib/home-model'
import { Bone } from './home-chrome'

/**
 * The front door's rows. A row keeps its name on the left with what it
 * counts under it, and the ranked figure alone on the right, so a name does
 * not truncate on a phone. The bar follows what the server actually ranked
 * by; a row is a link only when it opens exactly what it counts.
 */

const LIST = 'divide-y divide-border/70 border-y border-border/70'
const ROW = 'group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 px-1'
const ROW_LINK = 'transition-colors hover:bg-muted/40 focus-visible:bg-muted/40'

const fractionOf = (value: number | null, top: number) => (value === null ? null : value / top)

/** A share of the top row; none when the row's measure is unknown. */
function Bar({ fraction }: { readonly fraction: number | null }) {
  if (fraction === null) return null
  return (
    <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
      <span
        className="block h-1 bg-primary/70 transition-colors group-hover:bg-primary"
        style={{ width: `${Math.min(Math.max(fraction * 100, 0.8), 100).toFixed(1)}%` }}
      />
    </span>
  )
}

/** The rows a party ranking shows unless told otherwise. */
export const PARTY_ROWS = 10

/** A party ranking: the value by money where the server ranked by it, the count where it did not. */
export function PartyRows({
  ranking,
  grain,
  kind,
  year,
  limit = PARTY_ROWS,
  dense = false,
  className,
}: {
  readonly ranking: Ranking
  readonly grain: HomeGrain
  readonly kind: 'authority' | 'supplier'
  /** The year the ranking counts: the party's page opens on it; null for the last twelve months, the pages' default. */
  readonly year: number | null
  readonly limit?: number
  readonly dense?: boolean
  readonly className?: string
}) {
  const rows = ranking.rows.slice(0, limit)
  const measure = (row: RankedRow) => (ranking.rankedBy === 'value' ? row.value : row.count)
  const top = Math.max(...rows.map((row) => measure(row) ?? 0), 1)
  return (
    <ol className={cn(LIST, className)}>
      {rows.map((row, index) => {
        const body = (
          <>
            <span className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2">
              <MonoLabel className="pt-0.5 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
              <span className="min-w-0">
                <span className="block truncate text-sm text-foreground">{row.label}</span>
                <Bar fraction={fractionOf(measure(row), top)} />
                <MonoLabel className="mt-1 block truncate tabular-nums text-muted-foreground">
                  {ranking.rankedBy === 'value' ? unitCount(grain, row.count) : row.share !== null ? percentText(row.share) : ''}
                </MonoLabel>
              </span>
            </span>
            <span className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-foreground">
              {ranking.rankedBy === 'value' ? (row.value === null ? '—' : moneyText(row.value)) : countText(row.count)}
            </span>
          </>
        )
        const className = cn(ROW, ROW_LINK, dense ? 'py-2' : 'py-2.5')
        return (
          <li key={row.key}>
            {kind === 'authority' ? (
              <Link to="/procurement/institutions/$cui" params={{ cui: row.key }} search={year === null ? {} : { year }} className={className}>
                {body}
              </Link>
            ) : (
              <Link to="/procurement/suppliers/$cui" params={{ cui: row.key }} search={year === null ? {} : { year }} className={className}>
                {body}
              </Link>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Rows not read yet, in the shape of the rows that replace them: the same
 * lines at the same sizes, so the list keeps its height when they land. A
 * ranking's places are known before its names, so they show.
 */
export function PendingRows({
  shape,
  rows,
  dense = false,
  className,
}: {
  readonly shape: 'party' | 'category' | 'record'
  readonly rows: number
  readonly dense?: boolean
  readonly className?: string
}) {
  return (
    <ol className={cn(LIST, className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className={cn(ROW, shape === 'record' ? 'py-3' : dense ? 'py-2' : 'py-2.5')}>
          {shape === 'party' ? (
            <span className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2">
              <MonoLabel className="pt-0.5 tabular-nums text-muted-foreground/60">{String(index + 1).padStart(2, '0')}</MonoLabel>
              <span className="min-w-0">
                <span className="block text-sm">
                  <Bone className={index % 2 === 0 ? 'w-4/5' : 'w-3/5'} />
                </span>
                <span className="mt-1 block h-1 bg-muted" />
                <MonoLabel className="mt-1 block">
                  <Bone className="w-32" />
                </MonoLabel>
              </span>
            </span>
          ) : shape === 'category' ? (
            <span className="min-w-0">
              <span className="block text-sm leading-snug">
                <Bone className={index % 2 === 0 ? 'w-3/4' : 'w-1/2'} />
              </span>
              <span className="mt-1 block h-1 bg-muted" />
              <MonoLabel className="mt-1 block">
                <Bone className="w-36" />
              </MonoLabel>
            </span>
          ) : (
            <span className="min-w-0">
              {/* A published title takes two lines below a wide screen; on it, one in four still does. */}
              <span className="block text-sm font-medium leading-snug">
                <Bone className="w-11/12" />
                <Bone className={cn('w-1/2', index % 4 !== 0 && 'lg:hidden')} />
              </span>
              <span className="mt-1 block text-xs">
                <Bone className="w-2/3" />
              </span>
              <span className="mt-0.5 block text-xs">
                <Bone className="w-1/2" />
              </span>
            </span>
          )}
          <span className="text-right text-sm">
            <Bone className="w-20" />
            {shape === 'record' ? (
              <MonoLabel className="block">
                <Bone className="w-14" />
              </MonoLabel>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  )
}

/**
 * The reader's categories. Not links: a category gathers several CPV codes,
 * and the explorer filters by one, so any list it opened would count a
 * different population than the row.
 */
export function CategoryRows({ rows, grain, className }: { readonly rows: readonly CategoryFigure[]; readonly grain: HomeGrain; readonly className?: string }) {
  const { i18n } = useLingui()
  const top = Math.max(...rows.map((row) => row.value ?? 0), 1)
  return (
    <ol className={cn(LIST, className)}>
      {rows.map((row) => (
        <li key={row.category.key} className={cn(ROW, 'py-2.5')}>
          <span className="min-w-0">
            <span className="block text-sm leading-snug text-foreground">{i18n._(row.category.label)}</span>
            <Bar fraction={fractionOf(row.value, top)} />
            <MonoLabel className="mt-1 block tabular-nums text-muted-foreground">
              {row.share !== null ? `${percentText(row.share)} · ` : ''}
              {unitCount(grain, row.count)}
            </MonoLabel>
          </span>
          {/* No published money is unknown, never 0 lei. */}
          <span className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-foreground">{row.value !== null ? moneyText(row.value) : '—'}</span>
        </li>
      ))}
    </ol>
  )
}

function RecordLink({ record, className, children }: { readonly record: RecentRecord; readonly className: string; readonly children: ReactNode }) {
  return record.grain === 'contract' ? (
    <Link to="/procurement/contracts/$id" params={{ id: record.id }} className={className}>
      {children}
    </Link>
  ) : (
    <Link to="/procurement/direct-acquisitions/$id" params={{ id: record.id }} className={className}>
      {children}
    </Link>
  )
}

/**
 * Records one per row, the whole row the record's link. `lead` picks what
 * the row leads with: the winners (who gets the money) or the title (what
 * was bought). The value is the one SEAP published for the record.
 */
export function RecordRows({
  records,
  lead,
  fallbackTitle,
  showBuyer = true,
  className,
}: {
  readonly records: readonly RecentRecord[]
  readonly lead: 'winners' | 'title'
  /** What a record with no title is called: its category, when the caller knows it. */
  readonly fallbackTitle?: (record: RecentRecord) => string | null
  /** Off on a buyer's own page, where every row would name it. */
  readonly showBuyer?: boolean
  readonly className?: string
}) {
  return (
    <ol className={cn(LIST, className)}>
      {records.map((record) => {
        const winners = record.winners.map((winner) => winner.name).join(' · ')
        const title = record.title ?? fallbackTitle?.(record) ?? t`Fără titlu publicat`
        return (
          <li key={`${record.grain}:${record.id}`}>
            <RecordLink record={record} className={cn(ROW, ROW_LINK, 'py-3')}>
              <span className="min-w-0">
                <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:underline group-hover:underline-offset-4">
                  {lead === 'winners' ? winners : title}
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {lead === 'winners' ? title : winners}
                </span>
                {showBuyer ? (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    <span className="sr-only">{t`Cumpărător:`} </span>
                    {record.buyer.name}
                  </span>
                ) : null}
              </span>
              <span className="text-right">
                <span className="block whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">{moneyText(record.value)}</span>
                <MonoLabel className="block whitespace-nowrap text-muted-foreground">
                  {record.winners.length > 1 ? firmsCount(record.winners.length) : record.date ? dayText(record.date) : ''}
                </MonoLabel>
              </span>
            </RecordLink>
          </li>
        )
      })}
    </ol>
  )
}
