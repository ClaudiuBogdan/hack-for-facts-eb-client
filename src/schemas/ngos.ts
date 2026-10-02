import { z } from 'zod'

/**
 * The NGO pages' route search: safe parsers that never throw on garbage
 * params — an unknown or retired value falls back to the default instead of
 * failing the page. The data's own shapes live with the features that read
 * them (`src/features/ngos/{hub,registry,organization}`).
 */

// --- /ngos (landing) ----------------------------------------------------

/** What the county map colours: registered NGOs per 10,000 residents, how many are registered, or the year's new ones per 100,000. */
export const NGO_HUB_LAYERS = ['densitate', 'total', 'noi'] as const
export type NgoHubLayerKey = (typeof NGO_HUB_LAYERS)[number]

/** What ranks the domains: how many organisations, or how much revenue. */
export const NGO_HUB_DOMAIN_METRICS = ['organizatii', 'venituri'] as const
export type NgoHubDomainMetric = (typeof NGO_HUB_DOMAIN_METRICS)[number]

/** An unknown or retired value falls back to the default instead of failing the page. */
export const ngoLandingSearchSchema = z
  .object({
    indicator: z.enum(NGO_HUB_LAYERS).optional().catch(undefined),
    domenii: z.enum(NGO_HUB_DOMAIN_METRICS).optional().catch(undefined),
  })
  .catch(() => ({}))

export type NgoLandingSearch = {
  readonly indicator?: NgoHubLayerKey
  readonly domenii?: NgoHubDomainMetric
}

export function parseNgoLandingSearch(
  search: Record<string, unknown>,
): NgoLandingSearch {
  return ngoLandingSearchSchema.parse(search) as NgoLandingSearch
}

// --- /ngos/$cui and /ngos/registry/$number (profile) ------------------

export const ngoProfileSearchSchema = z
  .object({
    lang: z.string().optional().catch(undefined),
    /** The statement read row by row; the latest when absent. */
    an: z.coerce.number().int().min(1990).max(2100).optional().catch(undefined),
  })
  .catch(() => ({}))

export type NgoProfileSearch = {
  readonly lang?: string
  readonly an?: number
}

export function parseNgoProfileSearch(
  search: Record<string, unknown>,
): NgoProfileSearch {
  return ngoProfileSearchSchema.parse(search) as NgoProfileSearch
}
