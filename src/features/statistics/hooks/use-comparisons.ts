import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import { searchInsTerritories } from '../api/graphql/statistics-fetchers'
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
  parseComparisonTokens,
  resolveEffectiveClassificationPins,
  resolveSelectedPeriod,
  type ClassificationPin,
  type ComparisonMatrix,
  type ComparisonTerritoryToken,
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
  /** Normalized territory tokens, in URL order (colour follows the slot). */
  readonly tokens: readonly ComparisonTerritoryToken[]
  readonly hasDataset: boolean
  readonly hasEnoughTerritories: boolean
}

export function useComparisons(
  search: StatisticsComparisonsSearch,
): UseComparisonsResult {
  const datasetCode = search.cod ?? ''
  const tokens = useMemo(
    () => parseComparisonTokens(search.teritorii),
    [search.teritorii],
  )
  const sirutaCodes = useMemo(() => tokens.map((token) => token.code), [tokens])
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
        territoryCodes: sirutaCodes,
        classificationPins: effectivePins,
        unitCode: search.unitate,
      }),
    enabled: observationsEnabled,
  })

  const matrix = useMemo(() => {
    const observations = observationsQuery.data?.observations
    if (!observations) return null
    return buildComparisonMatrix({ observations, territoryCodes: sirutaCodes })
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
    tokens,
    hasDataset: datasetCode.length > 0,
    hasEnoughTerritories: tokens.length >= 2,
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
    // Mixed levels are first-class: LAU rows become siruta: tokens, county
    // rows cod: tokens — one territoryCodes filter serves both.
    rows: query.data?.rows ?? [],
    isLoading: enabled && query.isPending,
    error: query.error,
    enabled,
  }
}

/**
 * Peer suggestions for the first selected territory: its county (via the
 * identity lookup — `parent_code` exists ONLY on `insTerritories` rows) and
 * the country. A county first-pick suggests just the country.
 */
export function useComparisonPeers(
  tokens: readonly ComparisonTerritoryToken[],
): readonly { token: string; label: string }[] {
  const first = tokens[0]
  const sirutaCode =
    first && first.token.startsWith('siruta:') ? first.code : null

  const identityQuery = useQuery({
    queryKey: ['statistics', 'comparisons', 'peer-identity', sirutaCode],
    queryFn: () =>
      searchInsTerritories({ filter: { sirutaCodes: [sirutaCode ?? ''] }, limit: 1 }),
    enabled: sirutaCode !== null,
    staleTime: 1000 * 60 * 60 * 24,
  })

  const peers: { token: string; label: string }[] = []
  const identity = identityQuery.data?.rows[0]
  if (identity?.countyCode) {
    peers.push({
      token: `cod:${identity.countyCode}`,
      label: identity.countyName
        ? `${t`județul`} ${identity.countyName}`
        : identity.countyCode,
    })
  }
  if (tokens.length > 0) {
    peers.push({ token: 'cod:RO', label: 'România' })
  }
  return peers
}
