import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { StatisticsComparisonsSearch } from '@/schemas/statistics'
import {
  fetchComparisonDataset,
  fetchComparisonObservations,
  type ComparisonDatasetMeta,
} from '../api/comparisons-api'
import { fetchDatasetPage } from '../api/dataset-explorer-api'
import { searchTerritories, TERRITORY_SEARCH_MIN_LENGTH } from '../api/territory-search-api'
import {
  buildComparisonMatrix,
  resolveEffectiveClassificationPins,
  resolveSelectedPeriod,
  type ClassificationPin,
  type ComparisonMatrix,
} from '../lib/comparison-series'

/**
 * Data layer for `/statistici/comparatii`.
 *
 * THE single-fetch contract, enforced here:
 *
 * `perioada` is NOT part of `observationsQueryKey` and is NOT passed to
 * `fetchComparisonObservations`. One `insObservations` request is issued per
 * (dataset × territories × pins) combination; the table, the bar chart, the
 * line chart and the period dropdown are all derived from its result inside
 * `useMemo`. Changing the period therefore re-renders but never refetches —
 * an integration test counts the intercepted requests to keep it that way.
 *
 * The observations query is `enabled` only once a dataset and at least one
 * territory are chosen. An `insObservations` call with no territory filter
 * scans 23.6M rows and times out at 30s.
 */

/** Sorted so `["b","a"]` and `["a","b"]` share one cache entry. */
function stableKey(values: readonly string[]): readonly string[] {
  return [...values].sort()
}

export interface UseComparisonsResult {
  readonly datasetMeta: ComparisonDatasetMeta | null
  readonly datasetLoading: boolean
  readonly datasetError: Error | null

  readonly matrix: ComparisonMatrix | null
  readonly observationsLoading: boolean
  readonly observationsError: Error | null
  readonly observationsFetching: boolean
  readonly partial: boolean
  readonly refetchObservations: () => void

  /** The pins actually sent to the server (URL pins + auto-pinned totals). */
  readonly effectivePins: readonly ClassificationPin[]
  /** The period on screen: the URL's when it exists in the data, else the latest. */
  readonly selectedPeriod: string | null
  readonly sirutaCodes: readonly string[]
  readonly hasDataset: boolean
  readonly hasEnoughTerritories: boolean
}

export function useComparisons(
  search: StatisticsComparisonsSearch,
): UseComparisonsResult {
  const datasetCode = search.cod ?? ''
  const sirutaCodes = useMemo(() => search.teritorii ?? [], [search.teritorii])
  const urlPins = useMemo(() => search.clasificari ?? [], [search.clasificari])

  const datasetQuery = useQuery({
    queryKey: ['statistics', 'comparisons', 'dataset', datasetCode],
    queryFn: () => fetchComparisonDataset(datasetCode),
    enabled: datasetCode.length > 0,
  })

  const datasetMeta = datasetQuery.data ?? null

  const effectivePins = useMemo(
    () =>
      resolveEffectiveClassificationPins({
        dimensions: datasetMeta?.classifications ?? [],
        urlPins,
      }),
    [datasetMeta, urlPins],
  )

  // The dataset must be resolved before observations are fetched: without its
  // dimensions the auto-pinned totals are unknown, and an under-pinned filter
  // silently mixes classification members into one number.
  const pinsResolved = datasetCode.length === 0 || datasetQuery.isSuccess
  const observationsEnabled =
    datasetCode.length > 0 && sirutaCodes.length > 0 && pinsResolved

  const observationsQuery = useQuery({
    // `perioada` is deliberately absent — see the module doc.
    queryKey: [
      'statistics',
      'comparisons',
      'observations',
      datasetCode,
      stableKey(sirutaCodes),
      stableKey(effectivePins.map((pin) => `${pin.typeCode}:${pin.valueCode}`)),
      search.unitate ?? null,
    ],
    queryFn: () =>
      fetchComparisonObservations({
        datasetCode,
        sirutaCodes,
        classificationPins: effectivePins,
        unitCode: search.unitate,
      }),
    enabled: observationsEnabled,
  })

  const matrix = useMemo(() => {
    const observations = observationsQuery.data?.observations
    if (!observations) return null
    return buildComparisonMatrix({ observations, sirutaCodes })
  }, [observationsQuery.data, sirutaCodes])

  const selectedPeriod = useMemo(
    () => (matrix ? resolveSelectedPeriod(matrix.periods, search.perioada) : null),
    [matrix, search.perioada],
  )

  return {
    datasetMeta,
    datasetLoading: datasetQuery.isPending && datasetCode.length > 0,
    datasetError: datasetQuery.error,

    matrix,
    observationsLoading: observationsEnabled && observationsQuery.isPending,
    observationsError: observationsQuery.error,
    observationsFetching: observationsQuery.isFetching,
    partial: observationsQuery.data?.partial ?? false,
    refetchObservations: () => {
      void observationsQuery.refetch()
    },

    effectivePins,
    selectedPeriod,
    sirutaCodes,
    hasDataset: datasetCode.length > 0,
    hasEnoughTerritories: sirutaCodes.length >= 2,
  }
}

/**
 * Dataset search for the picker. Only datasets with loaded facts are offered —
 * a catalog-only dataset would render six empty rows and teach the user
 * nothing.
 */
export function useComparisonDatasetSearch(term: string) {
  const trimmed = term.trim()

  const query = useQuery({
    queryKey: ['statistics', 'comparisons', 'dataset-search', trimmed],
    queryFn: () => fetchDatasetPage({ q: trimmed.length > 0 ? trimmed : undefined, stare: 'available' }),
  })

  return {
    datasets: query.data?.datasets ?? [],
    isLoading: query.isPending,
    error: query.error,
  }
}

/** Debounced territory search for the picker. Below the min length no request is made. */
export function useTerritorySearch(term: string) {
  const trimmed = term.trim()
  const enabled = trimmed.length >= TERRITORY_SEARCH_MIN_LENGTH

  const query = useQuery({
    queryKey: ['statistics', 'comparisons', 'territory-search', trimmed],
    queryFn: () => searchTerritories(trimmed),
    enabled,
  })

  return {
    // Only LAU territories carry a SIRUTA code, and `teritorii` is a SIRUTA
    // list — county (NUTS3) rows cannot be compared through this filter.
    rows: (query.data?.rows ?? []).filter((row) => Boolean(row.siruta)),
    isLoading: enabled && query.isPending,
    error: query.error,
    enabled,
  }
}
