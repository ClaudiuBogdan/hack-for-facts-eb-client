import { GraphQLRequestError, isAbortError, isGraphQLTimeout } from '@/lib/graphql/graphql-client'
import { createLogger } from '@/lib/logger'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import type {
  ElectionContest,
  ElectionContestPage,
  ElectionContestsSearch,
  ElectionEdition,
  ElectionEditionPage,
  ElectionsCatalogSearch,
} from '@/schemas/elections-catalog'
import { fetchElectionCatalog, fetchElectionContest, fetchElectionContests, fetchElectionEdition } from './elections-catalog-api'

/**
 * The elections pages' server reads, for the route loaders only.
 *
 * TanStack Start sends no HTML until every loader resolves, so each read runs
 * under a deadline of its own. A read that fails or runs past it is left out:
 * the page's own query reads it again in the browser and shows its retry, and
 * the render goes out uncached like every elections render. A superseded
 * request's abort travels on to the router. Nothing is kept between requests.
 */

const SSR_DEADLINE_MS = 5_000

const logger = createLogger('elections-catalog-ssr')

const isNotFound = (error: unknown) =>
  error instanceof GraphQLRequestError && error.graphQLErrors.some((entry) => entry.extensions?.code === 'NOT_FOUND')

/** The read's result, or `undefined` when it failed: a failure is never an absent record or an empty list. */
async function settle<T>(what: string, read: () => Promise<T>): Promise<T | undefined> {
  try {
    return await read()
  } catch (error) {
    if (isAbortError(error)) throw error
    // A read past its deadline was logged by the GraphQL client already; a missing edition's list is no fault.
    if (!isGraphQLTimeout(error) && !isNotFound(error)) logger.error('Elections server read failed', { what, error })
    return undefined
  }
}

const deadline = (signal: AbortSignal) => withDeadline(signal, SSR_DEADLINE_MS) ?? signal

export async function readElectionCatalogForSsr(search: ElectionsCatalogSearch, signal: AbortSignal): Promise<ElectionEditionPage | undefined> {
  return settle('catalog', () => fetchElectionCatalog(search, deadline(signal)))
}

export interface ElectionEditionServerRead {
  /** `null`: the API has no such edition. Absent: the read failed. */
  readonly edition?: ElectionEdition | null
  /** Absent: the read failed (or the edition does not exist); the edition stands without it. */
  readonly contests?: ElectionContestPage
}

/** The edition and its first contests side by side: a failed contest list never takes the edition with it. */
export async function readElectionEditionForSsr(
  electionKey: string,
  search: ElectionContestsSearch,
  signal: AbortSignal,
): Promise<ElectionEditionServerRead> {
  const [edition, contests] = await Promise.all([
    settle('edition', () => fetchElectionEdition(electionKey, deadline(signal))),
    settle('contests', () => fetchElectionContests(electionKey, search, deadline(signal))),
  ])
  return {
    ...(edition !== undefined ? { edition } : {}),
    // An absent edition's list is a NOT_FOUND, which the edition's own `null` already says.
    ...(contests !== undefined && edition !== null ? { contests } : {}),
  }
}

/** `null`: the API has no such contest. `undefined`: the read failed. */
export async function readElectionContestForSsr(contestKey: string, signal: AbortSignal): Promise<ElectionContest | null | undefined> {
  return settle('contest', () => fetchElectionContest(contestKey, deadline(signal)))
}
