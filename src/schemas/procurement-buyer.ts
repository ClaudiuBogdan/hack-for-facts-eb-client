import { z } from 'zod'

/**
 * A buyer page's URL state (`/procurement/institutions/$cui`): the year it
 * describes and the two band choices, so a page as shown is shareable.
 * Defaults stay out of the URL; a value the page cannot use is dropped on its
 * own rather than failing the route. `year` keeps the name every link to the
 * page already passes.
 */

/**
 * Which population a band counts. Each band's default follows the buyer's
 * year — direct purchases for „Ce cumpără" unless there were none, contracts
 * for „Cele mai mari" when there were any — so the page keeps a choice only
 * when it differs from that default.
 */
export const PROCUREMENT_BUYER_GRAINS = ['directe', 'contracte'] as const

export type ProcurementBuyerGrain = (typeof PROCUREMENT_BUYER_GRAINS)[number]

export interface ProcurementBuyerSearch {
  readonly year?: number
  /** „Ce cumpără". */
  readonly ce?: ProcurementBuyerGrain
  /** „Cele mai mari". */
  readonly mari?: ProcurementBuyerGrain
}

const schema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional().catch(undefined),
  ce: z.enum(PROCUREMENT_BUYER_GRAINS).optional().catch(undefined),
  mari: z.enum(PROCUREMENT_BUYER_GRAINS).optional().catch(undefined),
})

export function parseProcurementBuyerSearch(raw: Record<string, unknown>): ProcurementBuyerSearch {
  const parsed = schema.parse(raw)
  return {
    ...(parsed.year !== undefined ? { year: parsed.year } : {}),
    ...(parsed.ce ? { ce: parsed.ce } : {}),
    ...(parsed.mari ? { mari: parsed.mari } : {}),
  }
}
