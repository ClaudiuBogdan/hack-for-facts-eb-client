import { withDeadline } from '@/lib/ssr/deadline-signal'
import { createServerMemo } from '@/lib/ssr/server-memo'
import { contractContextInputOf, type ContractSheet, type CtContext } from '../lib/contract-model'
import { fetchContract, fetchContractContext } from './procurement-contract-api'

/**
 * A contract page's server reads, for the route loader only.
 *
 * The contract is three requests one after the other (~0.5 s against the
 * API), the context three side by side after it; SEAP loads daily at most, so
 * each is kept in the server process for as long as a shared cache may keep
 * the page. The memos are bounded — there are 1.5 million contract rows — and
 * each read has its own deadline, not the request's signal: it is shared
 * across requests. A read past its deadline fails as a read; the page reads
 * it again in the browser and the render goes out `no-store`.
 */

const SSR_DEADLINE_MS = 6_000
const KEEP_MS = 10 * 60 * 1000
const MAX_CONTRACTS = 1_000

// A partial read (the names, the notice or a context read failed) is served once and read again, never kept.
const contracts = createServerMemo<ContractSheet | null>(KEEP_MS, { maxEntries: MAX_CONTRACTS, keep: (sheet) => sheet === null || !sheet.partial })
const contexts = createServerMemo<CtContext>(KEEP_MS, { maxEntries: MAX_CONTRACTS, keep: (context) => !context.partial })

const deadline = () => withDeadline(undefined, SSR_DEADLINE_MS)

export interface ProcurementContractServerRead {
  readonly id: string
  /** `null`: SEAP has no such record. Absent: the read failed, and the browser reads it again. */
  readonly contract?: ContractSheet | null
  /** `null`: the contract has none to read (no CUI for a side, no date, before 2019). Absent: not read, or the read failed. */
  readonly context?: CtContext | null
}

/** The contract, then its context; a failed context is left out and the contract stands. */
export async function readProcurementContractForSsr(id: string): Promise<ProcurementContractServerRead> {
  let contract: ContractSheet | null
  try {
    contract = await contracts(id, () => fetchContract(id, deadline()))
  } catch {
    return { id }
  }
  if (!contract) return { id, contract }
  const input = contractContextInputOf(contract)
  if (!input) return { id, contract, context: null }
  const found = contract
  try {
    const context = await contexts(id, () => fetchContractContext(input, found, deadline()))
    return { id, contract, context }
  } catch {
    return { id, contract }
  }
}
