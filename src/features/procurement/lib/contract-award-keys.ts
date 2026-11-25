/**
 * Contract-award query keys, in a module of their own: a route's eager code
 * (its `head`) reads the cache by them without pulling in the reads.
 */
export const procurementContractAwardKeys = {
  all: ['procurement', 'contract-award'] as const,
  award: (id: string) => [...procurementContractAwardKeys.all, id] as const,
  buyer: (cui: string, from: string, to: string, sort: string, page: number) => [...procurementContractAwardKeys.all, 'buyer', cui, from, to, sort, page] as const,
}
