import { z } from 'zod'
import { PROCUREMENT_BUYER_GRAINS, type ProcurementBuyerGrain } from './procurement-buyer'

/**
 * A firm's page's URL state (`/procurement/suppliers/$cui`): the year it
 * describes and the two band choices, so a page as shown is shareable — as the
 * buyer page's (`procurement-buyer.ts`), whose band choices it shares.
 * Defaults stay out of the URL; a value the page cannot use is dropped on its
 * own rather than failing the route. `year` keeps the name every link to the
 * page already passes.
 */

export type ProcurementSupplierGrain = ProcurementBuyerGrain

export interface ProcurementSupplierSearch {
  readonly year?: number
  /** „Ce vinde". */
  readonly ce?: ProcurementSupplierGrain
  /** „Cele mai mari". */
  readonly mari?: ProcurementSupplierGrain
}

const schema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional().catch(undefined),
  ce: z.enum(PROCUREMENT_BUYER_GRAINS).optional().catch(undefined),
  mari: z.enum(PROCUREMENT_BUYER_GRAINS).optional().catch(undefined),
})

export function parseProcurementSupplierSearch(raw: Record<string, unknown>): ProcurementSupplierSearch {
  const parsed = schema.parse(raw)
  return {
    ...(parsed.year !== undefined ? { year: parsed.year } : {}),
    ...(parsed.ce ? { ce: parsed.ce } : {}),
    ...(parsed.mari ? { mari: parsed.mari } : {}),
  }
}
