import { Link } from '@tanstack/react-router'
import { Trans, useLingui } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { countyName } from '../../lib/buyer-text'
import { contractsCount, percentText } from '../../lib/home-format'
import type { AnalyticsUrlSearch } from '../../lib/analytics-model'
import { isUnpublishedProcedure, procedureLabel } from '../../lib/home-model'
import type { CountyFigureRow, ProcedureCountRow } from '../../lib/profile-model'

/**
 * A procurement profile's lists that read the same on a buyer's page and a
 * firm's, in the front door's row rhythm: the name on the left with its bar
 * under it, the figure alone on the right. A row is a link only when it
 * opens exactly what it counts.
 */

const LIST = 'divide-y divide-border/70 border-y border-border/70'
const ROW = 'group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 px-1'
const EMPTY = 'border-y py-4 text-sm text-muted-foreground'

/**
 * Counties, each with its share: the other side's county (a buyer's firms, a
 * firm's institutions), the page's own county marked. The bar follows what
 * the rows are ranked by. The counties past the listed ones, and the records
 * with no county, are one line.
 */
export function CountyRows({
  rows,
  rankedBy,
  home,
  homeLabel,
  searchOf,
  empty,
  limit = 6,
  className,
}: {
  readonly rows: readonly CountyFigureRow[]
  readonly rankedBy: 'value' | 'count'
  /** The page's own county, marked. */
  readonly home: string | null
  readonly homeLabel: string
  /** The analytics page's answer for exactly what a row counts; rows are not links without it. */
  readonly searchOf?: (code: string) => AnalyticsUrlSearch
  readonly empty: string
  readonly limit?: number
  readonly className?: string
}) {
  const shown = rows.slice(0, limit)
  if (shown.length === 0) return <p className={cn(EMPTY, className)}>{empty}</p>
  const measure = (row: CountyFigureRow) => (rankedBy === 'value' ? row.value : row.count)
  const top = Math.max(...shown.map((row) => measure(row) ?? 0), 1)
  const listed = shown.reduce((sum, row) => sum + (row.share ?? 0), 0)
  const rest = rows.length > shown.length ? Math.max(0, 1 - listed) : 0
  return (
    <ol className={cn(LIST, className)}>
      {shown.map((row) => {
        const isHome = row.code === home
        const measured = measure(row)
        const body = (
          <>
            <span className="min-w-0">
              <span className={cn('block truncate text-sm text-foreground', isHome && 'font-semibold')}>
                {countyName(row.code)}
                {isHome ? <MonoLabel className="ml-2 text-primary">{homeLabel}</MonoLabel> : null}
              </span>
              <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
                {measured !== null ? (
                  <span className={cn('block h-1', isHome ? 'bg-primary' : 'bg-primary/50')} style={{ width: `${Math.max((measured / top) * 100, 0.8)}%` }} />
                ) : null}
              </span>
            </span>
            <span className="text-right text-sm font-semibold tabular-nums text-foreground">{row.share !== null ? percentText(row.share, 0) : '—'}</span>
          </>
        )
        return (
          <li key={row.code}>
            {searchOf ? (
              <Link to="/procurement/analytics" search={searchOf(row.code)} className={cn(ROW, 'py-2.5 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40')}>
                {body}
              </Link>
            ) : (
              <div className={cn(ROW, 'py-2.5')}>{body}</div>
            )}
          </li>
        )
      })}
      {rest >= 0.005 ? (
        <li className="px-1 py-2 text-xs text-muted-foreground">
          {/* The rest holds the other counties and the records with no county on them. */}
          <Trans>Restul: {percentText(rest, 0)}</Trans>
        </li>
      ) : null}
    </ol>
  )
}

/**
 * Contract awards by procedure type, by number. Not links: the explorer's
 * list does not filter by procedure. An award negotiated without a prior
 * notice is set in bold — a fact about the route, not a finding.
 */
export function ProcedureRows({
  procedures,
  unlisted,
  empty,
  className,
}: {
  readonly procedures: readonly ProcedureCountRow[]
  /** Awards past the listed procedures, or with none on record. */
  readonly unlisted: number
  readonly empty: string
  readonly className?: string
}) {
  const { i18n } = useLingui()
  const listed = procedures.reduce((sum, row) => sum + row.count, 0)
  const total = listed + unlisted
  if (total === 0) return <p className={cn(EMPTY, className)}>{empty}</p>
  return (
    <ol className={cn(LIST, className)}>
      {procedures.map((row) => {
        const label = procedureLabel(row.key)
        const unpublished = isUnpublishedProcedure(row.key)
        return (
          <li key={row.key} className={cn(ROW, 'py-2.5')}>
            <span className="min-w-0">
              <span className={cn('block text-sm leading-snug text-foreground', unpublished && 'font-semibold')}>{label ? i18n._(label) : row.key}</span>
              <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
                <span className={cn('block h-1', unpublished ? 'bg-foreground' : 'bg-primary/70')} style={{ width: `${Math.max((row.count / total) * 100, 0.8)}%` }} />
              </span>
            </span>
            <span className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-foreground">{contractsCount(row.count)}</span>
          </li>
        )
      })}
      {unlisted > 0 ? (
        <li className={cn(ROW, 'py-2.5 text-muted-foreground')}>
          <span className="text-sm">
            <Trans>Alte proceduri sau necunoscută</Trans>
          </span>
          <span className="whitespace-nowrap text-right text-sm tabular-nums">{contractsCount(unlisted)}</span>
        </li>
      ) : null}
    </ol>
  )
}
