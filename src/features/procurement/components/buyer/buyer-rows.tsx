import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { supplierName, type BuyerProfile, type SupplierRanking } from '../../lib/buyer-model'
import { countyName } from '../../lib/buyer-text'
import { contractsCount, percentText } from '../../lib/home-format'
import { buyerCountySearch } from '../../lib/home-links'
import { isUnpublishedProcedure, procedureLabel, type HomeGrain, type Ranking } from '../../lib/home-model'
import { PartyRows } from '../home/home-rows'

/**
 * The buyer page's lists, in the front door's row rhythm: the name on the
 * left with what it counts under it, the figure alone on the right. A row is
 * a link only when it opens exactly what it counts.
 */

const LIST = 'divide-y divide-border/70 border-y border-border/70'
const ROW = 'group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 px-1'
const EMPTY = 'border-y py-4 text-sm text-muted-foreground'

/** A supplier ranking with its names, in the front door's party rows; each opens the firm's page on the year. */
export function SupplierRows({
  profile,
  ranking,
  grain,
  className,
}: {
  readonly profile: BuyerProfile
  readonly ranking: SupplierRanking
  readonly grain: HomeGrain
  readonly className?: string
}) {
  if (ranking.rows.length === 0) {
    return (
      <p className={cn(EMPTY, className)}>
        {grain === 'direct' ? <Trans>Nicio achiziție directă în {profile.year}.</Trans> : <Trans>Niciun contract atribuit în {profile.year}.</Trans>}
      </p>
    )
  }
  const named: Ranking = {
    rankedBy: ranking.rankedBy,
    rows: ranking.rows.map((row) => ({ key: row.cui, label: supplierName(profile, row.cui), count: row.count, value: row.value, share: row.share })),
  }
  return <PartyRows className={className} ranking={named} grain={grain} kind="supplier" year={profile.year} limit={8} />
}

/**
 * Direct-purchase money by the supplier's county, the buyer's own county
 * marked; each row opens those purchases in the explorer. The counties past
 * the listed ones are one line.
 */
export function CountyRows({ profile, limit = 6, className }: { readonly profile: BuyerProfile; readonly limit?: number; readonly className?: string }) {
  const rows = profile.supplierCounties.slice(0, limit)
  if (rows.length === 0) {
    return (
      <p className={cn(EMPTY, className)}>
        <Trans>Nicio achiziție directă în {profile.year}.</Trans>
      </p>
    )
  }
  const top = Math.max(...rows.map((row) => row.value ?? 0), 1)
  const listed = rows.reduce((sum, row) => sum + (row.share ?? 0), 0)
  const rest = profile.supplierCounties.length > rows.length ? Math.max(0, 1 - listed) : 0
  return (
    <ol className={cn(LIST, className)}>
      {rows.map((row) => {
        const home = row.code === profile.county
        return (
          <li key={row.code}>
            <Link
              to="/procurement/search"
              search={buyerCountySearch(profile.identity.cui, row.code, profile.year)}
              className={cn(ROW, 'py-2.5 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40')}
            >
              <span className="min-w-0">
                <span className={cn('block truncate text-sm text-foreground', home && 'font-semibold')}>
                  {countyName(row.code)}
                  {home ? <MonoLabel className="ml-2 text-primary">{t`județul instituției`}</MonoLabel> : null}
                </span>
                <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
                  {row.value !== null ? (
                    <span className={cn('block h-1', home ? 'bg-primary' : 'bg-primary/50')} style={{ width: `${Math.max((row.value / top) * 100, 0.8)}%` }} />
                  ) : null}
                </span>
              </span>
              <span className="text-right text-sm font-semibold tabular-nums text-foreground">{row.share !== null ? percentText(row.share, 0) : '—'}</span>
            </Link>
          </li>
        )
      })}
      {rest >= 0.005 ? (
        <li className="px-1 py-2 text-xs text-muted-foreground">
          {/* The rest holds the other counties and the firms with no county on record. */}
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
export function ProcedureRows({ profile, className }: { readonly profile: BuyerProfile; readonly className?: string }) {
  const { i18n } = useLingui()
  const listed = profile.procedures.reduce((sum, row) => sum + row.count, 0)
  const total = listed + profile.proceduresUnlisted
  if (total === 0) {
    return (
      <p className={cn(EMPTY, className)}>
        <Trans>Niciun contract atribuit în {profile.year}.</Trans>
      </p>
    )
  }
  return (
    <ol className={cn(LIST, className)}>
      {profile.procedures.map((row) => {
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
      {profile.proceduresUnlisted > 0 ? (
        <li className={cn(ROW, 'py-2.5 text-muted-foreground')}>
          <span className="text-sm">
            <Trans>Alte proceduri sau necunoscută</Trans>
          </span>
          <span className="whitespace-nowrap text-right text-sm tabular-nums">{contractsCount(profile.proceduresUnlisted)}</span>
        </li>
      ) : null}
    </ol>
  )
}
