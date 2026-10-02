/**
 * A procedure page's query keys, in a module of their own: the route's eager
 * code (its `head`) reads the cache by them without pulling in the page's
 * reads.
 */
export const procurementProcedureKeys = {
  all: ['procurement', 'procedure'] as const,
  procedure: (id: string) => [...procurementProcedureKeys.all, id] as const,
}
