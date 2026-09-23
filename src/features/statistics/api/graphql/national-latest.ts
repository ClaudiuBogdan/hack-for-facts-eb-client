import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { createLogger } from '@/lib/logger'
import { throwIfCancelled } from '@/lib/ssr/deadline-signal'
import { INS_LATEST_VALUE_FIELDS } from './ins-queries'
import { validateNationalLatest } from './national-latest-validation'
import { mapLatestValue } from './statistics-mappers'
import { insLatestValueNodeRawSchema } from './statistics-raw-schemas'

const logger = createLogger('ins-national-latest')

/** A retired matrix is missing from every answer; the alert is worth raising once per process. */
const reported = new Set<string>()

const query = `query InsNationalLatest($codes: [String!]!) {
  latest: insLatestDatasetValues(entity: { territoryCode: "RO", territoryLevel: NATIONAL },
    datasetCodes: $codes, preferredClassificationCodes: ["TOTAL"]) { ${INS_LATEST_VALUE_FIELDS} }
}`

/**
 * The latest national cell of each matrix, in one read. A code the API
 * leaves out is named in `missingCodes` and logged; the figures that came
 * back are served.
 */
export async function fetchNationalLatest(codes: readonly string[], signal?: AbortSignal) {
  throwIfCancelled(signal)
  const response = await graphqlQuery<unknown>(
    query,
    { codes },
    { auth: 'none', signal },
  )
  throwIfCancelled(signal)
  const { latest } = z
    .object({ latest: z.array(insLatestValueNodeRawSchema) })
    .parse(response)
  const { outcomes, missing } = validateNationalLatest(latest, codes, {
    code: 'RO',
    level: 'NATIONAL',
  })
  if (missing.length > 0) {
    const unseen = missing.filter((code) => !reported.has(code))
    for (const code of unseen) reported.add(code)
    if (unseen.length > 0) logger.warn('National latest cells missing from the answer', { missing: unseen })
    else logger.info('National latest cells still missing from the answer', { missing })
  }
  return {
    nativeContract: 'native-v2' as const,
    nationalValues: outcomes.map(mapLatestValue),
    missingCodes: missing,
  }
}
