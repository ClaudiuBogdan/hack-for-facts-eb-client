import { z } from 'zod'
import { lazySchema, type LazyOutput } from '@/lib/route-contract'

/**
 * The `/justice` routes' URL contract: the front door's and the court page's
 * search params. Apart from `judicial.ts` (the API's shapes, which re-exports
 * this) so that the route files, which every page loads, carry only this; and
 * lazy, so nothing here is built until a `/justice` route is matched. See
 * `docs/route-contracts.md`.
 */

/** The court page's search: the year it describes (unset: the default year). Any calendar year parses; the route keeps only a year the capture holds a case in. */
export const justiceCourtSearchSchema = lazySchema(() =>
  z
    .object({
      an: z.coerce.number().int().min(1000).max(2100).optional().catch(undefined),
    })
    .catch({}),
)
export type JusticeCourtSearch = LazyOutput<typeof justiceCourtSearchSchema>

export function parseJusticeCourtSearch(search: Record<string, unknown>): JusticeCourtSearch {
  return justiceCourtSearchSchema.parse(search)
}

/** The front door's choices: the hero's level, the matters' courts and the courts band's level (unset: their defaults). */
export const JUSTICE_HUB_DEFAULTS = { instante: 'judecatorie', materii: 'toate', nivel: 'tribunal' } as const

const MAIN_LEVELS = ['judecatorie', 'tribunal', 'curte_de_apel'] as const

export const justiceHubSearchSchema = lazySchema(() =>
  z
    .object({
      instante: z.enum(MAIN_LEVELS).optional().catch(undefined),
      materii: z.enum(['toate', 'judecatorie', 'tribunal', 'curte_de_apel']).optional().catch(undefined),
      nivel: z.enum(MAIN_LEVELS).optional().catch(undefined),
    })
    .catch({}),
)
export type JusticeHubSearch = LazyOutput<typeof justiceHubSearchSchema>

export function parseJusticeHubSearch(search: Record<string, unknown>): JusticeHubSearch {
  return justiceHubSearchSchema.parse(search)
}
