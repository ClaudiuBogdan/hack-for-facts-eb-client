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
