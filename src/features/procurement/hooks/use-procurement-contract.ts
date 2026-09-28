import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchContract, fetchContractContext } from '../api/procurement-contract-api'
import { contractContextInputOf, type ContractSheet, type CtContext } from '../lib/contract-model'
import { procurementContractKeys } from '../lib/contract-keys'

/**
 * A contract page's reads: the contract, and its context once the contract
 * names the two parties — each its own query, so a failed context leaves the
 * contract standing. The route loader reads both on the server and seeds
 * them here.
 */

/** SEAP loads daily at most; an hour keeps a return visit from reading again. */
const STALE_TIME = 60 * 60 * 1000
/** A partial read is read again by the next visit, not by every return to the tab. */
const PARTIAL_STALE_TIME = 60 * 1000

export { procurementContractKeys }

export function procurementContractQueryOptions(id: string, initialData?: ContractSheet | null) {
  return queryOptions({
    queryKey: procurementContractKeys.contract(id),
    queryFn: ({ signal }) => fetchContract(id, signal),
    staleTime: (query) => (query.state.data?.partial ? PARTIAL_STALE_TIME : STALE_TIME),
    ...(initialData !== undefined && (initialData === null || initialData.id === id) ? { initialData } : {}),
  })
}

export function procurementContractContextQueryOptions(sheet: ContractSheet, initialData?: CtContext) {
  const input = contractContextInputOf(sheet)
  return queryOptions({
    queryKey: procurementContractKeys.context(sheet.id),
    queryFn: ({ signal }) => (input ? fetchContractContext(input, sheet, signal) : Promise.resolve(null)),
    staleTime: (query) => (query.state.data?.partial ? PARTIAL_STALE_TIME : STALE_TIME),
    enabled: input !== null,
    ...(initialData ? { initialData } : {}),
  })
}

export function useProcurementContract(id: string, initialData?: ContractSheet | null) {
  return useQuery(procurementContractQueryOptions(id, initialData))
}

/** Called once the contract is read: the context needs its parties and day, and waits (disabled) without them. */
export function useProcurementContractContext(sheet: ContractSheet, initialData?: CtContext) {
  return useQuery(procurementContractContextQueryOptions(sheet, initialData))
}
