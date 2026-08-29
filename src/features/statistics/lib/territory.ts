import { t } from '@lingui/core/macro'
import type { InsTerritoryLevel } from '@/schemas/ins'
import type {
  StatisticsRelatedLink,
  StatisticsTerritoryIdentity,
} from '@/schemas/statistics'

/**
 * Territory identity + related-links helpers for the statistics surface.
 *
 * Territory facts (name, level, county) come ONLY from the live INS territory
 * record. When the live API cannot supply them, the UI receives an explicit
 * fallback identity instead of guessing a source fact — there is deliberately
 * no client-side SIRUTA→level table (a stale one mislabeled `179132` as a
 * county; it is a LAU).
 *
 * Related links point ONLY at existing platform routes
 * (`/budget-explorer`, `/primarie/$cui`, `/entities/$cui`, `/companies/$cui`,
 * `/map`). Deferred statistics routes (`/statistici/harti`,
 * `/statistici/comparatii`) are intentionally NOT linked.
 */

/**
 * Resolves a territory identity for a SIRUTA code.
 *
 * - `liveName` / `liveLevel` / `liveCountyName` / `liveCountyCode` come from
 *   the live INS dashboard/territory record when available.
 * - When name/level are missing, `enrichedFallback` flags that the UI should
 *   show a "date incomplete" caveat instead of inventing facts.
 */
export function resolveTerritoryIdentity(params: {
  readonly siruta: string
  readonly liveName?: string | null
  readonly liveLevel?: InsTerritoryLevel | string | null
  readonly liveCountyName?: string | null
  readonly liveCountyCode?: string | null
}): StatisticsTerritoryIdentity {
  const siruta = params.siruta.trim()
  const level = (params.liveLevel ?? null) as InsTerritoryLevel | null

  const hasLiveName =
    typeof params.liveName === 'string' && params.liveName.trim().length > 0

  const name = hasLiveName ? params.liveName!.trim() : null
  const countyName = params.liveCountyName?.trim() || null
  const countyCode = params.liveCountyCode?.trim() || null

  return {
    siruta,
    name,
    level,
    countyName,
    countyCode,
    enrichedFallback: !name,
  }
}

/**
 * Builds cross-domain related links for a territory, pointing only at
 * existing platform routes.
 *
 * - `/budget-explorer` (territory-scoped budget exploration entry).
 * - `/primarie/$cui` (local-government transparency; only when a UAT CUI is
 *   known — callers pass it via `uatCui`).
 * - `/entities/$cui` (entity detail; only when an entity CUI is known).
 * - `/companies/$cui` (company detail; only when a company CUI is known).
 * - `/map` (territory map entry, existing map surface).
 *
 * No links are emitted to deferred `/statistici/harti` or
 * `/statistici/comparatii` routes.
 */
export function buildTerritoryRelatedLinks(params: {
  readonly identity: StatisticsTerritoryIdentity
  readonly uatCui?: string | null
  readonly entityCui?: string | null
  readonly companyCui?: string | null
}): readonly StatisticsRelatedLink[] {
  const identity = params.identity
  const isUat = identity.level === 'LAU'
  const canScopeBudgetAndMap = isUat || Boolean(identity.countyCode)
  const joinBasis = isUat ? 'siruta' : 'county'
  const joinValue = isUat ? identity.siruta : (identity.countyCode ?? identity.siruta)
  const disabledReason = canScopeBudgetAndMap
    ? null
    : t`Legătura are nevoie de un cod de județ din sursa teritorială.`

  const links: StatisticsRelatedLink[] = [
    {
      label: t`Explorer bugetar`,
      to: '/budget-explorer',
      params: {},
      joinBasis,
      joinValue,
      enabled: canScopeBudgetAndMap,
      disabledReason,
    },
    {
      label: t`Hartă teritorială`,
      to: '/map',
      params: {},
      joinBasis,
      joinValue,
      enabled: canScopeBudgetAndMap,
      disabledReason,
    },
  ]

  const uatCui = params.uatCui?.trim()
  if (uatCui && uatCui.length > 0) {
    links.push({
      label: t`Primăria localității`,
      to: '/primarie/$cui',
      params: { cui: uatCui },
      joinBasis: 'cui',
      joinValue: uatCui,
      enabled: true,
      disabledReason: null,
    })
  }

  const entityCui = params.entityCui?.trim()
  if (entityCui && entityCui.length > 0) {
    links.push({
      label: t`Instituție publică`,
      to: '/entities/$cui',
      params: { cui: entityCui },
      joinBasis: 'cui',
      joinValue: entityCui,
      enabled: true,
      disabledReason: null,
    })
  }

  const companyCui = params.companyCui?.trim()
  if (companyCui && companyCui.length > 0) {
    links.push({
      label: t`Companie`,
      to: '/companies/$cui',
      params: { cui: companyCui },
      joinBasis: 'cui',
      joinValue: companyCui,
      enabled: true,
      disabledReason: null,
    })
  }

  return links
}
