import { ComparisonDatasetError } from '../../lib/comparison-dataset-error'
import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  insSourceDescriptorSchema,
  normalizeInsDatasetCode,
} from '@/lib/ins/source-contract'
import type { InsEntitySelectorInput } from '@/schemas/ins'
import { comparisonPublicationKey } from '../../lib/native-comparison'
import {
  INS_DATASET_FIELDS,
  INS_DATASET_DIMENSION_FIELDS,
  INS_LATEST_VALUE_FIELDS,
} from './ins-queries'
import {
  insDetailedDatasetRawSchema,
  insLatestValueNodeRawSchema,
} from './statistics-raw-schemas'
import { mapDatasetDetails, mapLatestValue } from './statistics-mappers'

/** All defaults and their descriptor share one native operation snapshot. Values only enter variables. */
export async function fetchInsComparisonDefaults(input: {
  readonly datasetCode: string
  readonly entities: readonly InsEntitySelectorInput[]
  readonly signal?: AbortSignal
}) {
  const code = normalizeInsDatasetCode(input.datasetCode)
  if (!code || input.entities.length < 1 || input.entities.length > 6)
    throw new RangeError('Invalid INS comparison default request')
  const variables: Record<string, unknown> = { code, codes: [code] }
  const declarations = input.entities.map((entity, i) => {
    variables[`entity${i}`] = entity
    return `$entity${i}: InsEntitySelectorInput!`
  })
  const fields = input.entities.map(
    (_, i) => `d${i}: insLatestDatasetValues(
    entity: $entity${i}, datasetCodes: $codes, preferredClassificationCodes: ["TOTAL"]
  ) { ${INS_LATEST_VALUE_FIELDS} }`,
  )
  const query = `query InsComparisonDefaults($code: String!, $codes: [String!]!, ${declarations.join(', ')}) {
    dataset: insDataset(code: $code) { ${INS_DATASET_FIELDS} ${INS_DATASET_DIMENSION_FIELDS} }
    ${fields.join('\n')}
  }`
  input.signal?.throwIfAborted()
  const response = await graphqlQuery<unknown>(query, variables, {
    auth: 'none',
    signal: input.signal,
  })
  input.signal?.throwIfAborted()
  const record = z.record(z.string(), z.unknown()).parse(response)
  if (record.dataset === null) throw new ComparisonDatasetError('UNKNOWN')
  const raw = insDetailedDatasetRawSchema.parse(record.dataset)
  if (raw.data_status === 'CATALOG_ONLY')
    throw new ComparisonDatasetError('CATALOG_ONLY')
  const descriptor = insSourceDescriptorSchema.parse(raw)
  if (descriptor.code !== code)
    throw new Error('INS comparison dataset identity mismatch')
  const latest = input.entities.map((_, i) => {
    const entries = z
      .array(insLatestValueNodeRawSchema)
      .length(1)
      .parse(record[`d${i}`])
    const outcome = entries[0]
    const current = insSourceDescriptorSchema.parse(outcome.dataset)
    if (
      comparisonPublicationKey(current) !== comparisonPublicationKey(descriptor)
    )
      throw new Error('INS comparison defaults publication mismatch')
    return mapLatestValue(outcome)
  })
  return { dataset: mapDatasetDetails(raw), descriptor, latest }
}
