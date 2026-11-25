import { withDeadline } from '@/lib/ssr/deadline-signal'
import type { ProcurementContractAwardInitialData } from '../components/contract-award/procurement-contract-award-page'
import { CaRecordsOffError, fetchContractAward } from './procurement-contract-award-api'

/**
 * One contract award's server read, for the route loader only. Nothing is
 * kept in the server process, and the render goes out no-store: the API
 * marks every contract-award answer no-store, as a winner's code or name can
 * be withdrawn without its date moving. A read past its deadline fails as a
 * read; the browser reads it again.
 */

const SSR_DEADLINE_MS = 6_000

export async function readContractAwardForSsr(id: string): Promise<ProcurementContractAwardInitialData> {
  try {
    return { id, read: await fetchContractAward(id, withDeadline(undefined, SSR_DEADLINE_MS)) }
  } catch (error) {
    if (error instanceof CaRecordsOffError) return { id, off: true }
    return { id }
  }
}
