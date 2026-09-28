import type { PeriodChoice } from './profile-period'

/**
 * A buyer page's query keys, in a module of their own: the route's eager
 * code (its `head`) reads the cache by them without pulling in the page's
 * reads.
 */
export const procurementBuyerKeys = {
  all: ['procurement', 'buyer'] as const,
  /** Every period's profile of one buyer: the route head names the buyer from any of them. */
  profiles: (cui: string) => [...procurementBuyerKeys.all, 'profile', cui] as const,
  profile: (cui: string, choice: PeriodChoice) => [...procurementBuyerKeys.profiles(cui), choice] as const,
  records: (cui: string, choice: PeriodChoice, limit: number) => [...procurementBuyerKeys.all, 'records', cui, choice, limit] as const,
}
