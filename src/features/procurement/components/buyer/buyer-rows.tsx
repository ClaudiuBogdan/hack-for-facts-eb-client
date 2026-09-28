import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import { supplierName, type BuyerProfile, type SupplierRanking } from '../../lib/buyer-model'
import type { HomeGrain, Ranking } from '../../lib/home-model'
import { PartyRows } from '../home/home-rows'

/**
 * The buyer page's own list, in the front door's row rhythm; the counties and
 * the procedures are the profile rows a firm's page shares.
 */

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
