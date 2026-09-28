/**
 * A firm's page's query keys, in a module of their own: the route's eager
 * code (its `head`) reads the cache by them without pulling in the page's
 * reads.
 */
export const procurementSupplierKeys = {
  all: ['procurement', 'supplier'] as const,
  /** Every year's profile of one firm: the route head names the firm from any of them. */
  profiles: (cui: string) => [...procurementSupplierKeys.all, 'profile', cui] as const,
  profile: (cui: string, year: number) => [...procurementSupplierKeys.profiles(cui), year] as const,
  direct: (cui: string, year: number, limit: number) => [...procurementSupplierKeys.all, 'direct', cui, year, limit] as const,
}
