import type { LocalMandates } from '../lib/mandates'
import { deadline, settle } from '../../api/elections-catalog-ssr'
import { fetchLocalMandates } from './elections-analytics-api'

/**
 * The analysis page's server read, for its route loader only: the local
 * mandates under the elections pages' deadline. A read that fails or runs
 * past it is left out, and the page's own query reads it in the browser. A
 * county's council is read in the browser only: it is one county's figures,
 * under the national ones the server sends.
 */
export async function readLocalMandatesForSsr(signal: AbortSignal): Promise<LocalMandates | undefined> {
  return settle('local-mandates', () => fetchLocalMandates(deadline(signal)))
}
