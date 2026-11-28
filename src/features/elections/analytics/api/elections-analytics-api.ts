import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { countyCouncilResponseSchema, localMandatesResponseSchema } from '@/schemas/elections-results'
import { LOCAL_2024, countyCouncilOf, localMandatesOf, type LocalMandates, type PhasePair } from '../lib/mandates'

/**
 * The analysis page's reads. Each is one request, parsed and folded into
 * party lines before anything keeps it: the query cache, a server seed and
 * the page's HTML hold only the reduced figures. A request that fails throws;
 * it is never read as missing figures.
 *
 * The API has no filter by measure, so the mandates read carries every vote
 * row too (about 780 KB, 2026-11-28); the server read keeps the browser from
 * paying it on a first visit.
 */

const TALLY = 'measure allocationPhase value status issues competitor { kind actorKey label }'

const COUNTIES = (office: string) =>
  `electionResultScopes(occurrenceKey: $occurrenceKey, office: "${office}", scopeType: county, page: 1, pageSize: 100) { total hasMore items { place { countyCode } tallies { ${TALLY} } } }`

export const LOCAL_MANDATES_QUERY = /* GraphQL */ `
  query ElectionsLocalMandates($occurrenceKey: ID!) {
    mayor: electionResult(occurrenceKey: $occurrenceKey, office: "mayor", scopeKey: "national") { tallies { ${TALLY} } }
    council: electionResult(occurrenceKey: $occurrenceKey, office: "local_council", scopeKey: "national") { tallies { ${TALLY} } }
    county: electionResult(occurrenceKey: $occurrenceKey, office: "county_council", scopeKey: "national") { tallies { ${TALLY} } }
    mayorCounties: ${COUNTIES('mayor')}
    councilCounties: ${COUNTIES('local_council')}
  }
`

export const COUNTY_COUNCIL_QUERY = /* GraphQL */ `
  query ElectionsCountyCouncil($occurrenceKey: ID!, $scopeKey: ID!, $contestKey: ID!) {
    electionResult(occurrenceKey: $occurrenceKey, office: "county_council", scopeKey: $scopeKey, contestKey: $contestKey) { tallies { ${TALLY} } }
  }
`

export async function fetchLocalMandates(signal?: AbortSignal): Promise<LocalMandates> {
  const data = await graphqlQuery<unknown>(LOCAL_MANDATES_QUERY, { occurrenceKey: LOCAL_2024 }, { operationName: 'ElectionsLocalMandates', signal, auth: 'none' })
  return localMandatesOf(localMandatesResponseSchema.parse(data))
}

/** One county's council, read from its own contest: the county aggregate serves nothing for this office. */
export async function fetchCountyCouncil(county: string, signal?: AbortSignal): Promise<PhasePair> {
  const data = await graphqlQuery<unknown>(
    COUNTY_COUNCIL_QUERY,
    { occurrenceKey: LOCAL_2024, scopeKey: `county:${county}`, contestKey: `${LOCAL_2024}:county_council:county:${county}` },
    { operationName: 'ElectionsCountyCouncil', signal, auth: 'none' },
  )
  return countyCouncilOf(countyCouncilResponseSchema.parse(data))
}
