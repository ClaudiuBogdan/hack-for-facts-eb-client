import { useMemo } from 'react'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import { placeIndexOf, type Place, type PlaceFeatures, type PlaceGeography, type PlaceIndex } from '@/features/procurement/lib/analytics-places'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'

/**
 * The localities (UATs) by SIRUTA, from the map's own files — the analysis
 * has no locality catalogue of its own. Read only once a locality is being
 * looked for or is on screen (the files weigh 3 MB). The counties are the
 * app's own list, by the mnemonic codes the analysis keys them by.
 */

const GEOGRAPHY: PlaceGeography = {
  regions: [],
  counties: ROMANIA_COUNTIES.map((county) => ({ countyCode: county.code, countyName: county.nameRo, region: null })),
}

export interface UatIndex {
  /** The localities as the shared place search takes them (`searchPlaces`). */
  readonly index: PlaceIndex
  /** Every locality, its county's mnemonic and its population; null until the files are read. */
  readonly localities: readonly Place[] | null
  readonly names: ReadonlyMap<string, string>
  readonly loading: boolean
  readonly failed: boolean
  readonly retry: () => void
}

export function useUatIndex(enabled: boolean): UatIndex {
  const uat = useGeoJsonData('UAT', { enabled })
  const counties = useGeoJsonData('County', { enabled })
  const index = useMemo(() => placeIndexOf(GEOGRAPHY, uat.data as PlaceFeatures, counties.data as PlaceFeatures), [uat.data, counties.data])
  // A county's own code is the procurement filter's, not a locality: left out.
  const localities = useMemo(() => index.localities?.filter((place) => place.kind !== 'judet') ?? null, [index])
  const names = useMemo(() => new Map((localities ?? []).map((place) => [place.value, place.name])), [localities])
  const failed = enabled && (uat.isError || counties.isError)
  return {
    index: { ...index, localities },
    localities,
    names,
    loading: enabled && !failed && localities === null,
    failed,
    retry: () => {
      if (uat.isError) void uat.refetch()
      if (counties.isError) void counties.refetch()
    },
  }
}
