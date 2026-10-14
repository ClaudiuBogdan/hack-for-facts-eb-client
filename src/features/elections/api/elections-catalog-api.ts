import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  ELECTIONS_PAGE_SIZE,
  electionContestPageSchema,
  electionContestSchema,
  electionEditionPageSchema,
  electionEditionSchema,
  type ElectionContest,
  type ElectionContestPage,
  type ElectionContestsSearch,
  type ElectionEdition,
  type ElectionEditionPage,
  type ElectionsCatalogSearch,
} from '@/schemas/elections-catalog'

/**
 * The elections pages' reads (server `elections/shell/graphql/schema.ts`):
 * the catalog of source editions, one edition, its contests, one contest.
 * Each is one request, parsed before the page sees it. A record the API
 * does not have is `null`; a request that fails throws, and is never read
 * as an absent record or an empty list. Filters reach the API exactly as the
 * address holds them.
 */

const READINESS = 'readiness { identity sourceSelection }'

const EDITION_FIELDS = `
  electionKey eventKey reportedName reportedYear reportedFamily reportedRound reportedDate reportedAuthority
  ${READINESS}
`

const CONTEST_FIELDS = `
  contestKey electionKey reportedOffice chamber reportedRound scopeType sourceScopeKey scopeLabel
  constituencyCode constituencyName
  ${READINESS}
`

export const ELECTION_CATALOG_QUERY = /* GraphQL */ `
  query ElectionCatalog($filter: ElectionCatalogFilter, $page: Int, $pageSize: Int) {
    electionCatalog(filter: $filter, page: $page, pageSize: $pageSize) {
      items { ${EDITION_FIELDS} }
      page pageSize total hasMore
    }
  }
`

export const ELECTION_EDITION_QUERY = /* GraphQL */ `
  query ElectionEdition($electionKey: ID!) {
    electionEdition(electionKey: $electionKey) { ${EDITION_FIELDS} }
  }
`

export const ELECTION_CONTESTS_QUERY = /* GraphQL */ `
  query ElectionContests($electionKey: ID!, $filter: ElectionContestsFilter, $page: Int, $pageSize: Int) {
    electionContests(electionKey: $electionKey, filter: $filter, page: $page, pageSize: $pageSize) {
      items { ${CONTEST_FIELDS} }
      page pageSize total hasMore
    }
  }
`

export const ELECTION_CONTEST_QUERY = /* GraphQL */ `
  query ElectionContest($contestKey: ID!) {
    electionContest(contestKey: $contestKey) { ${CONTEST_FIELDS} }
  }
`

type InFilter<Value> = { readonly in: readonly Value[] }

/** The catalog's filter: each field only when the address sets it, one exact value. */
export function catalogFilterOf(search: ElectionsCatalogSearch): Record<string, InFilter<string | number>> {
  return {
    ...(search.an !== undefined ? { reportedYears: { in: [search.an] } } : {}),
    ...(search.tip !== undefined ? { reportedFamilies: { in: [search.tip] } } : {}),
  }
}

/** An edition's contest filter: each field only when the address sets it, one exact value. */
export function contestsFilterOf(search: ElectionContestsSearch): Record<string, InFilter<string>> {
  return {
    ...(search.functie !== undefined ? { reportedOffices: { in: [search.functie] } } : {}),
    ...(search.arie !== undefined ? { scopeTypes: { in: [search.arie] } } : {}),
    ...(search.tur !== undefined ? { reportedRounds: { in: [search.tur] } } : {}),
  }
}

const catalogResponseSchema = z.object({ electionCatalog: electionEditionPageSchema })
const editionResponseSchema = z.object({ electionEdition: electionEditionSchema.nullable() })
const contestsResponseSchema = z.object({ electionContests: electionContestPageSchema })
const contestResponseSchema = z.object({ electionContest: electionContestSchema.nullable() })

export async function fetchElectionCatalog(search: ElectionsCatalogSearch, signal?: AbortSignal): Promise<ElectionEditionPage> {
  const data = await graphqlQuery<unknown>(
    ELECTION_CATALOG_QUERY,
    { filter: catalogFilterOf(search), page: search.pagina ?? 1, pageSize: ELECTIONS_PAGE_SIZE },
    { operationName: 'ElectionCatalog', signal, auth: 'none' },
  )
  return catalogResponseSchema.parse(data).electionCatalog
}

/** `null`: the API has no public edition under this key. */
export async function fetchElectionEdition(electionKey: string, signal?: AbortSignal): Promise<ElectionEdition | null> {
  const data = await graphqlQuery<unknown>(ELECTION_EDITION_QUERY, { electionKey }, { operationName: 'ElectionEdition', signal, auth: 'none' })
  return editionResponseSchema.parse(data).electionEdition
}

/** An edition the API does not have answers NOT_FOUND here, as an error: the edition's own read says whether it exists. */
export async function fetchElectionContests(
  electionKey: string,
  search: ElectionContestsSearch,
  signal?: AbortSignal,
): Promise<ElectionContestPage> {
  const data = await graphqlQuery<unknown>(
    ELECTION_CONTESTS_QUERY,
    { electionKey, filter: contestsFilterOf(search), page: search.pagina ?? 1, pageSize: ELECTIONS_PAGE_SIZE },
    { operationName: 'ElectionContests', signal, auth: 'none' },
  )
  return contestsResponseSchema.parse(data).electionContests
}

/** `null`: the API has no public contest under this key. */
export async function fetchElectionContest(contestKey: string, signal?: AbortSignal): Promise<ElectionContest | null> {
  const data = await graphqlQuery<unknown>(ELECTION_CONTEST_QUERY, { contestKey }, { operationName: 'ElectionContest', signal, auth: 'none' })
  return contestResponseSchema.parse(data).electionContest
}
