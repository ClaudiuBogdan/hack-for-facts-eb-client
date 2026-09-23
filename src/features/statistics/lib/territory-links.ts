import { t } from '@lingui/core/macro'
import type { StatisticsTerritoryIdentity } from '@/schemas/statistics'

/** One way out of the territory page into another domain of the platform. */
export interface TerritoryRelatedLink {
  readonly to: '/budget-explorer' | '/map'
  readonly label: string
  /** How the destination is scoped: the locality by SIRUTA, or its county. */
  readonly joinBasis: 'siruta' | 'county'
  readonly joinValue: string
  readonly enabled: boolean
  readonly disabledReason: string | null
}

/**
 * Cross-domain links for a territory, pointing at existing platform routes
 * — `/budget-explorer` and `/map`, scoped to the locality (LAU) or, for a
 * county-level page, to the county. Built at render, so the labels follow
 * the reader's language rather than the language the hub was fetched in.
 */
export function territoryRelatedLinks(identity: StatisticsTerritoryIdentity): readonly TerritoryRelatedLink[] {
  const isUat = identity.level === 'LAU'
  const enabled = isUat || Boolean(identity.countyCode)
  const joinBasis = isUat ? 'siruta' : 'county'
  const joinValue = isUat ? identity.siruta : (identity.countyCode ?? identity.siruta)
  const disabledReason = enabled ? null : t`Legătura are nevoie de un cod de județ din sursa teritorială.`
  return [
    { to: '/budget-explorer', label: t`Explorer bugetar`, joinBasis, joinValue, enabled, disabledReason },
    { to: '/map', label: t`Hartă teritorială`, joinBasis, joinValue, enabled, disabledReason },
  ]
}
