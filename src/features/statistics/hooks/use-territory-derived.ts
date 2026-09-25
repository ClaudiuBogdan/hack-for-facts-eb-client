import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchTerritoryDerivedScope } from '../api/graphql/territory-derived-fetcher'
import type { DerivedScopeData, TerritoryDerivedData } from '../lib/territory-derived'
import { statisticsKeys, statisticsRetry, STATISTICS_STALE_TIME } from './query-config'

/** The newest year any read asks for: next year's 1 January divides this year's stocks. */
export const TERRITORY_DERIVED_LAST_YEAR = new Date().getUTCFullYear() + 1

const NO_SCOPE: DerivedScopeData = { series: new Map(), flags: new Map() }

export const territoryDerivedQueryOptions = (params: {
  readonly siruta: string
  /** Null where the county is no reference: the capital's county is the city itself. */
  readonly countyCode: string | null
  readonly enabled?: boolean
}) =>
  queryOptions({
    queryKey: statisticsKeys.territoryDerived(params.siruta, params.countyCode ?? ''),
    queryFn: async ({ signal }): Promise<TerritoryDerivedData> => {
      const lastYear = TERRITORY_DERIVED_LAST_YEAR
      const countyCode = params.countyCode
      const [place, county, country] = await Promise.all([
        fetchTerritoryDerivedScope({ scope: { sirutaCodes: [params.siruta] }, lastYear, signal }),
        countyCode === null
          ? NO_SCOPE
          : fetchTerritoryDerivedScope({ scope: { territoryCodes: [countyCode] }, lastYear, signal }),
        fetchTerritoryDerivedScope({ scope: { territoryCodes: ['RO'] }, lastYear, signal }),
      ])
      return { place, county, country }
    },
    enabled: params.enabled ?? true,
    staleTime: STATISTICS_STALE_TIME.figures,
    retry: statisticsRetry,
  })

/**
 * The place's, its county's and Romania's inputs for the normalized
 * indicators — three reads in parallel (two for the capital), started only
 * when the section is near the screen (`enabled`): it sits below the page's
 * other bands, and most visits never reach it.
 */
export function useTerritoryDerived(params: {
  readonly siruta: string
  readonly countyCode: string | null
  readonly enabled: boolean
}) {
  return useQuery(territoryDerivedQueryOptions(params))
}
