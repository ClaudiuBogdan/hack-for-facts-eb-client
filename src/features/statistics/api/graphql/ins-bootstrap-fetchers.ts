import { InsSourcePageError } from '@/lib/ins/source-pages'
import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  insSourceDescriptorSchema,
  insSourceLayoutSchema,
  insSourceMemberCodeSchema,
  normalizeInsDatasetCode,
} from '@/lib/ins/source-contract'
import type {
  InsDatasetDetails,
  InsDimensionValueConnection,
} from '@/schemas/ins'
import { comparisonPublicationKey } from '../../lib/native-comparison'
import { mapDatasetDetails } from './statistics-mappers'
import {
  insDetailedDatasetRawSchema,
  insDimensionTypeRawSchema,
  insPeriodicityRawSchema,
  insTerritoryLevelRawSchema,
} from './statistics-raw-schemas'
import {
  INS_DATASET_DETAILS_QUERY,
  INS_DATASET_DIMENSION_VALUES_QUERY,
} from './ins-queries'

const sourceInteger = z
  .number()
  .int()
  .refine((value) => insSourceMemberCodeSchema.safeParse(String(value)).success)
const datasetSchema = insDetailedDatasetRawSchema.superRefine(
  (dataset, context) => {
    const schema =
      dataset.data_status === 'AVAILABLE'
        ? insSourceDescriptorSchema
        : insSourceLayoutSchema
    if (
      !['AVAILABLE', 'CATALOG_ONLY'].includes(dataset.data_status ?? '') ||
      !schema.safeParse(dataset).success
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Invalid native INS dataset descriptor',
      })
    }
  },
)
const dimensionValueSchema = z.object({
  nom_item_id: sourceInteger,
  dimension_type: insDimensionTypeRawSchema,
  label_ro: z.string().nullish(),
  label_en: z.string().nullish(),
  parent_nom_item_id: sourceInteger.nullish(),
  offset_order: z.number().int().nullish(),
  territory: z
    .object({
      code: z.string().nullish(),
      siruta_code: z.string().nullish(),
      level: insTerritoryLevelRawSchema.nullish(),
      name_ro: z.string().nullish(),
    })
    .nullish(),
  time_period: z
    .object({
      iso_period: z.string(),
      year: z.number().int(),
      quarter: z.number().int().nullish(),
      month: z.number().int().nullish(),
      periodicity: insPeriodicityRawSchema,
    })
    .nullish(),
  classification_value: z
    .object({
      id: z.string().nullish(),
      type_code: z.string(),
      code: insSourceMemberCodeSchema,
      name_ro: z.string().nullish(),
    })
    .nullish(),
  unit: z
    .object({
      code: insSourceMemberCodeSchema,
      symbol: z.string().nullish(),
      name_ro: z.string().nullish(),
    })
    .nullish(),
})
const dimensionPageSchema = z.object({
  descriptor: datasetSchema,
  insDatasetDimensionValues: z.object({
    nodes: z.array(dimensionValueSchema),
    pageInfo: z.object({
      totalCount: z.number().int().min(-1),
      hasNextPage: z.boolean(),
      hasPreviousPage: z.boolean(),
    }),
  }),
})

/** Catalog metadata remains readable before publication; available data must be certified. */
export async function getInsDatasetDetails(
  code: string,
  signal?: AbortSignal,
): Promise<InsDatasetDetails | null> {
  code = normalizeInsDatasetCode(code)
  if (!code) throw new RangeError('Missing INS dataset code')
  signal?.throwIfAborted()
  const response = await graphqlQuery<unknown>(
    INS_DATASET_DETAILS_QUERY,
    { code },
    { auth: 'none', signal },
  )
  signal?.throwIfAborted()
  const { insDataset } = z
    .object({ insDataset: datasetSchema.nullable() })
    .parse(response)
  if (insDataset === null) return null
  if (insDataset.code !== code) throw new Error('INS dataset identity mismatch')
  return mapDatasetDetails(insDataset)
}

/** Validate one option page against its descriptor from the same native operation. */
export async function getInsDimensionValuesPage(params: {
  datasetCode: string
  dimensionIndex: number
  expectedPublicationKey?: string
  search?: string
  limit?: number
  offset?: number
  signal?: AbortSignal
}): Promise<InsDimensionValueConnection> {
  const datasetCode = normalizeInsDatasetCode(params.datasetCode)
  const limit = params.limit ?? 50
  const offset = params.offset ?? 0
  if (
    !datasetCode ||
    !Number.isInteger(params.dimensionIndex) ||
    params.dimensionIndex < 0 ||
    params.dimensionIndex > 8 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 1000 ||
    !Number.isSafeInteger(offset) ||
    offset < 0
  ) {
    throw new RangeError('Invalid INS dimension page request')
  }
  params.signal?.throwIfAborted()
  const response = await graphqlQuery<unknown>(
    INS_DATASET_DIMENSION_VALUES_QUERY,
    {
      datasetCode,
      dimensionIndex: params.dimensionIndex,
      search: params.search ?? '',
      limit,
      offset,
    },
    { auth: 'none', signal: params.signal },
  )
  params.signal?.throwIfAborted()
  const { descriptor, insDatasetDimensionValues: page } =
    dimensionPageSchema.parse(response)
  if (params.expectedPublicationKey !== undefined &&
      comparisonPublicationKey(insSourceDescriptorSchema.parse(descriptor)) !== params.expectedPublicationKey) {
    throw new InsSourcePageError('PUBLICATION_CHANGED')
  }
  const dimension = descriptor.dimensions?.find(
    (d) => d.index === params.dimensionIndex,
  )
  const { nodes, pageInfo } = page
  const end = offset + nodes.length
  if (
    descriptor.code !== datasetCode ||
    !dimension ||
    nodes.length > limit ||
    pageInfo.hasPreviousPage !== offset > 0 ||
    (pageInfo.hasNextPage && nodes.length === 0) ||
    (pageInfo.totalCount >= 0 &&
      (end > pageInfo.totalCount ||
        pageInfo.hasNextPage !== end < pageInfo.totalCount)) ||
    new Set(nodes.map((node) => node.nom_item_id)).size !== nodes.length
  ) {
    throw new Error('Invalid INS dimension page')
  }
  for (const node of nodes) {
    const classification =
      dimension.type === 'CLASSIFICATION' || dimension.type === 'TERRITORIAL'
    if (
      node.dimension_type !== dimension.type ||
      (classification &&
        (node.classification_value?.type_code !== `D${dimension.index}` ||
          node.classification_value.code !== String(node.nom_item_id))) ||
      (!classification && node.classification_value != null) ||
      (dimension.type === 'UNIT_OF_MEASURE' &&
        node.unit?.code !== String(node.nom_item_id))
    ) {
      throw new Error('INS dimension member identity mismatch')
    }
  }
  return page
}
