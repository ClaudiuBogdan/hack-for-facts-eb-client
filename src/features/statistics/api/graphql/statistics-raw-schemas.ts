import { z } from 'zod'
import {
  insSourceObservationSchema,
  insSourcePeriodicitySchema,
  insSourceGeoPairsSchema,
} from '@/lib/ins/source-contract'
import {
  validateInsLatestOutcome,
  validateInsDashboardOutcome,
} from '@/lib/ins/source-outcomes'

/**
 * Raw-response schemas for the statistics-owned INS operations.
 *
 * These validate the wire payload before it reaches the mappers. They are
 * deliberately *lenient about nullability* (`.nullish()` on anything the SDL
 * does not prove non-null) and deliberately *strict about shape*: no `.catch()`
 * fallbacks, because silently coercing a broken payload hides a contract break
 * that we would rather see as a query error.
 *
 * `value` is a Decimal serialized as a string and stays a string all the way
 * to the table and the CSV. Never `z.number()` it.
 */

export const insPageInfoRawSchema = z.object({
  totalCount: z.number(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
})

export const insDataStatusRawSchema = z.enum(['AVAILABLE', 'CATALOG_ONLY'])

export const insTerritoryLevelRawSchema = z.enum([
  'NATIONAL',
  'NUTS1',
  'NUTS2',
  'NUTS3',
  'LAU',
])

/**
 * `parent_*` is the containing territory — the county, for the LAU rows the
 * product cares about. The server names it `parent_`, not `county_`, because a
 * NUTS2 row's parent is a macroregion, not a county.
 */
export const insTerritoryNodeRawSchema = z.object({
  code: z.string(),
  siruta_code: z.string().nullish(),
  level: insTerritoryLevelRawSchema.nullish(),
  name_ro: z.string().nullish(),
  parent_code: z.string().nullish(),
  parent_name_ro: z.string().nullish(),
})

export const insTerritoriesResponseRawSchema = z.object({
  insTerritories: z.object({
    nodes: z.array(insTerritoryNodeRawSchema),
    pageInfo: insPageInfoRawSchema,
  }),
})

export const insPeriodicityRawSchema = insSourcePeriodicitySchema

/**
 * `data_status` is `.nullish()` rather than required so a client deployed ahead
 * of the server field still parses; the mapper then falls back to deriving the
 * status from `sync_status`.
 */
export const insDatasetNodeRawSchema = z.object({
  id: z.string(),
  code: z.string(),
  name_ro: z.string().nullish(),
  name_en: z.string().nullish(),
  definition_ro: z.string().nullish(),
  definition_en: z.string().nullish(),
  periodicity: z.array(insPeriodicityRawSchema).nullish(),
  year_range: z.array(z.number()).nullish(),
  dimension_count: z.number().nullish(),
  has_uat_data: z.boolean().nullish(),
  has_county_data: z.boolean().nullish(),
  has_siruta: z.boolean().nullish(),
  sync_status: z.string().nullish(),
  last_sync_at: z.string().nullish(),
  context_code: z.string().nullish(),
  context_name_ro: z.string().nullish(),
  context_name_en: z.string().nullish(),
  context_path: z.string().nullish(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
  data_status: insDataStatusRawSchema.nullish(),
})

export const insDatasetsExplorerResponseRawSchema = z.object({
  insDatasets: z.object({
    nodes: z.array(insDatasetNodeRawSchema),
    pageInfo: insPageInfoRawSchema,
  }),
})

export type InsTerritoryNodeRaw = z.infer<typeof insTerritoryNodeRawSchema>
export type InsDatasetNodeRaw = z.infer<typeof insDatasetNodeRawSchema>

// ---------------------------------------------------------------------------
// Landing operations (POST 1 observations, POST 2 catalog, UAT snapshot)
// ---------------------------------------------------------------------------

export const insMatchStrategyRawSchema = z.enum([
  'PREFERRED_CLASSIFICATION',
  'TOTAL_FALLBACK',
  'AMBIGUOUS_GEOGRAPHY',
  'NO_DATA',
])

const insTimePeriodRefRawSchema = z.object({
  iso_period: z.string(),
  year: z.number(),
  periodicity: insPeriodicityRawSchema.nullish(),
})

const totalCountProbeRawSchema = z.object({
  pageInfo: z.object({ totalCount: z.number() }),
})

export const statisticsLandingCatalogResponseRawSchema = z.object({
  loaded: totalCountProbeRawSchema,
  catalog: totalCountProbeRawSchema,
  t1: totalCountProbeRawSchema,
  t2: totalCountProbeRawSchema,
  t3: totalCountProbeRawSchema,
  t4: totalCountProbeRawSchema,
  t5: totalCountProbeRawSchema,
  t6: totalCountProbeRawSchema,
  t7: totalCountProbeRawSchema,
  t8: totalCountProbeRawSchema,
})

// ---------------------------------------------------------------------------
// Dataset detail (tier 0 + series)
// ---------------------------------------------------------------------------

export const insDimensionTypeRawSchema = z.enum([
  'TEMPORAL',
  'TERRITORIAL',
  'CLASSIFICATION',
  'UNIT_OF_MEASURE',
])

const insDatasetDimensionRawSchema = z.object({
  index: z.number(),
  type: insDimensionTypeRawSchema,
  label_ro: z.string().nullish(),
  label_en: z.string().nullish(),
  is_hierarchical: z.boolean().nullish(),
  option_count: z.number().nullish(),
  classification_type: z
    .object({
      code: z.string().nullish(),
      name_ro: z.string().nullish(),
      name_en: z.string().nullish(),
      is_hierarchical: z.boolean().nullish(),
    })
    .nullish(),
})

/** Full observation node for the series/table (the validated detail lane). */
export const insObservationNodeRawSchema = z.object({
  value: z.string().nullish(),
  value_status: z.string().nullish(),
  time_period: z.object({
    iso_period: z.string(),
    year: z.number(),
    quarter: z.number().nullish(),
    month: z.number().nullish(),
    periodicity: insPeriodicityRawSchema,
  }),
  territory: z
    .object({
      code: z.string().nullish(),
      siruta_code: z.string().nullish(),
      level: insTerritoryLevelRawSchema.nullish(),
      name_ro: z.string().nullish(),
    })
    .nullish(),
  unit: z
    .object({
      code: z.string().nullish(),
      symbol: z.string().nullish(),
      name_ro: z.string().nullish(),
    })
    .nullish(),
  classifications: z
    .array(
      z.object({
        type_code: z.string().nullish(),
        type_name_ro: z.string().nullish(),
        code: z.string().nullish(),
        name_ro: z.string().nullish(),
        sort_order: z.number().nullish(),
      }),
    )
    .nullish(),
})

/** Native source vectors require identity fields before any derived output. */
export const insNativeObservationRawSchema = insObservationNodeRawSchema.extend(
  {
    id: insSourceObservationSchema.shape.id,
    dataset_code: insSourceObservationSchema.shape.dataset_code,
    value: z.string().nullable(),
    unit: z.object({
      code: insSourceObservationSchema.shape.unit.shape.code,
      symbol: z.string().nullish(),
      name_ro: z.string().nullish(),
    }),
    classifications: z
      .array(
        z.object({
          id: z.string(),
          type_code:
            insSourceObservationSchema.shape.classifications.element.shape
              .type_code,
          type_name_ro: z.string().nullish(),
          type_name_en: z.string().nullish(),
          code: insSourceObservationSchema.shape.classifications.element.shape
            .code,
          name_ro: z.string().nullish(),
          name_en: z.string().nullish(),
          sort_order: z.number().nullish(),
        }),
      )
      .max(7),
    dimensions: insSourceObservationSchema.shape.dimensions,
  },
)

export const insDetailedDatasetRawSchema = insDatasetNodeRawSchema.extend({
  dimensions: z.array(insDatasetDimensionRawSchema).nullish(),
})

export const insLatestValueNodeRawSchema = z
  .object({
    latestPeriod: z.string().nullable(),
    matchStrategy: insMatchStrategyRawSchema,
    hasData: z.boolean(),
    geographicWitnesses: z.array(insSourceGeoPairsSchema),
    dataset: insDetailedDatasetRawSchema,
    observation: insNativeObservationRawSchema.nullable(),
  })
  .superRefine((outcome, context) => {
    const error = validateInsLatestOutcome(outcome)
    if (error) context.addIssue({ code: 'custom', message: error })
  })

const landingDecadeNodeRawSchema = z.object({
  value: z.string().nullish(),
  value_status: z.string().nullish(),
  territory: z
    .object({ code: z.string(), name_ro: z.string().nullish() })
    .nullish(),
  time_period: insTimePeriodRefRawSchema,
  unit: z
    .object({ symbol: z.string().nullish(), name_ro: z.string().nullish() })
    .nullish(),
})

const landingExampleNodeRawSchema = z.object({
  value: z.string().nullish(),
  territory: z
    .object({
      code: z.string(),
      siruta_code: z.string().nullish(),
      level: insTerritoryLevelRawSchema.nullish(),
      name_ro: z.string().nullish(),
    })
    .nullish(),
  time_period: insTimePeriodRefRawSchema,
  unit: z.object({ symbol: z.string().nullish() }).nullish(),
})

export const statisticsLandingDataResponseRawSchema = z.object({
  latest: z.array(insLatestValueNodeRawSchema),
  decade: z.object({
    pageInfo: z.object({ totalCount: z.number() }),
    nodes: z.array(landingDecadeNodeRawSchema),
  }),
  example: z.object({
    nodes: z.array(landingExampleNodeRawSchema),
  }),
})

export const statisticsUatSnapshotResponseRawSchema = z.object({
  latest: z.array(insLatestValueNodeRawSchema),
  territory: z.object({
    nodes: z.array(insTerritoryNodeRawSchema),
  }),
})

export type InsLatestValueNodeRaw = z.infer<typeof insLatestValueNodeRawSchema>
export type LandingDecadeNodeRaw = z.infer<typeof landingDecadeNodeRawSchema>
export type LandingExampleNodeRaw = z.infer<typeof landingExampleNodeRawSchema>
export type StatisticsLandingCatalogResponseRaw = z.infer<
  typeof statisticsLandingCatalogResponseRawSchema
>

export const statisticsDatasetTier0ResponseRawSchema = z.object({
  dataset: insDatasetNodeRawSchema
    .extend({
      dimensions: z.array(insDatasetDimensionRawSchema).nullish(),
    })
    .nullish(),
  latest: z.array(insLatestValueNodeRawSchema),
})

export const insSourceObservationsResponseRawSchema = z.object({
  descriptor: z.unknown(),
  insObservations: z.object({
    nodes: z.array(insNativeObservationRawSchema),
    pageInfo: insPageInfoRawSchema,
  }),
})

export const statisticsRelatedDatasetsRawSchema = z.object({
  related: z
    .object({
      pageInfo: z.object({ totalCount: z.number() }),
      nodes: z.array(
        z.object({
          code: z.string(),
          name_ro: z.string().nullish(),
          data_status: insDataStatusRawSchema.nullish(),
        }),
      ),
    })
    .nullish(),
})

export type InsObservationNodeRaw = z.infer<typeof insObservationNodeRawSchema>
export type StatisticsDatasetTier0ResponseRaw = z.infer<
  typeof statisticsDatasetTier0ResponseRawSchema
>
export type StatisticsRelatedDatasetsRaw = z.infer<
  typeof statisticsRelatedDatasetsRawSchema
>

// ---------------------------------------------------------------------------
// Territory hub
// ---------------------------------------------------------------------------

export const insDashboardGroupRawSchema = z
  .object({
    latestPeriod: z.string().nullable(),
    dataset: insDetailedDatasetRawSchema,
    observations: z.array(insNativeObservationRawSchema),
    status: z.enum(['SERIES', 'AMBIGUOUS_GEOGRAPHY']),
    geographicWitnesses: z.array(insSourceGeoPairsSchema),
    truncated: z.boolean(),
  })
  .superRefine((outcome, context) => {
    const error = validateInsDashboardOutcome(outcome)
    if (error) context.addIssue({ code: 'custom', message: error })
  })

export const statisticsTerritoryHubResponseRawSchema = z.object({
  dashboard: z.array(insDashboardGroupRawSchema),
  identity: z.object({ nodes: z.array(insTerritoryNodeRawSchema) }),
})

export const statisticsTerritoryHubContextResponseRawSchema = z.object({
  loaded: totalCountProbeRawSchema,
  catalog: totalCountProbeRawSchema,
  county: z.array(insLatestValueNodeRawSchema).nullish(),
  national: z.array(insLatestValueNodeRawSchema),
})

export type StatisticsTerritoryHubResponseRaw = z.infer<
  typeof statisticsTerritoryHubResponseRawSchema
>
