import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'

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

let optionsCache: Promise<ProcurementGeographyOptions> | null = null

/** Long-lived reference vocabulary shared by the filter UI and live adapter. */
export function fetchProcurementGeographyOptions(): Promise<ProcurementGeographyOptions> {
  if (!optionsCache) {
    optionsCache = graphqlQuery<unknown>(
      PROCUREMENT_GEOGRAPHY_OPTIONS_QUERY,
      {},
      { operationName: 'ProcurementGeographyOptions' },
    )
      .then((raw) => {
        const parsed = procurementGeographyOptionsResponseSchema.parse(raw)
        return {
          regions: parsed.referenceRegions,
          counties: parsed.referenceCounties,
        }
      })
      .catch((error: unknown) => {
        optionsCache = null
        throw error
      })
  }
  return optionsCache
}

export function resetProcurementReferenceCacheForTests(): void {
  optionsCache = null
}
