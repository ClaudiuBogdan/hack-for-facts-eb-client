import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import { validateLandingCountyUniverse } from '../../lib/native-landing'
import type { NativeLandingSource } from '../../lib/native-landing-types'
import { INS_TERRITORIES_QUERY } from './ins-queries'
import { insTerritoriesResponseRawSchema } from './statistics-raw-schemas'

/** A complete canonical spine, not a county list inferred from available facts. */
export async function fetchLandingCountyUniverse(signal?: AbortSignal) {
  const territories: NativeLandingSource['territories'][number][] = []
  const seen = new Set<string>()
  const expected = ROMANIA_COUNTIES.length
  const limit = 20
  while (territories.length < expected) {
    signal?.throwIfAborted()
    const offset = territories.length
    const response = await graphqlQuery<unknown>(
      INS_TERRITORIES_QUERY,
      { filter: { levels: ['NUTS3'] }, limit, offset },
      { auth: 'none', signal },
    )
    signal?.throwIfAborted()
    const {
      insTerritories: { nodes, pageInfo },
    } = insTerritoriesResponseRawSchema.parse(response)
    if (
      pageInfo.totalCount !== expected ||
      pageInfo.hasPreviousPage !== offset > 0 ||
      nodes.length === 0 ||
      nodes.length > limit ||
      nodes.length + offset > expected
    )
      throw new Error('Incomplete canonical county catalog page')
    for (const node of nodes) {
      if (node.level !== 'NUTS3' || seen.has(node.code))
        throw new Error('Invalid canonical county catalog identity')
      seen.add(node.code)
      territories.push({
        code: node.code,
        level: node.level,
        name: node.name_ro ?? null,
      })
    }
    if (!pageInfo.hasNextPage) return validateLandingCountyUniverse(territories)
  }
  // Every successful page made progress. At the full expected membership the
  // catalog must terminate; no partial prefix is returned when it does not.
  throw new Error('Canonical county catalog did not terminate')
}
