/**
 * A direct purchase page's query keys, in a module of their own: the route's
 * eager code (its `head`) reads the cache by them without pulling in the
 * page's reads.
 */
export const procurementDirectPurchaseKeys = {
  all: ['procurement', 'direct-purchase'] as const,
  purchase: (id: string) => [...procurementDirectPurchaseKeys.all, id] as const,
  context: (id: string) => [...procurementDirectPurchaseKeys.all, id, 'context'] as const,
}
