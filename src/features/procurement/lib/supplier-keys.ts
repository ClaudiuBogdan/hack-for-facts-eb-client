import type { PeriodChoice } from './profile-period'

/**
 * A firm's page's query keys, in a module of their own: the route's eager
 * code (its `head`) reads the cache by them without pulling in the page's
 * reads.
 */
export const procurementSupplierKeys = {
  all: ['procurement', 'supplier'] as const,
  /** Every period's profile of one firm: the route head names the firm from any of them. */
  profiles: (cui: string) => [...procurementSupplierKeys.all, 'profile', cui] as const,
  profile: (cui: string, choice: PeriodChoice) => [...procurementSupplierKeys.profiles(cui), choice] as const,
  direct: (cui: string, choice: PeriodChoice, limit: number) => [...procurementSupplierKeys.all, 'direct', cui, choice, limit] as const,
}
