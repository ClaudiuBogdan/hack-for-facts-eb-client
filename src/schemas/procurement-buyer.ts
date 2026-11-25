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

/** The contract awards' order (PROC-KB0Z step 1): newest first by default, oldest first, largest first. */
export const PROCUREMENT_BUYER_AWARD_ORDERS = ['noi', 'vechi', 'valoare'] as const

export type ProcurementBuyerAwardOrder = (typeof PROCUREMENT_BUYER_AWARD_ORDERS)[number]

/** The furthest page a list may reach: the API lists to row 10,000, twenty a page. */
export const PROCUREMENT_BUYER_AWARD_MAX_PAGE = 500

export interface ProcurementBuyerSearch {
  readonly year?: number
  /** „Ce cumpără". */
  readonly ce?: ProcurementBuyerGrain
  /** „Cele mai mari". */
  readonly mari?: ProcurementBuyerGrain
  /** „Contractele atribuite": their order, and the page shown. */
  readonly ordine?: ProcurementBuyerAwardOrder
  readonly pagina?: number
}

const schema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional().catch(undefined),
  ce: z.enum(PROCUREMENT_BUYER_GRAINS).optional().catch(undefined),
  mari: z.enum(PROCUREMENT_BUYER_GRAINS).optional().catch(undefined),
  ordine: z.enum(PROCUREMENT_BUYER_AWARD_ORDERS).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).max(PROCUREMENT_BUYER_AWARD_MAX_PAGE).optional().catch(undefined),
})

/**
 * Every key is returned, a dropped one as undefined: the router merges this
 * result over the search it was given, so a key left out would keep the
 * unusable value (`?pagina=501`, which the API refuses).
 */
export function parseProcurementBuyerSearch(raw: Record<string, unknown>): ProcurementBuyerSearch {
  const parsed = schema.parse(raw)
  return {
    year: parsed.year,
    ce: parsed.ce,
    mari: parsed.mari,
    // The defaults stay out of the URL: newest first, the first page.
    ordine: parsed.ordine && parsed.ordine !== 'noi' ? parsed.ordine : undefined,
    pagina: parsed.pagina !== undefined && parsed.pagina > 1 ? parsed.pagina : undefined,
  }
}
