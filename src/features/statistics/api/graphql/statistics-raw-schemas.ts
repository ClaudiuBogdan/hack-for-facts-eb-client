import { z } from 'zod'

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

export const insPeriodicityRawSchema = z.enum(['ANNUAL', 'QUARTERLY', 'MONTHLY'])

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
  'REPRESENTATIVE_FALLBACK',
  'NO_DATA',
])

const insTimePeriodRefRawSchema = z.object({
  iso_period: z.string(),
  year: z.number(),
})

export const insLatestValueNodeRawSchema = z.object({
  latestPeriod: z.string().nullish(),
  matchStrategy: insMatchStrategyRawSchema,
  hasData: z.boolean(),
  dataset: z.object({
    code: z.string(),
    name_ro: z.string().nullish(),
    name_en: z.string().nullish(),
    periodicity: z.array(insPeriodicityRawSchema).nullish(),
  }),
  observation: z
    .object({
      value: z.string().nullish(),
      value_status: z.string().nullish(),
      unit: z.object({ symbol: z.string().nullish(), name_ro: z.string().nullish() }).nullish(),
      time_period: insTimePeriodRefRawSchema,
    })
    .nullish(),
})

const landingDecadeNodeRawSchema = z.object({
  value: z.string().nullish(),
  value_status: z.string().nullish(),
  territory: z.object({ code: z.string(), name_ro: z.string().nullish() }).nullish(),
  time_period: insTimePeriodRefRawSchema,
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
