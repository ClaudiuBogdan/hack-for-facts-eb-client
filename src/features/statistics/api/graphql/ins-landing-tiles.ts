import { validateLandingLatest } from './landing-latest-validation'
import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { insLatestValueNodeRawSchema } from './statistics-raw-schemas'
import { mapLatestValue } from './statistics-mappers'
import { INS_LATEST_VALUE_FIELDS } from './ins-queries'
import { LANDING_NATIONAL_DATASET_CODES } from '../../lib/landing-constants'

const query = `query InsLandingTiles($codes: [String!]!) {
  latest: insLatestDatasetValues(entity: { territoryCode: "RO", territoryLevel: NATIONAL },
    datasetCodes: $codes, preferredClassificationCodes: ["TOTAL"]) { ${INS_LATEST_VALUE_FIELDS} }
}`

export async function fetchNativeLandingTiles(signal?: AbortSignal) {
  signal?.throwIfAborted()
  const response = await graphqlQuery<unknown>(
    query,
    { codes: LANDING_NATIONAL_DATASET_CODES },
    { auth: 'none', signal },
  )
  signal?.throwIfAborted()
  const { latest } = z
    .object({ latest: z.array(insLatestValueNodeRawSchema) })
    .parse(response)
  validateLandingLatest(latest, LANDING_NATIONAL_DATASET_CODES, {
    code: 'RO',
    level: 'NATIONAL',
  })
  return {
    nativeContract: 'native-v2' as const,
    nationalValues: latest.map(mapLatestValue),
  }
}
