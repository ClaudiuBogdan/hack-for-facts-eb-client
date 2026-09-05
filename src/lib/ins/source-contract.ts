import { z } from 'zod'

/** Identity fields of the native INS contract; labels and values never identify a series. */
export const insSourcePeriodicitySchema = z.enum([
  'ANNUAL',
  'SEMESTRIAL',
  'QUARTERLY',
  'MONTHLY',
  'RANGE',
  'OTHER',
])
const SOURCE_INTEGER_MIN = -2147483648
const SOURCE_INTEGER_MAX = 2147483647
export const insSourceMemberCodeSchema = z
  .string()
  .regex(/^(0|-?[1-9][0-9]{0,9})$/)
  .refine(
    (code) =>
      Number(code) >= SOURCE_INTEGER_MIN && Number(code) <= SOURCE_INTEGER_MAX,
    'Source member exceeds PostgreSQL integer range',
  )
export const insSourceDimensionCodeSchema = z.string().regex(/^D[0-6]$/)
export const insSourceGeoPairsSchema = z
  .array(
    z.tuple([
      z.number().int().min(0).max(6),
      z.number().int().min(SOURCE_INTEGER_MIN).max(SOURCE_INTEGER_MAX),
    ]),
  )
  .min(1)
  .max(7)
  .refine(
    (pairs) =>
      pairs.every(
        (pair, index) => index === 0 || pair[0] > pairs[index - 1][0],
      ),
    'Geographic source coordinates must have unique ordered dimensions',
  )

export const insSourceGeographySchema = z
  .object({
    pairs: insSourceGeoPairsSchema,
    resolution: z.enum(['EXACT', 'CONTEXTUAL', 'UNRESOLVED']),
    flags: z.array(z.string()),
    resolvedTerritory: z
      .object({ code: z.string(), level: z.string() })
      .passthrough()
      .nullable(),
    contextTerritory: z
      .object({ code: z.string(), level: z.string() })
      .passthrough()
      .nullable(),
    applicableRules: z.array(
      z.object({
        ruleId: z.string(),
        appliesFrom: z.string(),
        appliesTo: z.string(),
        flag: z.string(),
        kind: z.literal('coverage'),
        evidenceUrl: z.string(),
        rationale: z.string(),
      }),
    ),
    qualified: z.boolean(),
  })
  .superRefine((geography, context) => {
    if (
      ((geography.resolution !== 'EXACT' ||
        geography.applicableRules.length > 0) &&
        !geography.qualified) ||
      (geography.resolution === 'EXACT') !==
        (geography.resolvedTerritory !== null) ||
      (geography.resolution === 'CONTEXTUAL' &&
        geography.contextTerritory === null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Geographic interpretation contradicts its qualification',
      })
    }
  })

export const insSourcePublicationSchema = z
  .object({
    revision_id: z.string().regex(/^[1-9][0-9]*$/),
    transform_contract_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .passthrough()

export const insSourceDimensionSchema = z.object({
  label_ro: z.string().nullish(),
  label_en: z.string().nullish(),
  index: z.number().int().min(0).max(8),
  type: z.enum([
    'TEMPORAL',
    'TERRITORIAL',
    'CLASSIFICATION',
    'UNIT_OF_MEASURE',
  ]),
  classification_type: z
    .object({ code: insSourceDimensionCodeSchema })
    .nullable(),
})

/** Must come from the same GraphQL operation/publication as its observation page. */
export const insSourceLayoutSchema = z
  .object({
    code: z.string().min(1),
    dimension_count: z.number().int().min(2).max(9),
    dimensions: z.array(insSourceDimensionSchema).min(2).max(9),
  })
  .superRefine((descriptor, context) => {
    const dimensions = [...descriptor.dimensions].sort(
      (a, b) => a.index - b.index,
    )
    if (
      dimensions.length !== descriptor.dimension_count ||
      dimensions.some((dimension, index) => dimension.index !== index) ||
      dimensions.filter((dimension) => dimension.type === 'TEMPORAL').length !==
        1 ||
      dimensions.filter((dimension) => dimension.type === 'UNIT_OF_MEASURE')
        .length !== 1 ||
      dimensions[dimensions.length - 2]?.type !== 'TEMPORAL' ||
      dimensions[dimensions.length - 1]?.type !== 'UNIT_OF_MEASURE'
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Dataset dimension declaration is incomplete',
      })
    }
    for (const dimension of dimensions) {
      const classification =
        dimension.type === 'CLASSIFICATION' || dimension.type === 'TERRITORIAL'
      if (
        classification
          ? dimension.classification_type?.code !== `D${dimension.index}`
          : dimension.classification_type !== null
      ) {
        context.addIssue({
          code: 'custom',
          message:
            'Source classification identity disagrees with its declared dimension',
        })
      }
    }
  })

/** A published dataset adds custody to the same validated source layout. */
export const insSourceDescriptorSchema = insSourceLayoutSchema.safeExtend({
  metadata: insSourcePublicationSchema,
})

export const insSourceObservationSchema = z.object({
  id: z.string().min(1),
  dataset_code: z.string().min(1),
  unit: z.object({ code: insSourceMemberCodeSchema }),
  classifications: z
    .array(
      z.object({
        type_code: insSourceDimensionCodeSchema,
        code: insSourceMemberCodeSchema,
      }),
    )
    .max(7),
  time_period: z.object({
    iso_period: z.string().min(1),
    periodicity: insSourcePeriodicitySchema,
  }),
  dimensions: z.object({ geography: insSourceGeographySchema.nullable() }),
})

export type InsSourceDescriptor = z.infer<typeof insSourceDescriptorSchema>
export type InsSourceObservation = z.infer<typeof insSourceObservationSchema>
export type InsSourceGeography = z.infer<typeof insSourceGeographySchema>
export type InsSourceGeoPairs = z.infer<typeof insSourceGeoPairsSchema>

/** Two witnesses are examples of ambiguity, never a complete source-option inventory. */
export function validInsSourceWitnesses(input: {
  descriptor: unknown
  ambiguous: boolean
  witnesses: unknown
}): boolean {
  if (!Array.isArray(input.witnesses)) return false
  if (!input.ambiguous) return input.witnesses.length === 0
  const parsed = insSourceDescriptorSchema.safeParse(input.descriptor)
  if (!parsed.success || input.witnesses.length !== 2) return false
  const expected = parsed.data.dimensions
    .filter((d) => d.type === 'TERRITORIAL')
    .map((d) => d.index)
    .sort((a, b) => a - b)
  if (expected.length === 0) return false
  const witnesses = z.array(insSourceGeoPairsSchema).safeParse(input.witnesses)
  return (
    witnesses.success &&
    witnesses.data.every(
      (pairs) =>
        pairs.length === expected.length &&
        pairs.every((pair, index) => pair[0] === expected[index]),
    ) &&
    JSON.stringify(witnesses.data[0]) !== JSON.stringify(witnesses.data[1])
  )
}

export type InsSourcePeriodicity = z.infer<typeof insSourcePeriodicitySchema>

export type InsChartPeriodicity = Extract<
  InsSourcePeriodicity,
  'ANNUAL' | 'QUARTERLY' | 'MONTHLY'
>
export const isInsChartPeriodicity = (
  value: InsSourcePeriodicity,
): value is InsChartPeriodicity =>
  value === 'ANNUAL' || value === 'QUARTERLY' || value === 'MONTHLY'

/** Match the native catalog's case-insensitive dataset-code lookup. */
export function normalizeInsDatasetCode(code: string): string {
  return code.trim().toUpperCase()
}
