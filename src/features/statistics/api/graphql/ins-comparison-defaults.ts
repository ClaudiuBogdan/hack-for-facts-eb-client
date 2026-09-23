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
  INS_COMPARISON_DEFAULT_FIELDS,
  INS_DATASET_FIELDS,
  INS_DATASET_DIMENSION_FIELDS,
} from './ins-queries'
import {
  insDetailedDatasetRawSchema,
  insLatestValueNodeRawSchema,
} from './statistics-raw-schemas'
import { mapDatasetDetails, mapLatestValue } from './statistics-mappers'

/**
 * The one operation that reads the dataset once and one default per compared
 * territory. Values only enter variables. Each alias repeats the lean
 * default selection, never the exhaustive one: the server caps a document
 * at 500 fields, and six exhaustive aliases were refused outright.
 */
export function buildInsComparisonDefaultsQuery(
  code: string,
  entities: readonly InsEntitySelectorInput[],
): { readonly query: string; readonly variables: Record<string, unknown> } {
  const variables: Record<string, unknown> = { code, codes: [code] }
  const declarations = entities.map((entity, i) => {
    variables[`entity${i}`] = entity
    return `$entity${i}: InsEntitySelectorInput!`
  })
  const fields = entities.map(
    (_, i) => `d${i}: insLatestDatasetValues(
    entity: $entity${i}, datasetCodes: $codes, preferredClassificationCodes: ["TOTAL"]
  ) { ${INS_COMPARISON_DEFAULT_FIELDS} }`,
  )
  const query = `query InsComparisonDefaults($code: String!, $codes: [String!]!, ${declarations.join(', ')}) {
    dataset: insDataset(code: $code) { ${INS_DATASET_FIELDS} ${INS_DATASET_DIMENSION_FIELDS} }
    ${fields.join('\n')}
  }`
  return { query, variables }
}

/** All defaults and their descriptor share one native operation snapshot. */
export async function fetchInsComparisonDefaults(input: {
  readonly datasetCode: string
  readonly entities: readonly InsEntitySelectorInput[]
  readonly signal?: AbortSignal
}) {
  const code = normalizeInsDatasetCode(input.datasetCode)
  if (!code || input.entities.length < 1 || input.entities.length > 6)
    throw new RangeError('Invalid INS comparison default request')
  const { query, variables } = buildInsComparisonDefaultsQuery(code, input.entities)
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
