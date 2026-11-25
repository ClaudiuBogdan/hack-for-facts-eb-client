/**
 * Contract-award query keys, in a module of their own: a route's eager code
 * (its `head`) reads the cache by them without pulling in the reads.
 *
 * Under the `procurement` root on purpose: the direct purchases' disclosure
 * watch (`use-disclosure-watch.ts`) drops them on a new publication and holds
 * their reads while the publication cannot be read. A winner's naming follows
 * the direct-acquisition gate (`disclosed`, server `ca-records-schema.ts`)
 * and its answer's key is the same release's date, so a contract award fails
 * closed with it.
 */
export const procurementContractAwardKeys = {
  all: ['procurement', 'contract-award'] as const,
  award: (id: string) => [...procurementContractAwardKeys.all, id] as const,
  buyer: (cui: string, from: string, to: string, sort: string, page: number) => [...procurementContractAwardKeys.all, 'buyer', cui, from, to, sort, page] as const,
  buyerTotals: (cui: string, from: string, to: string) => [...procurementContractAwardKeys.all, 'buyer-totals', cui, from, to] as const,
}
