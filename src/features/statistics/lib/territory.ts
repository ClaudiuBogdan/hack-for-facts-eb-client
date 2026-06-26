import { t } from '@lingui/core/macro'
import type { InsTerritoryLevel } from '@/schemas/ins'
import type {
  StatisticsRelatedLink,
  StatisticsTerritoryIdentity,
} from '@/schemas/statistics'

/**
 * Territory identity + related-links helpers for the statistics surface.
 *
 * Territory level is inferred from the live INS dashboard territory when
 * available. When the live API cannot supply name/level, the UI receives an
 * explicit fallback identity instead of guessing a source fact.
 *
 * Related links point ONLY at existing platform routes
 * (`/budget-explorer`, `/primarie/$cui`, `/entities/$cui`, `/companies/$cui`,
 * `/map`). Deferred statistics routes (`/statistici/harti`,
 * `/statistici/comparatii`) are intentionally NOT linked.
 */

/**
 * Known county (NUTS3) SIRUTA codes. A SIRUTA that exactly matches one of
 * these is treated as county-level. This is a small, stable subset used
 * only as a fallback hint when the live territory level is missing; the
 * authoritative level always comes from the INS territory record.
 */
const KNOWN_COUNTY_SIRUTA_CODES: ReadonlySet<string> = new Set([
  '179132', // Municipiul București
])

const KNOWN_COUNTY_CODE_BY_SIRUTA: ReadonlyMap<string, string> = new Map([
  ['179132', 'B'], // Municipiul București
])

/**
 * Infers a fallback territory level from a SIRUTA code when the live
 * territory record is missing its `level`. Returns `null` when no confident
 * inference is possible — callers must then surface an explicit fallback
 * identity rather than guess.
 */
export function inferFallbackTerritoryLevel(
  siruta: string,
): InsTerritoryLevel | null {
  const normalized = siruta.trim()
  if (normalized.length === 0) return null

  if (KNOWN_COUNTY_SIRUTA_CODES.has(normalized)) {
    return 'NUTS3'
  }

  return null
}

export function inferFallbackCountyCode(siruta: string): string | null {
  return KNOWN_COUNTY_CODE_BY_SIRUTA.get(siruta.trim()) ?? null
}

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
  const liveLevel = (params.liveLevel ?? null) as InsTerritoryLevel | null

  const hasLiveName =
    typeof params.liveName === 'string' && params.liveName.trim().length > 0

  const name = hasLiveName ? params.liveName!.trim() : null
  const countyName = params.liveCountyName?.trim() || null
  const countyCode = params.liveCountyCode?.trim() || null
  let level = liveLevel
  let enrichedFallback = !name

  if (!level) {
    const inferred = inferFallbackTerritoryLevel(siruta)
    if (inferred) {
      level = inferred
      enrichedFallback = true
    }
  }

  return {
    siruta,
    name,
    level,
    countyName,
    countyCode,
    enrichedFallback,
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
