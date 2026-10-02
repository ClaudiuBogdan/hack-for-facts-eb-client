import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchProcedure } from '../api/procurement-procedure-api'
import type { ProcedureSheet } from '../lib/procedure-model'
import { procurementProcedureKeys } from '../lib/procedure-keys'

/** SEAP loads daily at most; an hour keeps a return visit from reading again. */
const STALE_TIME = 60 * 60 * 1000
/** A partial read is read again by the next visit, not by every return to the tab. */
const PARTIAL_STALE_TIME = 60 * 1000

export function procurementProcedureQueryOptions(id: string, initialData?: ProcedureSheet | null) {
  return queryOptions({
    queryKey: procurementProcedureKeys.procedure(id),
    queryFn: ({ signal }) => fetchProcedure(id, signal),
    staleTime: (query) => (query.state.data?.partial ? PARTIAL_STALE_TIME : STALE_TIME),
    ...(initialData !== undefined && (initialData === null || initialData.id === id) ? { initialData } : {}),
  })
}

/** The procedure page's read; the route loader reads it on the server and seeds it here. */
export function useProcurementProcedure(id: string, initialData?: ProcedureSheet | null) {
  return useQuery(procurementProcedureQueryOptions(id, initialData))
}
