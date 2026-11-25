import { z } from 'zod'
import { PROCUREMENT_BUYER_AWARD_MAX_PAGE, PROCUREMENT_BUYER_AWARD_ORDERS, type ProcurementBuyerAwardOrder } from './procurement-buyer'

/**
 * A winner's contract-award list URL state (`/procurement/contract-awards/winners/$cui`):
 * the year shown (none: every year published), the order and the page. The
 * defaults stay out of the URL; a value the page cannot use is dropped on its
 * own rather than failing the route. `year` keeps the name links to the other
 * procurement pages pass.
 */
export interface ProcurementContractAwardWinnerSearch {
  readonly year?: number
  readonly ordine?: ProcurementBuyerAwardOrder
  readonly pagina?: number
}

/** The first year contract awards are published (the API's floor). */
export const PROCUREMENT_CONTRACT_AWARD_FIRST_YEAR = 2021

const schema = z.object({
  year: z.coerce.number().int().min(PROCUREMENT_CONTRACT_AWARD_FIRST_YEAR).max(2100).optional().catch(undefined),
  ordine: z.enum(PROCUREMENT_BUYER_AWARD_ORDERS).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).max(PROCUREMENT_BUYER_AWARD_MAX_PAGE).optional().catch(undefined),
})

/**
 * Every key is returned, a dropped one as undefined: the router merges this
 * result over the search it was given, so a key left out would keep the
 * unusable value (`?pagina=501`, which the API refuses).
 */
export function parseProcurementContractAwardWinnerSearch(raw: Record<string, unknown>): ProcurementContractAwardWinnerSearch {
  const parsed = schema.parse(raw)
  return {
    year: parsed.year,
    ordine: parsed.ordine && parsed.ordine !== 'noi' ? parsed.ordine : undefined,
    pagina: parsed.pagina !== undefined && parsed.pagina > 1 ? parsed.pagina : undefined,
  }
}
