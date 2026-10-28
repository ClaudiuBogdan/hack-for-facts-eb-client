import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { createServerMemo } from '@/lib/ssr/server-memo'

const PROCUREMENT_GEOGRAPHY_OPTIONS_QUERY = /* GraphQL */ `
  query ProcurementGeographyOptions {
    referenceRegions {
      region
      countyCount
      uatCount
    }
    referenceCounties {
      countyCode
      countyName
      region
      uatCount
    }
  }
`

const procurementRegionOptionSchema = z.object({
  region: z.string(),
  countyCount: z.number().int().nonnegative(),
  uatCount: z.number().int().nonnegative(),
})

const procurementCountyOptionSchema = z.object({
  countyCode: z.string(),
  countyName: z.string(),
  region: z.string().nullable(),
  uatCount: z.number().int().nonnegative(),
})

const procurementGeographyOptionsResponseSchema = z.object({
  referenceRegions: z.array(procurementRegionOptionSchema),
  referenceCounties: z.array(procurementCountyOptionSchema),
})

export type ProcurementRegionOption = z.infer<
  typeof procurementRegionOptionSchema
>
export type ProcurementCountyOption = z.infer<
  typeof procurementCountyOptionSchema
>

export type ProcurementGeographyOptions = {
  readonly regions: readonly ProcurementRegionOption[]
  readonly counties: readonly ProcurementCountyOption[]
}

/**
 * Reference vocabulary changes with an API release: kept for six hours, as
 * the analytics page keeps it (`procurement-analytics-ssr.ts`), then served
 * stale while one read refreshes it. A failed read is not kept.
 */
const KEEP_OPTIONS_MS = 6 * 60 * 60 * 1000

let options = createServerMemo<ProcurementGeographyOptions>(KEEP_OPTIONS_MS)

/** Long-lived reference vocabulary shared by the filter UI and live adapter. */
export function fetchProcurementGeographyOptions(): Promise<ProcurementGeographyOptions> {
  return options('all', () =>
    graphqlQuery<unknown>(
      PROCUREMENT_GEOGRAPHY_OPTIONS_QUERY,
      {},
      { operationName: 'ProcurementGeographyOptions' },
    ).then((raw) => {
      const parsed = procurementGeographyOptionsResponseSchema.parse(raw)
      return {
        regions: parsed.referenceRegions,
        counties: parsed.referenceCounties,
      }
    }),
  )
}

export function resetProcurementReferenceCacheForTests(): void {
  options = createServerMemo<ProcurementGeographyOptions>(KEEP_OPTIONS_MS)
}
