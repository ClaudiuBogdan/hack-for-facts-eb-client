import { z } from 'zod'
import { lazySchema, type LazyOutput } from '@/lib/route-contract'

/**
 * `/companies/$cui`'s URL contract: the profile's choices. Apart from
 * `private-company.ts` (which re-exports it) so that the route file, which every
 * page loads, carries only this; and lazy, so nothing is built until the route
 * is matched (docs/route-contracts.md).
 */

/**
 * What the business band's chart shows: `toate`, turnover, net result and
 * people together (the default); the others each alone, in detail.
 */
export const COMPANY_FINANCIAL_MEASURES = ['toate', 'cifra-de-afaceri', 'profit', 'salariati'] as const
export type CompanyFinancialMeasure = (typeof COMPANY_FINANCIAL_MEASURES)[number]

/** Which SEAP records say who pays and what for: contracts or direct purchases. */
export const COMPANY_PAYMENT_GRAINS = ['contracte', 'achizitii-directe'] as const
export type CompanyPaymentGrain = (typeof COMPANY_PAYMENT_GRAINS)[number]

/**
 * The profile's choices, each in the URL so a view can be shared. A value the
 * page does not know is dropped rather than failing the route, so an old link
 * (`?tab=financials`) still opens the page.
 *
 * - `masura`: the business chart's measure (unset: `toate`);
 * - `plati`: contracts or direct purchases (unset: whichever the company has,
 *   contracts first).
 */
export const privateCompanySearchSchema = lazySchema(() =>
  z
    .object({
      masura: z.enum(COMPANY_FINANCIAL_MEASURES).optional().catch(undefined),
      plati: z.enum(COMPANY_PAYMENT_GRAINS).optional().catch(undefined),
    })
    .catch({}),
)

export type PrivateCompanySearchState = LazyOutput<typeof privateCompanySearchSchema>

export function parsePrivateCompanySearch(
  search: Record<string, unknown>,
): PrivateCompanySearchState {
  return privateCompanySearchSchema.parse(search)
}
