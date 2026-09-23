import type { InsTerritoryLevel } from '@/schemas/ins'
import type { StatisticsTerritoryIdentity } from '@/schemas/statistics'

/**
 * Territory identity for the statistics surface.
 *
 * Territory facts (name, level, county) come ONLY from the live INS territory
 * record. When the live API cannot supply them, the UI receives an explicit
 * fallback identity instead of guessing a source fact — there is deliberately
 * no client-side SIRUTA→level table (a stale one mislabeled `179132` as a
 * county; it is a LAU).
 *
 * The page's rows link to `/ins/seturi/$cod` and `/ins/comparatii`; its rail
 * (`RelatedLinksRail`) links to `/map` and `/budget-explorer`.
 */

/** The municipality of Bucharest: a LAU that is its own county cell. */
export const BUCHAREST_MUNICIPALITY_SIRUTA = '179132'

/**
 * INS publishes names with the cedilla letters of the pre-2010 keyboard
 * (ş, ţ) where Romanian writes comma-below (ș, ț): „BUCUREŞTI". The page
 * spells them as Romanian does; the code stays the identity.
 */
export function normalizeRomanianDiacritics(text: string): string {
  return text.replace(/ş/g, 'ș').replace(/Ş/g, 'Ș').replace(/ţ/g, 'ț').replace(/Ţ/g, 'Ț')
}

/**
 * Resolves a territory identity for a SIRUTA code.
 *
 * - `liveName` / `liveLevel` / `liveCountyName` / `liveCountyCode` come from
 *   the live INS dashboard/territory record when available.
 * - When the name is missing, `enrichedFallback` flags that the UI should
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

  const name = hasLiveName ? normalizeRomanianDiacritics(params.liveName!.trim()) : null
  const countyName = params.liveCountyName?.trim()
    ? normalizeRomanianDiacritics(params.liveCountyName.trim())
    : null
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
