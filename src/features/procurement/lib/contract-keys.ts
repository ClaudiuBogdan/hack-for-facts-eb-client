/**
 * A contract page's query keys, in a module of their own: the route's eager
 * code (its `head`) reads the cache by them without pulling in the page's
 * reads.
 */
export const procurementContractKeys = {
  all: ['procurement', 'contract'] as const,
  contract: (id: string) => [...procurementContractKeys.all, id] as const,
  context: (id: string) => [...procurementContractKeys.all, id, 'context'] as const,
}
